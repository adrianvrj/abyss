import { createDojoConfig } from "@dojoengine/core";
import { mainnet, sepolia } from "@starknet-react/chains";
import { shortString } from "starknet";
import manifestSepolia from "@/lib/manifest.json";

export const NAMESPACE = "ABYSS";

export const SEPOLIA_CHAIN_ID = shortString.encodeShortString("SN_SEPOLIA");
export const MAINNET_CHAIN_ID = shortString.encodeShortString("SN_MAIN");
const DEFAULT_NETWORK = (import.meta.env.VITE_DEFAULT_CHAIN || "sepolia").toLowerCase();
export const DEFAULT_CHAIN_ID =
  DEFAULT_NETWORK === "mainnet" ? MAINNET_CHAIN_ID : SEPOLIA_CHAIN_ID;

export const DEFAULT_SEPOLIA_RPC_URL =
  "https://api.cartridge.gg/x/starknet/sepolia";
export const DEFAULT_SEPOLIA_TORII_URL =
  "https://api.cartridge.gg/x/abyss/torii";
export const DEFAULT_MAINNET_RPC_URL =
  "https://api.cartridge.gg/x/starknet/mainnet";
export const DEFAULT_MAINNET_TORII_URL =
  "https://api.cartridge.gg/x/abyss-mainnet/torii";

const dojoConfigSepolia = createDojoConfig({
  rpcUrl:
    import.meta.env.VITE_SN_SEPOLIA_RPC_URL ||
    import.meta.env.VITE_STARKNET_RPC_URL ||
    DEFAULT_SEPOLIA_RPC_URL,
  toriiUrl:
    import.meta.env.VITE_SN_SEPOLIA_TORII_URL ||
    import.meta.env.VITE_TORII_URL ||
    DEFAULT_SEPOLIA_TORII_URL,
  manifest: manifestSepolia,
});

const dojoConfigMainnet = createDojoConfig({
  rpcUrl:
    import.meta.env.VITE_SN_MAIN_RPC_URL ||
    import.meta.env.VITE_MAINNET_RPC_URL ||
    import.meta.env.VITE_STARKNET_RPC_URL ||
    DEFAULT_MAINNET_RPC_URL,
  toriiUrl:
    import.meta.env.VITE_SN_MAIN_TORII_URL ||
    import.meta.env.VITE_MAINNET_TORII_URL ||
    import.meta.env.VITE_TORII_URL ||
    DEFAULT_MAINNET_TORII_URL,
  manifest: manifestSepolia,
});

export const manifests = {
  [SEPOLIA_CHAIN_ID]: manifestSepolia,
  [MAINNET_CHAIN_ID]: manifestSepolia,
} as const;

export const dojoConfigs = {
  [SEPOLIA_CHAIN_ID]: dojoConfigSepolia,
  [MAINNET_CHAIN_ID]: dojoConfigMainnet,
} as const;

export const chains = {
  [SEPOLIA_CHAIN_ID]: sepolia,
  [MAINNET_CHAIN_ID]: mainnet,
} as const;

type ChainLike = bigint | string | undefined | null;

export function toChainIdHex(chainId: ChainLike): string {
  if (typeof chainId === "bigint") {
    return `0x${chainId.toString(16)}`;
  }
  if (typeof chainId === "string") {
    if (chainId.startsWith("0x")) {
      return chainId.toLowerCase();
    }
    return chainId;
  }
  return DEFAULT_CHAIN_ID;
}

function requireConfig(chainId?: ChainLike) {
  const chainIdHex = toChainIdHex(chainId);
  const config = dojoConfigs[chainIdHex as keyof typeof dojoConfigs];
  if (!config) {
    throw new Error(
      `Abyss client is not configured for chain ${chainIdHex}. Add a manifest and Dojo config before using this network.`,
    );
  }
  return config;
}

function requireManifest(chainId?: ChainLike) {
  const chainIdHex = toChainIdHex(chainId);
  const manifest = manifests[chainIdHex as keyof typeof manifests];
  if (!manifest) {
    throw new Error(
      `Abyss manifest is not available for chain ${chainIdHex}. Sync the correct manifest into client/src/lib/manifest.json before using this network.`,
    );
  }
  return manifest;
}

export function getDojoConfig(chainId?: ChainLike) {
  return requireConfig(chainId);
}

export function getRpcUrl(chainId?: ChainLike) {
  return requireConfig(chainId).rpcUrl;
}

export function getToriiUrl(chainId?: ChainLike) {
  return requireConfig(chainId).toriiUrl;
}

export function getWorldAddress(chainId?: ChainLike) {
  return requireManifest(chainId).world.address;
}

export function getContractAddress(
  chainId: ChainLike,
  namespace: string,
  contractName: string,
) {
  const manifest = requireManifest(chainId);
  const tag = `${namespace}-${contractName}`;
  const contract = manifest.contracts.find((item) => item.tag === tag);

  if (!contract) {
    throw new Error(
      `Contract ${tag} is not available in the active manifest for chain ${toChainIdHex(chainId)}.`,
    );
  }

  return contract.address;
}

export function getPlayAddress(chainId?: ChainLike) {
  return getContractAddress(chainId, NAMESPACE, "Play");
}

export function getMarketAddress(chainId?: ChainLike) {
  return getContractAddress(chainId, NAMESPACE, "Market");
}

export function getRelicAddress(chainId?: ChainLike) {
  return getContractAddress(chainId, NAMESPACE, "Relic");
}

export function getSetupAddress(chainId?: ChainLike) {
  return getContractAddress(chainId, NAMESPACE, "Setup");
}

export function getTreasuryAddress(chainId?: ChainLike) {
  return getContractAddress(chainId, NAMESPACE, "Treasury");
}

export function getCollectionAddress(chainId?: ChainLike) {
  return getContractAddress(chainId, NAMESPACE, "Collection");
}

export function getChipAddress(chainId?: ChainLike) {
  return getContractAddress(chainId, NAMESPACE, "Chip");
}

export function getCharmAddress(chainId?: ChainLike) {
  return getContractAddress(chainId, NAMESPACE, "Charm");
}

export function getRelicNftAddress(chainId?: ChainLike) {
  return getContractAddress(chainId, NAMESPACE, "RelicNFT");
}
