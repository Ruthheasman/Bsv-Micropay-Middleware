import { Request, Response, NextFunction } from 'express'
import { verifyTransaction } from './verify.js'
import { MicropayOptions, PaymentRequiredResponse, WalletType } from './types.js'
import { txCache } from './cache.js'
import { convertUsdToBsvRange } from './exchange.js'

const DEFAULT_WALLETS: WalletType[] = ['brc100', 'handcash', 'yours', 'metanet']

export function micropay(options: MicropayOptions) {
  const {
    amount,
    receivingAddress,
    currency = 'BSV',
    wallets = DEFAULT_WALLETS,
    onPayment,
    network = 'mainnet',
    rateCacheTtlMs = 300_000,
    rateBufferPercent = 2,
  } = options

  if (!amount || amount <= 0) throw new Error('micropay: amount must be a positive number')
  if (!receivingAddress) throw new Error('micropay: receivingAddress is required')
  if (rateBufferPercent < 0 || rateBufferPercent > 20) throw new Error('micropay: rateBufferPercent must be between 0 and 20')
  if (rateCacheTtlMs <= 0) throw new Error('micropay: rateCacheTtlMs must be a positive number')

  return async function micropayMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const txId = req.headers['x-bsv-txid'] as string | undefined

    let bsvAmount: number
    let verifyAmount: number

    try {
      if (currency === 'USD') {
        const range = await convertUsdToBsvRange(amount, rateBufferPercent, rateCacheTtlMs)
        bsvAmount = range.quoted
        verifyAmount = range.minimum
      } else {
        bsvAmount = amount
        verifyAmount = amount
      }
    } catch (err) {
      console.error('[micropay] exchange rate error:', err)
      res.status(503).json({
        status: 503,
        error: 'Unable to fetch exchange rate. Please try again shortly.',
      })
      return
    }

    if (!txId) {
      const body: PaymentRequiredResponse = {
        status: 402,
        paymentRequired: true,
        amount: bsvAmount,
        currency: 'BSV',
        payTo: receivingAddress,
        wallets,
        network,
        instructions:
          'Broadcast a BSV transaction paying the specified amount to payTo, ' +
          'then retry this request with the transaction ID in the X-BSV-TxId header.',
        docs: 'https://github.com/ruthheasman/bsv-micropay-middleware',
        ...(currency === 'USD' ? { fiatAmount: amount, fiatCurrency: 'USD' as const } : {}),
      }
      res.status(402).json(body)
      return
    }

    const endpoint = `${req.method}:${req.path}`
    if (txCache.has(txId, endpoint)) {
      res.status(402).json({
        status: 402,
        paymentRequired: true,
        error: 'Transaction already used. Each request requires a new payment.',
        amount: bsvAmount,
        currency: 'BSV',
        payTo: receivingAddress,
      })
      return
    }

    try {
      const result = await verifyTransaction({
        txId,
        expectedAmount: verifyAmount,
        receivingAddress,
        network,
      })

      if (!result.valid) {
        res.status(402).json({
          status: 402,
          paymentRequired: true,
          error: result.reason,
          amount: bsvAmount,
          currency: 'BSV',
          payTo: receivingAddress,
        })
        return
      }

      txCache.set(txId, endpoint)

      req.bsvPayment = {
        txId,
        amount: result.amount ?? bsvAmount,
        from: result.senderAddress,
        confirmedAt: result.confirmedAt,
      }

      if (onPayment) {
        onPayment(req.bsvPayment).catch((err: Error) =>
          console.error('[micropay] onPayment hook error:', err)
        )
      }

      next()
    } catch (err) {
      console.error('[micropay] verification error:', err)
      res.status(500).json({
        status: 500,
        error: 'Payment verification failed. Please try again.',
      })
    }
  }
}
