import { GameConfig, SymbolConfig } from './GameConfig';
import { ContractItem, ItemEffectType } from './abyssContract';

export interface AppliedEffects {
    modifiedConfig: GameConfig;
}

export interface SymbolProbabilityDistribution {
    type: SymbolConfig['type'];
    baseWeight: number;
    bonusWeight: number;
    finalWeight: number;
    probability: number;
    delta: number;
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

    // DirectScoreBonus items no longer modify base symbol points.
    // Their bonus accumulates per pattern hit during spins.

    // Apply SymbolProbabilityBoost effects
    ownedItems
        .filter(item => item.effect_type === ItemEffectType.SymbolProbabilityBoost)
        .forEach(item => {
            if (item.target_symbol === 'anti-coin') {
                const coinSymbol = modifiedConfig.symbols.find((symbol) => symbol.type === 'coin');
                if (coinSymbol) {
                    coinSymbol.probability = Math.max(0, coinSymbol.probability - item.effect_value);
                }
                return;
            }

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

export function getSymbolProbabilityDistribution(
    baseConfig: GameConfig,
    ownedItems: ContractItem[]
): SymbolProbabilityDistribution[] {
    const symbols = baseConfig.symbols.map((symbol) => {
        const bonusWeight = ownedItems.reduce((sum, item) => {
            if (
                item.effect_type === ItemEffectType.SymbolProbabilityBoost &&
                item.target_symbol === symbol.type
            ) {
                return sum + item.effect_value;
            }

            if (
                item.effect_type === ItemEffectType.SymbolProbabilityBoost &&
                item.target_symbol === 'anti-coin' &&
                symbol.type === 'coin'
            ) {
                return sum - item.effect_value;
            }

            return sum;
        }, 0);

        const finalWeight = Math.max(0, symbol.probability + bonusWeight);

        return {
            type: symbol.type,
            baseWeight: symbol.probability,
            bonusWeight,
            finalWeight,
        };
    });

    const baseTotal = symbols.reduce((sum, symbol) => sum + symbol.baseWeight, 0);
    const finalTotal = symbols.reduce((sum, symbol) => sum + symbol.finalWeight, 0);

    return symbols.map((symbol) => {
        const baseProbability =
            baseTotal > 0 ? (symbol.baseWeight / baseTotal) * 100 : 0;
        const probability =
            finalTotal > 0 ? (symbol.finalWeight / finalTotal) * 100 : 0;

        return {
            ...symbol,
            probability,
            delta: probability - baseProbability,
        };
    });
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
