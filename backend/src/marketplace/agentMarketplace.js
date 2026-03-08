import { emitEvent } from "../events/eventBus.js"
import { logEconomy } from "../utils/economyLogger.js"
import { normalizeWei } from "../utils/priceUtils.js"
import { getAgentReputation } from "../reputation/reputationStore.js"

const BASE_WEI = 500000000000000

export const agentMarketplace = {
  DataAgent: {
    service: "market_data",
    basePrice: normalizeWei(BASE_WEI),
    executor: "DataAgent"
  },
  FastDataAgent: {
    service: "market_data",
    basePrice: normalizeWei(BASE_WEI * 1.2),
    executor: "DataAgent"
  },
  CheapDataAgent: {
    service: "market_data",
    basePrice: normalizeWei(BASE_WEI * 0.7),
    executor: "DataAgent"
  },
  ReliableDataAgent: {
    service: "market_data",
    basePrice: normalizeWei(BASE_WEI * 1.1),
    executor: "DataAgent"
  },
  SentimentAgent: {
    service: "sentiment_analysis",
    basePrice: normalizeWei(BASE_WEI),
    executor: "SentimentAgent"
  },
  CheapSentimentAgent: {
    service: "sentiment_analysis",
    basePrice: normalizeWei(BASE_WEI * 0.8),
    executor: "SentimentAgent"
  },
  FastSentimentAgent: {
    service: "sentiment_analysis",
    basePrice: normalizeWei(BASE_WEI * 1.1),
    executor: "SentimentAgent"
  },
  AnalysisAgent: {
    service: "trend_analysis",
    basePrice: normalizeWei(BASE_WEI * 0.8),
    executor: "AnalysisAgent"
  },
  StrategyAgent: {
    service: "strategy_generation",
    basePrice: normalizeWei(BASE_WEI),
    executor: "StrategyAgent"
  },
  ReportAgent: {
    service: "report_generation",
    basePrice: normalizeWei(BASE_WEI * 1.1),
    executor: "ReportAgent"
  }
}

export function findAgentsForService(service) {
  const providers = Object.entries(agentMarketplace)
    .filter(([, agent]) => agent.service === service)
    .map(([name, agent]) => {
      const reputation = getAgentReputation(name)
      return {
        name,
        price: normalizeWei(agent.basePrice),
        reputation: reputation.score
      }
    })

  if (providers.length) {
    const sorted = [...providers].sort((a, b) => b.reputation - a.reputation)
    const chosen = sorted[0]

    const payload = {
      service,
      selectedAgent: chosen.name,
      reputation: chosen.reputation
    }

    logEconomy("MarketplaceSelection", payload)
    emitEvent("MarketplaceSelection", payload)
  }

  return providers
}

