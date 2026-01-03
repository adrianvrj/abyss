use starknet::ContractAddress;
use starknet::storage::Map;
use crate::modules::game_types::{GameConfig, GameSession, Item, LeaderboardEntry};

/// Contract storage structure
#[storage]
pub struct Storage {
    // Admin address - only admin can update scores and reset players
    pub admin: ContractAddress,
    // Game configuration
    pub game_config: GameConfig,
    // Session data mapping: session_id -> GameSession
    pub sessions: Map<u32, GameSession>,
    // Player sessions count per player
    pub player_sessions_count: Map<ContractAddress, u32>,
    // Player sessions mapping: (player_address, index) -> session_id
    pub player_session: Map<(ContractAddress, u32), u32>,
    // Leaderboard entries stored as Map (more gas efficient)
    pub leaderboard: Map<u32, LeaderboardEntry>,
    pub leaderboard_count: u32,
    // Total number of sessions created
    pub total_sessions: u32,
    // Competitive sessions tracking
    pub total_competitive_sessions: u32,
    pub competitive_session: Map<u32, u32>, // index -> session_id
    // Casual sessions tracking
    pub total_casual_sessions: u32,
    pub casual_session: Map<u32, u32>, // index -> session_id
    // Item shop storage
    pub items: Map<u32, Item>, // item_id -> Item
    pub total_items: u32,
    // Session inventory: (session_id, item_id) -> quantity
    pub session_inventory: Map<(u32, u32), u32>,
    // Track which items a session owns: (session_id, index) -> item_id
    pub session_item_ids: Map<(u32, u32), u32>,
    pub session_item_count: Map<u32, u32>,
}

