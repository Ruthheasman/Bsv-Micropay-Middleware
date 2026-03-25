/**
 * AI Agent micropayment client — real @bsv/sdk implementation.
 *
 * This is the autonomous payment loop:
 *   1. Hit the endpoint
 *   2. Receive 402 with payment instructions
 *   3. Build, sign, and broadcast a BSV transaction
 *   4. Retry with X-BSV-TxId header
 *   5. Get the data
 *
 * No human in the loop. No OAuth. No redirects.
 * An agent can call fetchWithMicropay() as freely as it calls any other fetch().
 */

import { Transaction, PrivateKey, P2PKH, ARC } from '@bsv/sdk'
import { PaymentRequiredResponse } from '../src/index.js'

// ─── Config (load from env in production) ──────────────────────────────────
const AGENT_PRIVATE_KEY_WIF = process.env.AGENT_BSV_KEY || 'your-wif-key-here'
const ARC_API_KEY = process.env.ARC_API_KEY || ''
const ARC_URL = 'https://arc.taal.com'

// ─── Core: fetch with automatic micropayment handling ───────────────────────
export async function fetchWithMicropay(
  url: string,
  init?: RequestInit
): Promise<Response> {
  // Step 1: Initial request
  const firstResponse = await fetch(url, init)

  // Already paid or free endpoint — return immediately
  if (firstResponse.status !== 402) return firstResponse

  // Step 2: Parse machine-readable 402 body
  const paymentInstructions: PaymentRequiredResponse = await firstResponse.json()

  console.log(
    `[agent] 402 received — paying ${paymentInstructions.amount} BSV to ${paymentInstructions.payTo}`
  )

  // Step 3: Build, sign, and broadcast BSV transaction
  const txId = await broadcastPayment({
    amountBSV: paymentInstructions.amount,
    receivingAddress: paymentInstructions.payTo,
    network: paymentInstructions.network,
  })

  console.log(`[agent] tx broadcast: ${txId}`)

  // Step 4: Retry with payment proof
  const paidResponse = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      'X-BSV-TxId': txId,
    },
  })

  return paidResponse
}

// ─── BSV transaction builder ─────────────────────────────────────────────────
interface BroadcastOptions {
  amountBSV: number
  receivingAddress: string
  network: 'mainnet' | 'testnet'
}

async function broadcastPayment(opts: BroadcastOptions): Promise<string> {
  const { amountBSV, receivingAddress } = opts

  const privateKey = PrivateKey.fromWif(AGENT_PRIVATE_KEY_WIF)
  const senderAddress = privateKey.toAddress()
  const satoshis = Math.ceil(amountBSV * 1e8)

  // Fetch UTXOs for the agent's address via WhatsOnChain
  const utxos = await fetchUTXOs(senderAddress)
  if (utxos.length === 0) throw new Error('[agent] No UTXOs available — fund your agent wallet')

  // Build transaction
  const tx = new Transaction()

  // Add inputs from UTXOs
  for (const utxo of utxos) {
    tx.addInput({
      sourceTransaction: await fetchRawTx(utxo.txid),
      sourceOutputIndex: utxo.vout,
      unlockingScriptTemplate: new P2PKH().unlock(privateKey),
    })
  }

  // Payment output — to the API's receiving address
  tx.addOutput({
    lockingScript: new P2PKH().lock(receivingAddress),
    satoshis,
  })

  // Change output — back to agent's own address
  tx.addOutput({
    lockingScript: new P2PKH().lock(senderAddress),
    change: true,
  })

  // Compute fee and sign
  await tx.fee()
  await tx.sign()

  // Broadcast via ARC (Taal) — returns txid
  const broadcaster = new ARC(ARC_URL, ARC_API_KEY)
  const result = await tx.broadcast(broadcaster)

  if (!result?.txid) throw new Error(`[agent] Broadcast failed: ${JSON.stringify(result)}`)

  return result.txid
}

// ─── WhatsOnChain helpers ────────────────────────────────────────────────────
interface UTXO {
  txid: string
  vout: number
  satoshis: number
}

async function fetchUTXOs(address: string): Promise<UTXO[]> {
  const res = await fetch(
    `https://api.whatsonchain.com/v1/bsv/main/address/${address}/unspent`
  )
  if (!res.ok) throw new Error(`[agent] Failed to fetch UTXOs: ${res.status}`)
  const data: any[] = await res.json()
  return data.map((u) => ({
    txid: u.tx_hash,
    vout: u.tx_pos,
    satoshis: u.value,
  }))
}

async function fetchRawTx(txid: string): Promise<Transaction> {
  const res = await fetch(
    `https://api.whatsonchain.com/v1/bsv/main/tx/${txid}/hex`
  )
  if (!res.ok) throw new Error(`[agent] Failed to fetch raw tx ${txid}: ${res.status}`)
  const hex = await res.text()
  return Transaction.fromHex(hex.trim())
}

// ─── Example usage ───────────────────────────────────────────────────────────
async function main() {
  const response = await fetchWithMicropay('http://localhost:3000/api/data')

  if (!response.ok) {
    const err = await response.json()
    console.error('[agent] Request failed:', err)
    return
  }

  const data = await response.json()
  console.log('[agent] Got data:', data)
  console.log('[agent] Payment recorded:', data.payment)
}

main().catch(console.error)
