import axios from "axios"
import { runSentimentAgentTask } from "./sentimentAgent.js"
import { createTaskContract, releasePayment } from "../contracts/taskContractManager.js"
import { emitEvent } from "../events/eventBus.js"

/**
 * DataAgent
 * Fetches real Ethereum market data from CoinGecko and can
 * autonomously hire SentimentAgent for sub-tasks.
 */
export async function runDataAgentTask(taskId, taskDescription) {
  console.log(
    `[DataAgent] Fetching market data for task ${taskId}: ${taskDescription}`
  )

  emitEvent("AGENT_STARTED", {
    agent: "DataAgent",
    taskId
  })

  const coingeckoURL =
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_vol=true"
  const binanceURL = "https://api.binance.com/api/v3/avgPrice?symbol=ETHUSDT"
  const coincapURL = "https://api.coincap.io/v2/assets/ethereum"

  try {
    const sources = await Promise.allSettled([
      axios.get(coingeckoURL, { timeout: 5000 }).then((r) => r.data),
      axios.get(binanceURL, { timeout: 5000 }).then((r) => r.data),
      axios.get(coincapURL, { timeout: 5000 }).then((r) => r.data)
    ])

    const prices = []
    const volumes = []

    if (sources[0].status === "fulfilled") {
      const eth = sources[0].value?.ethereum || {}
      if (eth.usd != null) prices.push(Number(eth.usd))
      if (eth.usd_24h_vol != null) volumes.push(Number(eth.usd_24h_vol))
    }
    if (sources[1].status === "fulfilled") {
      const p = sources[1].value?.price
      if (p != null) prices.push(Number(p))
    }
    if (sources[2].status === "fulfilled") {
      const data = sources[2].value?.data || {}
      if (data.priceUsd != null) prices.push(Number(data.priceUsd))
      if (data.volumeUsd24Hr != null) volumes.push(Number(data.volumeUsd24Hr))
    }

    const avgPrice =
      prices.length > 0
        ? String(
            (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)
          )
        : "0"
    const avgVolume =
      volumes.length > 0
        ? String(
            Math.floor(
              volumes.reduce((a, b) => a + b, 0) / volumes.length
            )
          )
        : "0"

    const result = {
      price: avgPrice,
      volume: avgVolume,
      timestamp: Date.now(),
      sourcesUsed: prices.length
    }

    console.log("[DataAgent] Market data fetched (multi-source)", result)

    // Decide if sentiment analysis is needed based on the task description.
    const needsSentiment =
      typeof taskDescription === "string" &&
      /sentiment|report|analysis|insight|trading/i.test(taskDescription)

    if (!needsSentiment) {
      emitEvent("AGENT_FINISHED", {
        agent: "DataAgent",
        taskId
      })
      return result
    }

    console.log("[DataAgent hiring SentimentAgent] Preparing sub-task for sentiment analysis")

    const subTaskId = `${taskId}_SentimentAgent`

    createTaskContract(subTaskId, ["DataAgent", "SentimentAgent"], "200000000000000")

    const sentimentResult = await runSentimentAgentTask(subTaskId, {
      task: taskDescription,
      data: result,
      parentTaskId: taskId,
      subTaskId
    })

    console.log("[AgentCoordinator] SentimentAgent completed:", sentimentResult)

    let subPayment = await releasePayment(subTaskId, "DataAgent")

    if (!subPayment?.txHash) {
      createTaskContract(subTaskId + "_orch", ["SentimentAgent"], "200000000000000")
      const fallback = await releasePayment(subTaskId + "_orch", "OrchestratorAgent")
      if (fallback?.txHash) subPayment = fallback
    }

    console.log("[Subtask Payment]", subPayment)

    const finalResult = {
      ...result,
      sentiment: sentimentResult,
      subTaskSentiment: sentimentResult,
      subTaskId,
      subTaskTxHash: subPayment?.txHash || ""
    }

    emitEvent("AGENT_FINISHED", {
      agent: "DataAgent",
      taskId
    })

    return finalResult
  } catch (error) {
    console.error("[DataAgent] Failed to execute data (or sub-task) flow:", error)
    throw error
  }
}

