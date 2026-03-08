import express from "express"
import cors from "cors"

import walletRoutes from "./routes/walletRoutes.js"
import taskRoutes from "./routes/taskRoutes.js"
import jobRoutes from "./routes/jobRoutes.js"
import eventsRoute from "./routes/eventsRoute.js"
import taskHistoryRoutes from "./routes/taskHistoryRoutes.js"
import systemRoutes from "./routes/systemRoutes.js"
import agentsRoutes from "./routes/agentsRoutes.js"
import marketplaceRoutes from "./routes/marketplaceRoutes.js"
import treasuryRoutes from "./routes/treasuryRoutes.js"
import reputationRoutes from "./routes/reputationRoutes.js"
import agreementsRoutes from "./routes/agreementsRoutes.js"
import economyRoutes from "./routes/economyRoutes.js"
import dashboardRoutes from "./routes/dashboardRoutes.js"
import deliverableRoutes from "./routes/deliverableRoutes.js"
import { initWdk } from "./wdk/wdkManager.js"
import {
  AGENT_NAMES,
  getAgentAddress
} from "./wallets/agentWalletRegistry.js"

const app = express()

app.use(cors())
app.use(express.json())

app.use("/api", walletRoutes)
app.use("/api", taskRoutes)
app.use("/api", jobRoutes)
app.use("/api", eventsRoute)
app.use("/api", taskHistoryRoutes)
app.use("/api", systemRoutes)
app.use("/api", agentsRoutes)
app.use("/api", marketplaceRoutes)
app.use("/api", treasuryRoutes)
app.use("/api", reputationRoutes)
app.use("/api", agreementsRoutes)
app.use("/api", economyRoutes)
app.use("/api", dashboardRoutes)
app.use("/api", deliverableRoutes)

app.get("/", (req, res) => {
  res.json({
    name: "NevoraX",
    status: "running",
    message: "Agent economy backend online"
  })
})

const PORT = 4000

async function startServer() {
  try {
    await initWdk()

    console.log("NevoraX Wallet System Initialized")

    // Pre-generate and log all agent addresses
    for (const agentName of AGENT_NAMES) {
      try {
        const address = await getAgentAddress(agentName)
        console.log(`${agentName} \u2192 ${address}`)
      } catch (error) {
        console.error(
          `[NevoraX][Startup] Failed to derive address for agent=${agentName}:`,
          error
        )
      }
    }

    app.listen(PORT, () => {
      console.log(`NevoraX server running on port ${PORT}`)
      console.log("NevoraX System APIs enabled:")
      console.log("/api/system/state")
      console.log("/api/agents")
      console.log("/api/marketplace")
      console.log("/api/treasury")
      console.log("/api/reputation")
      console.log("/api/agreements")
    })
  } catch (error) {
    console.error("[NevoraX][Startup] Failed to start server:", error)
    process.exit(1)
  }
}

// Start the server with WDK initialization
startServer()