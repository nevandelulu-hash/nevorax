import { planTask } from "../planner/taskPlanner.js"
import {
  createTaskContract,
  releasePayment
} from "../contracts/taskContractManager.js"
import { runDataAgentTask } from "./dataAgent.js"
import { runSentimentAgentTask } from "./sentimentAgent.js"
import { runAnalysisAgentTask } from "./analysisAgent.js"
import { runStrategyAgentTask } from "./strategyAgent.js"
import { runReportAgentTask } from "./reportAgent.js"
import { emitEvent } from "../events/eventBus.js"
import { planTaskWithOpenClaw } from "./openclawReasoner.js"
import { selectProvider } from "../marketplace/marketplaceEngine.js"
import { resolveExecutionAgent } from "../marketplace/providerMapping.js"
import { negotiatePrice } from "./negotiationAgent.js"
import {
  allocateBudget,
  getTreasuryState,
  refundBudget
} from "./treasuryAgent.js"
import {
  getAgentReputation,
  recordAgentSuccess,
  recordAgentFailure
} from "../reputation/reputationStore.js"
import {
  createAgreement,
  completeAgreement,
  failAgreement,
  updateAgreementStatus
} from "../contracts/agentAgreement.js"
import { normalizeWei } from "../utils/priceUtils.js"
import { saveTask } from "../store/taskStore.js"
import { saveDeliverable } from "../assets/deliverableStore.js"

/**
 * OrchestratorAgent
 * Coordinates multi-agent tasks, planning, execution and payments.
 * Uses the LLM + economic modules to decide which agents to involve.
 */
