import type * as torii from "@dojoengine/torii-wasm";
import { ToriiGrpcClient } from "@dojoengine/grpc";
import { DEFAULT_CHAIN_ID, getToriiUrl, getWorldAddress } from "@/config";

type ChainLike = bigint | string | undefined | null;

const clientPromises = new Map<string, Promise<torii.ToriiClient>>();
const grpcClients = new Map<string, ToriiGrpcClient>();

function toChainIdHex(chainId: ChainLike) {
  if (typeof chainId === "bigint") {
    return `0x${chainId.toString(16)}`;
  }
  if (typeof chainId === "string") {
    return chainId.startsWith("0x") ? chainId.toLowerCase() : chainId;
  }
  return DEFAULT_CHAIN_ID;
}

export async function initToriiClient(chainId?: ChainLike) {
  const chainIdHex = toChainIdHex(chainId);
  const existing = clientPromises.get(chainIdHex);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    const module = await import("@dojoengine/torii-wasm");
    return new module.ToriiClient({
      toriiUrl: getToriiUrl(chainIdHex),
      worldAddress: getWorldAddress(chainIdHex),
    });
  })();

  clientPromises.set(chainIdHex, promise);
  return promise;
}

export function initGrpcClient(chainId?: ChainLike) {
  const chainIdHex = toChainIdHex(chainId);
  const existing = grpcClients.get(chainIdHex);
  if (existing) {
    return existing;
  }

  const client = new ToriiGrpcClient({
    toriiUrl: getToriiUrl(chainIdHex),
    worldAddress: getWorldAddress(chainIdHex),
  });

  grpcClients.set(chainIdHex, client);
  return client;
}
