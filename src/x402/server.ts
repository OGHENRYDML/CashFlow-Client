import type { EthUsdPriceFn } from '../lib/amount.js';
import { parseAmount } from '../lib/amount.js';
import { decodePaymentHeaders, encodePaymentHeaders, type PaymentRequest, X402_VERSION } from './types.js';

/** A minimally-typed Express/Connect-compatible request object. */
export type HttpRequestLike = {
  headers: Record<string, string | string[] | undefined>;
  [key: string]: unknown;
};

/** A minimally-typed Express/Connect-compatible response object. */
export type HttpResponseLike = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
  [key: string]: unknown;
};

export type VerifyPaymentFn = (txHash: string, expected: PaymentRequest) => Promise<boolean>;

export type X402MiddlewareOptions = {
  /** Price to charge per request — an amount string or raw wei. */
  price: string | bigint;
  /** Recipient address (the agent wallet). */
  address: `0x${string}`;
  /** Chain id of the network the payment is made on. */
  network: number;
  /** Verifies a submitted transaction hash against the expected payment. */
  verify: VerifyPaymentFn;
  /** Oracle for `$` prices; omitted prices must be in wei/eth/gwei. */
  ethUsdPrice?: EthUsdPriceFn;
};

/**
 * Build an Express/Connect-compatible middleware that enforces an x402
 * payment on a route. Unpaid requests get `402 Payment Required` with the
 * payment details in headers; requests carrying a valid `x-402-payment`
 * transaction hash are allowed through.
 *
 * Usage (Express):
 *   app.use(agent.x402('$0.01'));
 */
export function x402Middleware(opts: X402MiddlewareOptions) {
  let cachedAmount: bigint | undefined;

  async function resolveAmount(): Promise<bigint> {
    if (cachedAmount !== undefined) return cachedAmount;
    if (typeof opts.price === 'bigint') {
      cachedAmount = opts.price;
    } else {
      const parsed = await parseAmount(opts.price, opts.ethUsdPrice);
      cachedAmount = parsed.valueWei;
    }
    return cachedAmount;
  }

  return async (
    req: HttpRequestLike,
    res: HttpResponseLike,
    next?: () => void
  ): Promise<void> => {
    const amount = await resolveAmount();
    const paymentReq: PaymentRequest = {
      version: X402_VERSION,
      network: String(opts.network),
      address: opts.address,
      amount,
      scheme: 'basic'
    };

    const paidTx = req.headers['x-402-payment'];
    if (paidTx) {
      const txHash = Array.isArray(paidTx) ? paidTx[0] : paidTx;
      const valid = await opts.verify(txHash, paymentReq);
      if (valid) {
        if (next) next();
        return;
      }
      res.statusCode = 402;
      res.setHeader('content-type', 'text/plain');
      res.end('x402: invalid or insufficient payment');
      return;
    }

    res.statusCode = 402;
    res.setHeader('content-type', 'text/plain');
    for (const [k, v] of Object.entries(encodePaymentHeaders(paymentReq))) {
      res.setHeader(k, v);
    }
    res.end('Payment required');
  };
}

/**
 * Verify a native-token payment transaction on-chain.
 * Returns true if the tx succeeded, was sent to the expected address, and
 * carried at least the expected amount.
 */
export async function verifyNativePayment(
  publicClient: { getTransactionReceipt: (a: { hash: `0x${string}` }) => Promise<{ status: string } | null>; getTransaction: (a: { hash: `0x${string}` }) => Promise<{ to: `0x${string}` | null; value: bigint }> },
  txHash: string,
  expected: PaymentRequest
): Promise<boolean> {
  const hash = txHash as `0x${string}`;
  const receipt = await publicClient.getTransactionReceipt({ hash });
  if (!receipt || receipt.status !== 'success') return false;
  const tx = await publicClient.getTransaction({ hash });
  if (!tx || !tx.to) return false;
  const toMatches = tx.to.toLowerCase() === expected.address.toLowerCase();
  const enough = tx.value >= expected.amount;
  return toMatches && enough;
}

export { decodePaymentHeaders, encodePaymentHeaders };
