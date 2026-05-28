import { CodeBlock } from "./CodeBlock";
import { Check, X, Minus, ExternalLink, AlertCircle } from "lucide-react";

const manifestJson = `{
  "version": "0.2.0",
  "name": "bsv-micropay-demo",
  "protocol": "bsv-micropay",
  "chain": "bsv",
  "network": "mainnet",
  "capabilities": {
    "payment": "bsv-micropay/0.2",
    "paymentModes": ["address", "brc-121"],
    "pricing": ["bsv", "usd"],
    "auth": null,
    "refunds": false,
    "identity": null,
    "paymentTransport": "header"
  },
  "paymentHeader": "X-BSV-TxId",
  "wallets": ["brc100", "handcash", "yours", "metanet"],
  "endpoints": [
    {
      "path": "/api/demo/paid",
      "method": "GET",
      "payment": {
        "amount": 0.001,
        "currency": "BSV",
        "mode": "address",
        "payTo": "1DemoAddressNotReal000000000000000"
      },
      "description": "Returns premium data after a 0.001 BSV payment."
    },
    {
      "path": "/api/demo/paid-usd",
      "method": "GET",
      "payment": {
        "amount": 0.25,
        "currency": "USD",
        "conversion": "coingecko-live"
      },
      "description": "USD pricing, live BSV conversion."
    }
  ]
}`;

const isNotItems = [
  {
    label: "a wallet",
    body: "We don't custody keys or hold funds. Your receiving address is yours — payments land there directly.",
  },
  {
    label: "a payment processor",
    body: "There's no facilitator, no settlement service, no merchant account. The middleware verifies a transaction on-chain and opens the gate.",
  },
  {
    label: "a token standard",
    body: "It works with native BSV. No ERC-20, no stablecoin contract, no token issuance required.",
  },
  {
    label: "a marketplace",
    body: "Each server publishes its own manifest at /.well-known. There's no central index, no listings, no curation.",
  },
  {
    label: "a billing system",
    body: "No invoices, no subscriptions, no metering dashboards. Payment is per request, atomic, and protocol-native.",
  },
];

type Cell = boolean | "partial" | string;
const comparison: {
  feature: string;
  ours: Cell;
  x402Agency: Cell;
  coinbase: Cell;
  stripe: Cell;
}[] = [
  { feature: "One-line server integration", ours: true, x402Agency: false, coinbase: true, stripe: false },
  { feature: "Sub-cent payments", ours: true, x402Agency: true, coinbase: false, stripe: false },
  { feature: "No facilitator / third party", ours: true, x402Agency: true, coinbase: false, stripe: false },
  { feature: "Native currency (no token contract)", ours: true, x402Agency: true, coinbase: false, stripe: false },
  { feature: "USD-denominated pricing", ours: true, x402Agency: true, coinbase: true, stripe: true },
  { feature: "BRC-121 standards-compliant mode", ours: true, x402Agency: false, coinbase: false, stripe: false },
  { feature: "Mutual cryptographic identity", ours: false, x402Agency: true, coinbase: false, stripe: false },
  { feature: "Automatic refunds on upstream failure", ours: false, x402Agency: true, coinbase: false, stripe: "partial" },
  { feature: "Quote binding (anti tier-switch)", ours: false, x402Agency: true, coinbase: false, stripe: false },
  { feature: ".well-known discovery manifest", ours: true, x402Agency: true, coinbase: false, stripe: false },
  { feature: "Chain-agnostic", ours: false, x402Agency: "partial", coinbase: false, stripe: true },
  { feature: "Minimum viable payment", ours: "~$0.0003", x402Agency: "~$0.00025", coinbase: "~$0.20", stripe: "~$0.50" },
];

function CellRender({ value }: { value: Cell }) {
  if (value === true) return <Check className="w-5 h-5 text-primary inline" aria-label="Yes" />;
  if (value === false) return <X className="w-4 h-4 text-muted-foreground/40 inline" aria-label="No" />;
  if (value === "partial") return <Minus className="w-4 h-4 text-accent inline" aria-label="Partial" />;
  return <span className="text-xs font-mono text-foreground/80">{value}</span>;
}

