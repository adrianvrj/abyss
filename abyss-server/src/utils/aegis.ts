import { AegisSDK } from '@cavos/aegis';
import * as dotenv from 'dotenv';
dotenv.config();

// Contract Addresses
export const ABYSS_CONTRACT_ADDRESS = process.env.ABYSS_CONTRACT_ADDRESS || '';

// ABI (Simplified for the functions we need)
export const ABYSS_CONTRACT_ABI = [
    {
        type: 'function',
        name: 'update_session_score',
        inputs: [
            { name: 'session_id', type: 'core::integer::u32' },
            { name: 'score_increase', type: 'core::integer::u32' },
        ],
        outputs: [],
        state_mutability: 'external',
    },
    {
        type: 'function',
        name: 'end_session',
        inputs: [{ name: 'session_id', type: 'core::integer::u32' }],
        outputs: [],
        state_mutability: 'external',
    },
    {
        type: 'function',
        name: 'consume_item',
        inputs: [
            { name: 'session_id', type: 'core::integer::u32' },
            { name: 'item_id', type: 'core::integer::u32' },
            { name: 'quantity', type: 'core::integer::u32' },
        ],
        outputs: [],
        state_mutability: 'external',
    },
    {
        type: 'function',
        name: 'get_session_data',
        inputs: [{ name: 'session_id', type: 'core::integer::u32' }],
        outputs: [
            {
                type: 'struct',
                name: 'abyss_game::contracts::abyss_game::GameSession',
                members: [
                    { name: 'session_id', type: 'core::integer::u32' },
                    { name: 'player_address', type: 'core::starknet::contract_address::ContractAddress' },
                    { name: 'level', type: 'core::integer::u32' },
                    { name: 'score', type: 'core::integer::u32' },
                    { name: 'total_score', type: 'core::integer::u32' },
                    { name: 'spins_remaining', type: 'core::integer::u32' },
                    { name: 'is_competitive', type: 'core::bool' },
                    { name: 'is_active', type: 'core::bool' },
                    { name: 'created_at', type: 'core::integer::u64' },
                ],
            },
        ],
        state_mutability: 'view',
    },
    {
        type: 'function',
        name: 'get_session_items',
        inputs: [{ name: 'session_id', type: 'core::integer::u32' }],
        outputs: [
            {
                type: "core::array",
                inner: {
                    type: "struct",
                    name: "abyss_game::contracts::abyss_game::PlayerItem",
                    members: [
                        { name: "item_id", type: "core::integer::u32" },
                        { name: "quantity", type: "core::integer::u32" }
                    ]
                }
            }
        ],
        state_mutability: 'view',
    },
];

const aegisConfig = {
    network: (process.env.AEGIS_NETWORK as 'SN_SEPOLIA' | 'SN_MAINNET') || 'SN_SEPOLIA',
    appName: "Abyss Server",
    appId: process.env.AEGIS_APP_ID || '',
    enableLogging: true,
};

export const aegis = new AegisSDK(aegisConfig);

export async function getAdminAccount() {
    // In a real server, we initialize this once.
    // Ensure ADMIN_PRIVATE_KEY is set
    if (!process.env.ADMIN_PRIVATE_KEY) {
        throw new Error("ADMIN_PRIVATE_KEY is not set");
    }
    // Connects the admin account to the SDK instance
    await aegis.connectAccount(process.env.ADMIN_PRIVATE_KEY, true);
    return aegis;
}
