import { createTaskContract } from "../contracts/taskContractManager.js"
import { recordExpense } from "../economy/agentEconomyStore.js"

/**
 * AgentCoordinator
 * Allows one agent to request services from another agent by
 * creating a dedicated sub-task contract.
 */
export async function requestAgentService({ requester, serviceAgent, taskId, payload }) {
  console.log(`[AgentCoordinator] ${requester} requesting ${serviceAgent} for task ${taskId}`)

  const subTaskId = `${taskId}_${serviceAgent}`

  console.log("[AgentCoordinator] SubTask Created", {
    subTaskId,
    requester,
    serviceAgent
  })

  const price = "500000000000000" // 0.0005 ETH

  const contract = await createTaskContract(
    subTaskId,
    [requester, serviceAgent],
    price
  )

  recordExpense(requester, price)

  return {
    subTaskId,
    contract
  }
}

