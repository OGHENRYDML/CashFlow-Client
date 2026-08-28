import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { accountFromPrivateKey } from "../wallet.js";
import type { CashflowConfig } from "../config.js";

/**
 * `x402 out`: wraps `fetch` so any 402 Payment Required response the agent
 * hits while calling someone else's paid endpoint is paid automatically from
 * the agent's own wallet, then transparently retried.
 *
 * ```ts
 * const pay = payFetch(config);
 * const res = await pay("https://some-paid-api.com/data");
 * ```
 */
export function payFetch(config: CashflowConfig, fetchImpl: typeof fetch = fetch) {
  if (!config.privateKey) {
    throw new Error(
      "No wallet configured. Run `cashfl0w init` first, or set CASHFL0W_PRIVATE_KEY.",
    );
  }
  const account = accountFromPrivateKey(config.privateKey);

  return wrapFetchWithPaymentFromConfig(fetchImpl, {
    schemes: [
      {
        network: "eip155:*",
        client: new ExactEvmScheme(account),
      },
    ],
  });
}