const errorCodes = [
  { code: "ERR_PAYMENT_REQUIRED", status: 402, description: "Endpoint is gated. Response body carries amount, payTo, network, and wallet hints." },
  { code: "ERR_INVALID_TXID", status: 400, description: "Payment header is present but the txid is malformed or unparseable." },
  { code: "ERR_INSUFFICIENT_AMOUNT", status: 402, description: "Transaction exists on-chain but underpays the quoted amount." },
  { code: "ERR_TXID_NOT_FOUND", status: 402, description: "Transaction not yet visible on the network. Client should wait and retry." },
  { code: "ERR_TXID_USED", status: 410, description: "Transaction has already been spent against this endpoint (replay prevention)." },
  { code: "ERR_RATE_STALE", status: 503, description: "USD-denominated route could not refresh its BSV exchange rate within the buffer window." },
  { code: "ERR_WRONG_ADDRESS", status: 402, description: "Transaction pays to an address other than the configured receivingAddress." },
];

export function SpecSection() {
  return (
    <section id="spec" className="py-24 relative bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono font-medium mb-4">
            SPECIFICATION
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Where BSV Micropay Fits
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            What we are, what we're not, and how we compare to other ways of charging for an API call.
          </p>
        </div>

        {/* What this is not */}
        <div className="mb-20">
          <h3 className="text-2xl font-display font-bold text-foreground mb-2">What this is not</h3>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            BSV Micropay does a small thing well. To make that clear, here's what it deliberately doesn't try to be.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isNotItems.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border bg-card p-6 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="mt-0.5 w-7 h-7 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <X className="w-4 h-4 text-destructive" />
                  </div>
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Not</div>
                    <div className="font-display font-semibold text-foreground text-lg leading-tight">
                      {item.label}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Discovery manifest */}
        <div id="discovery" className="mb-20">
          <h3 className="text-2xl font-display font-bold text-foreground mb-2">
            Discovery: <code className="font-mono text-primary text-xl">/.well-known/bsv-micropay-info</code>
          </h3>
          <p className="text-muted-foreground mb-8 max-w-3xl">
            Every BSV Micropay server publishes a machine-readable manifest at a well-known URL. An AI agent
            can crawl it and learn — without a human in the loop — what endpoints exist, what they cost, which
            wallets are supported, and which error codes to handle. No registry, no central index.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            <div className="lg:col-span-3">
              <CodeBlock code={manifestJson} filename="GET /.well-known/bsv-micropay-info" />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
                  Live on this demo
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  The demo API server publishes a real manifest. Hit it from your agent or your terminal.
                </p>
                <a
                  href="/api/.well-known/bsv-micropay-info"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  View live manifest
                  <ExternalLink className="w-4 h-4" />
                </a>
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
                    Or from a terminal
                  </div>
                  <pre className="text-xs font-mono bg-secondary/50 rounded-lg p-3 overflow-x-auto text-foreground">
{`curl -s \\
  https://<your-server>/\\
  .well-known/bsv-micropay-info | jq`}
                  </pre>
                  <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                    On this Replit demo the api-server is path-mounted, so the manifest lives at
                    {" "}<code className="font-mono text-foreground">/api/.well-known/bsv-micropay-info</code>.
                    On a single-origin deployment, drop the <code className="font-mono text-foreground">/api</code> prefix.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
                <div className="text-xs font-mono uppercase tracking-wider text-primary mb-2">
                  Convention
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  The path <code className="font-mono text-primary">/.well-known/bsv-micropay-info</code> follows{" "}
                  <a
                    href="https://www.rfc-editor.org/rfc/rfc8615"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-primary"
                  >
                    RFC 8615
                  </a>
                  . It MUST be reachable without authentication or payment.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison table */}
        <div id="comparison" className="mb-20">
          <h3 className="text-2xl font-display font-bold text-foreground mb-2">How we compare</h3>
          <p className="text-muted-foreground mb-8 max-w-3xl">
            BSV Micropay isn't the only way to charge for an API call. Here's an honest look at where each
            approach wins.
          </p>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    <th className="text-left font-display font-semibold text-foreground px-6 py-4">Feature</th>
                    <th className="text-center font-display font-semibold text-primary px-4 py-4">
                      <div>BSV Micropay</div>
                      <div className="text-xs font-mono font-normal text-muted-foreground mt-1">this project</div>
                    </th>
                    <th className="text-center font-display font-semibold text-foreground px-4 py-4">
                      <div>x402 Agency</div>
                      <div className="text-xs font-mono font-normal text-muted-foreground mt-1">protocol spec</div>
                    </th>
                    <th className="text-center font-display font-semibold text-foreground px-4 py-4">
                      <div>Coinbase x402</div>
                      <div className="text-xs font-mono font-normal text-muted-foreground mt-1">USDC-only</div>
                    </th>
                    <th className="text-center font-display font-semibold text-foreground px-4 py-4">
                      <div>Stripe metered</div>
                      <div className="text-xs font-mono font-normal text-muted-foreground mt-1">card billing</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={`border-b border-border/50 last:border-b-0 ${i % 2 === 0 ? "" : "bg-secondary/20"}`}
                    >
                      <td className="px-6 py-3 text-foreground font-medium">{row.feature}</td>
                      <td className="text-center px-4 py-3 bg-primary/5">
                        <CellRender value={row.ours} />
                      </td>
                      <td className="text-center px-4 py-3"><CellRender value={row.x402Agency} /></td>
                      <td className="text-center px-4 py-3"><CellRender value={row.coinbase} /></td>
                      <td className="text-center px-4 py-3"><CellRender value={row.stripe} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-6 text-xs text-muted-foreground font-mono">
            <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> supported</span>
            <span className="inline-flex items-center gap-1.5"><Minus className="w-4 h-4 text-accent" /> partial</span>
            <span className="inline-flex items-center gap-1.5"><X className="w-4 h-4 text-muted-foreground/40" /> not in scope</span>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="text-sm font-display font-semibold text-foreground mb-1">Where we win</div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                One-line ergonomics, sub-cent economics, and BRC-121 standards-compliant mode for the BSV
                ecosystem. Right tool for indie API builders and agent endpoints.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="text-sm font-display font-semibold text-foreground mb-1">Where we don't compete</div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Mutual identity, automatic refunds, and quote binding live in the x402 Agency spec — a fuller
                protocol stack for the long-running agent economy. Use that if you need those primitives.
              </p>
            </div>
          </div>
        </div>

        {/* Error codes */}
        <div id="errors">
          <h3 className="text-2xl font-display font-bold text-foreground mb-2">Error code registry</h3>
          <p className="text-muted-foreground mb-8 max-w-3xl">
            Every paid endpoint returns errors using this set of codes. Client SDKs handle them automatically;
            integrators can map them directly.
          </p>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    <th className="text-left font-display font-semibold text-foreground px-6 py-4 w-1/3">Code</th>
                    <th className="text-left font-display font-semibold text-foreground px-4 py-4 w-20">HTTP</th>
                    <th className="text-left font-display font-semibold text-foreground px-4 py-4">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {errorCodes.map((err, i) => (
                    <tr
                      key={err.code}
                      className={`border-b border-border/50 last:border-b-0 ${i % 2 === 0 ? "" : "bg-secondary/20"}`}
                    >
                      <td className="px-6 py-3">
                        <code className="font-mono text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                          {err.code}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-foreground">{err.status}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground leading-relaxed">{err.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4 mt-0.5 text-accent flex-shrink-0" />
            <span>
              All error responses are JSON. The error code travels in the body as <code className="font-mono text-foreground">{"{ error: \"...\" }"}</code>;
              the HTTP status is the canonical signal.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
