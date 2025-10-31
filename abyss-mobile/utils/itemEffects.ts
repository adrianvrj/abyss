import { GameConfig, SymbolConfig, PatternMultiplier } from '@/constants/GameConfig';
import { ContractItem, ItemEffectType } from './abyssContract';

export interface AppliedEffects {
  modifiedConfig: GameConfig;
  activeEffects: EffectSummary[];
}

export interface EffectSummary {
  itemId: number;
  itemName: string;
  effectType: ItemEffectType;
  effectValue: number;
  targetSymbol?: string;
  description: string;
}

/**
 * Apply item effects to base game configuration
 * Implements all effect types: DirectScoreBonus, SymbolProbabilityBoost, PatternMultiplierBoost
 */
export function applyItemEffects(
  baseConfig: GameConfig,
  ownedItems: ContractItem[]
): AppliedEffects {
  // Deep copy to avoid mutating base config
  let modifiedConfig: GameConfig = JSON.parse(JSON.stringify(baseConfig));
  const activeEffects: EffectSummary[] = [];

  // Apply DirectScoreBonus effects - adds points to specific symbols
  ownedItems
    .filter(item => item.effect_type === ItemEffectType.DirectScoreBonus)
    .forEach(item => {
      const symbolConfig = modifiedConfig.symbols.find(
        s => s.type === item.target_symbol
      );
      if (symbolConfig) {
        symbolConfig.points += item.effect_value;
        activeEffects.push(createEffectSummary(item));
      }
    });

  // Apply SymbolProbabilityBoost effects - increases spawn chance for specific symbols
  ownedItems
    .filter(item => item.effect_type === ItemEffectType.SymbolProbabilityBoost)
    .forEach(item => {
      const symbolConfig = modifiedConfig.symbols.find(
        s => s.type === item.target_symbol
      );
      if (symbolConfig) {
        symbolConfig.probability += item.effect_value;
        activeEffects.push(createEffectSummary(item));
      }
    });

  // Normalize probabilities to ensure they sum to 100%
  normalizeProbabilities(modifiedConfig.symbols);

  // Apply PatternMultiplierBoost effects - boosts all pattern multipliers by percentage
  // Multiple boosts stack additively (e.g., +10% and +25% = +35% total)
  const patternBoostTotal = ownedItems
    .filter(item => item.effect_type === ItemEffectType.PatternMultiplierBoost)
    .reduce((sum, item) => {
      activeEffects.push(createEffectSummary(item));
      return sum + item.effect_value;
    }, 0);

  if (patternBoostTotal > 0) {
    modifiedConfig.patternMultipliers = modifiedConfig.patternMultipliers.map(pm => ({
      ...pm,
      multiplier: Math.round(pm.multiplier * (100 + patternBoostTotal) / 100)
    }));
  }

  return { modifiedConfig, activeEffects };
}

/**
 * Calculate additional spins from SpinBonus items
 * All SpinBonus effects stack additively
 */
export function calculateBonusSpins(ownedItems: ContractItem[]): number {
  return ownedItems
    .filter(item => item.effect_type === ItemEffectType.SpinBonus)
    .reduce((sum, item) => sum + item.effect_value, 0);
}

/**
 * Calculate score multiplier from ScoreMultiplier items
 * Returns a decimal multiplier (e.g., 1.2 for 20% boost)
 * Multiple multipliers stack additively (e.g., +20% and +50% = +70% = 1.7x)
 */
export function calculateScoreMultiplier(ownedItems: ContractItem[]): number {
  const multiplierBonus = ownedItems
    .filter(item => item.effect_type === ItemEffectType.ScoreMultiplier)
    .reduce((sum, item) => sum + item.effect_value, 0);

  return (100 + multiplierBonus) / 100; // Convert percentage to decimal
}

/**
 * Calculate level progression reduction from LevelProgressionBonus items
 * Returns percentage reduction (e.g., 15 for 15% reduction in XP requirements)
 * Multiple bonuses stack additively
 */
export function calculateLevelProgressionBonus(ownedItems: ContractItem[]): number {
  return ownedItems
    .filter(item => item.effect_type === ItemEffectType.LevelProgressionBonus)
    .reduce((sum, item) => sum + item.effect_value, 0);
}

/**
 * Normalize symbol probabilities to sum to 100%
 * Adjusts all probabilities proportionally to maintain balance
 */
function normalizeProbabilities(symbols: SymbolConfig[]): void {
  const total = symbols.reduce((sum, s) => sum + s.probability, 0);

  if (total !== 100) {
    const factor = 100 / total;

    // Apply factor and round
    symbols.forEach(s => {
      s.probability = Math.round(s.probability * factor);
    });

    // Handle rounding errors - adjust the largest probability
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

/**
 * Create a summary object for an item effect for UI display
 */
function createEffectSummary(item: ContractItem): EffectSummary {
  return {
    itemId: item.item_id,
    itemName: item.name,
    effectType: item.effect_type,
    effectValue: item.effect_value,
    targetSymbol: item.target_symbol || undefined,
    description: item.description,
  };
}
