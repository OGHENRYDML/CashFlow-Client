# cashfl0w

> Non-custodial wallet + [x402](https://x402.org) payments for your terminal and your AI agents.

One command creates a wallet. Your agent charges for what it does, pays for what it
needs, and sweeps its earnings to your own wallet — no custody, no dashboard, no forms.

```sh
npx cashfl0w init        # new wallet, keys written to .env
```

## Features

- 🔑 **Non-custodial** — the private key is generated locally and written to your
  `.env` (kept out of git). Nothing is ever uploaded or custodied.
- ⚡ **x402 in the box** — an Express/Connect middleware that charges per request, and a
  client that pays for x402-protected resources. Implemented against the x402 "basic"
  scheme for native-token payments on Base.
- 🧹 **Sweep** — move the agent wallet's balance to your own wallet, on a command or a
  USD threshold (`onThreshold`).

## Install

```sh
npm install cashfl0w
# or use it without installing:
npx cashfl0w init
```

Requires Node 18+.

## CLI

```sh
cashfl0w init                        # create a wallet, write CASHFL0W_PRIVATE_KEY to .env
cashfl0w address                     # print the agent wallet address
cashfl0w balance                     # show address + native balance
cashfl0w sweep --to 0xOWNER          # send the balance to the owner wallet
cashfl0w sweep --to 0xOWNER --threshold 50   # only when balance >= $50
cashfl0w pay https://api.example.com/data    # pay for an x402-protected resource
```

## SDK

```ts
import { agent } from 'cashfl0w';

// 1. Charge $0.01 per request on an Express route
app.use(agent.x402('$0.01'));

// 2. Pay for an x402-protected resource
const res = await agent.pay('https://api.example.com/data');

// 3. Sweep earnings to your wallet once they pass $50
await agent.sweep('0xYourWallet', { onThresholdUsd: 50 });

// Or check balance / address anytime
console.log(agent.address);
console.log(await agent.balanceEth());
```

### Amounts

`agent.x402` and the CLI accept amount strings:

| Form             | Meaning                                   |
| ---------------- | ----------------------------------------- |
| `'$0.01'`        | $0.01 of native token (needs a price oracle) |
| `'0.01 ETH'`     | 0.01 ETH                                  |
| `'1 gwei'`       | 1 gwei                                    |
| `'1000000000000'`| raw wei                                   |

USD amounts use a price oracle. The default fetches ETH/USD from CoinGecko; pass your
own with `createAgent({ ethUsdPrice })`.

### Configuration (environment)

| Variable                 | Default                     | Purpose                              |
| ------------------------ | --------------------------- | ------------------------------------ |
| `CASHFL0W_PRIVATE_KEY`   | — (required)                | The agent wallet's private key       |
| `CASHFL0W_RPC_URL`       | `https://mainnet.base.org`  | RPC endpoint for on-chain reads/writes |
| `CASHFL0W_CHAIN_ID`      | `8453` (Base)               | Chain id advertised in x402 headers  |
| `CASHFL0W_OWNER_ADDRESS` | —                           | Default owner for `sweep`            |

### Advanced

```ts
import { createAgent, newWallet, parseAmount, x402Middleware } from 'cashfl0w';

// Full control (useful for tests or a custom chain/oracle)
const a = createAgent({
  privateKey: process.env.CASHFL0W_PRIVATE_KEY as `0x${string}`,
  rpcUrl: 'https://mainnet.base.org',
  chainId: 8453,
  ethUsdPrice: async () => 2000
});
```

## How x402 works here

1. A client requests a protected resource.
2. The server answers `402 Payment Required` with `x-402-address`, `x-402-price`
   (wei) and `x-402-network` headers.
3. The client sends the native-token transaction on-chain.
4. The client retries the request carrying the transaction hash in `x-402-payment`.
5. The server verifies the transaction (to, value, status) and serves the resource.

This package implements the **"basic"** x402 scheme for native-token payments on Base.
Token (ERC-20) payments and more complex schemes are a natural extension point.

## Development

```sh
npm install
npm run build      # tsup -> dist/
npm test           # node --test (unit tests, no network/RPC required)
npm run typecheck  # tsc --noEmit
```

## License

MIT
