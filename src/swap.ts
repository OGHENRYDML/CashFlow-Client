import type { Address } from "viem";
import type { NetworkInfo } from "./networks.js";

const ZEROX_API_BASE = "https://api.0x.org";

export interface SwapQuoteParams {
  network: NetworkInfo;
  sellToken: Address | "native";
  buyToken: Address;
  /** Amount of `sellToken` to sell, in its smallest unit (wei / base units). */
  sellAmount: bigint;
  taker: Address;
  apiKey?: string;
  /** Basis points (0-1000) CASHFL0W takes as its fee on this swap. */
  swapFeeBps?: number;
  /** Address that receives the CASHFL0W swap fee. Required if swapFeeBps > 0. */
  swapFeeRecipient?: Address;
}

export interface ZeroExPermit2Quote {
  transaction: { to: Address; data: `0x${string}`; value: string; gas: string | null };
  permit2?: { eip712: Record<string, unknown> };
  sellAmount: string;
  buyAmount: string;
  fees?: { integratorFee?: { amount: string; token: Address } | null };
  issues?: Record<string, unknown>;
}

/**
 * Fetches a firm, executable quote from the 0x Swap API (Permit2 endpoint),
 * with a CASHFL0W affiliate fee attached when `swapFeeBps` is set. This is
 * the monetization mechanic from the business plan: `swapFeeBps` is
 * CASHFL0W's own cut, paid on-chain straight to `swapFeeRecipient` as part
 * of the swap — no custody, no separate billing step.
 */
export async function getSwapQuote(params: SwapQuoteParams): Promise<ZeroExPermit2Quote> {
  if (params.swapFeeBps && params.swapFeeBps > 0 && !params.swapFeeRecipient) {
    throw new Error("swapFeeRecipient is required when swapFeeBps > 0");
  }

  const search = new URLSearchParams({
    chainId: String(params.network.chainId),
    sellToken: params.sellToken === "native" ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" : params.sellToken,
    buyToken: params.buyToken,
    sellAmount: params.sellAmount.toString(),
    taker: params.taker,
  });

  if (params.swapFeeBps && params.swapFeeBps > 0 && params.swapFeeRecipient) {
    search.set("swapFeeBps", String(params.swapFeeBps));
    search.set("swapFeeRecipient", params.swapFeeRecipient);
    search.set("swapFeeToken", params.buyToken);
  }

  const res = await fetch(`${ZEROX_API_BASE}/swap/permit2/quote?${search.toString()}`, {
    headers: {
      "0x-api-key": params.apiKey ?? "",
      "0x-version": "v2",
    },
  });

  if (!res.ok) {
    throw new Error(`0x quote failed (${res.status}): ${await res.text()}`);
  }

  return (await res.json()) as ZeroExPermit2Quote;
}
