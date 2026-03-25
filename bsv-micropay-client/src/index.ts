export { createMicropayClient } from './client.js'
export { createBsvSdkAdapter } from './adapters/bsv-sdk.js'
export { createHandCashAdapter } from './adapters/handcash.js'
export { createYoursAdapter, isYoursAvailable, isYoursReady } from './adapters/yours.js'
export { createMetanetAdapter, isMetanetAvailable, isMetanetConnected } from './adapters/metanet.js'
export { createAutoAdapter, detectWallet } from './adapters/auto.js'
export type { DetectedWallet } from './adapters/auto.js'
export type { HandCashAdapterOptions } from './adapters/handcash.js'
export type {
  WalletAdapter,
  WalletName,
  MicropayClient,
  MicropayClientOptions,
  MicropayClientFromKeyOptions,
  MicropayClientFromWalletNameOptions,
  PaymentEvent,
  PaymentRequiredBody,
  Network,
} from './types.js'
