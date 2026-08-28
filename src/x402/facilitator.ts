import { HTTPFacilitatorClient } from "@x402/core/server";
import type { CashflowConfig } from "../config.js";

/** Community-run, testnet-only facilitator. Free, no signup. Base Sepolia only. */
export const PUBLIC_TESTNET_FACILITATOR_URL = "https://x402.org/facilitator";

/**
 * OpenFacilitator's shared endpoint: free, no account, no API key, unlimited
 * requests, fee-free USDC settlement on EVM + Solana mainnet. This is the
 * default for mainnet traffic — it's the only production facilitator that
 * doesn't require signing up for a key, which matches the zero-friction,
 * indie-builder positioning from the business plan.
 */
export const OPEN_FACILITATOR_URL = "https://pay.openfacilitator.io";

/**
 * Picks an x402 facilitator for the configured network.
 *
 * - An explicit `CASHFL0W_FACILITATOR_URL` always wins (e.g. to point at
 *   Coinbase's CDP facilitator instead, if you later want its KYT screening).
 * - Testnet networks default to the public `x402.org/facilitator`.
 * - Mainnet defaults to OpenFacilitator — no signup, no API key.
 */
export function resolveFacilitator(config: CashflowConfig): HTTPFacilitatorClient {
  if (config.facilitatorUrl) {
    return new HTTPFacilitatorClient({ url: config.facilitatorUrl });
  }

  const url = config.network.isTestnet ? PUBLIC_TESTNET_FACILITATOR_URL : OPEN_FACILITATOR_URL;
  return new HTTPFacilitatorClient({ url });
}
