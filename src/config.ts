import { config as loadDotenv } from "dotenv";
import { DEFAULT_NETWORK, getNetwork, type NetworkInfo } from "./networks.js";

loadDotenv();

export interface CashflowConfig {
  privateKey?: `0x${string}`;
  address?: `0x${string}`;
  network: NetworkInfo;
  facilitatorUrl?: string;
  sweepTo?: `0x${string}`;
  sweepThreshold?: number;
  swapFeeBps: number;
  swapFeeRecipient?: `0x${string}`;
  zeroExApiKey?: string;
}

function readAddress(name: string): `0x${string}` | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new Error(`${name} is set but is not a valid 0x-address: "${value}"`);
  }
  return value as `0x${string}`;
}

export function loadConfig(): CashflowConfig {
  const networkId = process.env.CASHFL0W_NETWORK || DEFAULT_NETWORK;

  return {
    privateKey: process.env.CASHFL0W_PRIVATE_KEY as `0x${string}` | undefined,
    address: readAddress("CASHFL0W_ADDRESS"),
    network: getNetwork(networkId),
    facilitatorUrl: process.env.CASHFL0W_FACILITATOR_URL,
    sweepTo: readAddress("CASHFL0W_SWEEP_TO"),
    sweepThreshold: process.env.CASHFL0W_SWEEP_THRESHOLD
      ? Number(process.env.CASHFL0W_SWEEP_THRESHOLD)
      : undefined,
    swapFeeBps: process.env.CASHFL0W_SWAP_FEE_BPS ? Number(process.env.CASHFL0W_SWAP_FEE_BPS) : 0,
    swapFeeRecipient: readAddress("CASHFL0W_SWAP_FEE_RECIPIENT"),
    zeroExApiKey: process.env.ZEROX_API_KEY,
  };
}
