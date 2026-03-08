import { askLLM } from "../llm/groqClient.js"
import { emitEvent } from "../events/eventBus.js"
import { logEconomy } from "../utils/economyLogger.js"
import { normalizeWei } from "../utils/priceUtils.js"

export async function negotiatePrice(service, basePrice) {
  const base = normalizeWei(basePrice)

  const prompt = `
You are a negotiation agent in an AI service economy.

Service: ${service}
Base price (wei): ${base}

Return JSON:

{
  "multiplier": 0.9,
  "reason": "short explanation"
}
`.trim()

  const response = await askLLM(prompt)

  try {
    const cleaned = response.replace(/`json/g, "").replace(/`/g, "").trim()

    const match = cleaned.match(/{[\s\S]*}/)

    const result = match ? JSON.parse(match[0]) : {}

    let multiplier = Number(result.multiplier)
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      multiplier = 1
    }

    // Clamp multiplier between 0.7x and 1.2x
    multiplier = Math.max(0.7, Math.min(1.2, multiplier))

    const finalPrice = normalizeWei(base * multiplier)

    logEconomy("PriceNegotiated", {
      service,
      basePrice: base,
      multiplier,
      finalPrice
    })

    emitEvent("PriceNegotiated", {
      service,
      price: finalPrice
    })

    return finalPrice
  } catch (e) {
    console.warn("[NegotiationAgent] fallback price", e)

    logEconomy("PriceNegotiated", {
      service,
      basePrice: base,
      multiplier: 1,
      finalPrice: base,
      fallback: true
    })

    emitEvent("PriceNegotiated", {
      service,
      price: base
    })

    return base
  }
}

