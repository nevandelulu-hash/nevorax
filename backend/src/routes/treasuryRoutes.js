import express from "express"
import { getTreasuryState } from "../agents/treasuryAgent.js"

const router = express.Router()

router.get("/treasury", (req, res) => {
  res.json(getTreasuryState())
})

export default router

