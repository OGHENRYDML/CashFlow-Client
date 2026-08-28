import {
  createWalletClient,
  erc20Abi,
  http,
  numberToHex,
  parseUnits,
  size,
  type Address,
  type Chain,
  type Hex,
} from "viem";
import { base, baseSepolia } from "viem/chains";
import { accountFromPrivateKey, publicClientFor } from "./wallet.js";
import { getSwapQuote } from "./swap.js";
import type { CashflowConfig } from "./config.js";

export interface SweepOptions {
  /** Convert the wallet's native-token balance to USDC via 0x before sweeping. */
  swap?: boolean;
  /** Native amount to leave behind to cover future gas, in ETH. Default 0.0005. */
  gasReserve?: string;
  dryRun?: boolean;
}

const CHAINS_BY_ID: Record<number, Chain> = {
  [base.id]: base,
  [baseSepolia.id]: baseSepolia,
};

export interface SweepResult {
  swept: boolean;
  reason?: string;
  usdcAmount?: string;
  /** Chain-native transaction identifier — a 0x-hash on EVM, a base58 signature on Solana. */
  swapTxHash?: string;
  sweepTxHash?: string;
}

/**
 * `sweep`: moves the agent's USDC balance to the owner's own wallet
 * (`CASHFL0W_SWEEP_TO`). Call it on a cron once the balance crosses
 * `CASHFL0W_SWEEP_THRESHOLD`, or directly from `cashfl0w sweep`.
 *
 * When `swap` is set and `swapFeeBps` is configured, any native-token
 * balance above `gasReserve` is converted to USDC first through 0x — this is
 * the fee mechanic from the business plan: CASHFL0W's cut is paid on-chain
 * to `swapFeeRecipient` as part of that swap, nothing is billed separately.
 */
export async function sweep(config: CashflowConfig, options: SweepOptions = {}): Promise<SweepResult> {
  if (!config.privateKey) {
    throw new Error("No wallet configured. Run `cashfl0w init` first, or set CASHFL0W_PRIVATE_KEY.");
  }
  if (!config.sweepTo) {
    throw new Error("CASHFL0W_SWEEP_TO is not set — nowhere to sweep to.");
  }

  const account = accountFromPrivateKey(config.privateKey);
  const network = config.network;
  const chain = CHAINS_BY_ID[network.chainId];
  if (!chain) {
    throw new Error(`No viem chain definition for chainId ${network.chainId} (${network.name}).`);
  }
  const publicClient = publicClientFor(network);
  const walletClient = createWalletClient({ account, chain, transport: http(network.rpcUrl) });

  let swapTxHash: Hex | undefined;

  if (options.swap) {
    const reserve = parseUnits(options.gasReserve ?? "0.0005", 18);
    const nativeBalance = await publicClient.getBalance({ address: account.address });
    const sellAmount = nativeBalance > reserve ? nativeBalance - reserve : 0n;

    if (sellAmount > 0n) {
      const quote = await getSwapQuote({
        network,
        sellToken: "native",
        buyToken: network.usdc,
        sellAmount,
        taker: account.address,
        apiKey: config.zeroExApiKey,
        swapFeeBps: config.swapFeeBps,
        swapFeeRecipient: config.swapFeeBps > 0 ? config.swapFeeRecipient : undefined,
      });

      if (options.dryRun) {
        swapTxHash = undefined;
      } else {
        let txData = quote.transaction.data;
        if (quote.permit2?.eip712) {
          const signature = await walletClient.signTypedData(
            quote.permit2.eip712 as Parameters<typeof walletClient.signTypedData>[0],
          );
          const signatureLengthHex = numberToHex(size(signature), { signed: false, size: 32 });
          txData = (txData + signatureLengthHex.slice(2) + signature.slice(2)) as Hex;
        }

        swapTxHash = await walletClient.sendTransaction({
          to: quote.transaction.to,
          data: txData,
          value: BigInt(quote.transaction.value ?? "0"),
        });
        await publicClient.waitForTransactionReceipt({ hash: swapTxHash });
      }
    }
  }

  const [usdcBalance, decimals] = await Promise.all([
    publicClient.readContract({
      address: network.usdc,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account.address],
    }),
    publicClient.readContract({
      address: network.usdc,
      abi: erc20Abi,
      functionName: "decimals",
    }),
  ]);

  if (usdcBalance === 0n) {
    return { swept: false, reason: "USDC balance is 0, nothing to sweep.", swapTxHash };
  }

  if (config.sweepThreshold !== undefined) {
    const thresholdRaw = parseUnits(String(config.sweepThreshold), decimals);
    if (usdcBalance < thresholdRaw) {
      return {
        swept: false,
        reason: `USDC balance is below CASHFL0W_SWEEP_THRESHOLD (${config.sweepThreshold}).`,
        swapTxHash,
      };
    }
  }

  if (options.dryRun) {
    return { swept: false, reason: "Dry run — no transaction sent.", swapTxHash };
  }

  const sweepTxHash = await walletClient.writeContract({
    address: network.usdc,
    abi: erc20Abi,
    functionName: "transfer",
    args: [config.sweepTo as Address, usdcBalance],
  });
  await publicClient.waitForTransactionReceipt({ hash: sweepTxHash });

  return {
    swept: true,
    usdcAmount: (Number(usdcBalance) / 10 ** decimals).toString(),
    swapTxHash,
    sweepTxHash,
  };
}
