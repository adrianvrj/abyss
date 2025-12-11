import { SymbolConfig, GameConfig } from './types';

/**
 * Item Effect Types (match contract values)
 */
export const ItemEffectType = {
    ScoreMultiplier: 0,        // Multiplies score by effect_value%
    PatternMultiplierBoost: 1, // Adds effect_value% to pattern multipliers
    SymbolProbabilityBoost: 2, // Increases probability of effect_target symbol
    DirectScoreBonus: 3,       // Adds effect_value to score directly
    SpinBonus: 4,              // Extra spins (handled at level up)
    LevelProgressionBonus: 5,  // Reduces score needed for level up
    SixSixSixProtection: 6,    // Protection from 666 (Biblia)
} as const;

/**
 * Item structure from client
 */
export interface OwnedItem {
    item_id: number;
    quantity: number;
    effect_type: number;
    effect_value: number;
    effect_target?: string; // Symbol type for SymbolProbabilityBoost
}

/**
 * Calculated bonuses from items
 */
export interface ItemBonuses {
    scoreMultiplier: number;       // Total multiplier (1.0 = no change)
    patternMultiplierBoost: number; // Percentage boost to pattern multipliers
    directScoreBonus: number;       // Flat score to add
    levelProgressionBonus: number;  // Percentage reduction in level threshold
    symbolProbabilityBoosts: Map<string, number>; // Symbol -> probability boost
    has666Protection: boolean;      // Has Biblia
}

/**
 * Calculate all bonuses from owned items
 */
export function calculateItemBonuses(ownedItems: OwnedItem[]): ItemBonuses {
    const bonuses: ItemBonuses = {
        scoreMultiplier: 1.0,
        patternMultiplierBoost: 0,
        directScoreBonus: 0,
        levelProgressionBonus: 0,
        symbolProbabilityBoosts: new Map(),
        has666Protection: false,
    };

    for (const item of ownedItems) {
        if (item.quantity <= 0) continue;

        const effectValue = item.effect_value * item.quantity;

        switch (item.effect_type) {
            case ItemEffectType.ScoreMultiplier:
                // Multiplicative: 10% boost = 1.1x, stacks multiplicatively
                bonuses.scoreMultiplier *= (1 + effectValue / 100);
                break;

            case ItemEffectType.PatternMultiplierBoost:
                // Additive percentage boost
                bonuses.patternMultiplierBoost += effectValue;
                break;

            case ItemEffectType.SymbolProbabilityBoost:
                // Boost probability for specific symbol
                if (item.effect_target) {
                    const current = bonuses.symbolProbabilityBoosts.get(item.effect_target) || 0;
                    bonuses.symbolProbabilityBoosts.set(item.effect_target, current + effectValue);
                }
                break;

            case ItemEffectType.DirectScoreBonus:
                // Flat bonus added to each spin
                bonuses.directScoreBonus += effectValue;
                break;

            case ItemEffectType.LevelProgressionBonus:
                // Percentage reduction in level threshold
                bonuses.levelProgressionBonus += effectValue;
                break;

            case ItemEffectType.SixSixSixProtection:
                bonuses.has666Protection = true;
                break;
        }
    }

    return bonuses;
}

/**
 * Apply symbol probability boosts to config
 */
export function applySymbolBoosts(
    baseConfig: GameConfig,
    symbolBoosts: Map<string, number>
): GameConfig {
    if (symbolBoosts.size === 0) {
        return baseConfig;
    }

    const modifiedSymbols = baseConfig.symbols.map(symbol => {
        const boost = symbolBoosts.get(symbol.type) || 0;
        if (boost > 0) {
            return {
                ...symbol,
                probability: symbol.probability + boost,
            };
        }
        return symbol;
    });

    return {
        ...baseConfig,
        symbols: modifiedSymbols,
    };
}

/**
 * Apply pattern multiplier boost
 */
export function applyPatternBoost(
    baseMultiplier: number,
    patternBoostPercent: number
): number {
    return baseMultiplier * (1 + patternBoostPercent / 100);
}

/**
 * Apply score multiplier and direct bonus
 */
export function applyScoreBonuses(
    baseScore: number,
    scoreMultiplier: number,
    directBonus: number
): number {
    return Math.floor(baseScore * scoreMultiplier) + directBonus;
}
