import { formatEther } from 'viem';
import type { Cashfl0wConfig, ConfigOverrides } from './config.js';
import { loadConfig } from './config.js';
import type { EthUsdPriceFn } from './lib/amount.js';
import { createClients } from './wallet.js';
import { x402Pay } from './x402/client.js';
import { verifyNativePayment, x402Middleware } from './x402/server.js';
import { sweep } from './sweep.js';

export type Agent = {
  /** The agent's own wallet address. */
  readonly address: `0x${string}`;
  /** Native balance of the agent wallet (wei). */
  balance(): Promise<bigint>;
  /** Native balance formatted as ETH. */
  balanceEth(): Promise<string>;
  /** Price oracle used for `$` amounts. */
  readonly ethUsdPrice: EthUsdPriceFn;
  /**
   * Express/Connect middleware that charges `price` per request via x402.
   * `price` may be an amount string (`'$0.01'`, `'0.001 ETH'`) or raw wei.
   */
  x402(price: string | bigint): ReturnType<typeof x402Middleware>;
  /** Pay for an x402-protected resource and return its response. */
  pay(url: string, init?: RequestInit): Promise<Response>;
  /** Move the wallet balance to an owner address (optionally on a USD threshold). */
  sweep(
    ownerAddress: `0x${string}`,
    opts?: { onThresholdUsd?: number; gasBufferRatio?: number }
  ): ReturnType<typeof sweep>;
};

/**
 * Create an agent wallet instance.
 *
 * With no arguments, config is loaded from the environment (see `loadConfig`).
 * Pass a partial config (or a full config) to override — useful for tests.
 */
export function createAgent(configOrOverrides?: Cashfl0wConfig | ConfigOverrides): Agent {
  const cfg: Cashfl0wConfig = isFullConfig(configOrOverrides)
    ? configOrOverrides
    : loadConfig(configOrOverrides);

  const { publicClient, walletClient, account } = createClients(
    cfg.privateKey,
    cfg.rpcUrl
  );

  return {
    address: account.address,
    ethUsdPrice: cfg.ethUsdPrice,

    balance: () => publicClient.getBalance({ address: account.address }),
    balanceEth: async () => formatEther(await publicClient.getBalance({ address: account.address })),

    x402: (price) =>
      x402Middleware({
        price,
        address: account.address,
        network: cfg.chainId,
        ethUsdPrice: cfg.ethUsdPrice,
        verify: (txHash, expected) => verifyNativePayment(publicClient, txHash, expected)
      }),

    pay: (url, init) =>
      x402Pay(url, { account, walletClient, network: String(cfg.chainId) }, init),

    sweep: (ownerAddress, opts) =>
      sweep(
        { account, publicClient, walletClient },
        {
          ownerAddress,
          onThresholdUsd: opts?.onThresholdUsd,
          gasBufferRatio: opts?.gasBufferRatio,
          ethUsdPrice: cfg.ethUsdPrice
        }
      )
  };
}

function isFullConfig(c?: Cashfl0wConfig | ConfigOverrides): c is Cashfl0wConfig {
  return !!c && 'address' in c && 'privateKey' in c && 'rpcUrl' in c && 'chainId' in c;
}
