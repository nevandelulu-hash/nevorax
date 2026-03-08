import { agentMarketplace } from "./agentMarketplace.js"
import { getAgentReputation } from "../reputation/reputationStore.js"

/**
 * Generate competitive bids from marketplace providers.
 * Sort by valueScore = reputation / price (higher is better).
 */
export function generateAgentBids(service) {
  const agents = Object.keys(agentMarketplace).filter(
    (agent) => agentMarketplace[agent].service === service
  )

  const bids = agents.map((agent) => {
    const basePrice = agentMarketplace[agent].basePrice
    const reputation = Math.max(0.1, getAgentReputation(agent).score)
    const variance = 0.8 + Math.random() * 0.4
    const price = Math.floor(basePrice * variance)
    const valueScore = reputation / (price || 1)

    return {
      agent,
      price,
      reputation,
      valueScore
    }
  })

  return bids.sort((a, b) => (b.valueScore || 0) - (a.valueScore || 0))
}

