import express from 'express'
import { micropay } from '../src/index.js'

const app = express()
app.use(express.json())

// ─── Config ────────────────────────────────────────────────────────────────
// In a real Replit app, pull these from Secrets (process.env)
const RECEIVING_ADDRESS = process.env.BSV_ADDRESS || '1YourBSVAddressHere'

// ─── Free endpoint — no payment needed ─────────────────────────────────────
app.get('/api/free', (req, res) => {
  res.json({ message: 'This endpoint is free!' })
})

// ─── Pay-per-use endpoint — 0.001 BSV per call ─────────────────────────────
// One line of middleware. That's it.
app.get(
  '/api/data',
  micropay({ amount: 0.001, receivingAddress: RECEIVING_ADDRESS }),
  (req, res) => {
    res.json({
      message: 'You paid! Here is your data.',
      payment: req.bsvPayment, // txId, amount, confirmedAt
      data: { value: Math.random() * 100 },
    })
  }
)

// ─── USD pricing — $0.25 per call, auto-converted to BSV ───────────────────
app.get(
  '/api/premium',
  micropay({
    amount: 0.25,
    currency: 'USD',
    receivingAddress: RECEIVING_ADDRESS,
  }),
  (req, res) => {
    res.json({
      message: 'You paid $0.25 (in BSV). Here is your premium data.',
      payment: req.bsvPayment,
      data: { premium: true, value: Math.random() * 1000 },
    })
  }
)

// ─── Higher-value AI endpoint — 0.01 BSV per call ──────────────────────────
app.post(
  '/api/generate',
  micropay({
    amount: 0.01,
    receivingAddress: RECEIVING_ADDRESS,
    wallets: ['brc100', 'handcash'],
    onPayment: async (payment) => {
      console.log(`Payment received: ${payment.txId} — ${payment.amount} BSV`)
    },
  }),
  async (req, res) => {
    const { prompt } = req.body
    res.json({
      result: `Generated response for: ${prompt}`,
      payment: req.bsvPayment,
    })
  }
)

// ─── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Try: curl http://localhost:${PORT}/api/data`)
  console.log(`Try: curl http://localhost:${PORT}/api/premium`)
  console.log(`Expect a 402 with payment instructions.`)
})
