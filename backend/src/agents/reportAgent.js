export async function runReportAgentTask(taskId, context) {
  console.log("[ReportAgent] Creating final report:", taskId)

  const { task, data, sentiment, analysis, strategy } = context || {}

  const report = `
Task: ${task}

Market Data
Price: ${data?.price}
Volume: ${data?.volume}

Sentiment
${sentiment?.sentiment} (${sentiment?.confidence})

Trend Analysis
${analysis?.trend}

Strategy Recommendation
${strategy?.recommendation}
`.trim()

  const deliverable = {
    id: "asset_" + Date.now(),
    type: "analysis_report",
    content: report,
    producedBy: [
      "DataAgent",
      "SentimentAgent",
      "AnalysisAgent",
      "StrategyAgent",
      "ReportAgent"
    ],
    createdAt: Date.now()
  }

  console.log("[ReportAgent] Deliverable created")

  return deliverable
}

