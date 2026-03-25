import type { WalletAdapter, Network } from '../types.js'

interface YoursProvider {
  isReady: boolean
  sendBsv: (params: { satoshis: number; address: string }) => Promise<string>
}

interface WindowWithYours {
  yours?: {
    provider?: YoursProvider
  }
}

export function isYoursAvailable(): boolean {
  const w = globalThis as unknown as WindowWithYours
  return !!(w.yours?.provider && typeof w.yours.provider.sendBsv === 'function')
}

export function isYoursReady(): boolean {
  const w = globalThis as unknown as WindowWithYours
  return !!(w.yours?.provider?.isReady)
}

export function createYoursAdapter(): WalletAdapter {
  return {
    async pay(amount: number, address: string, network: Network): Promise<string> {
      if (network === 'testnet') {
        throw new Error('Yours Wallet does not support testnet. Use the bsv-sdk adapter for testnet payments.')
      }

      const w = globalThis as unknown as WindowWithYours

      if (!w.yours?.provider || typeof w.yours.provider.sendBsv !== 'function') {
        throw new Error(
          'Yours Wallet not found. Install the Yours Wallet browser extension: ' +
          'https://yours.org'
        )
      }

      const provider = w.yours.provider

      if (!provider.isReady) {
        throw new Error('Yours Wallet is installed but not ready. Please unlock your wallet.')
      }

      const satoshis = Math.ceil(amount * 1e8)

      const txId = await provider.sendBsv({
        satoshis,
        address,
      })

      if (!txId) {
        throw new Error('Yours Wallet returned no transaction ID — payment may have been cancelled')
      }

      return txId
    },
  }
}
