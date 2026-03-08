import express from "express"
import { runOrchestratedTask } from "../agents/orchestratorAgent.js"

const router = express.Router()

const BUDGET_REGEX = /(\d+(?:\.\d+)?)\s*(eth|usd)/i

function parseTaskInput(body) {
  const task =
    typeof body?.task === "string" && body.task.trim().length > 0
      ? body.task.trim()
      : "Generate ETH market report"

  let budgetWei = null
  const match = task.match(BUDGET_REGEX)
  if (match) {
    const value = parseFloat(match[1])
    const unit = (match[2] || "").toLowerCase()
    if (unit === "eth") {
      budgetWei = Math.floor(value * 1e18)
    } else if (unit === "usd") {
      budgetWei = null
    }
  }

  return {
    task,
    metadata: {
      parsedBudget: budgetWei,
      rawTask: task
    }
  }
}

console.log("Task routes loaded")

router.get("/task/run", async (req, res) => {
  try {
    const parsed = parseTaskInput({ task: req.query.task })
    const result = await runOrchestratedTask(parsed.task)
    res.json(result)
  } catch (error) {
    console.error("[NevoraX][API] Failed to run task:", error)
    res.status(500).json({ error: "Failed to run task" })
  }
})

router.post("/task/run", async (req, res) => {
  try {
    const parsed = parseTaskInput(req.body)
    const result = await runOrchestratedTask(parsed.task)
    res.json({ ...result, metadata: parsed.metadata })
  } catch (error) {
    console.error("[NevoraX][API] Failed to run task:", error)
    res.status(500).json({ error: "Failed to run task" })
  }
})

export default router

