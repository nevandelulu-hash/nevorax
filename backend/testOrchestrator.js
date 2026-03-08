import { runOrchestratedTask } from "./src/agents/orchestratorAgent.js"

async function main() {
  try {
    const result = await runOrchestratedTask("Debug test task")
    console.log("Orchestrator result:", JSON.stringify(result, null, 2))
  } catch (error) {
    console.error("Orchestrator error:", error)
  }
}

main().then(() => {
  // keep process alive a moment to flush logs
  setTimeout(() => process.exit(0), 1000)
})

