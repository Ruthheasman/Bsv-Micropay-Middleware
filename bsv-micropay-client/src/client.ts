import type {
  MicropayClient,
  MicropayClientOptions,
  MicropayClientFromKeyOptions,
  MicropayClientFromWalletNameOptions,
  PaymentRequiredBody,
  WalletAdapter,
  WalletName,
} from './types.js'
import { createBsvSdkAdapter } from './adapters/bsv-sdk.js'
import { createHandCashAdapter } from './adapters/handcash.js'
import { createYoursAdapter } from './adapters/yours.js'
import { createMetanetAdapter } from './adapters/metanet.js'
import { createAutoAdapter } from './adapters/auto.js'

function resolveWalletByName(
  name: WalletName,
  options: MicropayClientFromWalletNameOptions
): WalletAdapter {
  switch (name) {
    case 'bsv-sdk':
      if (!options.privateKey) throw new Error("wallet 'bsv-sdk' requires a privateKey")
      return createBsvSdkAdapter({
        privateKey: options.privateKey,
        arcUrl: options.arcUrl,
        arcApiKey: options.arcApiKey,
      })
    case 'handcash':
      if (!options.handcashAppId) throw new Error("wallet 'handcash' requires a handcashAppId")
      return createHandCashAdapter({ appId: options.handcashAppId })
    case 'yours':
      return createYoursAdapter()
    case 'metanet':
      return createMetanetAdapter()
    case 'auto':
      return createAutoAdapter()
  }
}

function isWalletName(value: unknown): value is WalletName {
  return typeof value === 'string' && ['bsv-sdk', 'handcash', 'yours', 'metanet', 'auto'].includes(value)
}

export function createMicropayClient(options: MicropayClientOptions): MicropayClient
export function createMicropayClient(options: MicropayClientFromKeyOptions): MicropayClient
export function createMicropayClient(options: MicropayClientFromWalletNameOptions): MicropayClient
export function createMicropayClient(
  options: MicropayClientOptions | MicropayClientFromKeyOptions | MicropayClientFromWalletNameOptions
): MicropayClient {
  let wallet: WalletAdapter
  const maxRetries = options.maxRetries ?? 1
  const maxPaymentAmount = options.maxPaymentAmount
  const trustedHosts = options.trustedHosts
  const onPayment = options.onPayment
  const logger = options.logger ?? console

  if ('wallet' in options && isWalletName(options.wallet)) {
    wallet = resolveWalletByName(options.wallet, options as MicropayClientFromWalletNameOptions)
  } else if ('wallet' in options && typeof options.wallet === 'object') {
    wallet = options.wallet as WalletAdapter
  } else if ('privateKey' in options && options.privateKey) {
    wallet = createBsvSdkAdapter({
      privateKey: options.privateKey,
      arcUrl: (options as MicropayClientFromKeyOptions).arcUrl,
      arcApiKey: (options as MicropayClientFromKeyOptions).arcApiKey,
    })
  } else {
    throw new Error(
      'createMicropayClient requires either a wallet adapter, a wallet name, or a privateKey'
    )
  }

  return {
    async fetch(url: string, init?: RequestInit): Promise<Response> {
      const firstResponse = await globalThis.fetch(url, init)

      if (firstResponse.status !== 402) return firstResponse

      let body: PaymentRequiredBody
      try {
        body = await firstResponse.json()
      } catch {
        throw new Error(`Received 402 but could not parse payment instructions from ${url}`)
      }

      if (!body.paymentRequired || !body.amount || !body.payTo) {
        throw new Error(`Received 402 but response is not a valid micropay payment request`)
      }

      if (trustedHosts) {
        const hostname = new URL(url).hostname
        if (!trustedHosts.includes(hostname)) {
          throw new Error(
            `Refused to pay ${body.amount} BSV to untrusted host: ${hostname}. ` +
            `Add it to trustedHosts to allow payments.`
          )
        }
      }

      if (maxPaymentAmount !== undefined && body.amount > maxPaymentAmount) {
        throw new Error(
          `Payment of ${body.amount} BSV exceeds maxPaymentAmount (${maxPaymentAmount} BSV). ` +
          `Increase maxPaymentAmount or check the endpoint.`
        )
      }

      let lastError: Error | undefined

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          logger.log(
            `[micropay-client] Paying ${body.amount} BSV to ${body.payTo} (attempt ${attempt + 1}/${maxRetries})`
          )

          const txId = await wallet.pay(body.amount, body.payTo, body.network ?? 'mainnet')

          logger.log(`[micropay-client] Transaction broadcast: ${txId}`)

          if (onPayment) {
            onPayment({
              txId,
              amount: body.amount,
              address: body.payTo,
              network: body.network ?? 'mainnet',
              url,
            })
          }

          const retryHeaders = new Headers(init?.headers)
          retryHeaders.set('X-BSV-TxId', txId)

          const paidResponse = await globalThis.fetch(url, {
            ...init,
            headers: retryHeaders,
          })

          if (paidResponse.status !== 402) {
            return paidResponse
          }

          logger.warn(
            `[micropay-client] Still received 402 after payment (attempt ${attempt + 1}/${maxRetries})`
          )
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err))
          logger.error(
            `[micropay-client] Payment attempt ${attempt + 1} failed: ${lastError.message}`
          )
        }
      }

      throw lastError ?? new Error('Payment failed after all retries — endpoint still returning 402')
    },
  }
}
