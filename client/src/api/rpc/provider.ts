import { RpcProvider } from "starknet";
import { DEFAULT_CHAIN_ID, getRpcUrl } from "@/config";

type ChainLike = bigint | string | undefined | null;

const providers = new Map<string, RpcProvider>();

function toChainIdHex(chainId: ChainLike) {
  if (typeof chainId === "bigint") {
    return `0x${chainId.toString(16)}`;
  }
  if (typeof chainId === "string") {
    return chainId.startsWith("0x") ? chainId.toLowerCase() : chainId;
  }
  return DEFAULT_CHAIN_ID;
}

export function getRpcProvider(chainId?: ChainLike) {
  const chainIdHex = toChainIdHex(chainId);
  const existing = providers.get(chainIdHex);
  if (existing) {
    return existing;
  }

  const provider = new RpcProvider({ nodeUrl: getRpcUrl(chainIdHex) });
  providers.set(chainIdHex, provider);
  return provider;
}

