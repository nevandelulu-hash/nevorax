export async function runAnalysisAgentTask(taskId, context) {
  console.log("[AnalysisAgent] Running analysis for task:", taskId)

  const { data, sentiment } = context || {}

  let trend = "sideways"

  if (sentiment?.sentiment === "bullish") {
    trend = "uptrend"
  }

  if (sentiment?.sentiment === "bearish") {
    trend = "downtrend"
  }

  const result = {
    trend,
    confidence: sentiment?.confidence || 0.5,
    timestamp: Date.now()
  }

  console.log("[AnalysisAgent] Analysis result:", result)

  return result
}

