"use client";

import ControllerConnector from "@cartridge/connector/controller";
import { mainnet, sepolia, Chain } from "@starknet-react/chains";
import {
    jsonRpcProvider,
    StarknetConfig,
} from "@starknet-react/core";
import { PropsWithChildren } from "react";
import { constants } from "starknet";
import { CONTRACTS, RPC_ENDPOINTS } from "@/lib/constants";

// Session policies for gasless transactions
const policies = {
    contracts: {
        [CONTRACTS.ABYSS_GAME]: {
            name: "Abyss Game",
            description: "On-chain slot machine game",
            methods: [
                { name: "Create Session", entrypoint: "create_session" },
                { name: "Request Spin", entrypoint: "request_spin" },
                { name: "End Session", entrypoint: "end_own_session" },
                { name: "Buy Item", entrypoint: "buy_item_from_market" },
                { name: "Sell Item", entrypoint: "sell_item" },
                { name: "Refresh Market", entrypoint: "refresh_market" },
                { name: "Equip Relic", entrypoint: "equip_relic" },
                { name: "Unequip Relic", entrypoint: "unequip_relic" },
                { name: "Activate Relic", entrypoint: "activate_relic" },
            ],
        },
        [CONTRACTS.CARTRIDGE_VRF]: {
            name: "Cartridge VRF",
            description: "Verifiable random function provider",
            methods: [
                { name: "Request Random", entrypoint: "request_random" },
            ],
        },
        [CONTRACTS.CHIP_TOKEN]: {
            name: "CHIP Token",
            description: "In-game currency token",
            methods: [
                { name: "Approve", entrypoint: "approve" },
                { name: "Transfer", entrypoint: "transfer" },
            ],
        },
        [CONTRACTS.RELIC_NFT]: {
            name: "Relic NFT",
            description: "Collectible Relic NFTs with special abilities",
            methods: [
                { name: "Mint Relic", entrypoint: "mint_relic" },
            ],
        },
        [CONTRACTS.ETH_TOKEN]: {
            name: "ETH Token",
            description: "Native ETH token for payments",
            methods: [
                { name: "Approve", entrypoint: "approve" },
            ],
        },
    },
};

// JSON RPC provider
const provider = jsonRpcProvider({
    rpc: (chain: Chain) => {
        if (chain.id === mainnet.id) {
            return { nodeUrl: RPC_ENDPOINTS.MAINNET };
        }
        if (chain.id === sepolia.id) {
            return { nodeUrl: RPC_ENDPOINTS.SEPOLIA };
        }
        return null;
    },
});

// Create singleton controller connector at module level (this file is loaded with ssr: false)
// Export it so useController can access it directly without fromConnectors()
export const controllerConnector = new ControllerConnector({
    policies,
    chains: [
        { rpcUrl: RPC_ENDPOINTS.SEPOLIA },
        { rpcUrl: RPC_ENDPOINTS.MAINNET },
    ],
    defaultChainId: constants.StarknetChainId.SN_SEPOLIA,
    // Theme Options
    // Note: To fully apply these in production + verified session policies, 
    // we should submit a PR to https://github.com/cartridge-gg/presets
    theme: {
        colors: {
            primary: "#FF841C",
        },
        // Valid image paths should be absolute or served from public
        icon: "https://abyss-game.vercel.app/images/abyss-logo.png",
        cover: "https://abyss-game.vercel.app/images/bg-desktop.png",
    },
    // Tokens/Collections (This might require indexer configuration in production)
    tokens: {
        erc20: [CONTRACTS.CHIP_TOKEN],
        erc721: [CONTRACTS.RELIC_NFT],
    },
    // colorMode: "dark", // Removed as it might conflict with theme object in some versions
    slot: "abyss-slot-dev", // Using a dev slot
} as any);


export function StarknetProvider({ children }: PropsWithChildren) {
    return (
        <StarknetConfig
            autoConnect
            defaultChainId={sepolia.id}
            chains={[sepolia, mainnet]}
            connectors={[controllerConnector]}
            provider={provider}
        >
            {children}
        </StarknetConfig>
    );
}
