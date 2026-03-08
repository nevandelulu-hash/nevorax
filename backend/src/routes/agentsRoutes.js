import express from "express"
import { agentMarketplace } from "../marketplace/agentMarketplace.js"
import { getAgentReputation } from "../reputation/reputationStore.js"

const router = express.Router()

router.get("/agents", (req, res) => {
  const agents = Object.keys(agentMarketplace).map((name) => {
    const def = agentMarketplace[name]
    const rep = getAgentReputation(name)
    return {
      name,
      service: def.service,
      basePrice: def.basePrice,
      reputation: rep.score
    }
  })

  res.json(agents)
})

export default router

