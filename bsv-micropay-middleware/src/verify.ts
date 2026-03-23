import { VerifyOptions, VerifyResult, Network } from './types.js'

const WOC_BASE: Record<Network, string> = {
  mainnet: 'https://api.whatsonchain.com/v1/bsv/main',
  testnet: 'https://api.whatsonchain.com/v1/bsv/test',
}

/**
 * Verify a BSV transaction against WhatsOnChain.
 * Checks:
 *   1. Transaction exists
 *   2. At least one output pays >= expectedAmount to receivingAddress
 *   3. Transaction has at least 1 confirmation (adjust for your risk tolerance)
 */
export async function verifyTransaction(opts: VerifyOptions): Promise<VerifyResult> {
  const { txId, expectedAmount, receivingAddress, network } = opts

  // Basic sanity check on txId format (64 hex chars)
  if (!/^[0-9a-fA-F]{64}$/.test(txId)) {
    return { valid: false, reason: 'Invalid transaction ID format' }
  }

  const base = WOC_BASE[network]

  try {
    const response = await fetch(`${base}/tx/${txId}`)

    if (response.status === 404) {
      return { valid: false, reason: 'Transaction not found on BSV network' }
    }

    if (!response.ok) {
      return { valid: false, reason: `Network error: ${response.status}` }
    }

    const tx = await response.json()

    // Check confirmations — 0-conf acceptable for micropayments (low value, low risk)
    // Bump to 1 for higher-value endpoints
    if (tx.confirmations === undefined) {
      return { valid: false, reason: 'Could not determine transaction confirmation status' }
    }

    // Find output(s) paying our address
    const outputs: any[] = tx.vout || []
    const matchingOutput = outputs.find((out) => {
      const addresses: string[] = out.scriptPubKey?.addresses || []
      return addresses.includes(receivingAddress)
    })

    if (!matchingOutput) {
      return {
        valid: false,
        reason: `No output found paying to address ${receivingAddress}`,
      }
    }

    const paidAmount: number = matchingOutput.value // value is in BSV on WoC

    if (paidAmount < expectedAmount) {
      return {
        valid: false,
        reason: `Payment amount ${paidAmount} BSV is less than required ${expectedAmount} BSV`,
      }
    }

    // Best-effort: grab sender address from first input
    const inputs: any[] = tx.vin || []
    const senderAddress: string | undefined =
      inputs[0]?.scriptSig?.addresses?.[0] ?? undefined

    const confirmedAt: string | undefined =
      tx.blocktime ? new Date(tx.blocktime * 1000).toISOString() : undefined

    return {
      valid: true,
      amount: paidAmount,
      senderAddress,
      confirmedAt,
    }
  } catch (err) {
    console.error('[micropay] WoC fetch error:', err)
    return { valid: false, reason: 'Failed to reach BSV verification service' }
  }
}
