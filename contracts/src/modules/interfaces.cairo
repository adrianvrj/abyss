use starknet::ContractAddress;
use crate::modules::game_types::{GameSession, LeaderboardEntry, GameConfig};
use starknet::get_caller_address;

/// Interface for the Abyss Game contract
#[starknet::interface]
pub trait IAbyssGame<TContractState> {
    /// Create a new game session
    fn create_session(ref self: TContractState, is_competitive: bool) -> u32;
    
    /// Update session score and check for level progression
    fn update_session_score(ref self: TContractState, session_id: u32, score_increase: u32);
    
    /// Get session data
    fn get_session_data(self: @TContractState, session_id: u32) -> GameSession;

    /// Get all active sessions for a player
    fn get_player_sessions(self: @TContractState, player_address: ContractAddress) -> Array<u32>;

    /// Get all competitive sessions for a player
    fn get_player_competitive_sessions(self: @TContractState, player_address: ContractAddress) -> Array<u32>;

    /// Get all non-competitive sessions for a player
    fn get_player_casual_sessions(self: @TContractState, player_address: ContractAddress) -> Array<u32>;

    /// End a session (mark as inactive) - Admin only
    fn end_session(ref self: TContractState, session_id: u32);

    /// End own session (mark as inactive) - Player can end their own session
    fn end_own_session(ref self: TContractState, session_id: u32);

    /// Get current level score threshold
    fn get_level_threshold(self: @TContractState, level: u32) -> u32;

    /// Get top 10 competitive sessions leaderboard
    fn get_leaderboard(self: @TContractState) -> Array<LeaderboardEntry>;
    
    /// Get admin address
    fn get_admin(self: @TContractState) -> ContractAddress;
    
    /// Get total number of sessions
    fn get_total_sessions(self: @TContractState) -> u32;
    
    /// Get all competitive sessions across all players
    fn get_all_competitive_sessions(self: @TContractState) -> Array<u32>;
    
    /// Get all casual sessions across all players
    fn get_all_casual_sessions(self: @TContractState) -> Array<u32>;
    
    /// Get total number of competitive sessions
    fn get_total_competitive_sessions(self: @TContractState) -> u32;
    
    /// Get total number of casual sessions
    fn get_total_casual_sessions(self: @TContractState) -> u32;
    
    /// Get game configuration
    fn get_game_config(self: @TContractState) -> GameConfig;
    
    /// Update game configuration - Admin only
    fn update_game_config(ref self: TContractState, config: GameConfig);
}

