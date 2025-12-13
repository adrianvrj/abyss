import { SymbolType, Pattern, PatternBonus, ScoreBreakdown } from './types';
import { GameConfig } from './types';

export function calculatePatternBonus(pattern: Pattern, config: GameConfig): number {
    try {
        const symbolConfig = config.symbols.find(s => s.type === pattern.symbol);
        if (!symbolConfig) return 0;
        const symbolValueInPattern = symbolConfig.points * pattern.positions.length;
        return Math.max(0, symbolValueInPattern * pattern.multiplier);
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
        const patternBonuses: PatternBonus[] = patterns.map(pattern => {
            const bonus = calculatePatternBonus(pattern, config);
            return { pattern, bonus };
        });

        const totalScore = patternBonuses.reduce((sum, pb) => sum + pb.bonus, 0);

        return {
            baseScore: 0,
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
