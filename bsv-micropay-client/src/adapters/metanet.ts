import type { WalletAdapter, Network } from '../types.js'

interface MetanetProvider {
  isConnected: boolean
  connect: () => Promise<void>
  sendPayment: (params: { satoshis: number; to: string }) => Promise<{ txid: string }>
}

interface WindowWithMetanet {
  metanet?: {
    provider?: MetanetProvider
  }
}

export function isMetanetAvailable(): boolean {
  const w = globalThis as unknown as WindowWithMetanet
  return !!(w.metanet?.provider && typeof w.metanet.provider.sendPayment === 'function')
}

export function isMetanetConnected(): boolean {
  const w = globalThis as unknown as WindowWithMetanet
  return !!(w.metanet?.provider?.isConnected)
}

export function createMetanetAdapter(): WalletAdapter {
  return {
    async pay(amount: number, address: string, network: Network): Promise<string> {
      if (network === 'testnet') {
        throw new Error('Metanet Client does not support testnet. Use the bsv-sdk adapter for testnet payments.')
      }

      const w = globalThis as unknown as WindowWithMetanet

      if (!w.metanet?.provider || typeof w.metanet.provider.sendPayment !== 'function') {
        throw new Error(
          'Metanet Client not found. Install the Metanet Client browser extension: ' +
          'https://metanet.id'
        )
      }

      const provider = w.metanet.provider

      if (!provider.isConnected) {
        await provider.connect()
      }

      const satoshis = Math.ceil(amount * 1e8)

      const result = await provider.sendPayment({
        satoshis,
        to: address,
      })

      if (!result?.txid) {
        throw new Error('Metanet Client returned no transaction ID — payment may have been cancelled')
      }

      return result.txid
    },
  }
}
