import type { Request, Response, NextFunction } from 'express'
import type { WalletInterface } from '@bsv/sdk'

export interface Brc121Options {
  /**
   * A BRC-100 compatible wallet instance. The wallet's identity key is used as the
   * server identity advertised to clients, and `wallet.internalizeAction` is used
   * to accept the BEEF transaction the client submits.
   */
  wallet: WalletInterface
  /**
   * Price in satoshis. Either a fixed number, or a function that returns the
   * price for the incoming request path. Returning `0` or `undefined` skips
   * payment for that path.
   */
  price: number | ((path: string) => number | undefined)
  /**
   * Payment freshness window in milliseconds. Requests with a `x-bsv-time`
   * header older than this are rejected as stale. Default: 30000 (per BRC-121).
   */
  paymentWindowMs?: number
  /**
   * Optional async hook called after a payment is accepted. Non-blocking.
   */
  onPayment?: (payment: Brc121PaymentInfo) => Promise<void> | void
}

export interface Brc121PaymentInfo {
  txid: string
  satoshisPaid: number
  senderIdentityKey: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      bsvBrc121Payment?: Brc121PaymentInfo
    }
  }
}

/**
 * BRC-121 (Simple 402 Payments) Express middleware.
 *
 * Standards-compliant alternative to {@link micropay} — uses BRC-121 headers,
 * BRC-29 key derivation, BEEF transport, and `wallet.internalizeAction` for
 * settlement. Requires a server-side BRC-100 wallet (`@bsv/sdk`).
 *
 * Under the hood, this is a thin wrapper around the official `@bsv/402-pay`
 * implementation, exposed with our idiomatic options shape and an `onPayment`
 * hook that surfaces accepted payments to downstream handlers.
 *
 * @example
 * ```ts
 * import express from 'express'
 * import { brc121 } from '@ruthheasman/bsv-micropay-middleware/brc121'
 * import { wallet } from './my-server-wallet.js' // BRC-100 WalletInterface
 *
 * app.get(
 *   '/api/data',
 *   brc121({ wallet, price: 100 }), // 100 sats
 *   (req, res) => res.json({ data: 'ok', payment: req.bsvBrc121Payment })
 * )
 * ```
 */
export function brc121(options: Brc121Options) {
  const { wallet, price, paymentWindowMs, onPayment } = options

  if (!wallet) throw new Error('brc121: wallet is required')
  if (price === undefined || price === null) throw new Error('brc121: price is required')
  if (typeof price === 'number' && price <= 0) {
    throw new Error('brc121: price must be a positive number of satoshis')
  }

  // Lazy import keeps @bsv/402-pay an optional dependency — users who never
  // touch the BRC-121 path don't need to install it.
  const middlewarePromise = import('@bsv/402-pay/server').then((mod) =>
    mod.createPaymentMiddleware({
      wallet,
      calculatePrice: (path: string) =>
        typeof price === 'number' ? price : price(path),
      paymentWindowMs,
    })
  )

  return async function brc121Middleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let inner
    try {
      inner = await middlewarePromise
    } catch (err) {
      console.error('[brc121] failed to load @bsv/402-pay — install it to use BRC-121 mode:', err)
      res.status(500).json({ status: 500, error: 'BRC-121 support not installed on this server.' })
      return
    }

    // Wrap `next` so we can detect a successful acceptance and surface payment
    // metadata. `@bsv/402-pay`'s middleware does not currently attach payment
    // info to the request, but it does call `next()` only on accepted payments.
    const wrappedNext = (err?: unknown) => {
      if (err) return next(err as Error)

      // Headers are present on accepted requests — extract the basics so
      // downstream handlers and the onPayment hook can use them.
      const senderIdentityKey = req.headers['x-bsv-sender'] as string | undefined
      if (senderIdentityKey) {
        const info: Brc121PaymentInfo = {
          txid: '', // populated by internalizeAction inside @bsv/402-pay; not currently exposed
          satoshisPaid: typeof price === 'number' ? price : (price(req.path) ?? 0),
          senderIdentityKey,
        }
        req.bsvBrc121Payment = info
        if (onPayment) {
          Promise.resolve(onPayment(info)).catch((e) =>
            console.error('[brc121] onPayment hook error:', e)
          )
        }
      }
      next()
    }

    return inner(req, res, wrappedNext)
  }
}

export type { WalletInterface } from '@bsv/sdk'
