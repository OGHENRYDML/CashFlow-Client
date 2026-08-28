import {
  createPublicClient,
  createWalletClient,
  http,
  type Account,
  type PublicClient,
  type Transport,
  type WalletClient
} from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

export type { Account, PublicClient, Transport, WalletClient };

/** Default public RPC for the Base mainnet (the x402-native chain). */
export const DEFAULT_RPC_URL = 'https://mainnet.base.org';
export const DEFAULT_CHAIN = base;

/** Public client bound to Base. */
export type BoundPublicClient = PublicClient<Transport, typeof base>;
/** Wallet client bound to Base with an attached account. */
export type BoundWalletClient = WalletClient<Transport, typeof base, Account>;

export type ClientBundle = {
  account: Account;
  publicClient: BoundPublicClient;
  walletClient: BoundWalletClient;
};

/** A freshly generated non-custodial wallet (private key never leaves the machine). */
export function newWallet(): { privateKey: `0x${string}`; address: `0x${string}` } {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return { privateKey, address: account.address };
}

/** Recover an account from a 0x-prefixed private key. */
export function accountFromKey(privateKey: `0x${string}`): Account {
  return privateKeyToAccount(privateKey);
}

/** Build viem clients (public + wallet) bound to Base and an RPC endpoint. */
export function createClients(
  privateKey: `0x${string}`,
  rpcUrl: string = DEFAULT_RPC_URL
): ClientBundle {
  const account = accountFromKey(privateKey);
  const transport = http(rpcUrl);
  const publicClient = createPublicClient({ chain: base, transport });
  const walletClient = createWalletClient({ chain: base, transport, account });
  return { account, publicClient, walletClient };
}
