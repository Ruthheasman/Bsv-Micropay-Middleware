# bsv-micropay-middleware

> Express middleware for BSV micropayments. Gate any API endpoint with pay-per-use BSV in one line of code.

Built for the age of personal AI agents — no OAuth, no redirects, no human in the loop. An agent hits your endpoint, receives a machine-readable `402 Payment Required`, pays autonomously via BSV, and retries. The whole cycle happens in seconds without any user interaction.

Works with **BRC-100 compliant wallets** (Yours, Metanet), **HandCash**, and **programmatic agent keys**.

---

## Install

**From GitHub (before npm publish):**
```bash
npm install github:ruthheasman/bsv-micropay-middleware
```

**From npm (once published):**
```bash
npm install @ruthheasman/bsv-micropay-middleware
```

Requires Node 18+. Express 4 or 5 as a peer dependency.

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
      payment: req.bsvPayment, // { txId, amount, confirmedAt }
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
  "instructions": "Broadcast a BSV transaction paying the specified amount to payTo, then retry this request with the transaction ID in the X-BSV-TxId header."
}
```

A caller with a valid txId in `X-BSV-TxId` gets through to your handler.

---

## Options

```typescript
micropay({
  // Required
  amount: 0.001,
  receivingAddress: '1YourBSVAddress',

  // Optional
  wallets: ['brc100', 'handcash', 'yours', 'metanet'], // default: all four
  network: 'mainnet',   // or 'testnet'. Default: 'mainnet'

  onPayment: async (payment) => {
    // Called after successful verification — use for logging, analytics, etc.
    // Non-blocking: a failure here won't affect the response.
    console.log(`${payment.txId} — ${payment.amount} BSV from ${payment.from}`)
  }
})
```

---

## How it works

```
1. Client → GET /api/data
2. Middleware ← no X-BSV-TxId header
3. Client ← 402 { amount, payTo, wallets, instructions }

4. Client broadcasts BSV tx → gets txId
5. Client → GET /api/data  (X-BSV-TxId: <txId>)
6. Middleware → verifies tx on WhatsOnChain
7. Middleware → replay check (same txId can't be reused)
8. Middleware → next()
9. Client ← 200 { your data, payment: { txId, amount, confirmedAt } }
```

**No infrastructure required.** Verification hits the BSV network directly via [WhatsOnChain](https://whatsonchain.com). No database, no webhook, no separate service — everything runs inside your existing Express process.

---

## AI agent usage

This is what makes BSV micropayments genuinely different from Stripe. An agent can pay programmatically with no human in the loop:

```typescript
async function fetchWithMicropay(url: string): Promise<Response> {
  const res = await fetch(url)
  if (res.status !== 402) return res

  const { amount, payTo } = await res.json()

  // Agent signs and broadcasts a BSV tx using its own keys
  const txId = await myBSVWallet.pay({ amount, to: payTo })

  // Retry with proof of payment
  return fetch(url, { headers: { 'X-BSV-TxId': txId } })
}
```

See [`example/agent-client.ts`](./example/agent-client.ts) for a full working implementation using `@bsv/sdk`.

---

## Accessing payment info downstream

After successful verification, `req.bsvPayment` is available in all downstream handlers:

```typescript
app.get('/api/data', micropay({ amount: 0.001, receivingAddress }), (req, res) => {
  const { txId, amount, from, confirmedAt } = req.bsvPayment!
  res.json({ txId, amount })
})
```

---

## Replay protection

Each `txId` can only be used **once per endpoint**. Attempting to reuse a txId returns a fresh 402. The cache uses a 24-hour TTL and runs in-process — no Redis needed for single-instance deployments.

For multi-instance deployments, export and replace the shared cache:

```typescript
import { TxCache, txCache } from '@ruthheasman/bsv-micropay-middleware'

// Swap in your own Redis-backed implementation with the same interface
// (has(txId, endpoint), set(txId, endpoint), size)
```

---

## Wallet compatibility

| Wallet | Type | Best for |
|--------|------|----------|
| Programmatic keys | BRC-100 | AI agents, automated pipelines |
| HandCash | BRC-100 + SDK | Human users, easiest onboarding |
| Yours Wallet | BRC-100 | Browser-based users |
| Metanet Wallet | BRC-100 | Browser-based users |

The middleware doesn't care which wallet the caller uses — it verifies the transaction against the BSV network. HandCash and Yours/Metanet are just BRC-100 compliant implementations.

---

## Testnet

```typescript
micropay({
  amount: 0.001,
  receivingAddress: 'your-testnet-address',
  network: 'testnet',
})
```

Get testnet BSV from the [BSV testnet faucet](https://faucet.bitcoincloud.net).

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
npm login
npm publish --access public
```

Then users can install with:
```bash
npm install @ruthheasman/bsv-micropay-middleware
```

---

## Project structure

```
src/
  index.ts        — public API exports
  middleware.ts   — micropay() middleware function
  verify.ts       — WhatsOnChain transaction verification
  cache.ts        — replay protection (in-memory, TTL-based)
  types.ts        — TypeScript types

example/
  server.ts       — Express app showing all usage patterns
  agent-client.ts — AI agent autonomous payment loop (@bsv/sdk)

AGENT.md          — Replit Agent onboarding prompts
```

---

## Why BSV for micropayments?

- **Near-zero fees** — fractions of a cent per transaction, making per-call pricing viable
- **Instant settlement** — 0-conf is safe for low-value micropayment use cases  
- **Programmable** — BRC-100 means agents can hold keys and pay autonomously
- **No minimum** — Stripe's $0.30 floor makes anything under ~£2 uneconomical. BSV has no floor.

This middleware is particularly useful for:
- AI API endpoints that should cost fractions of a cent per call
- Pay-per-use data APIs
- Agent-to-agent commerce
- Any endpoint where Stripe is overkill and free is underselling it

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
