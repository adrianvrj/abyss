import { GameConfig, SymbolConfig } from './GameConfig';
import { ContractItem, ItemEffectType } from './abyssContract';

export interface AppliedEffects {
    modifiedConfig: GameConfig;
}

/**
 * Apply item effects to base game configuration
 */
export function applyItemEffects(
    baseConfig: GameConfig,
    ownedItems: ContractItem[]
): AppliedEffects {
    // Deep copy
    const modifiedConfig: GameConfig = JSON.parse(JSON.stringify(baseConfig));

    // Apply DirectScoreBonus effects
    ownedItems
        .filter(item => item.effect_type === ItemEffectType.DirectScoreBonus)
        .forEach(item => {
            const symbolConfig = modifiedConfig.symbols.find(s => s.type === item.target_symbol);
            if (symbolConfig) {
                symbolConfig.points += item.effect_value;
            }
        });

    // Apply SymbolProbabilityBoost effects
    ownedItems
        .filter(item => item.effect_type === ItemEffectType.SymbolProbabilityBoost)
        .forEach(item => {
            const symbolConfig = modifiedConfig.symbols.find(s => s.type === item.target_symbol);
            if (symbolConfig) {
                symbolConfig.probability += item.effect_value;
            }
        });

    // Normalize probabilities
    normalizeProbabilities(modifiedConfig.symbols);

    // Apply PatternMultiplierBoost effects
    const patternBoostTotal = ownedItems
        .filter(item => item.effect_type === ItemEffectType.PatternMultiplierBoost)
        .reduce((sum, item) => sum + item.effect_value, 0);

    if (patternBoostTotal > 0) {
        modifiedConfig.patternMultipliers = modifiedConfig.patternMultipliers.map(pm => ({
            ...pm,
            multiplier: Math.round(pm.multiplier * (100 + patternBoostTotal) / 100 * 10) / 10
        }));
    }

    return { modifiedConfig };
}

function normalizeProbabilities(symbols: SymbolConfig[]): void {
    const total = symbols.reduce((sum, s) => sum + s.probability, 0);

    if (total !== 100) {
        const factor = 100 / total;
        symbols.forEach(s => {
            s.probability = Math.round(s.probability * factor);
        });

        const newTotal = symbols.reduce((sum, s) => sum + s.probability, 0);
        if (newTotal !== 100) {
            const diff = 100 - newTotal;
            const largestSymbol = symbols.reduce((max, s) =>
                s.probability > max.probability ? s : max
            );
            largestSymbol.probability += diff;
        }
    }
}
