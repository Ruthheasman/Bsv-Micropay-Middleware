export type Network = 'mainnet' | 'testnet'
export type WalletName = 'bsv-sdk' | 'handcash' | 'yours' | 'metanet' | 'auto'

export interface PaymentRequiredBody {
  status: 402
  paymentRequired: true
  amount: number
  currency: 'BSV'
  payTo: string
  wallets?: string[]
  network: Network
  instructions: string
  fiatAmount?: number
  fiatCurrency?: string
}

export interface WalletAdapter {
  pay(amount: number, address: string, network: Network): Promise<string>
}

export interface MicropayClientOptions {
  wallet: WalletAdapter
  maxRetries?: number
  maxPaymentAmount?: number
  trustedHosts?: string[]
  onPayment?: (info: PaymentEvent) => void
  logger?: Pick<Console, 'log' | 'error' | 'warn'>
}

export interface MicropayClientFromKeyOptions {
  privateKey: string
  arcUrl?: string
  arcApiKey?: string
  maxRetries?: number
  maxPaymentAmount?: number
  trustedHosts?: string[]
  onPayment?: (info: PaymentEvent) => void
  logger?: Pick<Console, 'log' | 'error' | 'warn'>
}

export interface MicropayClientFromWalletNameOptions {
  wallet: WalletName
  handcashAppId?: string
  privateKey?: string
  arcUrl?: string
  arcApiKey?: string
  maxRetries?: number
  maxPaymentAmount?: number
  trustedHosts?: string[]
  onPayment?: (info: PaymentEvent) => void
  logger?: Pick<Console, 'log' | 'error' | 'warn'>
}

export interface PaymentEvent {
  txId: string
  amount: number
  address: string
  network: Network
  url: string
}

export interface MicropayClient {
  fetch(url: string, init?: RequestInit): Promise<Response>
}