export async function runOrchestratedTask(taskDescription) {
  console.log("[NevoraX DEBUG] runOrchestratedTask started:", taskDescription)
  console.log("[OrchestratorAgent] Received task:", taskDescription)

  // 1. Base plan (taskId, price) from planner
  const basePlan = await planTask(taskDescription)
  console.log("[OrchestratorAgent] Base task plan from planner:", basePlan)

  emitEvent("TASK_CREATED", {
    taskId: basePlan.taskId,
    taskDescription
  })

  // 2. Use OpenClaw-style reasoner to decide which agents should participate
  console.log("[OpenClaw Reasoner] Planning task:", taskDescription)

  let agents = basePlan.agents
  try {
    const ocPlan = await planTaskWithOpenClaw(taskDescription)
    if (ocPlan && Array.isArray(ocPlan.agents) && ocPlan.agents.length > 0) {
      const ocAgents = ocPlan.agents.map((a) =>
        typeof a === "string" ? a : a.name
      )
      const merged = new Set([...(agents || []), ...ocAgents])
      agents = Array.from(merged)
    }
  } catch (error) {
    console.warn(
      "[OpenClaw Reasoner] Planning failed, falling back to TaskPlanner agents:",
      error
    )
  }

  console.log("[OpenClaw Reasoner] Selected agents:", agents)

  // 3. Marketplace selection for market_data
  console.log("[Marketplace] Searching providers for market_data")
  const marketplaceResult = selectProvider("market_data")
  const selectedProvider = marketplaceResult.provider || "DataAgent"
  const executionAgent = marketplaceResult.executionAgent || resolveExecutionAgent(selectedProvider)
  const basePrice = marketplaceResult.basePrice || 500000000000000
  const bids = marketplaceResult.bids || []

  console.log("[Marketplace] Provider selected:", selectedProvider, "→ Execution agent:", executionAgent)
  console.log("[Marketplace] Agent bids:", bids)

  emitEvent("AgentBids", {
    service: "market_data",
    bids
  })

  emitEvent("AgentSelected", {
    agent: selectedProvider,
    price: basePrice,
    executionAgent
  })

  const marketplaceInfo = {
    provider: selectedProvider,
    executionAgent,
    bids
  }

  // 4. Negotiation
  console.log("[NegotiationAgent] Negotiating price")
  const negotiatedPrice = await negotiatePrice(
    "market_data",
    basePrice
  )
  console.log("[NegotiationAgent] Final price:", String(negotiatedPrice))

  const negotiationInfo = {
    basePrice,
    finalPrice: negotiatedPrice
  }

  // 5. Treasury budget allocation
  console.log("[TreasuryAgent] Allocating budget")
  allocateBudget(basePlan.taskId, negotiatedPrice)
  const treasuryState = getTreasuryState()
  console.log("[TreasuryAgent] Treasury state:", treasuryState)

  const treasuryInfo = {
    allocatedBudget: negotiatedPrice,
    remainingBalance: treasuryState.balance
  }

  // 6. Create agreement
  const agreement = createAgreement({
    taskId: basePlan.taskId,
    provider: typeof selectedProvider === "string" ? selectedProvider : selectedProvider?.name,
    service: "market_data",
    price: negotiatedPrice
  })

  console.log("[NevoraX Economy] AgreementCreated", agreement)
  emitEvent("AgreementCreated", agreement)
  updateAgreementStatus(agreement.agreementId, "negotiating")

  // 7. Create task contract using negotiated price
  const contract = await createTaskContract(
    basePlan.taskId,
    agents,
    String(negotiatedPrice)
  )
  console.log("[OrchestratorAgent] Task contract created:", contract)

  // 8. Execute participating agents
  const results = {}
  let sentimentResult = null
  let analysisResult = null
  let strategyResult = null

  const shouldRunDataAgent =
    agents.includes(selectedProvider) ||
    agents.includes("DataAgent") ||
    executionAgent === "DataAgent"

  if (selectedProvider && executionAgent && shouldRunDataAgent) {
    try {
      updateAgreementStatus(agreement.agreementId, "executing")
      emitEvent("AgentExecutionStarted", {
        agent: executionAgent,
        provider: selectedProvider,
        taskId: basePlan.taskId
      })
      const dataResult = await runDataAgentTask(basePlan.taskId, taskDescription)
      results.data = dataResult
      recordAgentSuccess("DataAgent")
      console.log("[Marketplace] Provider selected:", selectedProvider, "→ Execution agent:", executionAgent)
      console.log("[Reputation] DataAgent:", getAgentReputation("DataAgent"))
      emitEvent("AgentExecutionCompleted", {
        agent: executionAgent,
        provider: selectedProvider,
        taskId: basePlan.taskId
      })
    } catch (error) {
      recordAgentFailure("DataAgent")
      failAgreement(agreement)
      refundBudget(basePlan.taskId)
      emitEvent("TaskFailed", {
        taskId: basePlan.taskId,
        error: String(error?.message || error),
        agent: "DataAgent"
      })
      throw error
    }
  }

  // SentimentAgent: reuse sub-task sentiment if available, otherwise execute
  if (agents.includes("SentimentAgent")) {
    const subTaskSentiment = results.data?.subTaskSentiment

    if (subTaskSentiment) {
      sentimentResult = subTaskSentiment
    } else {
      const context = JSON.stringify({
        task: taskDescription,
        data: results.data || null
      })
      try {
        emitEvent("AgentExecutionStarted", {
          agent: "SentimentAgent",
          taskId: basePlan.taskId
        })
        sentimentResult = await runSentimentAgentTask(basePlan.taskId, context)
        recordAgentSuccess("SentimentAgent")
        console.log("[Reputation] SentimentAgent:", getAgentReputation("SentimentAgent"))
        emitEvent("AgentExecutionCompleted", {
          agent: "SentimentAgent",
          taskId: basePlan.taskId
        })
      } catch (error) {
        recordAgentFailure("SentimentAgent")
        failAgreement(agreement)
        refundBudget(basePlan.taskId)
        emitEvent("TaskFailed", {
          taskId: basePlan.taskId,
          error: String(error?.message || error),
          agent: "SentimentAgent"
        })
        throw error
      }
    }
  }

  // 9. Synthesize a simple report
  const reportLines = []
  const formattedTask = taskDescription
    // insert space between lower→upper boundaries
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    // insert space between ALLCAPS runs and Capitalized words (e.g. BTCMarket → BTC Market)
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
  reportLines.push(`Task: ${formattedTask}`)

  if (results.data) {
    reportLines.push(
      `Market Data → price: ${results.data.price}, volume: ${results.data.volume}`
    )
  }

  let sentimentResultFinal = null

  if (results?.data?.subTaskSentiment) {
    sentimentResultFinal = results.data.subTaskSentiment
  }

  if (!sentimentResultFinal && sentimentResult) {
    sentimentResultFinal = sentimentResult
  }

  const sentiment = sentimentResultFinal

  if (sentiment) {
    reportLines.push(
      `Sentiment → sentiment: ${sentiment.sentiment}, confidence: ${sentiment.confidence}`
    )
    if (sentiment.reasoning) {
      reportLines.push(`Reasoning → ${sentiment.reasoning}`)
    }
  }

  // 9b. AnalysisAgent
  if (agents.includes("AnalysisAgent")) {
    const subTaskId = `${basePlan.taskId}_AnalysisAgent`
    const price = "300000000000000"
    await createTaskContract(subTaskId, ["OrchestratorAgent", "AnalysisAgent"], price)
    try {
      emitEvent("AgentExecutionStarted", {
        agent: "AnalysisAgent",
        taskId: subTaskId
      })
      analysisResult = await runAnalysisAgentTask(subTaskId, {
        data: results.data,
        sentiment
      })
      results.analysis = analysisResult
      recordAgentSuccess("AnalysisAgent")
      console.log("[Reputation] AnalysisAgent:", getAgentReputation("AnalysisAgent"))
      emitEvent("AgentExecutionCompleted", {
        agent: "AnalysisAgent",
        taskId: subTaskId
      })
      await releasePayment(subTaskId, "OrchestratorAgent")
    } catch (error) {
      recordAgentFailure("AnalysisAgent")
      failAgreement(agreement)
      refundBudget(basePlan.taskId)
      emitEvent("TaskFailed", {
        taskId: subTaskId,
        error: String(error?.message || error),
        agent: "AnalysisAgent"
      })
      throw error
    }
  }

  // 9c. StrategyAgent
  if (agents.includes("StrategyAgent")) {
    const subTaskId = `${basePlan.taskId}_StrategyAgent`
    const price = "300000000000000"
    await createTaskContract(subTaskId, ["OrchestratorAgent", "StrategyAgent"], price)
    try {
      emitEvent("AgentExecutionStarted", {
        agent: "StrategyAgent",
        taskId: subTaskId
      })
      strategyResult = await runStrategyAgentTask(subTaskId, {
        analysis: analysisResult
      })
      results.strategy = strategyResult
      recordAgentSuccess("StrategyAgent")
      console.log("[Reputation] StrategyAgent:", getAgentReputation("StrategyAgent"))
      emitEvent("AgentExecutionCompleted", {
        agent: "StrategyAgent",
        taskId: subTaskId
      })
      await releasePayment(subTaskId, "OrchestratorAgent")
    } catch (error) {
      recordAgentFailure("StrategyAgent")
      failAgreement(agreement)
      refundBudget(basePlan.taskId)
      emitEvent("TaskFailed", {
        taskId: subTaskId,
        error: String(error?.message || error),
        agent: "StrategyAgent"
      })
      throw error
    }
  }

  // 9d. ReportAgent (final deliverable)
  let finalDeliverable = null
  if (agents.includes("ReportAgent")) {
    const subTaskId = `${basePlan.taskId}_ReportAgent`
    const price = "300000000000000"
    await createTaskContract(subTaskId, ["OrchestratorAgent", "ReportAgent"], price)
    try {
      emitEvent("AgentExecutionStarted", {
        agent: "ReportAgent",
        taskId: subTaskId
      })
      finalDeliverable = await runReportAgentTask(subTaskId, {
        task: taskDescription,
        data: results.data,
        sentiment,
        analysis: analysisResult,
        strategy: strategyResult
      })
      emitEvent("AgentExecutionCompleted", {
        agent: "ReportAgent",
        taskId: subTaskId
      })
      recordAgentSuccess("ReportAgent")
      console.log("[Reputation] ReportAgent:", getAgentReputation("ReportAgent"))
      await releasePayment(subTaskId, "OrchestratorAgent")
    } catch (error) {
      recordAgentFailure("ReportAgent")
      failAgreement(agreement)
      refundBudget(basePlan.taskId)
      emitEvent("TaskFailed", {
        taskId: subTaskId,
        error: String(error?.message || error),
        agent: "ReportAgent"
      })
      throw error
    }
  }

  const report = reportLines.join("\n")

  // 10. Release main payment via contract manager (subtask paid by DataAgent)
  const paymentResult = await releasePayment(basePlan.taskId)
  const subTaskTxHash = results.data?.subTaskTxHash || ""
  const txHash = paymentResult?.txHash || ""

  const completedAgreement = completeAgreement(agreement)

  const reputationInfo = {
    DataAgent: getAgentReputation("DataAgent").score,
    SentimentAgent: getAgentReputation("SentimentAgent").score,
    AnalysisAgent: getAgentReputation("AnalysisAgent").score,
    StrategyAgent: getAgentReputation("StrategyAgent").score,
    ReportAgent: getAgentReputation("ReportAgent").score
  }

  const normalizedAgents = agents.map((a) => (typeof a === "string" ? a : a.name))

  const taskLower = (taskDescription || "").toLowerCase()
  let deliverableType = "market_insight"
  if (/forecast|prediction/i.test(taskLower)) deliverableType = "forecast"
  else if (/strategy|recommend/i.test(taskLower)) deliverableType = "strategy"
  else if (/signal|alert/i.test(taskLower)) deliverableType = "signal"
  else if (/dataset|raw|data only/i.test(taskLower)) deliverableType = "dataset"
  else if (/analysis|report/i.test(taskLower)) deliverableType = "analysis_report"

  const producedByMeta = {
    provider: selectedProvider,
    executionAgent
  }

  const baseDeliverablePayload = finalDeliverable
    ? {
        type: finalDeliverable.type,
        content: finalDeliverable.content,
        agents: finalDeliverable.producedBy,
        producedBy: producedByMeta,
        cost: negotiatedPrice
      }
    : {
        type: deliverableType,
        content: report,
        agents: normalizedAgents,
        producedBy: producedByMeta,
        cost: negotiatedPrice
      }

  const deliverable = saveDeliverable(baseDeliverablePayload)

  const result = {
    taskId: basePlan.taskId,
    agents: normalizedAgents,
    estimatedCost: negotiatedPrice,
    report,
    sentiment: sentiment || null,
    analysis: analysisResult || null,
    strategy: strategyResult || null,
    marketplace: marketplaceInfo,
    negotiation: negotiationInfo,
    treasury: treasuryInfo,
    agreement: completedAgreement,
    reputation: reputationInfo,
    deliverable,
    txHash,
    subTaskTxHash,
    timestamp: Date.now()
  }

  console.log("[OrchestratorAgent] Task completed", {
    taskId: result.taskId,
    agents: result.agents,
    estimatedCost: result.estimatedCost,
    txHash: result.txHash,
    subTaskTxHash: result.subTaskTxHash
  })

  saveTask(result)

  return result
}

