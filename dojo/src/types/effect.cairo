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
    pub const DebtPledge: u8 = 12;
    /// Snowball: each spin a pattern of the trigger symbol lands, the target
    /// pattern type's base multiplier grows by a flat amount (in hundredths of a
    /// multiplier), permanently for the session. No cap.
    pub const PatternSnowball: u8 = 13;
}

/// Pattern type targets for PatternSnowball charms (stored in CharmMetadata.condition_type).
pub mod SnowballPatternType {
    pub const Horizontal: u8 = 1;
    pub const Vertical: u8 = 2;
    pub const Diagonal: u8 = 3;
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
    pub const Consecutive666: u8 = 7;
    pub const AllPatternTypesSameSpin: u8 = 8;
}
