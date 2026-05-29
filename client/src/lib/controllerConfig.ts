import ControllerConnector from "@cartridge/connector/controller";
import type { ControllerOptions } from "@cartridge/controller";
import {
  DEFAULT_CHAIN_ID,
  DEFAULT_MAINNET_RPC_URL,
  DEFAULT_SEPOLIA_RPC_URL,
  NAMESPACE,
  getChipAddress,
  getMarketAddress,
  getPlayAddress,
  getRelicAddress,
  getToriiUrl,
  tryGetStreakAddress,
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

function streakContractPolicies(): NonNullable<SessionPolicies["contracts"]> {
  const streakAddress = tryGetStreakAddress(DEFAULT_CHAIN_ID);
  if (!streakAddress) {
    return {};
  }
  return {
    [streakAddress]: {
      methods: [
        { entrypoint: "claim_streak_loot" },
        { entrypoint: "recover_streak" },
      ],
    },
  };
}

/** `recover_streak` pulls CHIP via `transfer_from`; session must include `approve` on the token. */
function chipApproveForRecoveryPolicies(): NonNullable<SessionPolicies["contracts"]> {
  const streakAddress = tryGetStreakAddress(DEFAULT_CHAIN_ID);
  const chipAddress = getChipAddress(DEFAULT_CHAIN_ID);
  if (!streakAddress || !chipAddress || chipAddress.toLowerCase() === "0x0") {
    return {};
  }
  return {
    [chipAddress]: {
      methods: [{ entrypoint: "approve" }],
    },
  };
}

export const sessionPolicies: SessionPolicies = {
  contracts: {
    ...streakContractPolicies(),
    ...chipApproveForRecoveryPolicies(),
    [PLAY_ADDRESS]: {
      methods: [
        { entrypoint: "create_session" },
        { entrypoint: "mint_session" },
        { entrypoint: "set_pending_charm_loadout" },
        { entrypoint: "equip_charms" },
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

export function buildControllerOptions(defaultChainId: string): ControllerOptions {
  return {
    defaultChainId,
    chains: [{ rpcUrl: CONTROLLER_RPC_URL }],
    namespace: NAMESPACE,
    slot: cartridgeSlot,
    ...(CONTROLLER_PRESET
      ? { preset: CONTROLLER_PRESET }
      : { policies: sessionPolicies }),
  };
}

let controllerConnectorSingleton: ControllerConnector | null = null;

/** Shared official Cartridge connector instance, registered with starknet-react. */
export function getControllerConnector(): ControllerConnector {
  if (!controllerConnectorSingleton) {
    controllerConnectorSingleton = new ControllerConnector(
      buildControllerOptions(DEFAULT_CHAIN_ID),
    );
  }
  return controllerConnectorSingleton;
}
