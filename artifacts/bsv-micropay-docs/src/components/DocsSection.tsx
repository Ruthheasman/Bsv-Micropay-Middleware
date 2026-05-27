import { CodeBlock } from "./CodeBlock";

export function DocsSection() {
  const serverCode = `import express from 'express'
import { micropay } from '@ruthheasman/bsv-micropay-middleware'

const app = express()

// One line of middleware to gate an endpoint
app.get(
  '/api/data',
  micropay({ amount: 0.001, receivingAddress: '1YourBSVAddress' }),
  (req, res) => {
    res.json({
      data: 'Premium content unlocked',
      payment: req.bsvPayment, // { txId, amount, confirmedAt }
    })
  }
)

app.listen(3000)`;

  const usdCode = `// Prices in USD, automatically converted to BSV at live rates
app.get(
  '/api/generate',
  micropay({
    amount: 0.25,           // $0.25
    currency: 'USD',        // Use CoinGecko for live exchange rate
    receivingAddress: '1YourBSVAddress',
    rateBufferPercent: 2,   // Handle rate drift
  }),
  (req, res) => {
    res.json({ result: 'AI response' })
  }
)`;

  const agentClientCode = `import { createMicropayClient } from '@ruthheasman/bsv-micropay-client'

// Initialize agent with private key
const client = createMicropayClient({
  privateKey: process.env.AGENT_BSV_KEY!,
  maxPaymentAmount: 0.05,                         // Safety guard
  trustedHosts: ['api.example.com', 'ml.app.io'], // Safety guard
})

// Client handles 402 -> pay -> retry automatically
const response = await client.fetch('https://api.example.com/generate')
const data = await response.json()`;

  const browserClientCode = `import { createMicropayClient, detectWallet } from '@ruthheasman/bsv-micropay-client'

// Auto-detect Yours Wallet or Metanet Client
const client = createMicropayClient({ wallet: 'auto' })

// Or specify one explicitly
const handcashClient = createMicropayClient({ 
  wallet: 'handcash', 
  handcashAppId: 'your-app-id' 
})

// Use normally - prompts user wallet on 402
const res = await client.fetch('/api/premium')`;

  const brc121ServerCode = `import { brc121 } from '@ruthheasman/bsv-micropay-middleware/brc121'
import { wallet } from './my-server-wallet' // BRC-100 WalletInterface

// Headers-based BRC-121 payment flow, settled via wallet.internalizeAction
app.get(
  '/api/articles/:slug',
  brc121({
    wallet,
    price: 100,             // 100 satoshis
    paymentWindowMs: 30_000 // BRC-121 default freshness window
  }),
  (req, res) => {
    res.json({
      content: '...',
      payment: req.bsvBrc121Payment, // { txid, satoshisPaid, senderIdentityKey }
    })
  }
)`;

  const brc121ClientCode = `import { createBrc121Client } from '@ruthheasman/bsv-micropay-client/brc121'
import { wallet } from './my-wallet' // BRC-100 WalletInterface

// Wraps fetch with the BRC-121 header protocol (BRC-29 + BEEF transport)
const client = createBrc121Client({
  wallet,
  maxPaymentSatoshis: 10_000,        // safety cap
  trustedHosts: ['api.example.com'], // safety cap
})

const res = await client.fetch('https://api.example.com/articles/foo')`;

  return (
    <div className="bg-background pb-32">
      {/* Middleware Section */}
      <section id="middleware" className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">Middleware</h2>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Server-side Express middleware. Blocks requests without a valid `X-BSV-TxId` header, returning a machine-readable 402 invoice.
              </p>
            </div>
            <a 
              href="https://www.npmjs.com/package/@ruthheasman/bsv-micropay-middleware" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono bg-secondary px-4 py-2 rounded-lg border border-border hover:border-primary transition-colors"
            >
              npm i @ruthheasman/bsv-micropay-middleware
            </a>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-foreground">Standard BSV Pricing</h3>
              <p className="text-muted-foreground">Charge a fixed amount of BSV. Verification happens instantly against WhatsOnChain.</p>
              <CodeBlock code={serverCode} language="typescript" filename="server.ts" className="h-[400px]" />
            </div>
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-foreground">Fiat Pricing (USD)</h3>
              <p className="text-muted-foreground">Quote prices in USD. The middleware automatically converts to BSV with safe tolerances.</p>
              <CodeBlock code={usdCode} language="typescript" filename="premium.ts" className="h-[400px]" />
            </div>
          </div>
        </div>
      </section>

      {/* Client SDK Section */}
      <section id="client-sdk" className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">Client SDK</h2>
              <p className="text-lg text-muted-foreground max-w-2xl">
                A wrapper around `fetch()` that intercepts 402 responses, fulfills the payment using the provided wallet, and retries the request seamlessly.
              </p>
            </div>
            <a 
              href="https://www.npmjs.com/package/@ruthheasman/bsv-micropay-client" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono bg-secondary px-4 py-2 rounded-lg border border-border hover:border-accent transition-colors"
            >
              npm i @ruthheasman/bsv-micropay-client
            </a>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-foreground">AI Agent Mode</h3>
              <p className="text-muted-foreground">Pass a private key. The agent signs and broadcasts transactions autonomously.</p>
              <CodeBlock code={agentClientCode} language="typescript" filename="agent.ts" className="h-[350px]" />
            </div>
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-foreground">Browser Wallets</h3>
              <p className="text-muted-foreground">Plug-and-play adapters for HandCash, Yours Wallet, and Metanet Client.</p>
              <CodeBlock code={browserClientCode} language="typescript" filename="app.ts" className="h-[350px]" />
            </div>
          </div>
        </div>
      </section>

      {/* BRC-121 Section */}
      <section id="brc121" className="py-20 border-t border-border bg-secondary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
            <div>
              <div className="inline-block text-xs font-bold tracking-widest text-primary uppercase mb-3">Standards Compliant</div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">BRC-121 Mode</h2>
              <p className="text-lg text-muted-foreground max-w-2xl">
                For interop with the broader BSV ecosystem, a fully BRC-121 ("Simple 402 Payments") compliant mode is exposed from the <code>/brc121</code> subpath. Uses HTTP headers, BRC-29 key derivation, and BEEF transport — settled via <code>wallet.internalizeAction</code>.
              </p>
            </div>
            <a
              href="https://github.com/bitcoin-sv/BRCs/blob/master/payments/0121.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono bg-card px-4 py-2 rounded-lg border border-border hover:border-primary transition-colors"
            >
              Read BRC-121 spec →
            </a>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-foreground">Server (BRC-100 wallet)</h3>
              <p className="text-muted-foreground">Pass a BRC-100 <code>WalletInterface</code> and a satoshi price. Validation, replay protection and BEEF settlement are handled automatically.</p>
              <CodeBlock code={brc121ServerCode} language="typescript" filename="server.ts" className="h-[420px]" />
            </div>
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-foreground">Client (BRC-100 wallet)</h3>
              <p className="text-muted-foreground">A <code>fetch</code> wrapper that constructs BRC-121 payment headers and retransmits on 402, with the same safety guards as simple mode.</p>
              <CodeBlock code={brc121ClientCode} language="typescript" filename="client.ts" className="h-[420px]" />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border bg-secondary/30">
              <h3 className="font-bold text-foreground">Which mode should I use?</h3>
            </div>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/20">
                  <th className="py-3 px-6 font-semibold text-foreground w-1/3"></th>
                  <th className="py-3 px-6 font-semibold text-foreground">Simple mode (<code>micropay</code>)</th>
                  <th className="py-3 px-6 font-semibold text-foreground">BRC-121 mode (<code>brc121</code>)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="py-3 px-6 font-medium text-foreground">Server needs</td><td className="py-3 px-6 text-muted-foreground">A BSV address</td><td className="py-3 px-6 text-muted-foreground">A BRC-100 wallet (<code>@bsv/sdk</code>)</td></tr>
                <tr><td className="py-3 px-6 font-medium text-foreground">Wire format</td><td className="py-3 px-6 text-muted-foreground">JSON body + <code>X-BSV-TxId</code> header</td><td className="py-3 px-6 text-muted-foreground">BRC-121 headers + BEEF</td></tr>
                <tr><td className="py-3 px-6 font-medium text-foreground">Verification</td><td className="py-3 px-6 text-muted-foreground">WhatsOnChain blockchain lookup</td><td className="py-3 px-6 text-muted-foreground"><code>wallet.internalizeAction</code></td></tr>
                <tr><td className="py-3 px-6 font-medium text-foreground">USD pricing</td><td className="py-3 px-6 text-muted-foreground">Built-in (CoinGecko)</td><td className="py-3 px-6 text-muted-foreground">Satoshi-priced only</td></tr>
                <tr><td className="py-3 px-6 font-medium text-foreground">Browser wallets</td><td className="py-3 px-6 text-muted-foreground">HandCash, Yours, Metanet</td><td className="py-3 px-6 text-muted-foreground">Any BRC-100 wallet</td></tr>
                <tr><td className="py-3 px-6 font-medium text-foreground">Best for</td><td className="py-3 px-6 text-muted-foreground">Quick integration, fiat pricing</td><td className="py-3 px-6 text-muted-foreground">Standards interop, BRC ecosystem</td></tr>
              </tbody>
            </table>
            <div className="px-6 py-4 border-t border-border text-sm text-muted-foreground">
              Both can run side-by-side in the same app on different routes — they don't conflict. The BRC-121 mode is a thin wrapper over the official <code>@bsv/402-pay</code> package.
            </div>
          </div>
        </div>
      </section>

      {/* Wallets Section */}
      <section id="wallets" className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">Supported Wallets</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The middleware doesn't care which wallet the user has. The client SDK provides ready-made adapters for the most popular BSV options.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/50 border-b border-border">
                  <th className="py-4 px-6 font-semibold text-foreground">Wallet / Adapter</th>
                  <th className="py-4 px-6 font-semibold text-foreground">Usage Type</th>
                  <th className="py-4 px-6 font-semibold text-foreground hidden sm:table-cell">Best For</th>
                  <th className="py-4 px-6 font-semibold text-foreground text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="py-4 px-6 font-medium">Programmatic Key (<code>@bsv/sdk</code>)</td>
                  <td className="py-4 px-6 text-muted-foreground">Node.js Server</td>
                  <td className="py-4 px-6 text-muted-foreground hidden sm:table-cell">AI Agents, automated pipelines</td>
                  <td className="py-4 px-6 text-center"><span className="inline-flex px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-700 dark:text-green-400">Ready</span></td>
                </tr>
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="py-4 px-6 font-medium">HandCash (Pay SDK)</td>
                  <td className="py-4 px-6 text-muted-foreground">Browser</td>
                  <td className="py-4 px-6 text-muted-foreground hidden sm:table-cell">Mainstream users, easiest UX</td>
                  <td className="py-4 px-6 text-center"><span className="inline-flex px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-700 dark:text-green-400">Ready</span></td>
                </tr>
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="py-4 px-6 font-medium">Yours Wallet</td>
                  <td className="py-4 px-6 text-muted-foreground">Browser Extension</td>
                  <td className="py-4 px-6 text-muted-foreground hidden sm:table-cell">Crypto-native users</td>
                  <td className="py-4 px-6 text-center"><span className="inline-flex px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-700 dark:text-green-400">Ready</span></td>
                </tr>
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="py-4 px-6 font-medium">Metanet Client</td>
                  <td className="py-4 px-6 text-muted-foreground">Browser Extension</td>
                  <td className="py-4 px-6 text-muted-foreground hidden sm:table-cell">Crypto-native users</td>
                  <td className="py-4 px-6 text-center"><span className="inline-flex px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-700 dark:text-green-400">Ready</span></td>
                </tr>
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="py-4 px-6 font-medium">Custom Adapter</td>
                  <td className="py-4 px-6 text-muted-foreground">Any</td>
                  <td className="py-4 px-6 text-muted-foreground hidden sm:table-cell">Bring your own wallet logic</td>
                  <td className="py-4 px-6 text-center"><span className="inline-flex px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-700 dark:text-green-400">Ready</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
