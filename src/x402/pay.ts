import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { ExactSvmScheme } from "@x402/svm/exact/client";
import { toClientSvmSigner } from "@x402/svm";
import type { SchemeRegistration } from "@x402/core/client";
import { accountFromPrivateKey } from "../wallet.js";
import { solanaSignerFromSecretKey } from "../solana/wallet.js";
import type { CashflowConfig } from "../config.js";

/**
 * `x402 out`: wraps `fetch` so any 402 Payment Required response the agent
 * hits while calling someone else's paid endpoint is paid automatically from
 * the agent's own wallet, then transparently retried. Pays with whichever
 * wallet — EVM, Solana, or both — is configured.
 *
 * ```ts
 * const pay = await payFetch(config);
 * const res = await pay("https://some-paid-api.com/data");
 * ```
 */
export async function payFetch(config: CashflowConfig, fetchImpl: typeof fetch = fetch) {
  const schemes: SchemeRegistration[] = [];

  if (config.privateKey) {
    schemes.push({ network: "eip155:*", client: new ExactEvmScheme(accountFromPrivateKey(config.privateKey)) });
  }
  if (config.solanaSecretKey) {
    const signer = await solanaSignerFromSecretKey(config.solanaSecretKey);
    schemes.push({ network: "solana:*", client: new ExactSvmScheme(toClientSvmSigner(signer)) });
  }
  if (schemes.length === 0) {
    throw new Error(
      "No wallet configured. Run `cashfl0w init` first, or set CASHFL0W_PRIVATE_KEY / CASHFL0W_SOLANA_PRIVATE_KEY.",
    );
  }

  return wrapFetchWithPaymentFromConfig(fetchImpl, { schemes });
}
