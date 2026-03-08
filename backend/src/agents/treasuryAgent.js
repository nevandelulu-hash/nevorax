import { emitEvent } from "../events/eventBus.js"
import { logEconomy } from "../utils/economyLogger.js"
import { normalizeWei } from "../utils/priceUtils.js"
import { getAgentBalance } from "../wallets/agentWalletRegistry.js"

let treasuryState = {
  balance: 10000000000000000, // in wei
  allocated: {},
  spent: 0
}

/**
 * Reconcile treasury balance with on-chain OrchestratorAgent wallet.
 * Call after payments to ensure treasury reflects real funds.
 */
export async function reconcileTreasuryWithBlockchain() {
  try {
    const chainBalance = await getAgentBalance("OrchestratorAgent")
    const parsed = BigInt(chainBalance)
    treasuryState.balance = Number(parsed)
    logEconomy("TreasuryReconciled", { chainBalance: chainBalance.toString() })
    emitEvent("TreasuryReconciled", { balance: chainBalance })
    return treasuryState.balance
  } catch (error) {
    console.error("[NevoraX][Treasury] Blockchain reconciliation failed:", error)
    return treasuryState.balance
  }
}

export function allocateBudget(taskId, amount) {
  const normalized = normalizeWei(amount)

  if (treasuryState.balance < normalized) {
    throw new Error("Treasury insufficient funds")
  }

  treasuryState.balance -= normalized
  treasuryState.allocated[taskId] = (treasuryState.allocated[taskId] || 0) + normalized

  const payload = {
    taskId,
    amount: normalized,
    remainingBalance: treasuryState.balance
  }

  logEconomy("TreasuryBudgetAllocated", payload)
  emitEvent("BudgetAllocated", payload)

  return normalized
}

export function releaseBudget(taskId) {
  return treasuryState.allocated[taskId] || 0
}

/**
 * Refund allocated budget back to treasury (e.g. on task failure).
 */
export function refundBudget(taskId) {
  const amount = treasuryState.allocated[taskId] || 0
  if (amount > 0) {
    treasuryState.balance += amount
    delete treasuryState.allocated[taskId]
    logEconomy("TreasuryRefund", { taskId, amount })
    emitEvent("BudgetRefunded", { taskId, amount })
  }
  return amount
}

export function recordRevenue(amount) {
  const normalized = normalizeWei(amount)
  treasuryState.balance += normalized
}

export function recordPayment(amount) {
  treasuryState.spent = (treasuryState.spent || 0) + Number(amount)
}

export function getTreasuryState() {
  return { ...treasuryState }
}

