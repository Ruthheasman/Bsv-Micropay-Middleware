import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/.well-known/bsv-micropay-info", (_req, res) => {
  res.json({
    version: "0.2.0",
    name: "bsv-micropay-demo",
    description:
      "Live demo of bsv-micropay-middleware — Express middleware for HTTP 402 payment gating on Bitcoin SV.",
    protocol: "bsv-micropay",
    chain: "bsv",
    network: "mainnet",
    capabilities: {
      payment: "bsv-micropay/0.2",
      paymentModes: ["address", "brc-121"],
      pricing: ["bsv", "usd"],
      auth: null,
      refunds: false,
      excessRefunds: false,
      identity: null,
      paymentTransport: "header",
    },
    paymentHeader: "X-BSV-TxId",
    wallets: ["brc100", "handcash", "yours", "metanet"],
    endpoints: [
      {
        path: "/api/demo/free",
        method: "GET",
        auth: false,
        payment: null,
        description: "Free endpoint, no payment required.",
      },
      {
        path: "/api/demo/paid",
        method: "GET",
        auth: false,
        payment: {
          amount: 0.001,
          currency: "BSV",
          mode: "address",
          payTo: "1DemoAddressNotReal000000000000000",
        },
        description: "Returns premium data after a 0.001 BSV payment.",
      },
      {
        path: "/api/demo/paid-usd",
        method: "GET",
        auth: false,
        payment: {
          amount: 0.25,
          currency: "USD",
          mode: "address",
          payTo: "1DemoAddressNotReal000000000000000",
          conversion: "coingecko-live",
        },
        description:
          "USD-denominated pricing, converted to BSV at live exchange rates.",
      },
    ],
    errors: [
      {
        status: 402,
        body: { paymentRequired: true },
        description:
          "Payment required. Response body carries amount, payTo, network, and wallet hints.",
      },
      {
        status: 400,
        body: { error: "INVALID_TXID" },
        description: "Malformed X-BSV-TxId header.",
      },
      {
        status: 402,
        body: { error: "INSUFFICIENT_AMOUNT" },
        description: "Transaction found but underpays the quoted amount.",
      },
      {
        status: 402,
        body: { error: "TXID_NOT_FOUND" },
        description: "Transaction not yet visible on the network.",
      },
      {
        status: 410,
        body: { error: "TXID_USED" },
        description: "Transaction has already been spent against this endpoint.",
      },
    ],
    docs: "https://github.com/Ruthheasman/Bsv-Micropay-Middleware",
    contact: "https://github.com/Ruthheasman/Bsv-Micropay-Middleware/issues",
  });
});

app.use("/api", router);

export default app;
