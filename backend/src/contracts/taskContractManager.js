import { executeTaskPayment } from "../agents/executionAgent.js"

const contracts = new Map()

export function createTaskContract(taskId, agents, price) {
  const contract = {
    taskId,
    agents,
    price,
    status: "pending",
    paymentReleased: false
  }

  contracts.set(taskId, contract)
  return contract
}

export function getTaskContract(taskId) {
  return contracts.get(taskId) || null
}

export async function markTaskCompleted(taskId) {
  const contract = contracts.get(taskId)
  if (!contract) {
    throw new Error(`Task contract not found for taskId=${taskId}`)
  }

  contract.status = "completed"
  return contract
}

/**
 * Release payment for a task using the ExecutionAgent.
 * @param {string} taskId
 * @param {string} [payerAgent] - Agent paying (default: OrchestratorAgent)
 * @returns {Promise<{txHash: string, ...}>}
 */
export async function releasePayment(taskId, payerAgent) {
  console.log("[Contracts]", Array.from(contracts.keys()))

  const contract = contracts.get(taskId)
  if (!contract) {
    console.log("Contract not found:", taskId)
    return { txHash: "" }
  }

  if (contract.paymentReleased) {
    return { txHash: contract.txHash || "" }
  }

  try {
    const paymentResult = await executeTaskPayment(contract, payerAgent)

    contract.paymentReleased = true
    contract.status = "completed"
    contract.txHash = paymentResult?.txHash
    contract.completedAt = Date.now()

    return paymentResult
  } catch (error) {
    console.error(
      `[NevoraX][TaskContract] Failed to release payment for taskId=${taskId}:`,
      error
    )
    throw error
  }
}

