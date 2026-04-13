import { shortString } from "starknet";
import manifest from "./manifest.json";

const DEFAULT_NETWORK = (process.env.NEXT_PUBLIC_DEFAULT_CHAIN || "sepolia").toLowerCase();
const DEFAULT_RPC_URL =
    DEFAULT_NETWORK === "mainnet"
        ? "https://api.cartridge.gg/x/starknet/mainnet"
        : "https://api.cartridge.gg/x/starknet/sepolia";

function contractAddress(tag: string, fallback: string) {
    return manifest.contracts.find((contract) => contract.tag === tag)?.address ?? fallback;
}

export const CONTRACTS = {
    ABYSS_GAME: process.env.NEXT_PUBLIC_WORLD_ADDRESS || manifest.world.address,
    CHIP_TOKEN: contractAddress("ABYSS-Chip", "0x05f0d54994c424cb7d509787d405655cf60f6221f257a2b7b2cdf865d16e6d0e"),
    RELIC_NFT: contractAddress("ABYSS-RelicNFT", "0x0629007964504df95d64b88806e43ac5d9aa5e2e7583b5c360f4b603a565e0b5"),
    CHARM_NFT: contractAddress("ABYSS-Charm", "0x076dc33ef7e8efbbd6f513f35a47bb94df3a57ab3c66e5985d316d435b70d745"),
    ETH_TOKEN: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    STRK_TOKEN: "0x04718f5a0Fc34cC1AF16A1cdee98fFB20C31f5cD61D6Ab07201858f4287c938D",
    CARTRIDGE_VRF: "0x051fea4450da9d6aee758bdeba88b2f665bcbf549d2c61421aa724e9ac0ced8f",
} as const;

// Symbol types matching the contract
export const SymbolType = {
    SEVEN: 1,
    DIAMOND: 2,
    CHERRY: 3,
    COIN: 4,
    LEMON: 5,
    SIX: 6,
} as const;

// Symbol display info
export const SYMBOLS: Record<number, { name: string; emoji: string; color: string }> = {
    1: { name: "Seven", emoji: "7️⃣", color: "#FFD700" },
    2: { name: "Diamond", emoji: "💎", color: "#00BFFF" },
    3: { name: "Cherry", emoji: "🍒", color: "#FF4444" },
    4: { name: "Coin", emoji: "🪙", color: "#FFB347" },
    5: { name: "Lemon", emoji: "🍋", color: "#FFFF00" },
    6: { name: "Six", emoji: "6️⃣", color: "#8B0000" },
};

// RPC endpoints
export const RPC_ENDPOINTS = {
    SEPOLIA: process.env.NEXT_PUBLIC_SN_SEPOLIA_RPC_URL || (DEFAULT_NETWORK === "sepolia" ? process.env.NEXT_PUBLIC_STARKNET_RPC_URL : "") || "https://api.cartridge.gg/x/starknet/sepolia",
    MAINNET: process.env.NEXT_PUBLIC_SN_MAIN_RPC_URL || (DEFAULT_NETWORK === "mainnet" ? process.env.NEXT_PUBLIC_STARKNET_RPC_URL : "") || "https://api.cartridge.gg/x/starknet/mainnet",
    LOCAL: "http://localhost:5050",
};

export const SEPOLIA_CHAIN_ID = shortString.encodeShortString("SN_SEPOLIA");
export const MAINNET_CHAIN_ID = shortString.encodeShortString("SN_MAIN");

export const NAMESPACE = "ABYSS";
