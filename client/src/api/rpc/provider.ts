import { RpcProvider } from "starknet";
import {
  DEFAULT_CHAIN_ID,
  DEFAULT_SEPOLIA_RPC_URL,
  getRpcUrl,
} from "@/config";

type ChainLike = bigint | string | undefined | null;

type RpcProviderLike = Pick<
  RpcProvider,
  "callContract" | "waitForTransaction" | "getTransactionReceipt"
>;

const providers = new Map<string, RpcProviderLike>();
const providerPools = new Map<string, RpcProvider[]>();

function toChainIdHex(chainId: ChainLike) {
  if (typeof chainId === "bigint") {
    return `0x${chainId.toString(16)}`;
  }
  if (typeof chainId === "string") {
    return chainId.startsWith("0x") ? chainId.toLowerCase() : chainId;
  }
  return DEFAULT_CHAIN_ID;
}

function getProviderUrls(chainIdHex: string) {
  const configuredUrl = getRpcUrl(chainIdHex);
  const urls = [configuredUrl];

  if (
    chainIdHex === DEFAULT_CHAIN_ID &&
    configuredUrl !== DEFAULT_SEPOLIA_RPC_URL
  ) {
    urls.push(DEFAULT_SEPOLIA_RPC_URL);
  }

  return [...new Set(urls.filter(Boolean))];
}

function getProviderPool(chainIdHex: string) {
  const existing = providerPools.get(chainIdHex);
  if (existing) {
    return existing;
  }

  const created = getProviderUrls(chainIdHex).map(
    (nodeUrl) => new RpcProvider({ nodeUrl }),
  );
  providerPools.set(chainIdHex, created);
  return created;
}

async function callWithFallback<T>(
  chainIdHex: string,
  method: keyof RpcProviderLike,
  args: unknown[],
): Promise<T> {
  const pool = getProviderPool(chainIdHex);
  const urls = getProviderUrls(chainIdHex);
  let lastError: unknown;

  for (let index = 0; index < pool.length; index += 1) {
    const provider = pool[index];

    try {
      const callable = provider[method] as (...params: unknown[]) => Promise<T>;
      return await callable.apply(provider, args);
    } catch (error) {
      lastError = error;

      if (index < pool.length - 1) {
        console.warn(
          `[ABYSS_RPC] ${String(method)} failed on ${urls[index]}, retrying fallback RPC`,
          error,
        );
      }
    }
  }

  throw lastError;
}

export function getRpcProvider(chainId?: ChainLike) {
  const chainIdHex = toChainIdHex(chainId);
  const existing = providers.get(chainIdHex);
  if (existing) {
    return existing;
  }

  const provider: RpcProviderLike = {
    callContract: (...args) =>
      callWithFallback(chainIdHex, "callContract", args as unknown[]),
    waitForTransaction: (...args) =>
      callWithFallback(chainIdHex, "waitForTransaction", args as unknown[]),
    getTransactionReceipt: (...args) =>
      callWithFallback(
        chainIdHex,
        "getTransactionReceipt",
        args as unknown[],
      ),
  };

  providers.set(chainIdHex, provider);
  return provider;
}
