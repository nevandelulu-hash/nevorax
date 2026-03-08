import { getAddress, getBalance, sendTransaction } from "../wdk/wdkManager.js"

const DEFAULT_CHAIN = "ethereum"

const AGENT_ACCOUNT_MAP = {
  OrchestratorAgent: 0,
  DataAgent: 1,
  SentimentAgent: 2,
  ExecutionAgent: 3,
  AnalysisAgent: 4,
  StrategyAgent: 5,
  ReportAgent: 6
}

/**
 * Resolve the HD account index assigned to an agent.
 * @param {string} agentName
 * @returns {number}
 */
export function getAgentAccountIndex(agentName) {
  const index = AGENT_ACCOUNT_MAP[agentName]
  if (index === undefined) {
    throw new Error(`Unknown agent name: ${agentName}`)
  }
  return index
}

/**
 * Get the EVM address for an agent's wallet.
 * @param {string} agentName
 * @returns {Promise<string>}
 */
export async function getAgentAddress(agentName) {
  const index = getAgentAccountIndex(agentName)
  try {
    const addr = await getAddress(DEFAULT_CHAIN, index)
    if (agentName === "SentimentAgent") {
      console.log("[WalletRegistry] SentimentAgent address:", addr)
    }
    return addr
  } catch (error) {
    console.error(
      `[NevoraX][WalletRegistry] Failed to get address for agent=${agentName}:`,
      error
    )
    throw error
  }
}

/**
 * Get the native balance (wei, as a string) for an agent's wallet.
 * @param {string} agentName
 * @returns {Promise<string>}
 */
export async function getAgentBalance(agentName) {
  const index = getAgentAccountIndex(agentName)
  try {
    return await getBalance(DEFAULT_CHAIN, index)
  } catch (error) {
    console.error(
      `[NevoraX][WalletRegistry] Failed to get balance for agent=${agentName}:`,
      error
    )
    throw error
  }
}

/**
 * Send a transaction from an agent's wallet.
 * @param {string} agentName
 * @param {string} toAddress
 * @param {string | bigint} amount - Amount in wei (string or bigint)
 * @returns {Promise<object>}
 */
export async function transferFromAgent(agentName, toAddress, amount) {
  const index = getAgentAccountIndex(agentName)
  try {
    return await sendTransaction(DEFAULT_CHAIN, index, toAddress, amount)
  } catch (error) {
    console.error(
      `[NevoraX][WalletRegistry] Failed to transfer from agent=${agentName}:`,
      error
    )
    throw error
  }
}

/**
 * Execute a native token payment from an agent's wallet.
 * @param {string} agentName
 * @param {string} toAddress
 * @param {string | bigint} amount - Amount in wei
 * @returns {Promise<{fromAgent: string, to: string, amount: string | bigint, txHash: string}>}
 */
export async function sendFromAgent(agentName, toAddress, amount) {
  const index = getAgentAccountIndex(agentName)

  try {
    const result = await sendTransaction(DEFAULT_CHAIN, index, toAddress, amount)

    const payload = {
      fromAgent: agentName,
      to: toAddress,
      amount,
      txHash: result?.hash
    }

    console.log("Agent Payment Executed")
    console.log(`From: ${payload.fromAgent}`)
    console.log(`To: ${payload.to}`)
    console.log(`Amount: ${payload.amount}`)
    console.log(`TxHash: ${payload.txHash}`)

    return payload
  } catch (error) {
    console.error(
      `[NevoraX][WalletRegistry] Failed to send payment from agent=${agentName}:`,
      error
    )
    throw error
  }
}

export const AGENT_NAMES = Object.freeze(Object.keys(AGENT_ACCOUNT_MAP))

