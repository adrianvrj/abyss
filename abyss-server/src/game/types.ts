export type SymbolType = 'diamond' | 'cherry' | 'lemon' | 'seven' | 'six' | 'coin';

export interface SymbolConfig {
    type: SymbolType;
    points: number;
    probability: number; // 0-100
}

export type PatternType =
    | 'horizontal-3'
    | 'horizontal-4'
    | 'horizontal-5'
    | 'vertical-3'
    | 'diagonal-3'
    | 'jackpot';

export interface PatternMultiplier {
    type: PatternType;
    multiplier: number;
}

export interface GameConfig {
    symbols: SymbolConfig[];
    patternMultipliers: PatternMultiplier[];
    probability666: number; // 0-100
    probabilityJackpot: number; // 0-100, forced jackpot chance
}

export interface Pattern {
    type: PatternType;
    positions: [number, number][]; // [row, col] pairs
    symbol: SymbolType;
    multiplier: number;
}

export interface PatternBonus {
    pattern: Pattern;
    bonus: number;
}

export interface ScoreBreakdown {
    baseScore: number;
    patternBonuses: PatternBonus[];
    totalScore: number;
}

export interface GenerateSymbolsResult {
    grid: SymbolType[][];
    is666: boolean;
}
