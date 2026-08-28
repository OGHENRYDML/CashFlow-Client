import { USDC_DEVNET_ADDRESS, USDC_MAINNET_ADDRESS } from "@x402/svm";

/** Networks CASHFL0W ships Solana support for, keyed by their CAIP-2 id. */
export interface SolanaNetworkInfo {
  /** CAIP-2 network id, e.g. "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp". */
  caip2: string;
  cluster: "mainnet-beta" | "devnet";
  name: string;
  isTestnet: boolean;
  /** Canonical USDC mint on this cluster, from @x402/svm. */
  usdc: string;
  rpcUrl: string;
}

export const SOLANA_NETWORKS: Record<string, SolanaNetworkInfo> = {
  "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": {
    caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    cluster: "mainnet-beta",
    name: "Solana",
    isTestnet: false,
    usdc: USDC_MAINNET_ADDRESS,
    rpcUrl: "https://api.mainnet-beta.solana.com",
  },
  "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1": {
    caip2: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    cluster: "devnet",
    name: "Solana Devnet",
    isTestnet: true,
    usdc: USDC_DEVNET_ADDRESS,
    rpcUrl: "https://api.devnet.solana.com",
  },
};

export const DEFAULT_SOLANA_NETWORK = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";

export function getSolanaNetwork(caip2: string): SolanaNetworkInfo {
  const network = SOLANA_NETWORKS[caip2];
  if (!network) {
    throw new Error(
      `Unknown Solana network "${caip2}". Supported: ${Object.keys(SOLANA_NETWORKS).join(", ")}.`,
    );
  }
  return network;
}
