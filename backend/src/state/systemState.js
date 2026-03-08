import { getAllTasks } from "../store/taskStore.js"
import { getTreasuryState } from "../agents/treasuryAgent.js"
import { agentMarketplace } from "../marketplace/agentMarketplace.js"
import { getAgentReputation } from "../reputation/reputationStore.js"

export function getSystemState() {
  const tasks = getAllTasks()
  const treasury = getTreasuryState()

  const agents = Object.keys(agentMarketplace).map((name) => {
    const def = agentMarketplace[name]
    const rep = getAgentReputation(name)
    return {
      name,
      service: def.service,
      basePrice: def.basePrice,
      reputation: rep.score
    }
  })

  return {
    agents,
    treasury,
    tasks,
    timestamp: Date.now()
  }
}

