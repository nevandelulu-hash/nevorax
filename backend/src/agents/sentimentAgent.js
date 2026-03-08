import { askLLM } from "../llm/groqClient.js"
import { emitEvent } from "../events/eventBus.js"

/**
 * Resilient LLM JSON parsing - handles markdown, extra text, malformed quotes.
 * @param {string} text
 * @returns {object|null}
 */
function parseLLMJson(text) {
  if (!text || typeof text !== "string") return null
  try {
    return JSON.parse(text)
  } catch {
    try {
      const cleaned = text
        .replace(/"json/gi, "")
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim()
      const match = cleaned.match(/\{[\s\S]*\}/)
      const extracted = match ? match[0] : cleaned
      return JSON.parse(extracted)
    } catch {
      return null
    }
  }
}

/**
 * SentimentAgent
 * Uses the LLM to analyze market sentiment based on data from DataAgent.
 */
export async function runSentimentAgentTask(taskId, context) {
  console.log(
    `[SentimentAgent] Executing sentiment task for ${taskId} with context: ${context}`
  )

  let parsedContext
  try {
    parsedContext = typeof context === "string" ? JSON.parse(context) : context
  } catch {
    parsedContext = { task: String(context), data: null }
  }

  const data = parsedContext?.data || {}
  const price = data.price ?? "unknown"
  const volume = data.volume ?? "unknown"

  const prompt = `
You are a crypto market sentiment analysis agent.

Based on the following data:

Price: ${price}
Volume: ${volume}

Return ONLY valid JSON with no extra text.

Format:

{
  "sentiment": "bullish | bearish | neutral",
  "confidence": number between 0 and 1,
  "reasoning": "short explanation"
}

Do not include markdown.
Do not include text outside JSON.
Return JSON only.
`.trim()

  const llmResponse = await askLLM(prompt)

  console.log("[SentimentAgent] Raw LLM response:", llmResponse)

  emitEvent("AGENT_STARTED", {
    agent: "SentimentAgent",
    taskId
  })

  const parsed = parseLLMJson(llmResponse?.trim() || "")
  if (!parsed) {
    console.warn(
      "[SentimentAgent] Failed to parse LLM JSON response; returning neutral fallback.",
      { llmResponse }
    )
    return {
      sentiment: "neutral",
      confidence: 0.5,
      reasoning: "Fallback sentiment because LLM response could not be parsed."
    }
  }

  if (!parsed || typeof parsed !== "object") {
    console.warn(
      "[SentimentAgent] Parsed LLM JSON is not an object; returning neutral fallback.",
      parsed
    )
    return {
      sentiment: "neutral",
      confidence: 0.5,
      reasoning: "Fallback sentiment because LLM JSON was not an object."
    }
  }

  const sentiment = typeof parsed.sentiment === "string" ? parsed.sentiment : "neutral"
  const confidence =
    typeof parsed.confidence === "number" && !Number.isNaN(parsed.confidence)
      ? parsed.confidence
      : 0.5
  const reasoning =
    typeof parsed.reasoning === "string"
      ? parsed.reasoning
      : "No detailed reasoning provided by the model."

  const result = { sentiment, confidence, reasoning }

  console.log("[SentimentAgent] Sentiment analysis completed", result)

  emitEvent("AGENT_FINISHED", {
    agent: "SentimentAgent",
    taskId
  })

  return result
}

