import { createDojoConfig } from "@dojoengine/core";
import manifest from "./manifest.json";

export const dojoConfig = createDojoConfig({
    rpcUrl: import.meta.env.VITE_STARKNET_RPC_URL || "https://api.cartridge.gg/x/starknet/sepolia",
    toriiUrl: import.meta.env.VITE_TORII_URL || "https://api.cartridge.gg/x/abyss/torii",
    manifest,
});

export const NAMESPACE = "ABYSS"; // Project namespace from Cairo constants
