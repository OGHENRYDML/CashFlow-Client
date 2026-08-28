import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount, TokenAccountNotFoundError } from "@solana/spl-token";
import { createKeyPairSignerFromBytes, type KeyPairSigner } from "@solana/kit";
import { base58 } from "@scure/base";
import type { SolanaNetworkInfo } from "./networks.js";

export interface GeneratedSolanaWallet {
  /** Base58-encoded 64-byte secret key (the standard Solana keypair format). */
  secretKey: string;
  address: string;
}

/**
 * Generates a fresh non-custodial Solana keypair. Returned to the caller
 * only — CASHFL0W never transmits it anywhere or takes custody of it.
 */
export function createSolanaWallet(): GeneratedSolanaWallet {
  const keypair = Keypair.generate();
  return { secretKey: base58.encode(keypair.secretKey), address: keypair.publicKey.toBase58() };
}

/** Converts a base58 secret key into the signer x402's SVM schemes expect. */
export function solanaSignerFromSecretKey(secretKey: string): Promise<KeyPairSigner> {
  return createKeyPairSignerFromBytes(base58.decode(secretKey));
}

export function connectionFor(network: SolanaNetworkInfo): Connection {
  return new Connection(network.rpcUrl, "confirmed");
}

/** Native SOL balance, formatted as a decimal string. */
export async function getSolBalance(network: SolanaNetworkInfo, address: string): Promise<string> {
  const connection = connectionFor(network);
  const lamports = await connection.getBalance(new PublicKey(address));
  return (lamports / LAMPORTS_PER_SOL).toString();
}

/** USDC balance on `network` for `address`, formatted as a decimal string. */
export async function getSolanaUsdcBalance(
  network: SolanaNetworkInfo,
  address: string,
): Promise<string> {
  const connection = connectionFor(network);
  const owner = new PublicKey(address);
  const mint = new PublicKey(network.usdc);
  const ata = await getAssociatedTokenAddress(mint, owner);
  try {
    const account = await getAccount(connection, ata);
    // USDC is 6 decimals on every network x402/svm supports.
    return (Number(account.amount) / 1_000_000).toString();
  } catch (err) {
    if (err instanceof TokenAccountNotFoundError) return "0";
    throw err;
  }
}
