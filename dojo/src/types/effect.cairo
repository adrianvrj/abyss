/// Item effect types - defines what the item modifies
pub mod ItemEffectType {
    pub const ScoreMultiplier: u8 = 0;
    pub const PatternMultiplierBoost: u8 = 1;
    pub const SymbolProbabilityBoost: u8 = 2;
    pub const DirectScoreBonus: u8 = 3;
    pub const SpinBonus: u8 = 4;
    pub const LevelProgressionBonus: u8 = 5;
    pub const SixSixSixProtection: u8 = 6;
    pub const SixSixSixCashOut: u8 = 11;
}

/// Relic effect types - active equipment effects
pub mod RelicEffectType {
    pub const NoEffect: u8 = 255;
    pub const RandomJackpot: u8 = 0;
    pub const Trigger666: u8 = 1;
    pub const DoubleNextSpin: u8 = 2;
    pub const ResetSpins: u8 = 3;
    pub const FreeMarketRefresh: u8 = 4;
}

/// Charm effect types - passive buff effects
pub mod CharmEffectType {
    pub const LuckBoost: u8 = 7;
    pub const PatternRetrigger: u8 = 8;
    pub const ExtraSpinWithLuck: u8 = 9;
    pub const ConditionalLuckBoost: u8 = 10;
}

/// Charm condition types - when passive effects activate
pub mod CharmConditionType {
    pub const None: u8 = 0;
    pub const NoPatternLastSpin: u8 = 1;
    pub const LowSpinsRemaining: u8 = 2;
    pub const PerItemInInventory: u8 = 3;
    pub const LowScore: u8 = 4;
    pub const HighLevel: u8 = 5;
    pub const Blocked666: u8 = 6;
}
