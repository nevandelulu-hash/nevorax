import { generateAgentBids } from "./biddingEngine.js"
import { resolveExecutionAgent } from "./providerMapping.js"

/**
 * Select the best provider for a service and resolve execution agent.
 * @param {string} service - Service type (e.g. market_data)
 * @returns {{ provider: string, executionAgent: string, bids: Array, basePrice: number }}
 */
export function selectProvider(service) {
  const bids = generateAgentBids(service)
  const bestBid = bids[0]

  if (!bestBid) {
    return {
      provider: null,
      executionAgent: null,
      bids: [],
      basePrice: 0
    }
  }

  const provider = bestBid.agent
  const executionAgent = resolveExecutionAgent(provider)

  return {
    provider,
    executionAgent,
    bids,
    basePrice: bestBid.price
  }
}
