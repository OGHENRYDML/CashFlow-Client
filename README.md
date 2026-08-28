# cashfl0w

**Wallets for your terminal and your agents.** A one-command, non-custodial
EVM + Solana wallet and x402 payment layer for autonomous agents.

```bash
npx cashfl0w init
```

Generates fresh non-custodial wallets — one EVM (Base), one Solana — writes
both to a local `.env`, and never sends either key anywhere. From there the
SDK gives the agent two primitives: charge for what it does (`charge`), and
pay for what it needs (`payFetch`), on either chain.

## Install

```bash
npm install cashfl0w
```

## CLI

```bash
npx cashfl0w init                    # generate EVM + Solana wallets, write .env
npx cashfl0w init -n eip155:8453     # EVM straight onto Base mainnet
npx cashfl0w init --evm-only         # skip the Solana wallet
npx cashfl0w init --solana-only      # skip the EVM wallet
npx cashfl0w whoami                   # show both addresses + balances
npx cashfl0w sweep                    # sweep EVM USDC balance to CASHFL0W_SWEEP_TO
npx cashfl0w sweep --swap             # also convert native balance to USDC via 0x first
npx cashfl0w sweep --chain solana     # sweep Solana USDC balance to CASHFL0W_SOLANA_SWEEP_TO
npx cashfl0w sweep --dry-run          # see what would happen, no transactions sent
```

`init` generates both an EVM keypair (viem/`secp256k1`) and a Solana keypair
(ed25519) by default — x402 itself is chain-agnostic (`ExactEvmScheme` /
`ExactSvmScheme`), so an agent can charge or pay on either. The one thing
that stays EVM-only is the `--swap` step on `sweep`: 0x, the mechanic behind
CASHFL0W's fee, doesn't operate on Solana. `sweep --chain solana` moves USDC
only, no conversion.

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

// x402 out — auto-pay any 402 you hit calling someone else's endpoint,
// with whichever wallet (EVM, Solana, or both) is configured
const fetchWithPayment = await payFetch(config);
const res = await fetchWithPayment("https://some-paid-api.com/data");
```

See `examples/server.ts` and `examples/client.ts` for runnable versions.

## Choosing a facilitator

A facilitator verifies and settles the on-chain payment on the resource
server's behalf. `cashfl0w` never makes you sign up for one to get started:

| Network | Default facilitator | Signup? |
|---|---|---|
| EVM testnet (`eip155:84532`, Base Sepolia) | [`x402.org/facilitator`](https://x402.org/facilitator) | None |
| EVM mainnet (`eip155:8453`, Base) | [`pay.openfacilitator.io`](https://www.openfacilitator.io/) | None |

`resolveFacilitator` picks by EVM network only — it's what both `charge`
and `payFetch` share for every registered scheme, EVM and Solana alike.
OpenFacilitator's shared endpoint is documented for EVM + Solana **mainnet**;
if you're pairing Base Sepolia with Solana **devnet** for testing, confirm
`x402.org/facilitator` actually settles your Solana scheme before relying on
it — override with `CASHFL0W_FACILITATOR_URL` if it doesn't.

**Why OpenFacilitator by default on mainnet:** it's the only production
facilitator that settles USDC fee-free on Base (and Solana) without an
account or API key — a perfect match for the "one command, no signup wall" positioning in
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

`sweep --chain solana` does the same USDC transfer on Solana, to
`CASHFL0W_SOLANA_SWEEP_TO` — but with no `--swap` equivalent. 0x doesn't
route Solana trades, so there's no swap-fee mechanic to plug in there yet;
a SOL balance stays a SOL balance until a Solana swap aggregator gets wired
up.

## Environment variables

See [`.env.example`](./.env.example) — `cashfl0w init` writes the wallet
ones for you.

## Scope

No card issuance, no fiat custody, no KYC flow. Off-ramping is the owner's
own problem, solved with whichever exchange they already trust. See the
CASHFL0W business plan for the reasoning.
