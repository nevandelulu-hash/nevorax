import express from "express"
import { getAgentReputation } from "../reputation/reputationStore.js"
import { agentMarketplace } from "../marketplace/agentMarketplace.js"

const router = express.Router()

router.get("/reputation", (req, res) => {
  const reputation = Object.keys(agentMarketplace).map((agent) => ({
    agent,
    stats: getAgentReputation(agent)
  }))

  res.json(reputation)
})

export default router

