export type WalletType = 'brc100' | 'handcash' | 'yours' | 'metanet'
export type Network = 'mainnet' | 'testnet'
export type Currency = 'BSV' | 'USD'

export interface MicropayOptions {
  /** Amount to charge (in BSV or USD depending on currency) */
  amount: number
  /** Your BSV address to receive payments */
  receivingAddress: string
  /** Currency for the amount. 'BSV' (default) or 'USD'. When 'USD', the amount is converted to BSV at the current exchange rate. */
  currency?: Currency
  /** Supported wallet types. Defaults to all. */
  wallets?: WalletType[]
  /** mainnet (default) or testnet */
  network?: Network
  /** Optional async hook called after successful payment verification */
  onPayment?: (payment: PaymentInfo) => Promise<void>
  /** How long to cache the exchange rate in milliseconds. Default: 300000 (5 minutes). Only used when currency is 'USD'. */
  rateCacheTtlMs?: number
  /** Buffer percentage added to the converted BSV amount to account for price movement. Default: 2. Only used when currency is 'USD'. */
  rateBufferPercent?: number
}

export interface PaymentInfo {
  txId: string
  amount?: number
  from?: string
  confirmedAt?: string
}

export interface PaymentRequiredResponse {
  status: 402
  paymentRequired: true
  amount: number
  currency: 'BSV'
  payTo: string
  wallets: WalletType[]
  network: Network
  instructions: string
  docs?: string
  fiatAmount?: number
  fiatCurrency?: 'USD'
}

export interface VerifyOptions {
  txId: string
  expectedAmount: number
  receivingAddress: string
  network: Network
}

export interface VerifyResult {
  valid: boolean
  amount?: number
  senderAddress?: string
  confirmedAt?: string
  reason?: string
}

declare global {
  namespace Express {
    interface Request {
      bsvPayment?: PaymentInfo
    }
  }
}
