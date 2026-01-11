// Contract constants for Abyss Game
// Update these addresses when deploying to different networks

// Sepolia addresses
export const CONTRACTS = {
    ABYSS_GAME: "0x05b38052dcad094f11f71c78b0c1b84a001616f7f04619502b73a359d8b7e4ae",
    CHIP_TOKEN: "0x05f0d54994c424cb7d509787d405655cf60f6221f257a2b7b2cdf865d16e6d0e",
    RELIC_NFT: "0x00207a2655e21d62a1bbf3644ac9c941a42f171647b12930f55a2e3326428aae",
    CHARM_NFT: "0x031aad01723740d5cef5cfcd1ff95ef9875400e8b5e72098c202821ee577f83c",
    ETH_TOKEN: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    STRK_TOKEN: "0x04718f5a0Fc34cC1AF16A1cdee98fFB20C31f5cD61D6Ab07201858f4287c938D",
    CARTRIDGE_VRF: "0x051fea4450da9d6aee758bdeba88b2f665bcbf549d2c61421aa724e9ac0ced8f",
} as const;

// Mainnet addresses (for future)
export const MAINNET_CONTRACTS = {
    ABYSS_GAME: "0x0047b8c70bc78069453063d317dec316a1db758db444af6bb8f027bcf83c31db", // TODO: Update after deployment
    PRAGMA_VRF: "0x4fb09ce7113bbdf568f225bc757a29cb2b72959c21ca63a7d59bdb9026da661",
};

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
    SEPOLIA: "https://api.cartridge.gg/x/starknet/sepolia",
    MAINNET: "https://api.cartridge.gg/x/starknet/mainnet",
};
