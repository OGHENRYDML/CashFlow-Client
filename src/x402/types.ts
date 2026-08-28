/**
 * Minimal x402 implementation (https://x402.org).
 *
 * x402 uses HTTP 402 "Payment Required" plus a handful of `x-402-*` headers
 * to describe an on-chain payment. A client sends the payment transaction,
 * then retries the request carrying the transaction hash in `x-402-payment`.
 *
 * This module implements the "basic" scheme for native-token payments.
 */

export const X402_VERSION = '1';

export type PaymentRequest = {
  /** x402 protocol version. */
  version: string;
  /** Chain id as a decimal string (e.g. "8453" for Base). */
  network: string;
  /** Recipient address the payment must be sent to. */
  address: `0x${string}`;
  /** Amount in wei (native token). */
  amount: bigint;
  /** Payment scheme; only "basic" is implemented. */
  scheme?: string;
};

export type RawHeaders = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Encode a payment request into the x402 response headers. */
export function encodePaymentHeaders(req: PaymentRequest): Record<string, string> {
  return {
    'x-402-version': req.version,
    'x-402-network': req.network,
    'x-402-address': req.address,
    'x-402-price': req.amount.toString(),
    ...(req.scheme ? { 'x-402-scheme': req.scheme } : {})
  };
}

/** Parse and validate x402 headers from an HTTP response. */
export function decodePaymentHeaders(headers: RawHeaders): PaymentRequest {
  const version = first(headers['x-402-version']);
  const network = first(headers['x-402-network']);
  const address = first(headers['x-402-address']);
  const price = first(headers['x-402-price']);
  const scheme = first(headers['x-402-scheme']);

  if (!version) throw new Error('Missing x-402-version header');
  if (!network) throw new Error('Missing x-402-network header');
  if (!address) throw new Error('Missing x-402-address header');
  if (price === undefined || price === '') throw new Error('Missing x-402-price header');
  if (!/^\d+$/.test(price)) throw new Error(`Invalid x-402-price: "${price}"`);

  return {
    version,
    network,
    address: address as `0x${string}`,
    amount: BigInt(price),
    ...(scheme ? { scheme } : {})
  };
}
