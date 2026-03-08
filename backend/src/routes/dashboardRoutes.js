import express from "express"
import { getAllAgentEconomy } from "../economy/agentEconomyStore.js"
import { getTreasuryState } from "../agents/treasuryAgent.js"
import { getAllTasks } from "../store/taskStore.js"
import { agentMarketplace } from "../marketplace/agentMarketplace.js"
import { getJobs } from "../jobs/jobStore.js"

const router = express.Router()

router.get("/dashboard", (req, res) => {
  const economy = getAllAgentEconomy()
  const treasury = getTreasuryState()
  const tasks = getAllTasks()
  const jobs = getJobs()

  const agents = Object.keys(agentMarketplace).map((name) => ({
    name,
    service: agentMarketplace[name].service,
    basePrice: agentMarketplace[name].basePrice
  }))

  const agreements = tasks
    .map((t) => t.agreement)
    .filter((a) => a && a.agreementId)

  res.json({
    agents,
    treasury,
    jobs,
    tasks,
    agreements,
    economy
  })
})

export default router

