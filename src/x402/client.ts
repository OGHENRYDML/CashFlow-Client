import type { Account, BoundWalletClient } from '../wallet.js';
import { decodePaymentHeaders } from './types.js';

export type X402PayDeps = {
  account: Account;
  walletClient: BoundWalletClient;
  /** Chain id string to compare against the server's `x-402-network`. */
  network: string;
};

/**
 * Request a resource that may be protected by x402.
 *
 * If the server answers 402, this parses the payment details, sends the
 * required native-token transaction, then retries the request with the
 * transaction hash in the `x-402-payment` header.
 *
 * Returns the server's response (200 on success after payment).
 */
export async function x402Pay(
  url: string,
  deps: X402PayDeps,
  init?: RequestInit
): Promise<Response> {
  let res = await fetch(url, init);
  if (res.status !== 402) return res;

  const payment = decodePaymentHeaders(
    res.headers as unknown as Record<string, string | undefined>
  );
  if (payment.network !== deps.network) {
    throw new Error(
      `x402 network mismatch: server wants chain ${payment.network}, client is on ${deps.network}`
    );
  }

  const txHash = await deps.walletClient.sendTransaction({
    to: payment.address,
    value: payment.amount
  });

  const retryHeaders: Record<string, string> = {
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
    'x-402-payment': txHash
  };

  return fetch(url, { ...init, headers: retryHeaders });
}
