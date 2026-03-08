import express from "express"
import { getAllAgentEconomy } from "../economy/agentEconomyStore.js"

const router = express.Router()

router.get("/economy", (req, res) => {
  res.json(getAllAgentEconomy())
})

export default router

