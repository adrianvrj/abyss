import {
  getCharmAddress,
  getChipAddress,
  DEFAULT_CHAIN_ID,
  MAINNET_CHAIN_ID,
  NAMESPACE,
  SEPOLIA_CHAIN_ID,
  getCollectionAddress,
  getMarketAddress,
  getPlayAddress,
  getRelicAddress,
  getRelicNftAddress,
  getSetupAddress,
  getTreasuryAddress,
  getWorldAddress,
} from "@/config";

export const CONTRACTS = {
  ABYSS_GAME: getWorldAddress(DEFAULT_CHAIN_ID),
  PLAY: getPlayAddress(DEFAULT_CHAIN_ID),
  MARKET: getMarketAddress(DEFAULT_CHAIN_ID),
  RELIC: getRelicAddress(DEFAULT_CHAIN_ID),
  TREASURY: getTreasuryAddress(DEFAULT_CHAIN_ID),
  COLLECTION: getCollectionAddress(DEFAULT_CHAIN_ID),
  SETUP_REGISTRY: getSetupAddress(DEFAULT_CHAIN_ID),
  CHIP_TOKEN: import.meta.env.VITE_CHIP_TOKEN ?? getChipAddress(DEFAULT_CHAIN_ID),
  RELIC_NFT: import.meta.env.VITE_RELIC_NFT ?? getRelicNftAddress(DEFAULT_CHAIN_ID),
  CHARM_NFT: import.meta.env.VITE_CHARM_NFT ?? getCharmAddress(DEFAULT_CHAIN_ID),
  ETH_TOKEN:
    import.meta.env.VITE_ETH_TOKEN ??
    "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
  STRK_TOKEN:
    import.meta.env.VITE_STRK_TOKEN ??
    "0x04718f5a0Fc34cC1AF16A1cdee98fFB20C31f5cD61D6Ab07201858f4287c938D",
  USDC_TOKEN:
    import.meta.env.VITE_USDC_TOKEN ??
    "0x0512feac6339ff7889822cb5aa2a86c848e9d392bb0e3e237c008674feed8343",
  SESSION_BUNDLE_ID: Number(import.meta.env.VITE_SESSION_BUNDLE_ID ?? "0"),
  X_SHARE_BUNDLE_ID:
    import.meta.env.VITE_X_SHARE_BUNDLE_ID !== undefined
      ? Number(import.meta.env.VITE_X_SHARE_BUNDLE_ID)
      : null,
  CARTRIDGE_VRF:
    import.meta.env.VITE_CARTRIDGE_VRF ??
    "0x051fea4450da9d6aee758bdeba88b2f665bcbf549d2c61421aa724e9ac0ced8f",
} as const;

export const CHIP_TOKEN_IMAGE_URL =
  import.meta.env.VITE_CHIP_TOKEN_IMAGE_URL ??
  "https://abyssgame.fun/chip-token.svg";

export const SymbolType = {
  SEVEN: 1,
  DIAMOND: 2,
  CHERRY: 3,
  COIN: 4,
  LEMON: 5,
  SIX: 6,
} as const;

export const SYMBOLS: Record<number, { name: string; emoji: string; color: string }> = {
  1: { name: "Seven", emoji: "7️⃣", color: "#FFD700" },
  2: { name: "Diamond", emoji: "💎", color: "#00BFFF" },
  3: { name: "Cherry", emoji: "🍒", color: "#FF4444" },
  4: { name: "Coin", emoji: "🪙", color: "#FFB347" },
  5: { name: "Lemon", emoji: "🍋", color: "#FFFF00" },
  6: { name: "Six", emoji: "6️⃣", color: "#8B0000" },
};

export const RPC_ENDPOINTS = {
  SEPOLIA:
    import.meta.env.VITE_SN_SEPOLIA_RPC_URL ??
    (DEFAULT_CHAIN_ID === SEPOLIA_CHAIN_ID ? import.meta.env.VITE_STARKNET_RPC_URL : ""),
  MAINNET:
    import.meta.env.VITE_SN_MAIN_RPC_URL ??
    import.meta.env.VITE_MAINNET_RPC_URL ??
    (DEFAULT_CHAIN_ID === MAINNET_CHAIN_ID ? import.meta.env.VITE_STARKNET_RPC_URL : ""),
  LOCAL: "http://localhost:5050",
};

export { DEFAULT_CHAIN_ID, MAINNET_CHAIN_ID, NAMESPACE, SEPOLIA_CHAIN_ID };
