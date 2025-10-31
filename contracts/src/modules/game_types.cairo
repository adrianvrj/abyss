use starknet::ContractAddress;

/// Symbol types in the game
#[derive(Drop, Copy, Serde, starknet::Store, PartialEq)]
#[allow(starknet::store_no_default_variant)]
pub enum SymbolType {
    Seven,
    Diamond,
    Cherry,
    Coin,
    Lemon,
    Six,
}

/// Symbol configuration
#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct SymbolConfig {
    pub points: u32,
    pub probability: u32, // Weight for random selection
}

/// Pattern type
#[derive(Drop, Copy, Serde, starknet::Store)]
#[allow(starknet::store_no_default_variant)]
pub enum PatternType {
    Horizontal3,
    Horizontal4,
    Horizontal5,
    Vertical3,
    Diagonal3,
}

/// Pattern information
#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct Pattern {
    pub pattern_type: PatternType,
    pub symbol: SymbolType,
    pub positions: u32, // Bitmask or encoded positions
    pub multiplier: u32,
}

/// Game configuration
#[derive(Drop, Serde, starknet::Store)]
pub struct GameConfig {
    pub symbol_seven: SymbolConfig,
    pub symbol_diamond: SymbolConfig,
    pub symbol_cherry: SymbolConfig,
    pub symbol_coin: SymbolConfig,
    pub symbol_lemon: SymbolConfig,
    pub symbol_six: SymbolConfig,
    pub pattern_h3_mult: u32,
    pub pattern_h4_mult: u32,
    pub pattern_h5_mult: u32,
    pub pattern_v3_mult: u32,
    pub pattern_d3_mult: u32,
    pub probability666: u32, // 0-10000 (1.5% = 150)
}

/// Game session data structure
#[derive(Drop, Serde, starknet::Store, Copy)]
pub struct GameSession {
    pub session_id: u32,
    pub player_address: ContractAddress,
    pub level: u32,
    pub score: u32,
    pub total_score: u32,
    pub spins_remaining: u32,
    pub is_competitive: bool, // True if this session counts for leaderboard
    pub is_active: bool, // True if session is still ongoing
    pub created_at: u64, // Timestamp when session was created
}

/// Leaderboard entry structure
#[derive(Drop, Serde, starknet::Store)]
pub struct LeaderboardEntry {
    pub player_address: ContractAddress,
    pub session_id: u32,
    pub level: u32,
    pub total_score: u32,
}

/// Item effect type - defines what the item modifies
#[derive(Drop, Copy, Serde, starknet::Store, PartialEq)]
#[allow(starknet::store_no_default_variant)]
pub enum ItemEffectType {
    ScoreMultiplier,           // Increases score by percentage
    PatternMultiplierBoost,    // Increases pattern multipliers
    SymbolProbabilityBoost,    // Increases specific symbol probability
    DirectScoreBonus,          // Adds direct score points
    SpinBonus,                 // Adds extra spins
    LevelProgressionBonus,     // Reduces score needed for next level
}

/// Item definition
#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct Item {
    pub item_id: u32,
    pub name: felt252,
    pub description: felt252,
    pub price: u32,
    pub sell_price: u32,          // 75% of buy price
    pub effect_type: ItemEffectType,
    pub effect_value: u32,        // The value of the effect (e.g., 20 for 20% boost)
}

/// Player item inventory entry
#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct PlayerItem {
    pub item_id: u32,
    pub quantity: u32,
}

/// Market state for a session
#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct SessionMarket {
    pub refresh_count: u32,
    pub item_slot_1: u32,
    pub item_slot_2: u32,
    pub item_slot_3: u32,
    pub item_slot_4: u32,
    pub item_slot_5: u32,
    pub item_slot_6: u32,
}

