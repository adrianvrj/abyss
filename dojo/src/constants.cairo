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

pub const WORLD_RESOURCE: felt252 = 0;

// Session defaults
pub const DEFAULT_SPINS: u32 = 5;
pub const DEFAULT_TICKETS: u32 = 8;

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
pub const TOTAL_ITEMS: u32 = 40;

// CHIP token
pub const CHIP_DECIMALS: u32 = 18;
pub const CHIP_SCORE_DIVISOR: u32 = 20;
pub const DEFAULT_CHIP_EMISSION_RATE: u32 = 1; // 1 CHIP per 20 score
pub const DEFAULT_CHIP_BOOST_MULTIPLIER: u32 = 1;
pub const CHIP_TOTAL_SUPPLY: u256 = 10_000_000_000_000_000_000_000_000;

// Revenue distribution (out of 100)
pub const REVENUE_PRIZE_PCT: u32 = 50;
pub const REVENUE_TREASURY_PCT: u32 = 30;
pub const REVENUE_TEAM_PCT: u32 = 20;

// Leaderboard
pub const LEADERBOARD_SIZE: u32 = 10;

// Level thresholds
pub const LEVEL_1_THRESHOLD: u32 = 66;
pub const LEVEL_2_THRESHOLD: u32 = 222;
pub const LEVEL_3_THRESHOLD: u32 = 333;
pub const LEVEL_4_THRESHOLD: u32 = 666;
pub const LEVEL_5_THRESHOLD: u32 = 1000;
pub const LEVEL_6_THRESHOLD: u32 = 2000;
pub const LEVEL_7_THRESHOLD: u32 = 4000;
pub const LEVEL_8_THRESHOLD: u32 = 6000;
pub const LEVEL_9_THRESHOLD: u32 = 8000;
pub const LEVEL_10_THRESHOLD: u32 = 10000;
