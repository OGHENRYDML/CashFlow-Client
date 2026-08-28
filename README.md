# cashfl0w

**Wallets for your terminal and your agents.** A one-command, non-custodial
EVM wallet and x402 payment layer for autonomous agents.

```bash
npx cashfl0w init
```

Generates a fresh non-custodial wallet (Base, or Base Sepolia for testing),
writes the key to a local `.env`, and never sends it anywhere. From there
the SDK gives the agent two primitives: charge for what it does (`charge`),
and pay for what it needs (`payFetch`).

## Install

```bash
npm install cashfl0w
```

## CLI

```bash
npx cashfl0w init                 # generate a wallet, write .env
npx cashfl0w init -n eip155:8453  # generate straight onto Base mainnet
npx cashfl0w whoami                # show address + native/USDC balances
npx cashfl0w sweep                 # sweep USDC balance to CASHFL0W_SWEEP_TO
npx cashfl0w sweep --swap          # also convert native balance to USDC via 0x first
npx cashfl0w sweep --dry-run       # see what would happen, no transactions sent
```

`init` only ever generates an EVM keypair (viem/`secp256k1`) — the plan's
monetization mechanic runs through 0x, which is EVM-only, so a Solana wallet
here would be dead weight, not a feature.

## SDK

```ts
import { charge, payFetch, loadConfig } from "cashfl0w";

const config = loadConfig();

// x402 in — charge for your own endpoint (Express middleware)
app.use(charge({
  "GET /premium": {
    accepts: { scheme: "exact", price: "$0.01", network: config.network.caip2, payTo: config.address! },
  },
}, config));

// x402 out — auto-pay any 402 you hit calling someone else's endpoint
const fetchWithPayment = payFetch(config);
const res = await fetchWithPayment("https://some-paid-api.com/data");
```

See `examples/server.ts` and `examples/client.ts` for runnable versions.

## Choosing a facilitator

A facilitator verifies and settles the on-chain payment on the resource
server's behalf. `cashfl0w` never makes you sign up for one to get started:

| Network | Default facilitator | Signup? |
|---|---|---|
| Testnet (`eip155:84532`, Base Sepolia) | [`x402.org/facilitator`](https://x402.org/facilitator) | None |
| Mainnet (`eip155:8453`, Base) | [`pay.openfacilitator.io`](https://www.openfacilitator.io/) | None |

**Why OpenFacilitator by default on mainnet:** it's the only production
facilitator that settles USDC fee-free on Base without an account or API
key — a perfect match for the "one command, no signup wall" positioning in
the business plan. Coinbase's CDP facilitator is also free and fee-free,
but requires a CDP API key pair (free, ~2 minutes at
[portal.cdp.coinbase.com](https://portal.cdp.coinbase.com)) and adds KYT
screening — worth switching to later if compliance tooling matters more
than zero-signup. It's not wired up as a URL swap like the others: install
`@coinbase/x402` and pass its `facilitator` config into
`HTTPFacilitatorClient` inside `src/x402/facilitator.ts` (see the
[`@coinbase/x402` README](https://www.npmjs.com/package/@coinbase/x402)).

Either way, the facilitator is swappable in one place (`src/x402/facilitator.ts`)
so this is a config change, never a rewrite — the same abstraction the
business plan's risk section calls out for 0x.

## `sweep` and the swap fee

`sweep` moves the agent's USDC balance to `CASHFL0W_SWEEP_TO` — the owner's
own wallet, outside CASHFL0W's reach. With `--swap`, any native-token
balance above a small gas reserve is converted to USDC through the 0x Swap
API first. If `CASHFL0W_SWAP_FEE_BPS` and `CASHFL0W_SWAP_FEE_RECIPIENT` are
set, that swap carries CASHFL0W's affiliate fee, paid on-chain as part of
the trade — this is the entire business model from the plan: the wallet
tooling is free, the swap fee on the way through is not.

## Environment variables

See [`.env.example`](./.env.example) — `cashfl0w init` writes the wallet
ones for you.

## Scope

No card issuance, no fiat custody, no KYC flow. Off-ramping is the owner's
own problem, solved with whichever exchange they already trust. See the
CASHFL0W business plan for the reasoning.
