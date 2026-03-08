let taskCounter = 1

/**
 * Plan a task by selecting agents and estimating cost.
 * @param {string} task
 * @returns {Promise<{taskId: string, agents: string[], estimatedCost: string}>}
 */
export async function planTask(task) {
  const t = (task || "").toLowerCase()
  const taskId = `task_${String(taskCounter).padStart(3, "0")}`
  taskCounter += 1

  if (
    t.includes("market") ||
    t.includes("report") ||
    t.includes("insight") ||
    t.includes("trading")
  ) {
    return {
      taskId,
      agents: [
        "DataAgent",
        "SentimentAgent",
        "AnalysisAgent",
        "StrategyAgent",
        "ReportAgent"
      ],
      estimatedCost: String(
        Math.floor(300000000000000 + Math.random() * 200000000000000)
      )
    }
  }

  return {
    taskId,
    agents: ["DataAgent"],
    estimatedCost: "200000000000000"
  }
}

