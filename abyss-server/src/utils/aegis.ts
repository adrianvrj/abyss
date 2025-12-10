import { AegisSDK } from '@cavos/aegis';
import * as dotenv from 'dotenv';
dotenv.config();

// Contract Addresses
export const ABYSS_CONTRACT_ADDRESS = process.env.ABYSS_CONTRACT_ADDRESS || '';

// ABI (Simplified for the functions we need)
export const ABYSS_CONTRACT_ABI = [
    {
        "type": "impl",
        "name": "AbyssGameImpl",
        "interface_name": "abyss_game::contracts::abyss_game::IAbyssGame"
    },
    {
        "type": "enum",
        "name": "core::bool",
        "variants": [
            {
                "name": "False",
                "type": "()"
            },
            {
                "name": "True",
                "type": "()"
            }
        ]
    },
    {
        "type": "struct",
        "name": "abyss_game::contracts::abyss_game::GameSession",
        "members": [
            {
                "name": "session_id",
                "type": "core::integer::u32"
            },
            {
                "name": "player_address",
                "type": "core::starknet::contract_address::ContractAddress"
            },
            {
                "name": "level",
                "type": "core::integer::u32"
            },
            {
                "name": "score",
                "type": "core::integer::u32"
            },
            {
                "name": "total_score",
                "type": "core::integer::u32"
            },
            {
                "name": "spins_remaining",
                "type": "core::integer::u32"
            },
            {
                "name": "is_competitive",
                "type": "core::bool"
            },
            {
                "name": "is_active",
                "type": "core::bool"
            },
            {
                "name": "created_at",
                "type": "core::integer::u64"
            }
        ]
    },
    {
        "type": "struct",
        "name": "abyss_game::contracts::abyss_game::LeaderboardEntry",
        "members": [
            {
                "name": "player_address",
                "type": "core::starknet::contract_address::ContractAddress"
            },
            {
                "name": "session_id",
                "type": "core::integer::u32"
            },
            {
                "name": "level",
                "type": "core::integer::u32"
            },
            {
                "name": "total_score",
                "type": "core::integer::u32"
            }
        ]
    },
    {
        "type": "struct",
        "name": "abyss_game::contracts::abyss_game::SessionMarket",
        "members": [
            {
                "name": "refresh_count",
                "type": "core::integer::u32"
            },
            {
                "name": "item_slot_1",
                "type": "core::integer::u32"
            },
            {
                "name": "item_slot_2",
                "type": "core::integer::u32"
            },
            {
                "name": "item_slot_3",
                "type": "core::integer::u32"
            },
            {
                "name": "item_slot_4",
                "type": "core::integer::u32"
            },
            {
                "name": "item_slot_5",
                "type": "core::integer::u32"
            },
            {
                "name": "item_slot_6",
                "type": "core::integer::u32"
            }
        ]
    },
    {
        "type": "struct",
        "name": "abyss_game::contracts::abyss_game::PlayerItem",
        "members": [
            {
                "name": "item_id",
                "type": "core::integer::u32"
            },
            {
                "name": "quantity",
                "type": "core::integer::u32"
            }
        ]
    },
    {
        "type": "struct",
        "name": "abyss_game::contracts::abyss_game::Item",
        "members": [
            {
                "name": "item_id",
                "type": "core::integer::u32"
            },
            {
                "name": "name",
                "type": "core::felt252"
            },
            {
                "name": "description",
                "type": "core::felt252"
            },
            {
                "name": "price",
                "type": "core::integer::u32"
            },
            {
                "name": "sell_price",
                "type": "core::integer::u32"
            },
            {
                "name": "effect_type",
                "type": "core::integer::u8"
            },
            {
                "name": "effect_value",
                "type": "core::integer::u32"
            },
            {
                "name": "target_symbol",
                "type": "core::felt252"
            }
        ]
    },
    {
        "type": "interface",
        "name": "abyss_game::contracts::abyss_game::IAbyssGame",
        "items": [
            {
                "type": "function",
                "name": "create_session",
                "inputs": [
                    {
                        "name": "player_address",
                        "type": "core::starknet::contract_address::ContractAddress"
                    },
                    {
                        "name": "is_competitive",
                        "type": "core::bool"
                    }
                ],
                "outputs": [
                    {
                        "type": "core::integer::u32"
                    }
                ],
                "state_mutability": "external"
            },
            {
                "type": "function",
                "name": "update_session_score",
                "inputs": [
                    {
                        "name": "session_id",
                        "type": "core::integer::u32"
                    },
                    {
                        "name": "score_increase",
                        "type": "core::integer::u32"
                    }
                ],
                "outputs": [],
                "state_mutability": "external"
            },
            {
                "type": "function",
                "name": "get_session_data",
                "inputs": [
                    {
                        "name": "session_id",
                        "type": "core::integer::u32"
                    }
                ],
                "outputs": [
                    {
                        "type": "abyss_game::contracts::abyss_game::GameSession"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "get_player_sessions",
                "inputs": [
                    {
                        "name": "player_address",
                        "type": "core::starknet::contract_address::ContractAddress"
                    }
                ],
                "outputs": [
                    {
                        "type": "core::array::Array::<core::integer::u32>"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "get_player_competitive_sessions",
                "inputs": [
                    {
                        "name": "player_address",
                        "type": "core::starknet::contract_address::ContractAddress"
                    }
                ],
                "outputs": [
                    {
                        "type": "core::array::Array::<core::integer::u32>"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "get_player_casual_sessions",
                "inputs": [
                    {
                        "name": "player_address",
                        "type": "core::starknet::contract_address::ContractAddress"
                    }
                ],
                "outputs": [
                    {
                        "type": "core::array::Array::<core::integer::u32>"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "end_session",
                "inputs": [
                    {
                        "name": "session_id",
                        "type": "core::integer::u32"
                    }
                ],
                "outputs": [],
                "state_mutability": "external"
            },
            {
                "type": "function",
                "name": "end_own_session",
                "inputs": [
                    {
                        "name": "session_id",
                        "type": "core::integer::u32"
                    }
                ],
                "outputs": [],
                "state_mutability": "external"
            },
            {
                "type": "function",
                "name": "get_level_threshold",
                "inputs": [
                    {
                        "name": "level",
                        "type": "core::integer::u32"
                    }
                ],
                "outputs": [
                    {
                        "type": "core::integer::u32"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "get_leaderboard",
                "inputs": [],
                "outputs": [
                    {
                        "type": "core::array::Array::<abyss_game::contracts::abyss_game::LeaderboardEntry>"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "get_admin",
                "inputs": [],
                "outputs": [
                    {
                        "type": "core::starknet::contract_address::ContractAddress"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "get_total_sessions",
                "inputs": [],
                "outputs": [
                    {
                        "type": "core::integer::u32"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "get_all_competitive_sessions",
                "inputs": [],
                "outputs": [
                    {
                        "type": "core::array::Array::<core::integer::u32>"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "get_all_casual_sessions",
                "inputs": [],
                "outputs": [
                    {
                        "type": "core::array::Array::<core::integer::u32>"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "get_total_competitive_sessions",
                "inputs": [],
                "outputs": [
                    {
                        "type": "core::integer::u32"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "get_total_casual_sessions",
                "inputs": [],
                "outputs": [
                    {
                        "type": "core::integer::u32"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "buy_item_from_market",
                "inputs": [
                    {
                        "name": "session_id",
                        "type": "core::integer::u32"
                    },
                    {
                        "name": "market_slot",
                        "type": "core::integer::u32"
                    }
                ],
                "outputs": [],
                "state_mutability": "external"
            },
            {
                "type": "function",
                "name": "sell_item",
                "inputs": [
                    {
                        "name": "session_id",
                        "type": "core::integer::u32"
                    },
                    {
                        "name": "item_id",
                        "type": "core::integer::u32"
                    },
                    {
                        "name": "quantity",
                        "type": "core::integer::u32"
                    }
                ],
                "outputs": [],
                "state_mutability": "external"
            },
            {
                "type": "function",
                "name": "refresh_market",
                "inputs": [
                    {
                        "name": "session_id",
                        "type": "core::integer::u32"
                    }
                ],
                "outputs": [],
                "state_mutability": "external"
            },
            {
                "type": "function",
                "name": "get_session_market",
                "inputs": [
                    {
                        "name": "session_id",
                        "type": "core::integer::u32"
                    }
                ],
                "outputs": [
                    {
                        "type": "abyss_game::contracts::abyss_game::SessionMarket"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "get_session_items",
                "inputs": [
                    {
                        "name": "session_id",
                        "type": "core::integer::u32"
                    }
                ],
                "outputs": [
                    {
                        "type": "core::array::Array::<abyss_game::contracts::abyss_game::PlayerItem>"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "get_item_info",
                "inputs": [
                    {
                        "name": "item_id",
                        "type": "core::integer::u32"
                    }
                ],
                "outputs": [
                    {
                        "type": "abyss_game::contracts::abyss_game::Item"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "get_total_items",
                "inputs": [],
                "outputs": [
                    {
                        "type": "core::integer::u32"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "get_session_item_quantity",
                "inputs": [
                    {
                        "name": "session_id",
                        "type": "core::integer::u32"
                    },
                    {
                        "name": "item_id",
                        "type": "core::integer::u32"
                    }
                ],
                "outputs": [
                    {
                        "type": "core::integer::u32"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "get_session_inventory_count",
                "inputs": [
                    {
                        "name": "session_id",
                        "type": "core::integer::u32"
                    }
                ],
                "outputs": [
                    {
                        "type": "core::integer::u32"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "get_refresh_cost",
                "inputs": [
                    {
                        "name": "session_id",
                        "type": "core::integer::u32"
                    }
                ],
                "outputs": [
                    {
                        "type": "core::integer::u32"
                    }
                ],
                "state_mutability": "view"
            }
        ]
    },
    {
        "type": "constructor",
        "name": "constructor",
        "inputs": [
            {
                "name": "admin_address",
                "type": "core::starknet::contract_address::ContractAddress"
            },
            {
                "name": "chip_token_address",
                "type": "core::starknet::contract_address::ContractAddress"
            }
        ]
    },
    {
        "type": "event",
        "name": "abyss_game::contracts::abyss_game::AbyssGame::Event",
        "kind": "enum",
        "variants": []
    }
]

const aegisConfig = {
    network: (process.env.AEGIS_NETWORK as 'SN_SEPOLIA' | 'SN_MAINNET') || 'SN_SEPOLIA',
    appName: "Abyss Server",
    appId: process.env.AEGIS_APP_ID || '',
    enableLogging: true,
};

export const aegis = new AegisSDK(aegisConfig);

// Flag to track if admin account is initialized
let isAdminInitialized = false;

export async function initializeAdminAccount(): Promise<void> {
    if (isAdminInitialized) {
        return; // Already initialized
    }

    if (!process.env.ADMIN_PRIVATE_KEY) {
        throw new Error("ADMIN_PRIVATE_KEY is not set");
    }

    await aegis.connectAccount(process.env.ADMIN_PRIVATE_KEY, true);
    isAdminInitialized = true;
    console.log('[Aegis] Admin account initialized');
}

// For backward compatibility - ensures admin is initialized
export async function getAdminAccount() {
    if (!isAdminInitialized) {
        await initializeAdminAccount();
    }
    return aegis;
}

