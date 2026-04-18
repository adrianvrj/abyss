use starknet::ContractAddress;

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG - Singleton game configuration
// ═══════════════════════════════════════════════════════════════════════════

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct Config {
    #[key]
    pub world_resource: felt252,
    // Admin & external contracts
    pub admin: ContractAddress,
    pub vrf: ContractAddress,
    pub pragma_oracle: ContractAddress,
    pub quote_token: ContractAddress,
    pub chip_token: ContractAddress,
    pub charm_nft: ContractAddress,
    pub relic_nft: ContractAddress,
    pub beast_nft: ContractAddress,
    pub treasury: ContractAddress,
    pub team: ContractAddress,
    // Symbol configs (points, probability weights)
    pub seven_points: u32,
    pub seven_prob: u32,
    pub diamond_points: u32,
    pub diamond_prob: u32,
    pub cherry_points: u32,
    pub cherry_prob: u32,
    pub coin_points: u32,
    pub coin_prob: u32,
    pub lemon_points: u32,
    pub lemon_prob: u32,
    pub six_points: u32,
    pub six_prob: u32,
    // Pattern multipliers
    pub pattern_h3_mult: u32,
    pub pattern_h4_mult: u32,
    pub pattern_h5_mult: u32,
    pub pattern_v3_mult: u32,
    pub pattern_d3_mult: u32,
    // 666 probability
    pub probability_666: u32,
    // CHIP emission
    pub chip_emission_rate: u32,
    pub chip_boost_multiplier: u32,
    // Pricing
    pub entry_price_usd: u256,
    // Counters
    pub total_sessions: u32,
    pub total_competitive_sessions: u32,
    pub total_items: u32,
    // Revenue split + swap config
    pub burn_percentage: u8,
    pub treasury_percentage: u8,
    pub team_percentage: u8,
    pub ekubo_router: ContractAddress,
    pub pool_fee: u128,
    pub pool_tick_spacing: u128,
    pub pool_extension: ContractAddress,
    pub pool_sqrt: u256,
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION - Per-game session state
// ═══════════════════════════════════════════════════════════════════════════

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct Session {
    #[key]
    pub session_id: u32,
    pub player_address: ContractAddress,
    pub level: u32,
    pub score: u32,
    pub total_score: u32,
    pub spins_remaining: u32,
    pub is_competitive: bool,
    pub is_active: bool,
    pub created_at: u64,
    pub chips_claimed: bool,
    // Relic system
    pub equipped_relic: u256,
    pub relic_last_used_spin: u32,
    pub relic_pending_effect: u8,
    pub total_spins: u32,
    // Charm system
    pub luck: u32,
    pub blocked_666_this_session: bool,
    // Economy
    pub tickets: u32,
    // Dynamic symbol scores (cumulative item buffs)
    pub score_seven: u32,
    pub score_diamond: u32,
    pub score_cherry: u32,
    pub score_coin: u32,
    pub score_lemon: u32,
}

// ═══════════════════════════════════════════════════════════════════════════
// SPIN RESULT - Last spin outcome per session
// ═══════════════════════════════════════════════════════════════════════════

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct SpinResult {
    #[key]
    pub session_id: u32,
    // Grid stored as individual cells (Dojo models can't have fixed arrays)
    pub cell_0: u8,
    pub cell_1: u8,
    pub cell_2: u8,
    pub cell_3: u8,
    pub cell_4: u8,
    pub cell_5: u8,
    pub cell_6: u8,
    pub cell_7: u8,
    pub cell_8: u8,
    pub cell_9: u8,
    pub cell_10: u8,
    pub cell_11: u8,
    pub cell_12: u8,
    pub cell_13: u8,
    pub cell_14: u8,
    // Outcome
    pub score: u32,
    pub patterns_count: u8,
    pub is_666: bool,
    pub is_jackpot: bool,
    pub is_pending: bool,
    pub biblia_used: bool,
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION MARKET - Market state per session
// ═══════════════════════════════════════════════════════════════════════════

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct SessionMarket {
    #[key]
    pub session_id: u32,
    pub refresh_count: u32,
    pub item_slot_1: u32,
    pub item_slot_2: u32,
    pub item_slot_3: u32,
    pub item_slot_4: u32,
    pub item_slot_5: u32,
    pub item_slot_6: u32,
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct SessionChipBonus {
    #[key]
    pub session_id: u32,
    pub bonus_units: u32,
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct SessionItemPurchaseCount {
    #[key]
    pub session_id: u32,
    #[key]
    pub item_id: u32,
    pub count: u32,
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION INVENTORY - Items owned per session
// ═══════════════════════════════════════════════════════════════════════════

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct SessionInventory {
    #[key]
    pub session_id: u32,
    #[key]
    pub item_id: u32,
    pub quantity: u32,
}

// ═══════════════════════════════════════════════════════════════════════════
// MARKET SLOT PURCHASED - Track purchased slots per session
// ═══════════════════════════════════════════════════════════════════════════

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct MarketSlotPurchased {
    #[key]
    pub session_id: u32,
    #[key]
    pub slot: u32,
    pub purchased: bool,
}

// ═══════════════════════════════════════════════════════════════════════════
// ITEM - Item definition (static data)
// ═══════════════════════════════════════════════════════════════════════════

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct Item {
    #[key]
    pub item_id: u32,
    pub name: felt252,
    pub description: felt252,
    pub price: u32,
    pub sell_price: u32,
    pub effect_type: u8,
    pub effect_value: u32,
    pub target_symbol: felt252,
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAYER SESSIONS - Track sessions per player
// ═══════════════════════════════════════════════════════════════════════════

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct PlayerSessions {
    #[key]
    pub player: ContractAddress,
    pub count: u32,
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct PlayerSessionEntry {
    #[key]
    pub player: ContractAddress,
    #[key]
    pub index: u32,
    pub session_id: u32,
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION INVENTORY INDEX - Track item IDs per session
// ═══════════════════════════════════════════════════════════════════════════

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct SessionItemIndex {
    #[key]
    pub session_id: u32,
    pub count: u32,
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct SessionItemEntry {
    #[key]
    pub session_id: u32,
    #[key]
    pub index: u32,
    pub item_id: u32,
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION CHARMS - Track charms equipped per session
// ═══════════════════════════════════════════════════════════════════════════

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct SessionCharms {
    #[key]
    pub session_id: u32,
    pub count: u32,
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct SessionCharmEntry {
    #[key]
    pub session_id: u32,
    #[key]
    pub index: u32,
    pub charm_id: u32,
}

// ═══════════════════════════════════════════════════════════════════════════
// TOKEN PAIR IDS - Oracle price feed mapping
// ═══════════════════════════════════════════════════════════════════════════

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct TokenPairId {
    #[key]
    pub token: ContractAddress,
    pub pair_id: felt252,
}

// ═══════════════════════════════════════════════════════════════════════════
// BEAST SESSIONS - Track free sessions from Beast NFTs
// ═══════════════════════════════════════════════════════════════════════════

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct BeastSessionsUsed {
    #[key]
    pub player: ContractAddress,
    pub count: u32,
}

// ═══════════════════════════════════════════════════════════════════════════
// X SHARE SESSION CLAIM - Track a single externally granted free session
// ═══════════════════════════════════════════════════════════════════════════

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct XShareSessionClaim {
    #[key]
    pub player: ContractAddress,
    pub granted: bool,
    pub used: bool,
}
