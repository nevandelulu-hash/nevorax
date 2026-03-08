import { getAgentAddress, sendFromAgent } from "../wallets/agentWalletRegistry.js"
import { emitEvent } from "../events/eventBus.js"
import { logEconomy } from "../utils/economyLogger.js"
import { recordPayment, reconcileTreasuryWithBlockchain } from "./treasuryAgent.js"
import { recordRevenue } from "../economy/agentEconomyStore.js"

const DEFAULT_PAYER_AGENT = "OrchestratorAgent"

/**
 * ExecutionAgent
 * Handles payments between agents using the WDK wallet system.
 *
 * @param {{taskId: string, agents: string[], price: string}} contract
 * @param {string} [payer] - Agent paying (default: OrchestratorAgent)
 * @returns {Promise<{fromAgent: string, to: string, amount: string, txHash: string}>}
 */
export async function executeTaskPayment(contract, payer) {
  const { taskId, agents, price } = contract

  const payerAgent = payer || DEFAULT_PAYER_AGENT
  const recipient = (agents || []).find((a) => a !== payerAgent)

  if (!recipient) {
    console.warn(
      `[NevoraX][ExecutionAgent] No recipient for payment on taskId=${taskId} (payer=${payer}, agents=${JSON.stringify(agents)})`
    )
    return {
      fromAgent: payerAgent,
      to: "",
      amount: "0",
      txHash: ""
    }
  }

  try {
    const toAddress = await getAgentAddress(recipient)

    console.log("[SubTask Payment Attempt]", {
      taskId,
      payerAgent,
      recipient,
      amount: price
    })

    const payment = await sendFromAgent(payerAgent, toAddress, price)

    console.log("[SubTask Payment Success]", payment)
    console.log("[NevoraX][ExecutionAgent] Task payment executed", {
      taskId,
      fromAgent: payment.fromAgent,
      toAgent: recipient,
      toAddress,
      amount: payment.amount,
      txHash: payment.txHash
    })

    const payload = {
      taskId,
      fromAgent: payment.fromAgent,
      toAgent: recipient,
      amount: payment.amount,
      txHash: payment.txHash
    }

    logEconomy("PaymentReleased", payload)
    recordPayment(payment.amount)
    recordRevenue(recipient, payment.amount)

    emitEvent("PaymentReleased", payload)

    if (payment.txHash) {
      logEconomy("BlockchainSettlement", { taskId, txHash: payment.txHash })
      emitEvent("BlockchainSettlement", {
        taskId,
        txHash: payment.txHash
      })

      emitEvent("BLOCKCHAIN_TX", {
        txHash: payment.txHash
      })

      reconcileTreasuryWithBlockchain().catch(() => {})
    }

    return payment
  } catch (error) {
    console.error(
      `[NevoraX][ExecutionAgent] Failed to execute payment for taskId=${taskId}:`,
      error
    )
    return {
      fromAgent: payerAgent,
      to: "",
      amount: "0",
      txHash: ""
    }
  }
}

