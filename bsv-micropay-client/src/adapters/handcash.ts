import type { WalletAdapter, Network } from '../types.js'

export interface HandCashAdapterOptions {
  appId: string
}

interface HandCashPayParams {
  appId: string
  to: string
  amount: number
  currencyCode: string
  onPaymentCompleted: (payment: { transactionId: string }) => void
  onError: (error: { message: string }) => void
}

interface HandCashPayModule {
  pay: (params: HandCashPayParams) => void
}

declare const HandCashPay: HandCashPayModule | undefined

export function createHandCashAdapter(options: HandCashAdapterOptions): WalletAdapter {
  const { appId } = options

  if (!appId) throw new Error('handcash adapter: appId is required')

  return {
    async pay(amount: number, address: string, network: Network): Promise<string> {
      if (network === 'testnet') {
        throw new Error('HandCash does not support testnet. Use the bsv-sdk adapter for testnet payments.')
      }

      if (typeof HandCashPay === 'undefined') {
        throw new Error(
          'HandCash Pay SDK not found. Include the HandCash Pay script in your page: ' +
          'https://docs.handcash.io/docs/pay-sdk'
        )
      }

      return new Promise<string>((resolve, reject) => {
        HandCashPay.pay({
          appId,
          to: address,
          amount,
          currencyCode: 'BSV',
          onPaymentCompleted: (payment) => {
            resolve(payment.transactionId)
          },
          onError: (error) => {
            reject(new Error(`HandCash payment failed: ${error.message}`))
          },
        })
      })
    },
  }
}
