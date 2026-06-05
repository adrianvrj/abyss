// World namespace
#[inline]
pub fn NAMESPACE() -> ByteArray {
    "ABYSS"
}

#[inline]
pub fn NAME() -> ByteArray {
    "Abyss"
}

#[inline]
pub fn SYMBOL() -> ByteArray {
    "ABYSS"
}

#[inline]
pub fn DESCRIPTION() -> ByteArray {
    "Abyss is a fully onchain slot machine game built on Starknet with Dojo Engine."
}

pub fn IMAGE() -> ByteArray {
    "https://static.cartridge.gg/presets/abyss/icon.png"
}

pub fn BANNER() -> ByteArray {
    "https://static.cartridge.gg/presets/abyss/cover.png"
}

pub fn CLIENT_URL() -> ByteArray {
    "https://play.abyssgame.fun"
}

pub fn METADATA_URL() -> ByteArray {
    "https://abyssgame.fun"
}

pub fn CHARM_BASE_URI() -> ByteArray {
    METADATA_URL() + "/api/charms/"
}

pub fn RELIC_BASE_URI() -> ByteArray {
    METADATA_URL() + "/api/relics/"
}

pub fn GOLDEN_CHIP_BASE_URI() -> ByteArray {
    METADATA_URL() + "/api/golden-chip/"
}

pub const WORLD_RESOURCE: felt252 = 0;

// Session defaults
pub const DEFAULT_SPINS: u32 = 5;
pub const MAX_CURRENT_SPINS: u32 = 8;
pub const DEFAULT_TICKETS: u32 = 7;

// Default symbol scores
pub const DEFAULT_SCORE_SEVEN: u32 = 7;
pub const DEFAULT_SCORE_DIAMOND: u32 = 5;
pub const DEFAULT_SCORE_CHERRY: u32 = 4;
pub const DEFAULT_SCORE_COIN: u32 = 3;
pub const DEFAULT_SCORE_LEMON: u32 = 2;

// Grid dimensions
pub const GRID_SIZE: u32 = 15; // 3 rows x 5 columns
pub const GRID_ROWS: u32 = 3;
pub const GRID_COLS: u32 = 5;

// Symbol count (excluding special)
pub const SYMBOL_COUNT: u8 = 6;

// Pattern multipliers (defaults)
pub const PATTERN_H3_MULT: u32 = 2;
pub const PATTERN_H4_MULT: u32 = 5;
pub const PATTERN_H5_MULT: u32 = 10;
pub const PATTERN_V3_MULT: u32 = 3;
pub const PATTERN_D3_MULT: u32 = 4;

// 666 probability (base: 150 = 1.5% out of 10000)
pub const BASE_666_PROBABILITY: u32 = 150;
pub const PROBABILITY_SCALE: u32 = 10000;

// Jackpot threshold
pub const JACKPOT_THREE_SEVENS: u32 = 3;

// Market
pub const MARKET_SLOTS: u32 = 6;
pub const BASE_REFRESH_COST: u32 = 50;
pub const TOTAL_ITEMS: u32 = 41;
pub const MARKET_CHARM_APPEAR_CHANCE: u32 = 22;

// CHIP token
pub const CHIP_DECIMALS: u32 = 18;
pub const CHIP_SCORE_DIVISOR: u32 = 20;
pub const DEFAULT_CHIP_EMISSION_RATE: u32 = 1; // 1 CHIP per 20 score
pub const DEFAULT_CHIP_BOOST_MULTIPLIER: u32 = 1;
pub const CHIP_TOTAL_SUPPLY: u256 = 10_000_000_000_000_000_000_000_000;
pub const CHIP_UNIT: u256 = 1_000_000_000_000_000_000;
pub const GAMEPLAY_REWARD_POOL: u256 = 3_000_000_000_000_000_000_000_000;
pub const CHARM_REWARD_POOL: u256 = 1_000_000_000_000_000_000_000_000;
pub const REWARD_RESERVE_POOL: u256 = 500_000_000_000_000_000_000_000;
pub const SESSION_ENTRY_PRICE_USD: u256 = 1_000_000;

// Golden Chip NFT
pub const GOLDEN_CHIP_MINT_PRICE: u256 = 150_000_000;
pub const GOLDEN_CHIP_INITIAL_SUPPLY: u32 = 200;
pub const GOLDEN_CHIP_DAILY_RUNS: u32 = 1;
pub const GOLDEN_CHIP_DAY_SECONDS: u64 = 86400;

// Revenue distribution (out of 100)
// 50% buyback-burn · 25% project revenue (team) · 25% leaderboard prize pool
pub const REVENUE_BURN_PCT: u32 = 50;
pub const REVENUE_TREASURY_PCT: u32 = 0;
pub const REVENUE_TEAM_PCT: u32 = 25;
pub const REVENUE_PRIZE_PCT: u32 = 25;

// Leaderboard
pub const LEADERBOARD_SIZE: u32 = 10;

// ── Seasons
// ──────────────────────────────────────────────────────────────
// Monthly competitive seasons. The active season's top-3 sessions split the
// accumulated USDC prize pool 50/30/20 once the season ends.
pub const SEASON_DURATION: u64 = 2_592_000; // 30 days in seconds
// Season 1 reuses the pre-existing global leaderboard so current scores carry
// over. Subsequent seasons use LEADERBOARD_BASE_ID + season_id (a range that
// will never collide with the legacy id 2).
pub const SEASON_1_LEADERBOARD_ID: felt252 = 2;
pub const LEADERBOARD_BASE_ID: felt252 = 1000;
pub const LEADERBOARD_CAP: u8 = 100;
// Prize split for season top-3 (out of 100).
pub const PRIZE_PCT_RANK_1: u256 = 50;
pub const PRIZE_PCT_RANK_2: u256 = 30;
pub const PRIZE_PCT_RANK_3: u256 = 20;

// Level thresholds
pub const LEVEL_1_THRESHOLD: u32 = 66;
pub const LEVEL_2_THRESHOLD: u32 = 220;
pub const LEVEL_3_THRESHOLD: u32 = 450;
pub const LEVEL_4_THRESHOLD: u32 = 1000;
pub const LEVEL_5_THRESHOLD: u32 = 2200;
pub const LEVEL_6_THRESHOLD: u32 = 5000;
pub const LEVEL_7_THRESHOLD: u32 = 9500;
pub const LEVEL_8_THRESHOLD: u32 = 17000;
pub const LEVEL_9_THRESHOLD: u32 = 24500;
pub const LEVEL_10_THRESHOLD: u32 = 42000;
