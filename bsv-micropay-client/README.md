# bsv-micropay-client

> Client SDK for BSV micropayments. Wraps `fetch` with automatic 402 payment handling.

Use this with any server running [`@ruthheasman/bsv-micropay-middleware`](https://github.com/ruthheasman/bsv-micropay-middleware). Your code calls `client.fetch(url)` and the SDK handles the entire 402 → pay → retry loop automatically.

Works with AI agents (private key), HandCash, Yours Wallet, and Metanet Client.

---

## Install

**From GitHub (before npm publish):**
```bash
npm install github:ruthheasman/bsv-micropay-middleware#bsv-micropay-client
```

**From npm (once published):**
```bash
npm install @ruthheasman/bsv-micropay-client
```

Requires Node 18+. Install `@bsv/sdk` if using the built-in BSV SDK adapter.

---

## Quick start (agent mode)

The simplest setup — pass a BSV private key and the SDK handles everything:

```typescript
import { createMicropayClient } from '@ruthheasman/bsv-micropay-client'

const client = createMicropayClient({
  privateKey: process.env.AGENT_BSV_KEY!,
})

const response = await client.fetch('https://api.example.com/data')
const data = await response.json()
```

---

## Quick start (browser wallet)

Use a wallet name to connect to HandCash, Yours, or Metanet:

```typescript
import { createMicropayClient } from '@ruthheasman/bsv-micropay-client'

// Use a specific wallet
const client = createMicropayClient({ wallet: 'yours' })

// Or auto-detect whichever wallet is installed
const client = createMicropayClient({ wallet: 'auto' })

const response = await client.fetch('https://api.example.com/data')
```

---

## Wallet adapters

### By name (simplest)

Pass a wallet name string to `createMicropayClient()`:

```typescript
createMicropayClient({ wallet: 'yours' })     // Yours Wallet browser extension
createMicropayClient({ wallet: 'metanet' })    // Metanet Client browser extension
createMicropayClient({ wallet: 'handcash', handcashAppId: 'your-app-id' })  // HandCash
createMicropayClient({ wallet: 'bsv-sdk', privateKey: '...' })  // @bsv/sdk (agents)
createMicropayClient({ wallet: 'auto' })       // auto-detect browser wallet
```

### By adapter instance (advanced)

Create an adapter directly for more control:

```typescript
import { createMicropayClient, createYoursAdapter } from '@ruthheasman/bsv-micropay-client'

const client = createMicropayClient({
  wallet: createYoursAdapter(),
})
```

### Auto-detect

The `'auto'` option checks which browser wallet extension is available and uses it:

```typescript
import { createMicropayClient, detectWallet } from '@ruthheasman/bsv-micropay-client'

// Check what's available (returns 'yours' | 'metanet' | null)
const detected = detectWallet()
console.log(`Using wallet: ${detected}`)

// Or just let the client auto-detect
const client = createMicropayClient({ wallet: 'auto' })
```

Detection order: Yours Wallet → Metanet Client. HandCash is not auto-detected because it requires an `appId`.

---

## HandCash setup

HandCash uses the Pay SDK and requires an app ID from the [HandCash developer dashboard](https://dashboard.handcash.io):

```typescript
const client = createMicropayClient({
  wallet: 'handcash',
  handcashAppId: 'your-app-id',
})
```

Include the HandCash Pay SDK script in your HTML:
```html
<script src="https://pay.handcash.io/handcash-pay.js"></script>
```

---

## Yours Wallet setup

Install the [Yours Wallet](https://yours.org) browser extension. No additional configuration needed:

```typescript
const client = createMicropayClient({ wallet: 'yours' })
```

---

## Metanet Client setup

Install the [Metanet Client](https://metanet.id) browser extension. No additional configuration needed:

```typescript
const client = createMicropayClient({ wallet: 'metanet' })
```

The adapter automatically connects if the wallet isn't already connected.

---

## Custom wallet adapter

Implement the `WalletAdapter` interface to use any wallet:

```typescript
import { createMicropayClient, WalletAdapter } from '@ruthheasman/bsv-micropay-client'

const myWallet: WalletAdapter = {
  async pay(amount, address, network) {
    const txId = await myCustomWallet.sendBSV({ amount, to: address })
    return txId
  }
}

const client = createMicropayClient({ wallet: myWallet })
```

---

## Options

```typescript
createMicropayClient({
  // Wallet — one of these is required:
  wallet: 'yours',                          // wallet name string
  // wallet: myAdapterInstance,              // or a WalletAdapter object
  // privateKey: 'wif-key',                 // or a private key (uses @bsv/sdk)

  // Wallet-specific options:
  handcashAppId: 'your-app-id',             // required when wallet is 'handcash'
  arcUrl: 'https://arc.taal.com',           // optional, for 'bsv-sdk' wallet
  arcApiKey: 'your-arc-key',               // optional, for 'bsv-sdk' wallet

  // General options:
  maxRetries: 1,                             // default: 1
  maxPaymentAmount: 0.1,                     // cap per-request spend (BSV)
  trustedHosts: ['api.example.com'],         // only pay these hosts
  onPayment: (event) => {                   // callback after each payment
    console.log(`Paid ${event.amount} BSV → ${event.txId}`)
  },
  logger: console,                           // default: console
})
```

---

## Security

When running an autonomous agent with real BSV keys, always set spending guards:

```typescript
const client = createMicropayClient({
  privateKey: process.env.AGENT_BSV_KEY!,
  maxPaymentAmount: 0.01,
  trustedHosts: ['api.example.com', 'ml.myapp.io'],
})
```

- **`maxPaymentAmount`** — Rejects any 402 requesting more than this amount.
- **`trustedHosts`** — Only pays 402 responses from these hostnames.

Both are strongly recommended for production deployments (agent or browser).

---

## WalletAdapter interface

```typescript
interface WalletAdapter {
  pay(amount: number, address: string, network: 'mainnet' | 'testnet'): Promise<string>
}
```

Built-in adapters:

| Adapter | Best for | Requires |
|---------|----------|----------|
| `createBsvSdkAdapter({ privateKey })` | AI agents, servers | `@bsv/sdk` |
| `createHandCashAdapter({ appId })` | Human users (easiest) | HandCash Pay SDK |
| `createYoursAdapter()` | Browser users | Yours extension |
| `createMetanetAdapter()` | Browser users | Metanet extension |
| `createAutoAdapter()` | Browser (any wallet) | Yours or Metanet |

---

## Project structure

```
src/
  index.ts              — public API exports
  client.ts             — createMicropayClient() factory
  types.ts              — TypeScript types and WalletAdapter interface
  adapters/
    bsv-sdk.ts          — @bsv/sdk wallet adapter (agent mode)
    handcash.ts         — HandCash Pay SDK adapter
    yours.ts            — Yours Wallet browser extension adapter
    metanet.ts          — Metanet Client browser extension adapter
    auto.ts             — auto-detect and factory
```

---

## Author

[Ruth Heasman](https://ruthdesignsdigital.com) — BSV Ambassador, independent developer.
Built on [Replit](https://replit.com). Part of the [3C (Chics Coding Consortium)](https://twitter.com/ruthheasman) BSV project series.

---

## License

MIT — see [LICENSE](./LICENSE)
