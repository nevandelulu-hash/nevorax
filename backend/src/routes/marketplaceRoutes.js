import express from "express"
import { agentMarketplace } from "../marketplace/agentMarketplace.js"
import { getAgentReputation } from "../reputation/reputationStore.js"
import { generateAgentBids } from "../marketplace/biddingEngine.js"

const router = express.Router()

router.get("/marketplace", (req, res) => {
  const services = Object.keys(agentMarketplace).map((agent) => ({
    agent,
    service: agentMarketplace[agent].service,
    basePrice: agentMarketplace[agent].basePrice,
    reputation: getAgentReputation(agent).score
  }))

  const bids = generateAgentBids("market_data")

  res.json({
    service: "market_data",
    services,
    bids
  })
})

export default router

