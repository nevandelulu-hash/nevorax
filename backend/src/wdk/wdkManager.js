import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

import WDK from "@tetherto/wdk"
import WalletManagerEvm from "@tetherto/wdk-wallet-evm"

// Resolve backend/.env relative to this file so that
// `npm run dev` works regardless of the working directory.
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({
  path: path.resolve(__dirname, "../../.env")
})

let wdkInstance = null
let wdkInitialized = false

/**
 * Initialize the WDK singleton with the EVM wallet registered.
 * - Loads seed phrase from WDK_SEED_PHRASE if provided
 * - Otherwise generates a new random seed phrase
 * - Registers the Ethereum wallet module using the Sepolia RPC
 */
export async function initWdk() {
  if (wdkInitialized && wdkInstance) {
    return wdkInstance
  }

  try {
    const rpcUrl = process.env.EVM_RPC
    if (!rpcUrl) {
      throw new Error("EVM_RPC is not defined in environment variables")
    }

    let seedPhrase = process.env.WDK_SEED_PHRASE
    if (!seedPhrase) {
      seedPhrase = WDK.getRandomSeedPhrase()
      console.warn(
        "[NevoraX][WDK] Generated new seed phrase. " +
          "STORE THIS SECURELY if you want persistent wallets:\n",
        seedPhrase
      )
    }

    const wdk = new WDK(seedPhrase).registerWallet("ethereum", WalletManagerEvm, {
      provider: rpcUrl
    })

    wdkInstance = wdk
    wdkInitialized = true

    console.log("WDK initialized")
    console.log("Wallet registered")

    return wdkInstance
  } catch (error) {
    console.error("[NevoraX][WDK] Failed to initialize WDK:", error)
    throw error
  }
}

async function getWdkInstance() {
  if (!wdkInitialized || !wdkInstance) {
    await initWdk()
  }

  if (!wdkInstance) {
    throw new Error("WDK is not initialized")
  }

  return wdkInstance
}

/**
 * Get a WDK account for a given chain and index.
 * @param {string} chain - Blockchain identifier (e.g., "ethereum")
 * @param {number} index - HD account index
 */
export async function getAccount(chain, index) {
  try {
    const wdk = await getWdkInstance()
    const account = await wdk.getAccount(chain, index)
    return account
  } catch (error) {
    console.error(
      `[NevoraX][WDK] Failed to get account for chain=${chain}, index=${index}:`,
      error
    )
    throw error
  }
}

/**
 * Get address for an account derived from the seed.
 * @param {string} chain
 * @param {number} index
 * @returns {Promise<string>}
 */
export async function getAddress(chain, index) {
  const account = await getAccount(chain, index)
  try {
    const address = await account.getAddress()
    return address
  } catch (error) {
    console.error(
      `[NevoraX][WDK] Failed to get address for chain=${chain}, index=${index}:`,
      error
    )
    throw error
  }
}

/**
 * Get native balance (in wei for EVM chains) as a string.
 * @param {string} chain
 * @param {number} index
 * @returns {Promise<string>}
 */
export async function getBalance(chain, index) {
  try {
    const wdk = await getWdkInstance()
    const account = await wdk.getAccount(chain, index)
    const balance = await account.getBalance()
    return balance.toString()
  } catch (error) {
    console.error("Balance error:", error)
    throw error
  }
}

/**
 * Send a native token transaction from a derived account.
 * @param {string} chain
 * @param {number} index
 * @param {string} to - Recipient address
 * @param {string | bigint} value - Amount in base units (e.g., wei)
 * @returns {Promise<object>} - Transaction result
 */
export async function sendTransaction(chain, index, to, value) {
  if (typeof to !== "string" || !to.startsWith("0x") || to.length !== 42) {
    throw new Error("Invalid recipient address")
  }

  let amount
  try {
    amount = typeof value === "bigint" ? value : BigInt(value)
  } catch {
    throw new Error("Invalid transaction value; expected bigint-compatible string")
  }

  if (amount < 0n) {
    throw new Error("Transaction value must be non-negative")
  }

  const account = await getAccount(chain, index)

  try {
    const result = await account.sendTransaction({
      to,
      value: amount
    })

    return result
  } catch (error) {
    console.error(
      `[NevoraX][WDK] Failed to send transaction from chain=${chain}, index=${index}:`,
      error
    )
    throw error
  }
}

