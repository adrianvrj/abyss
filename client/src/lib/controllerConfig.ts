import ControllerConnector from "@cartridge/connector/controller";
import type { ControllerOptions } from "@cartridge/controller";
import {
  DEFAULT_CHAIN_ID,
  DEFAULT_MAINNET_RPC_URL,
  DEFAULT_SEPOLIA_RPC_URL,
  NAMESPACE,
  getMarketAddress,
  getPlayAddress,
  getRelicAddress,
  getToriiUrl,
} from "@/config";
import { CONTRACTS } from "@/lib/constants";

type SessionPolicies = {
  contracts?: Record<string, { methods: { entrypoint: string }[] }>;
  messages?: unknown[];
};

export const CONTROLLER_PRESET = import.meta.env.VITE_CARTRIDGE_PRESET || "abyss";
export const DEFAULT_CARTRIDGE_CONTROLLER_RPC_URL = DEFAULT_CHAIN_ID.includes("534e5f4d41494e")
  ? `${DEFAULT_MAINNET_RPC_URL}/rpc/v0_9`
  : `${DEFAULT_SEPOLIA_RPC_URL}/rpc/v0_9`;
export const CONTROLLER_RPC_URL =
  import.meta.env.VITE_CONTROLLER_RPC_URL ||
  import.meta.env.VITE_CARTRIDGE_RPC_URL ||
  DEFAULT_CARTRIDGE_CONTROLLER_RPC_URL;
export const PLAY_ADDRESS = getPlayAddress(DEFAULT_CHAIN_ID);
export const MARKET_ADDRESS = getMarketAddress(DEFAULT_CHAIN_ID);
export const RELIC_ADDRESS = getRelicAddress(DEFAULT_CHAIN_ID);
export const VRF_ADDRESS = CONTRACTS.CARTRIDGE_VRF;

const toriiUrl = getToriiUrl(DEFAULT_CHAIN_ID);

export const cartridgeSlot = toriiUrl.includes("cartridge.gg")
  ? toriiUrl.split("/").filter(Boolean).slice(-2, -1)[0]
  : "abyss";

export const sessionPolicies: SessionPolicies = {
  contracts: {
    [PLAY_ADDRESS]: {
      methods: [
        { entrypoint: "create_session" },
        { entrypoint: "mint_session" },
        { entrypoint: "request_spin" },
        { entrypoint: "end_session" },
        { entrypoint: "claim_chips" },
      ],
    },
    [MARKET_ADDRESS]: {
      methods: [
        { entrypoint: "buy_item" },
        { entrypoint: "refresh_market" },
        { entrypoint: "sell_item" },
      ],
    },
    [RELIC_ADDRESS]: {
      methods: [
        { entrypoint: "equip_relic" },
        { entrypoint: "activate_relic" },
      ],
    },
    [VRF_ADDRESS]: {
      methods: [
        { entrypoint: "request_random" },
      ],
    },
    [CONTRACTS.RELIC_NFT]: {
      methods: [
        { entrypoint: "mint_relic" },
        { entrypoint: "mint_relic_with_token" },
      ],
    },
  },
};

export const CONTROLLER_SESSION_VERSION = JSON.stringify({
  preset: CONTROLLER_PRESET || null,
  rpcUrl: CONTROLLER_RPC_URL,
  slot: cartridgeSlot,
  play: PLAY_ADDRESS,
  market: MARKET_ADDRESS,
  relic: RELIC_ADDRESS,
  vrf: VRF_ADDRESS,
  relicNft: CONTRACTS.RELIC_NFT,
});

function getControllerSessionStorageKey(address: string) {
  return `abyss:controller-session:${address.toLowerCase()}`;
}

function readStoredSessionVersion(address: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(getControllerSessionStorageKey(address));
  } catch {
    return null;
  }
}

function writeStoredSessionVersion(address: string, version: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      getControllerSessionStorageKey(address),
      version,
    );
  } catch {
    // Ignore localStorage write failures in private browsing or sandboxed iframes.
  }
}

export function buildControllerOptions(defaultChainId: string): ControllerOptions {
  return {
    defaultChainId,
    chains: [{ rpcUrl: CONTROLLER_RPC_URL }],
    namespace: NAMESPACE,
    slot: cartridgeSlot,
    shouldOverridePresetPolicies: false,
    policies: sessionPolicies,
    ...(CONTROLLER_PRESET ? { preset: CONTROLLER_PRESET } : {}),
  };
}

export function getControllerConnectorConfigKey(defaultChainId: string) {
  return JSON.stringify({
    defaultChainId,
    options: buildControllerOptions(defaultChainId),
  });
}

export async function ensureControllerSession(
  connector: unknown,
  address?: string,
) {
  if (!address) {
    return;
  }

  if (readStoredSessionVersion(address) === CONTROLLER_SESSION_VERSION) {
    return;
  }

  const controllerConnector = connector as ControllerConnector | null | undefined;
  const controller = controllerConnector?.controller;

  if (!controller?.updateSession) {
    return;
  }

  await controller.updateSession({
    policies: sessionPolicies,
    ...(CONTROLLER_PRESET ? { preset: CONTROLLER_PRESET } : {}),
  });

  writeStoredSessionVersion(address, CONTROLLER_SESSION_VERSION);
}
