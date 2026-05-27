# bsv-micropay-middleware

> Express middleware for BSV micropayments. Gate any API endpoint with pay-per-use BSV in one line of code.

Built for the age of personal AI agents — no OAuth, no redirects, no human in the loop. An agent hits your endpoint, receives a machine-readable `402 Payment Required`, pays autonomously via BSV, and retries. The whole cycle happens in seconds without any user interaction.

Works with **BRC-100 compliant wallets** (Yours, Metanet), **HandCash**, and **programmatic agent keys** via `@bsv/sdk`.

---

## Table of contents

- [Install](#install)
- [Quick start](#quick-start)
- [Options](#options)
- [Fiat pricing (USD)](#fiat-pricing-usd)
- [How it works](#how-it-works)
- [Replay protection](#replay-protection)
- [Accessing payment info downstream](#accessing-payment-info-downstream)
- [Client SDK](#client-sdk)
  - [Agent mode (private key)](#agent-mode-private-key)
  - [Browser wallet mode](#browser-wallet-mode)
  - [Custom wallet adapter](#custom-wallet-adapter)
  - [Security guards](#security-guards)
  - [Client SDK options reference](#client-sdk-options-reference)
- [BRC-121 mode (standards-compliant)](#brc-121-mode-standards-compliant)
- [Which mode should I use?](#which-mode-should-i-use)
- [Wallet adapters](#wallet-adapters)
  - [bsv-sdk (programmatic keys)](#bsv-sdk-programmatic-keys)
  - [HandCash](#handcash)
  - [Yours Wallet](#yours-wallet)
  - [Metanet Client](#metanet-client)
  - [Auto-detect](#auto-detect)
- [Wallet compatibility](#wallet-compatibility)
- [Testnet](#testnet)
- [Project structure](#project-structure)
- [Why BSV for micropayments?](#why-bsv-for-micropayments)
- [Adding to an existing Replit app](#adding-to-an-existing-replit-app)
- [Publishing to npm](#publishing-to-npm)
- [Contributing](#contributing)
- [Author](#author)
- [License](#license)

---

## Install

### Middleware (server-side)

**From GitHub (before npm publish):**
```bash
npm install github:ruthheasman/bsv-micropay-middleware
```

**From npm (once published):**
```bash
npm install @ruthheasman/bsv-micropay-middleware
```

Requires Node 18+. Express 4 or 5 as a peer dependency.

### Client SDK

The client SDK lives in `bsv-micropay-client/` within this repo.

**From GitHub:**
```bash
npm install github:ruthheasman/bsv-micropay-middleware#path:bsv-micropay-client
```

**From npm (once published):**
```bash
npm install @ruthheasman/bsv-micropay-client
```

For programmatic/agent usage, also install `@bsv/sdk`:
```bash
npm install @bsv/sdk
```

---

## Quick start

```typescript
import express from 'express'
import { micropay } from '@ruthheasman/bsv-micropay-middleware'

const app = express()

// Free endpoint
app.get('/health', (req, res) => res.json({ ok: true }))

// Gated endpoint — one line
app.get(
  '/api/data',
  micropay({ amount: 0.001, receivingAddress: process.env.BSV_ADDRESS! }),
  (req, res) => {
    res.json({
      data: 'your data here',
      payment: req.bsvPayment, // { txId, amount, from, confirmedAt }
    })
  }
)

app.listen(3000)
```

A caller without a valid payment gets:

```json
{
  "status": 402,
  "paymentRequired": true,
  "amount": 0.001,
  "currency": "BSV",
  "payTo": "1YourAddress...",
  "wallets": ["brc100", "handcash", "yours", "metanet"],
  "network": "mainnet",
  "instructions": "Broadcast a BSV transaction paying the specified amount to payTo, then retry this request with the transaction ID in the X-BSV-TxId header.",
  "docs": "https://github.com/ruthheasman/bsv-micropay-middleware"
}
```

A caller with a valid txId in the `X-BSV-TxId` header gets through to your handler.

---

## Options

```typescript
micropay({
  // Required
  amount: 0.001,                // amount to charge (BSV or USD)
  receivingAddress: '1Your...', // your BSV address

  // Optional
  currency: 'BSV',      // 'BSV' (default) or 'USD' — see Fiat Pricing below
  wallets: ['brc100', 'handcash', 'yours', 'metanet'], // default: all four
  network: 'mainnet',   // 'mainnet' (default) or 'testnet'

  // USD-specific (ignored when currency is 'BSV')
  rateCacheTtlMs: 300_000, // exchange rate cache duration (default: 5 min)
  rateBufferPercent: 2,    // buffer on converted amount (default: 2%)

  // Lifecycle hook
  onPayment: async (payment) => {
    // Called after successful verification — non-blocking
    console.log(`${payment.txId} — ${payment.amount} BSV from ${payment.from}`)
  }
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `amount` | `number` | *required* | Price per request (in BSV or USD) |
| `receivingAddress` | `string` | *required* | Your BSV address |
| `currency` | `'BSV' \| 'USD'` | `'BSV'` | Pricing currency |
| `wallets` | `WalletType[]` | all four | Wallets to advertise in the 402 |
| `network` | `'mainnet' \| 'testnet'` | `'mainnet'` | BSV network |
| `rateCacheTtlMs` | `number` | `300000` | Exchange rate cache TTL (USD only) |
| `rateBufferPercent` | `number` | `2` | Buffer % on converted amount (USD only) |
| `onPayment` | `(payment) => Promise<void>` | — | Async hook after verification |

---

## Fiat pricing (USD)

Set prices in US dollars. The middleware converts to BSV at the current exchange rate via CoinGecko:

```typescript
app.get(
  '/api/premium',
  micropay({
    amount: 0.25,           // $0.25 USD
    currency: 'USD',
    receivingAddress: process.env.BSV_ADDRESS!,
  }),
  (req, res) => res.json({ data: 'premium content' })
)
```

The 402 response includes both amounts:

```json
{
  "status": 402,
  "paymentRequired": true,
  "amount": 0.00384615,
  "currency": "BSV",
  "fiatAmount": 0.25,
  "fiatCurrency": "USD",
  "payTo": "1YourAddress...",
  "wallets": ["brc100", "handcash", "yours", "metanet"],
  "instructions": "..."
}
```

**Rate caching:** The exchange rate is cached for 5 minutes (configurable). A 2% buffer (configurable) is added to the quoted amount to handle price movement between when the 402 is issued and when the payment arrives. Verification uses a symmetric buffer below the rate, so slight underpayments due to volatility are accepted.

**Fallback behaviour:** If CoinGecko is temporarily unavailable, the middleware serves a stale rate (up to 6× the cache TTL). If no rate is available at all, it returns a 503 rather than a potentially incorrect 402.

---

## How it works

```
1. Client  → GET /api/data
2. Server  ← no X-BSV-TxId header
3. Client  ← 402 { amount, payTo, wallets, instructions }
4. Client  → broadcasts BSV tx, gets txId
5. Client  → GET /api/data  (X-BSV-TxId: <txId>)
6. Server  → verifies tx on WhatsOnChain
7. Server  → replay check (same txId can't be reused for same endpoint)
8. Server  → next()
9. Client  ← 200 { your data, payment: { txId, amount, confirmedAt } }
```

**No infrastructure required.** Verification hits the BSV blockchain directly via [WhatsOnChain](https://whatsonchain.com). No database, no webhook, no separate service — everything runs inside your existing Express process.

---

## Replay protection

Each `txId` can only be used **once per endpoint** (`METHOD:path`). Attempting to reuse a txId returns a fresh 402. The cache uses a 24-hour TTL with hourly sweeps, running entirely in-process — no Redis needed for single-instance deployments.

For multi-instance deployments, you can swap in your own cache implementation:

```typescript
import { TxCache, txCache } from '@ruthheasman/bsv-micropay-middleware'

// The TxCache interface is:
//   has(txId: string, endpoint: string): boolean
//   set(txId: string, endpoint: string): void
//   size: number
//
// Implement a Redis-backed version with the same interface for horizontal scaling.
```

---

## Accessing payment info downstream

After successful verification, `req.bsvPayment` is available in all downstream handlers and middleware:

```typescript
app.get('/api/data', micropay({ amount: 0.001, receivingAddress }), (req, res) => {
  const { txId, amount, from, confirmedAt } = req.bsvPayment!
  // txId       — the transaction ID that paid for this request
  // amount     — actual BSV amount received
  // from       — sender's BSV address (if available from the transaction)
  // confirmedAt — confirmation timestamp (if confirmed)
  res.json({ txId, amount })
})
```

---

## Client SDK

The client SDK (`@ruthheasman/bsv-micropay-client`) wraps `fetch` with automatic 402 payment handling. When a request returns `402 Payment Required`, the client parses the payment instructions, pays via the configured wallet, and retries — all in one call.

### Agent mode (private key)

For AI agents and server-to-server use. The agent holds its own BSV private key and pays autonomously:

```typescript
import { createMicropayClient } from '@ruthheasman/bsv-micropay-client'

const client = createMicropayClient({
  privateKey: process.env.BSV_AGENT_KEY!, // WIF-encoded private key
  maxPaymentAmount: 0.01,                 // safety cap per request
  trustedHosts: ['api.example.com'],      // only pay these hosts
})

// Use like fetch — payments happen automatically
const res = await client.fetch('https://api.example.com/paid-endpoint')
const data = await res.json()
```

This uses `@bsv/sdk` under the hood to construct, sign, and broadcast transactions. UTXOs are fetched from WhatsOnChain, and transactions are broadcast via ARC (TAAL).

### Browser wallet mode

For web apps where users pay from their browser wallet:

```typescript
import { createMicropayClient } from '@ruthheasman/bsv-micropay-client'

// Use a specific wallet
const client = createMicropayClient({ wallet: 'yours' })

// Or auto-detect whichever wallet the user has installed
const client = createMicropayClient({ wallet: 'auto' })

const res = await client.fetch('/api/paid-endpoint')
```

Supported wallet names: `'bsv-sdk'`, `'handcash'`, `'yours'`, `'metanet'`, `'auto'`.

### Custom wallet adapter

Implement the `WalletAdapter` interface to integrate any BSV wallet:

```typescript
import { createMicropayClient, WalletAdapter } from '@ruthheasman/bsv-micropay-client'

const myWallet: WalletAdapter = {
  async pay(amount: number, address: string, network: 'mainnet' | 'testnet'): Promise<string> {
    // Your wallet logic here
    // amount is in BSV (e.g. 0.001)
    // Return the broadcast transaction ID
    return txId
  }
}

const client = createMicropayClient({ wallet: myWallet })
```

### Security guards

Two built-in safety mechanisms prevent the client from spending more than intended:

```typescript
const client = createMicropayClient({
  privateKey: process.env.BSV_AGENT_KEY!,

  // Won't pay more than this per request (in BSV)
  maxPaymentAmount: 0.01,

  // Only pay 402s from these hostnames
  trustedHosts: ['api.example.com', 'api.myservice.io'],
})
```

- **`maxPaymentAmount`** — If the 402 asks for more than this amount, the client throws instead of paying. Protects against compromised or misconfigured endpoints.
- **`trustedHosts`** — If the request URL's hostname isn't in this list, the client refuses to pay. Prevents paying arbitrary servers if URLs are constructed dynamically.

### Client SDK options reference

`createMicropayClient` supports three constructor modes. Pick the one that fits your use case:

**Mode 1: Private key (agents, server-to-server)**
```typescript
createMicropayClient({ privateKey, arcUrl?, arcApiKey?, ...common })
```

**Mode 2: Wallet name (browser or named adapter)**
```typescript
createMicropayClient({ wallet: 'yours' | 'metanet' | 'handcash' | 'bsv-sdk' | 'auto', handcashAppId?, privateKey?, arcUrl?, arcApiKey?, ...common })
```

**Mode 3: Custom wallet adapter**
```typescript
createMicropayClient({ wallet: myWalletAdapter, ...common })
```

**Common options (all modes):**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxRetries` | `number` | `1` | Payment retry attempts |
| `maxPaymentAmount` | `number` | — | Max BSV per request (safety cap) |
| `trustedHosts` | `string[]` | — | Hostnames allowed to receive payments |
| `onPayment` | `(event) => void` | — | Callback after each payment |
| `logger` | `Console` | `console` | Logger for payment activity |

**Mode-specific options:**

| Option | Modes | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `privateKey` | 1, 2 | `string` | — | WIF private key (required for mode 1, optional for mode 2 with `'bsv-sdk'`) |
| `arcUrl` | 1, 2 | `string` | `'https://arc.taal.com'` | ARC broadcast endpoint (bsv-sdk only) |
| `arcApiKey` | 1, 2 | `string` | `''` | ARC API key (bsv-sdk only) |
| `handcashAppId` | 2 | `string` | — | Required when `wallet` is `'handcash'` |

Note: `@bsv/sdk` is only required when using the `bsv-sdk` adapter (mode 1 or mode 2 with `wallet: 'bsv-sdk'`). It is dynamically imported at payment time, not a global peer dependency.

---

## BRC-121 mode (standards-compliant)

The default `micropay()` middleware uses a simple JSON-body protocol — easy to integrate, works with just a receiving address, and pairs naturally with any BSV wallet. For interop with the broader BSV ecosystem there is also a fully [BRC-121](https://github.com/bitcoin-sv/BRCs/blob/master/payments/0121.md) ("Simple 402 Payments") compliant alternative, exposed from the `/brc121` subpath.

BRC-121 uses HTTP headers (not a JSON body), pays to a key derived from the server's identity key via [BRC-29](https://github.com/bitcoin-sv/BRCs/blob/master/payments/0029.md) / [BRC-42](https://github.com/bitcoin-sv/BRCs/blob/master/key-derivation/0042.md), transmits the transaction in [BEEF](https://github.com/bitcoin-sv/BRCs/blob/master/transactions/0062.md) format, and settles via `wallet.internalizeAction` on a server-side [BRC-100](https://github.com/bitcoin-sv/BRCs/blob/master/wallet/0100.md) wallet.

Under the hood the BRC-121 mode wraps the official BSV implementation, [`@bsv/402-pay`](https://www.npmjs.com/package/@bsv/402-pay), behind our idiomatic options shape — so you get standards compliance for free without writing the BRC-29 / BRC-42 / BEEF plumbing yourself.

### Install

```bash
npm install @bsv/402-pay @bsv/sdk
```

Both are optional peer dependencies of this middleware — only install them if you use BRC-121 mode.

### Server

```typescript
import express from 'express'
import { brc121 } from '@ruthheasman/bsv-micropay-middleware/brc121'
import { wallet } from './my-server-wallet.js' // a BRC-100 WalletInterface

const app = express()

app.get(
  '/api/articles/:slug',
  brc121({
    wallet,
    price: 100,            // 100 satoshis (~$0.00006 at current rates)
    paymentWindowMs: 30_000, // optional — default is 30s per spec
  }),
  (req, res) => {
    res.json({
      content: '...',
      payment: req.bsvBrc121Payment, // { txid, satoshisPaid, senderIdentityKey }
    })
  }
)
```

A caller without payment receives a 402 with the headers:

```
HTTP/1.1 402 Payment Required
x-bsv-sats: 100
x-bsv-server: 02a1b2c3...           (the server's identity public key)
```

The client then constructs a BRC-29 payment derived against that key, packages it as a BEEF, and re-sends with five headers: `x-bsv-beef`, `x-bsv-sender`, `x-bsv-nonce`, `x-bsv-time`, `x-bsv-vout`. The middleware validates timestamp freshness (30-second window), runs `wallet.internalizeAction` to accept the BEEF, and checks the `isMerge` flag for replay protection — then calls `next()`.

### Client

```typescript
import { createBrc121Client } from '@ruthheasman/bsv-micropay-client/brc121'
import { wallet } from './my-wallet.js'

const client = createBrc121Client({
  wallet,
  maxPaymentSatoshis: 10_000,   // safety cap per request
  trustedHosts: ['api.example.com'],
  onPayment: ({ url, satoshis, serverIdentityKey }) => {
    console.log(`Paid ${satoshis} sats to ${serverIdentityKey.slice(0, 12)}… for ${url}`)
  },
})

const res = await client.fetch('https://api.example.com/articles/foo')
const data = await res.json()
```

The client transparently handles the 402 → pay → retry cycle using the BRC-121 headers, with the same `maxPaymentSatoshis` / `trustedHosts` safety guards available on the simple mode.

---

## Which mode should I use?

| | **Simple mode** (`micropay`) | **BRC-121 mode** (`brc121`) |
|---|---|---|
| Server needs | A BSV address | A BRC-100 wallet (`@bsv/sdk`) |
| Wire format | JSON body + `X-BSV-TxId` header | BRC-121 headers + BEEF transport |
| Verification | WhatsOnChain blockchain lookup | `wallet.internalizeAction` on a BEEF |
| Key derivation | None — pays a static address | BRC-29 / BRC-42 derived per request |
| Replay protection | Per-endpoint txId cache | BRC-29 `isMerge` flag |
| USD pricing | Built-in (CoinGecko) | Satoshi-priced only |
| Browser wallets | HandCash, Yours, Metanet | Any BRC-100 wallet |
| Best for | Quick integration, no wallet infrastructure, fiat pricing | Standards compliance, multi-output payments, BRC ecosystem interop |

You can run **both** in the same app on different routes — they don't conflict. Use simple mode for quick public APIs, BRC-121 mode for endpoints that need to play nicely with the wider BSV stack.

---

## Wallet adapters

### bsv-sdk (programmatic keys)

Server-side adapter using `@bsv/sdk`. Constructs raw transactions, fetches UTXOs from WhatsOnChain, broadcasts via ARC:

```typescript
import { createBsvSdkAdapter } from '@ruthheasman/bsv-micropay-client'

const wallet = createBsvSdkAdapter({
  privateKey: 'L1...wif',         // WIF private key
  arcUrl: 'https://arc.taal.com', // optional: custom ARC endpoint
  arcApiKey: 'your-key',          // optional: ARC API key
})
```

Requires `@bsv/sdk` (dynamically imported — only needed if you use this adapter). Supports both mainnet and testnet.

### HandCash

Browser-side adapter using the HandCash Pay SDK. Triggers the HandCash payment popup:

```typescript
import { createHandCashAdapter } from '@ruthheasman/bsv-micropay-client'

const wallet = createHandCashAdapter({
  appId: 'your-handcash-app-id'
})
```

Requires the HandCash Pay SDK script in your page. Mainnet only.

### Yours Wallet

Browser extension adapter. Calls `window.yours.provider.sendBsv()`:

```typescript
import { createYoursAdapter, isYoursAvailable, isYoursReady } from '@ruthheasman/bsv-micropay-client'

if (isYoursAvailable() && isYoursReady()) {
  const wallet = createYoursAdapter()
}
```

Requires the [Yours Wallet](https://yours.org) browser extension. Mainnet only.

### Metanet Client

Browser extension adapter. Calls `window.metanet.provider.sendPayment()`:

```typescript
import { createMetanetAdapter, isMetanetAvailable, isMetanetConnected } from '@ruthheasman/bsv-micropay-client'

if (isMetanetAvailable()) {
  const wallet = createMetanetAdapter()
  // Auto-connects if not already connected
}
```

Requires the [Metanet Client](https://metanet.id) browser extension. Mainnet only.

### Auto-detect

Detects whichever browser wallet is installed and creates the appropriate adapter:

```typescript
import { detectWallet, createAutoAdapter } from '@ruthheasman/bsv-micropay-client'

// Check what's available
const walletName = detectWallet() // 'yours' | 'metanet' | null

// Or let it pick automatically
const wallet = createAutoAdapter() // throws if nothing found
```

Detection priority: Yours (if ready) → Metanet → Yours (if available but not ready).

---

## Wallet compatibility

| Wallet | Environment | Testnet | Auth required | Best for |
|--------|-------------|---------|---------------|----------|
| `bsv-sdk` | Node.js / server | Yes | No (raw keys) | AI agents, automated pipelines, server-to-server |
| HandCash | Browser | No | Yes (app ID) | Human users, easiest onboarding |
| Yours Wallet | Browser | No | No (extension) | Browser-based users |
| Metanet Client | Browser | No | No (extension) | Browser-based users |
| Auto-detect | Browser | No | No | Apps that want to support whatever the user has |

The middleware itself is wallet-agnostic — it only verifies that the transaction exists on-chain and pays the right amount to the right address. Any wallet that can broadcast a valid BSV transaction works.

---

## Testnet

### Server

```typescript
micropay({
  amount: 0.001,
  receivingAddress: 'your-testnet-address',
  network: 'testnet',
})
```

### Client

```typescript
const client = createMicropayClient({
  privateKey: process.env.BSV_TESTNET_KEY!,
})
// The client reads the network from the 402 response automatically
```

Get testnet BSV from the [BSV testnet faucet](https://faucet.bitcoincloud.net).

Note: Only the `bsv-sdk` adapter supports testnet. HandCash, Yours, and Metanet are mainnet only.

---

## Project structure

```
bsv-micropay-middleware/
├── src/
│   ├── index.ts          — public API exports
│   ├── middleware.ts      — micropay() Express middleware
│   ├── verify.ts          — WhatsOnChain transaction verification
│   ├── cache.ts           — replay protection (in-memory, 24h TTL)
│   ├── exchange.ts        — BSV/USD exchange rate (CoinGecko, cached)
│   └── types.ts           — TypeScript types + Express augmentation
│
├── bsv-micropay-client/
│   ├── src/
│   │   ├── index.ts       — client SDK exports
│   │   ├── client.ts      — createMicropayClient() + fetch wrapper
│   │   ├── types.ts       — client SDK types
│   │   └── adapters/
│   │       ├── bsv-sdk.ts — @bsv/sdk adapter (agents, server)
│   │       ├── handcash.ts— HandCash Pay adapter (browser)
│   │       ├── yours.ts   — Yours Wallet adapter (browser)
│   │       ├── metanet.ts — Metanet Client adapter (browser)
│   │       └── auto.ts    — auto-detect + create adapter
│   └── package.json
│
├── example/
│   ├── server.ts          — Express server with BSV + USD endpoints
│   └── agent-client.ts    — AI agent autonomous payment loop
│
├── AGENT.md               — Replit Agent onboarding prompts
├── package.json
└── LICENSE
```

---

## Why BSV for micropayments?

- **Near-zero fees** — fractions of a cent per transaction, making per-call pricing viable
- **Instant settlement** — 0-conf is safe for low-value micropayment use cases
- **Programmable** — agents can hold keys and pay autonomously, no OAuth or human approval
- **No minimum** — Stripe's $0.30 floor makes anything under ~$2 uneconomical. BSV has no floor.
- **No accounts** — no signup, no API keys, no approval process. Just a BSV address.

This middleware is particularly useful for:
- AI API endpoints that cost fractions of a cent per call
- Pay-per-use data APIs
- Agent-to-agent commerce (machine-to-machine)
- Any endpoint where Stripe is overkill and free is underselling it

---

## Adding to an existing Replit app

See [AGENT.md](./AGENT.md) for copy-paste Replit Agent prompts that wire this into your existing app automatically.

Short version:

1. Add `BSV_ADDRESS` to Replit Secrets
2. Install: `npm install github:ruthheasman/bsv-micropay-middleware`
3. Paste the agent prompt from AGENT.md

---

## Publishing to npm

Once you're happy with the API:

```bash
# Middleware
cd bsv-micropay-middleware
npm login
npm publish --access public

# Client SDK
cd bsv-micropay-client
npm login
npm publish --access public
```

Then users can install with:
```bash
npm install @ruthheasman/bsv-micropay-middleware
npm install @ruthheasman/bsv-micropay-client
```

---

## Contributing

Issues and PRs welcome. This is early — the API may shift before 1.0.

---

## Author

[Ruth Heasman](https://ruthdesignsdigital.com) — BSV Ambassador, independent developer.
Built on [Replit](https://replit.com). Part of the [3C (Chics Coding Consortium)](https://twitter.com/ruthheasman) BSV project series.

---

## License

MIT — see [LICENSE](./LICENSE)
