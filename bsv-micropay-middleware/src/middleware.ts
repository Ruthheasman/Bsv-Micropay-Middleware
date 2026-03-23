import { Request, Response, NextFunction } from 'express'
import { verifyTransaction } from './verify.js'
import { MicropayOptions, PaymentRequiredResponse, WalletType } from './types.js'
import { txCache } from './cache.js'

const DEFAULT_WALLETS: WalletType[] = ['brc100', 'handcash', 'yours', 'metanet']

export function micropay(options: MicropayOptions) {
  const {
    amount,
    receivingAddress,
    wallets = DEFAULT_WALLETS,
    onPayment,
    network = 'mainnet',
  } = options

  if (!amount || amount <= 0) throw new Error('micropay: amount must be a positive number')
  if (!receivingAddress) throw new Error('micropay: receivingAddress is required')

  return async function micropayMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const txId = req.headers['x-bsv-txid'] as string | undefined

    // No payment header — issue 402 with machine-readable instructions
    if (!txId) {
      const body: PaymentRequiredResponse = {
        status: 402,
        paymentRequired: true,
        amount,
        currency: 'BSV',
        payTo: receivingAddress,
        wallets,
        network,
        instructions:
          'Broadcast a BSV transaction paying the specified amount to payTo, ' +
          'then retry this request with the transaction ID in the X-BSV-TxId header.',
        docs: 'https://github.com/your-org/bsv-micropay-middleware',
      }
      res.status(402).json(body)
      return
    }

    // Replay protection — same txId cannot be reused for the same endpoint
    const endpoint = `${req.method}:${req.path}`
    if (txCache.has(txId, endpoint)) {
      res.status(402).json({
        status: 402,
        paymentRequired: true,
        error: 'Transaction already used. Each request requires a new payment.',
        amount,
        currency: 'BSV',
        payTo: receivingAddress,
      })
      return
    }

    // Payment header present — verify on-chain
    try {
      const result = await verifyTransaction({
        txId,
        expectedAmount: amount,
        receivingAddress,
        network,
      })

      if (!result.valid) {
        res.status(402).json({
          status: 402,
          paymentRequired: true,
          error: result.reason,
          amount,
          currency: 'BSV',
          payTo: receivingAddress,
        })
        return
      }

      // Mark as used before calling next() — prevents racing duplicate requests
      txCache.set(txId, endpoint)

      // Attach tx info to request for downstream use
      req.bsvPayment = {
        txId,
        amount: result.amount ?? amount,
        from: result.senderAddress,
        confirmedAt: result.confirmedAt,
      }

      // Fire optional hook (non-blocking)
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
