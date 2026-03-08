import express from "express"
import { getSystemState } from "../state/systemState.js"

const router = express.Router()

router.get("/system/state", (req, res) => {
  res.json(getSystemState())
})

export default router

