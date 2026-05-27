import type { WalletInterface } from '@bsv/sdk'

export interface Brc121ClientOptions {
  /**
   * A BRC-100 compatible wallet instance used to construct payments via
   * BRC-29 key derivation and BEEF transport.
   */
  wallet: WalletInterface
  /**
   * Cache timeout for paid content in milliseconds. Default: 30 minutes.
   * Pass `0` to disable caching.
   */
  cacheTimeoutMs?: number
  /**
   * Maximum payment, in satoshis, this client will pay per request.
   * If the server demands more than this, the request throws instead of paying.
   */
  maxPaymentSatoshis?: number
  /**
   * Only allow payments to these hostnames. If set, requests to any other
   * host that return 402 will throw rather than pay.
   */
  trustedHosts?: string[]
  /**
   * Callback invoked after each successful payment.
   */
  onPayment?: (event: { url: string; satoshis: number; serverIdentityKey: string }) => void
  /** Logger. Defaults to `console`. */
  logger?: Pick<Console, 'log' | 'warn' | 'error'>
}

export interface Brc121Client {
  /**
   * Drop-in `fetch` replacement that handles BRC-121 402 Payment Required
   * responses by constructing a BRC-29 payment and retransmitting with the
   * BRC-121 payment headers.
   */
  fetch: (url: string, init?: RequestInit) => Promise<Response>
  /** Clears the in-memory paid-content cache. */
  clearCache: () => void
}

/**
 * Creates a BRC-121 client that wraps `fetch` and automatically pays
 * 402 Payment Required responses according to the BRC-121 spec.
 *
 * Use this instead of {@link createMicropayClient} when talking to a server
 * that uses BRC-121 headers (`x-bsv-sats`, `x-bsv-server`, …) rather than
 * the simple JSON-body payment flow.
 *
 * @example
 * ```ts
 * import { createBrc121Client } from '@ruthheasman/bsv-micropay-client/brc121'
 * import { wallet } from './my-wallet.js' // BRC-100 WalletInterface
 *
 * const client = createBrc121Client({ wallet, maxPaymentSatoshis: 10_000 })
 * const res = await client.fetch('https://example.com/articles/foo')
 * ```
 */
export function createBrc121Client(options: Brc121ClientOptions): Brc121Client {
  const { wallet, cacheTimeoutMs, maxPaymentSatoshis, trustedHosts, onPayment, logger = console } = options

  if (!wallet) throw new Error('createBrc121Client: wallet is required')

  // Lazy-import @bsv/402-pay so it stays an optional dependency.
  const fetcherPromise = import('@bsv/402-pay/client').then((mod) =>
    mod.create402Fetch({ wallet, cacheTimeoutMs })
  )

  let cachedFetcher: Awaited<typeof fetcherPromise> | undefined

  async function ensureFetcher() {
    if (!cachedFetcher) {
      try {
        cachedFetcher = await fetcherPromise
      } catch (err) {
        throw new Error(
          'BRC-121 client requires @bsv/402-pay. Install it with `npm install @bsv/402-pay @bsv/sdk`.'
        )
      }
    }
    return cachedFetcher
  }

  async function brc121Fetch(url: string, init?: RequestInit): Promise<Response> {
    if (trustedHosts) {
      const hostname = new URL(url).hostname
      if (!trustedHosts.includes(hostname)) {
        // Try the request without payment first; if it's free we let it through.
        const probe = await globalThis.fetch(url, init)
        if (probe.status !== 402) return probe
        throw new Error(
          `BRC-121 refused to pay untrusted host: ${hostname}. Add it to trustedHosts to allow payments.`
        )
      }
    }

    if (maxPaymentSatoshis !== undefined) {
      const probe = await globalThis.fetch(url, init)
      if (probe.status !== 402) return probe
      const sats = parseInt(probe.headers.get('x-bsv-sats') ?? '', 10)
      const serverKey = probe.headers.get('x-bsv-server') ?? ''
      if (!Number.isFinite(sats) || sats <= 0 || !serverKey) {
        throw new Error('BRC-121 server returned 402 without valid x-bsv-sats / x-bsv-server headers.')
      }
      if (sats > maxPaymentSatoshis) {
        throw new Error(
          `BRC-121 payment of ${sats} sats exceeds maxPaymentSatoshis (${maxPaymentSatoshis}). Increase the cap or skip this endpoint.`
        )
      }
      logger.log(`[brc121-client] Paying ${sats} sats to server ${serverKey.slice(0, 12)}… for ${url}`)
      const fetcher = await ensureFetcher()
      const res = await fetcher(url, init)
      if (res.status !== 402 && onPayment) {
        onPayment({ url, satoshis: sats, serverIdentityKey: serverKey })
      }
      return res
    }

    const fetcher = await ensureFetcher()
    return fetcher(url, init)
  }

  return {
    fetch: brc121Fetch,
    clearCache() {
      cachedFetcher?.clearCache()
    },
  }
}

export type { WalletInterface } from '@bsv/sdk'
