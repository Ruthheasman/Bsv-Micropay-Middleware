# Replit Agent Setup Prompt

Copy and paste this prompt directly into Replit Agent to add BSV micropayment
gating to an existing Express app.

---

## Prompt: Add to existing app

```
I want to add BSV micropayment gating to my Express API using the
bsv-micropay-middleware package.

Please do the following:

1. Install the package:
   npm install github:ruthheasman/bsv-micropay-middleware

2. Add this import to my server file:
   import { micropay } from '@ruthheasman/bsv-micropay-middleware'

3. Gate the following routes with micropayments:
   [LIST YOUR ROUTES AND AMOUNTS HERE — e.g. GET /api/data → 0.001 BSV]

4. The middleware pattern is:
   app.get('/api/data', micropay({ amount: 0.001, receivingAddress: process.env.BSV_ADDRESS }), handler)

5. Check that BSV_ADDRESS exists in Replit Secrets. If it doesn't, 
   tell me — do not hardcode any addresses.

6. Do not modify any other routes, files, or logic.
   Only add the micropay() middleware to the routes I specified.
```

---

## Prompt: Fresh Replit template

```
Set up a new Express + TypeScript API with BSV micropayment gating.

1. Install dependencies:
   npm install express @ruthheasman/bsv-micropay-middleware
   npm install -D typescript @types/express @types/node tsx

2. Create server.ts with:
   - A free GET /health endpoint (no payment)
   - A gated GET /api/data endpoint requiring 0.001 BSV
   - A gated POST /api/generate endpoint requiring 0.005 BSV
   - micropay() middleware applied to the gated routes
   - receivingAddress loaded from process.env.BSV_ADDRESS
   - A startup log showing which endpoints are gated and at what price

3. Create tsconfig.json for ESM TypeScript.

4. Add a start script: "tsx server.ts"

5. Remind me to add BSV_ADDRESS to Replit Secrets before running.
```

---

## Secrets required

Add these in Replit → Tools → Secrets:

| Key | Value | Required |
|-----|-------|----------|
| `BSV_ADDRESS` | Your BSV receiving address | Yes |
| `ARC_API_KEY` | Taal ARC API key (for agent broadcast) | Only if using agent-client |

---

## How to test once running

**Expect a 402 (no payment):**
```bash
curl https://your-repl.replit.app/api/data
```

**With a valid txId:**
```bash
curl https://your-repl.replit.app/api/data \
  -H "X-BSV-TxId: your_broadcast_txid_here"
```

The 402 response body is machine-readable — an AI agent can parse it and
pay autonomously without any human interaction.
