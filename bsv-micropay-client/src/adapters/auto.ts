import type { WalletAdapter } from '../types.js'
import { createYoursAdapter, isYoursAvailable, isYoursReady } from './yours.js'
import { createMetanetAdapter, isMetanetAvailable } from './metanet.js'

export type DetectedWallet = 'yours' | 'metanet' | null

export function detectWallet(): DetectedWallet {
  if (isYoursAvailable() && isYoursReady()) return 'yours'
  if (isMetanetAvailable()) return 'metanet'
  if (isYoursAvailable()) return 'yours'

  return null
}

export function createAutoAdapter(): WalletAdapter {
  const detected = detectWallet()

  if (!detected) {
    throw new Error(
      'No supported BSV wallet detected in this browser. ' +
      'Install Yours Wallet (yours.org) or Metanet Client (metanet.id), ' +
      'or use createMicropayClient({ privateKey }) for server/agent usage.'
    )
  }

  switch (detected) {
    case 'yours':
      return createYoursAdapter()
    case 'metanet':
      return createMetanetAdapter()
  }
}
