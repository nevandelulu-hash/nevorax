import { emitEvent } from "../events/eventBus.js"
import { logEconomy } from "../utils/economyLogger.js"

const reputationStore = {}

export function getAgentReputation(agentName) {
  if (!reputationStore[agentName]) {
    reputationStore[agentName] = {
      completed: 0,
      failed: 0,
      totalTasks: 0
    }
  }

  const stats = reputationStore[agentName]
  stats.totalTasks = stats.completed + stats.failed

  const total = stats.totalTasks
  const score =
    total === 0
      ? 1
      : (stats.completed / total) * Math.log(total + 1)

  return {
    ...stats,
    score
  }
}

export function recordAgentSuccess(agentName) {
  if (!reputationStore[agentName]) {
    reputationStore[agentName] = {
      completed: 0,
      failed: 0,
      totalTasks: 0
    }
  }

  reputationStore[agentName].completed++
  reputationStore[agentName].totalTasks =
    reputationStore[agentName].completed + reputationStore[agentName].failed

  const stats = reputationStore[agentName]

  logEconomy("ReputationUpdate", {
    agent: agentName,
    stats
  })

  emitEvent("AgentCompleted", {
    agent: agentName,
    stats
  })
}

export function recordAgentFailure(agentName) {
  if (!reputationStore[agentName]) {
    reputationStore[agentName] = {
      completed: 0,
      failed: 0,
      totalTasks: 0
    }
  }

  reputationStore[agentName].failed++
  reputationStore[agentName].totalTasks =
    reputationStore[agentName].completed + reputationStore[agentName].failed

  const stats = reputationStore[agentName]

  logEconomy("ReputationUpdate", {
    agent: agentName,
    stats
  })
}

