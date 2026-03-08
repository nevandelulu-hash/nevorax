export async function runStrategyAgentTask(taskId, context) {
  console.log("[StrategyAgent] Generating strategy for task:", taskId)

  const { analysis } = context || {}

  let recommendation = "hold"

  if (analysis?.trend === "uptrend") {
    recommendation = "buy"
  }

  if (analysis?.trend === "downtrend") {
    recommendation = "sell"
  }

  const result = {
    recommendation,
    reasoning: "strategy derived from trend analysis",
    timestamp: Date.now()
  }

  console.log("[StrategyAgent] Strategy result:", result)

  return result
}

