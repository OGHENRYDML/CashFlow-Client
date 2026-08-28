import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import {
  createPublicClient,
  erc20Abi,
  formatUnits,
  http,
  type Address,
  type HttpTransport,
  type PublicClient,
} from "viem";
import type { NetworkInfo } from "./networks.js";

export interface GeneratedWallet {
  privateKey: `0x${string}`;
  address: Address;
}

/**
 * Generates a fresh non-custodial keypair. The private key is returned to the
 * caller only — CASHFL0W never transmits it anywhere or takes custody of it.
 */
export function createWallet(): GeneratedWallet {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return { privateKey, address: account.address };
}

export function accountFromPrivateKey(privateKey: `0x${string}`): PrivateKeyAccount {
  return privateKeyToAccount(privateKey);
}

export function publicClientFor(network: NetworkInfo): PublicClient<HttpTransport> {
  return createPublicClient({
    transport: http(network.rpcUrl),
  });
}

/** Native gas-token balance, formatted as a decimal string. */
export async function getNativeBalance(network: NetworkInfo, address: Address): Promise<string> {
  const client = publicClientFor(network);
  const balance = await client.getBalance({ address });
  return formatUnits(balance, 18);
}

/** USDC balance on `network` for `address`, formatted as a decimal string. */
export async function getUsdcBalance(network: NetworkInfo, address: Address): Promise<string> {
  const client = publicClientFor(network);
  const [balance, decimals] = await Promise.all([
    client.readContract({
      address: network.usdc,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address],
    }),
    client.readContract({
      address: network.usdc,
      abi: erc20Abi,
      functionName: "decimals",
    }),
  ]);
  return formatUnits(balance, decimals);
}
