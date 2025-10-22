import { SymbolType } from '../types';
import { GameConfig } from '../constants/GameConfig';
import { Pattern } from './patternDetector';

export interface PatternBonus {
  pattern: Pattern;
  bonus: number;
}

export interface ScoreBreakdown {
  baseScore: number;
  patternBonuses: PatternBonus[];
  totalScore: number;
}

/**
 * Calculate base score from all symbols in the grid
 */
export function calculateBaseScore(grid: SymbolType[][], config: GameConfig): number {
  try {
    let total = 0;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        const symbol = grid[row][col];
        const symbolConfig = config.symbols.find(s => s.type === symbol);
        total += symbolConfig?.points || 0;
      }
    }

    return total;
  } catch (error) {
    console.error('Error calculating base score:', error);
    return 0;
  }
}

export function calculatePatternBonus(pattern: Pattern, config: GameConfig): number {
  try {
    const symbolConfig = config.symbols.find(s => s.type === pattern.symbol);
    if (!symbolConfig) return 0;

    const symbolValueInPattern = symbolConfig.points * pattern.positions.length;
    // Calculate total score: symbol points × pattern length × multiplier
    const totalScore = symbolValueInPattern * pattern.multiplier;

    return Math.max(0, totalScore);
  } catch (error) {
    console.error('Error calculating pattern bonus:', error);
    return 0;
  }
}

export function calculateScore(
  grid: SymbolType[][],
  patterns: Pattern[],
  config: GameConfig
): ScoreBreakdown {
  try {
    const baseScore = 0; // Base score not used - only patterns count

    const patternBonuses: PatternBonus[] = patterns.map(pattern => {
      const symbolConfig = config.symbols.find(s => s.type === pattern.symbol);
      if (!symbolConfig) return { pattern, bonus: 0 };

      const symbolValueInPattern = symbolConfig.points * pattern.positions.length;
      const bonus = symbolValueInPattern * pattern.multiplier;

      return { pattern, bonus };
    });

    const totalScore = patternBonuses.reduce((sum, pb) => sum + pb.bonus, 0);

    return {
      baseScore,
      patternBonuses,
      totalScore,
    };
  } catch (error) {
    console.error('Error calculating score:', error);
    return {
      baseScore: 0,
      patternBonuses: [],
      totalScore: 0,
    };
  }
}
