import type { EthUsdPriceFn } from './lib/amount.js';
import { getEthUsdPrice } from './lib/amount.js';
import { accountFromKey, DEFAULT_RPC_URL } from './wallet.js';

export type Cashfl0wConfig = {
  /** Private key (0x-prefixed). Read from CASHFL0W_PRIVATE_KEY. */
  privateKey: `0x${string}`;
  /** Derived address. */
  address: `0x${string}`;
  /** RPC endpoint for the active chain. */
  rpcUrl: string;
  /** Chain id (defaults to Base = 8453). */
  chainId: number;
  /** Optional owner address used by sweep when none is passed explicitly. */
  ownerAddress?: `0x${string}`;
  /** ETH/USD oracle for `$` amounts. */
  ethUsdPrice: EthUsdPriceFn;
};

export type ConfigOverrides = Partial<Omit<Cashfl0wConfig, 'address'>>;

/**
 * Load the agent config from environment variables.
 *
 *   CASHFL0W_PRIVATE_KEY  (required)
 *   CASHFL0W_RPC_URL      (default: https://mainnet.base.org)
 *   CASHFL0W_CHAIN_ID     (default: 8453)
 *   CASHFL0W_OWNER_ADDRESS (optional)
 */
export function loadConfig(overrides: ConfigOverrides = {}): Cashfl0wConfig {
  const privateKey = (overrides.privateKey ?? process.env.CASHFL0W_PRIVATE_KEY) as
    | `0x${string}`
    | undefined;
  if (!privateKey) {
    throw new Error(
      'CASHFL0W_PRIVATE_KEY is not set. Run `cashfl0w init` to create a wallet, or set the env var.'
    );
  }
  const address = accountFromKey(privateKey).address;
  const rpcUrl = overrides.rpcUrl ?? process.env.CASHFL0W_RPC_URL ?? DEFAULT_RPC_URL;
  const chainId = overrides.chainId ?? Number(process.env.CASHFL0W_CHAIN_ID ?? 8453);
  const ownerAddress = (overrides.ownerAddress ??
    (process.env.CASHFL0W_OWNER_ADDRESS || undefined)) as `0x${string}` | undefined;
  const ethUsdPrice = overrides.ethUsdPrice ?? getEthUsdPrice;

  return { privateKey, address, rpcUrl, chainId, ownerAddress, ethUsdPrice };
}
