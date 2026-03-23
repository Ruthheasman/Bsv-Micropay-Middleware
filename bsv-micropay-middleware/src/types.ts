export type WalletType = 'brc100' | 'handcash' | 'yours' | 'metanet'
export type Network = 'mainnet' | 'testnet'

export interface MicropayOptions {
  /** Amount in BSV (e.g. 0.001) */
  amount: number
  /** Your BSV address to receive payments */
  receivingAddress: string
  /** Supported wallet types. Defaults to all. */
  wallets?: WalletType[]
  /** mainnet (default) or testnet */
  network?: Network
  /** Optional async hook called after successful payment verification */
  onPayment?: (payment: PaymentInfo) => Promise<void>
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

// Extend Express Request to include bsvPayment
declare global {
  namespace Express {
    interface Request {
      bsvPayment?: PaymentInfo
    }
  }
}
