/**
 * Minimal example: an agent charging for its own endpoint with `charge`
 * (x402 in). Run with `npx tsx examples/server.ts` after `cashfl0w init`.
 */
import express from "express";
import { charge, loadConfig } from "../src/index.js";

const config = loadConfig();
if (!config.address) {
  throw new Error("Run `cashfl0w init` first.");
}

const app = express();

app.use(
  charge(
    {
      "GET /premium": {
        accepts: {
          scheme: "exact",
          price: "$0.01",
          network: config.network.caip2,
          payTo: config.address,
        },
        description: "Example premium endpoint",
      },
    },
    config,
  ),
);

app.get("/premium", (_req, res) => {
  res.json({ message: "Paid content unlocked." });
});

const port = 3000;
app.listen(port, () => console.log(`Charging on http://localhost:${port}/premium`));
