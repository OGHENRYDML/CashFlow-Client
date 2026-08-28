import { Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddress,
  TokenAccountNotFoundError,
} from "@solana/spl-token";
import { base58 } from "@scure/base";
import { connectionFor } from "./wallet.js";
import type { CashflowConfig } from "../config.js";
import type { SweepResult } from "../sweep.js";

/**
 * Sweeps the agent's Solana USDC balance to `CASHFL0W_SOLANA_SWEEP_TO`.
 *
 * Unlike the EVM `sweep`, there's no `--swap` step here: 0x — the swap
 * routing behind CASHFL0W's fee — doesn't operate on Solana. This moves
 * USDC only; a SOL-to-USDC conversion is out of scope until a Solana swap
 * aggregator gets wired up.
 */
export async function sweepSolana(config: CashflowConfig, dryRun = false): Promise<SweepResult> {
  if (!config.solanaSecretKey) {
    throw new Error(
      "No Solana wallet configured. Run `cashfl0w init` first, or set CASHFL0W_SOLANA_PRIVATE_KEY.",
    );
  }
  if (!config.solanaSweepTo) {
    throw new Error("CASHFL0W_SOLANA_SWEEP_TO is not set — nowhere to sweep to.");
  }

  const network = config.solanaNetwork;
  const connection = connectionFor(network);
  const keypair = Keypair.fromSecretKey(base58.decode(config.solanaSecretKey));
  const mint = new PublicKey(network.usdc);
  const destination = new PublicKey(config.solanaSweepTo);

  const sourceAta = await getAssociatedTokenAddress(mint, keypair.publicKey);

  let balance: bigint;
  try {
    balance = (await getAccount(connection, sourceAta)).amount;
  } catch (err) {
    if (err instanceof TokenAccountNotFoundError) balance = 0n;
    else throw err;
  }

  if (balance === 0n) {
    return { swept: false, reason: "USDC balance is 0, nothing to sweep." };
  }

  if (config.sweepThreshold !== undefined) {
    const thresholdRaw = BigInt(Math.round(config.sweepThreshold * 1_000_000));
    if (balance < thresholdRaw) {
      return {
        swept: false,
        reason: `USDC balance is below CASHFL0W_SWEEP_THRESHOLD (${config.sweepThreshold}).`,
      };
    }
  }

  if (dryRun) {
    return { swept: false, reason: "Dry run — no transaction sent." };
  }

  const destinationAta = await getAssociatedTokenAddress(mint, destination);
  const transaction = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(
      keypair.publicKey,
      destinationAta,
      destination,
      mint,
    ),
    createTransferCheckedInstruction(sourceAta, mint, destinationAta, keypair.publicKey, balance, 6),
  );

  const sweepTxHash = await sendAndConfirmTransaction(connection, transaction, [keypair]);

  return {
    swept: true,
    usdcAmount: (Number(balance) / 1_000_000).toString(),
    sweepTxHash,
  };
}
