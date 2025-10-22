export const ABYSS_CONTRACT_ABI = [
    {
        "type": "impl",
        "name": "AbyssGameImpl",
        "interface_name": "abyss_game::IAbyssGame"
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
        "name": "abyss_game::GameSession",
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
        "name": "abyss_game::LeaderboardEntry",
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
        "type": "interface",
        "name": "abyss_game::IAbyssGame",
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
                        "type": "abyss_game::GameSession"
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
                        "type": "core::array::Array::<abyss_game::LeaderboardEntry>"
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
            }
        ]
    },
    {
        "type": "event",
        "name": "abyss_game::AbyssGame::Event",
        "kind": "enum",
        "variants": []
    }
]