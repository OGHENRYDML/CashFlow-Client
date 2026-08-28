/**
 * Minimal example: an agent auto-paying a 402 response with `payFetch`
 * (x402 out). Run with `npx tsx examples/client.ts` after `cashfl0w init`
 * and funding the wallet with testnet USDC.
 */
import { loadConfig, payFetch } from "../src/index.js";

const config = loadConfig();
const fetchWithPayment = await payFetch(config);

const res = await fetchWithPayment("http://localhost:3000/premium");
console.log(await res.json());
