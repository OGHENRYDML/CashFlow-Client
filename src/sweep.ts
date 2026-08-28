import { formatEther } from 'viem';
import type { EthUsdPriceFn } from './lib/amount.js';
import type { Account, BoundPublicClient, BoundWalletClient } from './wallet.js';

export type SweepDeps = {
  account: Account;
  publicClient: BoundPublicClient;
  walletClient: BoundWalletClient;
};

export type SweepOptions = {
  /** Owner wallet that receives the balance. */
  ownerAddress: `0x${string}`;
  /** Only sweep when the USD value of the balance reaches this threshold. */
  onThresholdUsd?: number;
  /** Oracle used to convert balance to USD (required when onThresholdUsd is set). */
  ethUsdPrice?: EthUsdPriceFn;
  /** Fraction of the balance left behind as a gas buffer (default 0.005). */
  gasBufferRatio?: number;
};

export type SweepResult =
  | { swept: false; reason: string; balanceWei: bigint; balanceEth: string }
  | {
      swept: true;
      balanceWei: bigint;
      balanceEth: string;
      sentWei: bigint;
      sentEth: string;
      txHash: `0x${string}`;
    };

/**
 * Move the agent wallet's native balance to the owner wallet.
 *
 * When `onThresholdUsd` is set, the sweep is a no-op until the balance's USD
 * value reaches the threshold — this is the "sweep on threshold" behaviour.
 */
export async function sweep(deps: SweepDeps, opts: SweepOptions): Promise<SweepResult> {
  const balance = await deps.publicClient.getBalance({ address: deps.account.address });
  const balanceEth = formatEther(balance);

  if (opts.onThresholdUsd !== undefined) {
    if (!opts.ethUsdPrice) {
      throw new Error('sweep: onThresholdUsd requires an ethUsdPrice oracle');
    }
    const price = await opts.ethUsdPrice();
    const usdValue = Number(balanceEth) * price;
    if (usdValue < opts.onThresholdUsd) {
      return {
        swept: false,
        reason: `below threshold ($${usdValue.toFixed(2)} < $${opts.onThresholdUsd})`,
        balanceWei: balance,
        balanceEth
      };
    }
  }

  if (balance <= 0n) {
    return { swept: false, reason: 'balance is zero', balanceWei: balance, balanceEth };
  }

  const gasBufferRatio = opts.gasBufferRatio ?? 0.005;
  const buffer = (balance * BigInt(Math.round(gasBufferRatio * 1_000_000))) / 1_000_000n;
  const sent = balance - buffer;
  if (sent <= 0n) {
    return { swept: false, reason: 'balance too small to cover gas', balanceWei: balance, balanceEth };
  }

  const txHash = await deps.walletClient.sendTransaction({
    to: opts.ownerAddress,
    value: sent
  });

  return {
    swept: true,
    balanceWei: balance,
    balanceEth,
    sentWei: sent,
    sentEth: formatEther(sent),
    txHash
  };
}
