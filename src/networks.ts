/** Networks CASHFL0W ships support for, keyed by their CAIP-2 id. */
export interface NetworkInfo {
  /** CAIP-2 network id, e.g. "eip155:8453". */
  caip2: string;
  /** Numeric EVM chain id. */
  chainId: number;
  name: string;
  isTestnet: boolean;
  /** Canonical USDC contract on this network. */
  usdc: `0x${string}`;
  /** Public JSON-RPC endpoint (override with your own for production traffic). */
  rpcUrl: string;
  blockExplorer: string;
}

export const NETWORKS: Record<string, NetworkInfo> = {
  "eip155:8453": {
    caip2: "eip155:8453",
    chainId: 8453,
    name: "Base",
    isTestnet: false,
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    rpcUrl: "https://mainnet.base.org",
    blockExplorer: "https://basescan.org",
  },
  "eip155:84532": {
    caip2: "eip155:84532",
    chainId: 84532,
    name: "Base Sepolia",
    isTestnet: true,
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    rpcUrl: "https://sepolia.base.org",
    blockExplorer: "https://sepolia.basescan.org",
  },
};

export const DEFAULT_NETWORK = "eip155:84532";

export function getNetwork(caip2: string): NetworkInfo {
  const network = NETWORKS[caip2];
  if (!network) {
    throw new Error(
      `Unknown network "${caip2}". Supported: ${Object.keys(NETWORKS).join(", ")}. ` +
        `Set CASHFL0W_NETWORK to one of these, or extend src/networks.ts for your chain.`,
    );
  }
  return network;
}
