import { SymbolType } from '../types';

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
  | 'diagonal-3';

export interface PatternMultiplier {
  type: PatternType;
  multiplier: number;
}

export interface GameConfig {
  symbols: SymbolConfig[];
  patternMultipliers: PatternMultiplier[];
  probability666: number; // 0-100
  animationDurations: {
    spin: number;
    reveal: number;
    scoreCount: number;
  };
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  symbols: [
    { type: 'seven', points: 7, probability: 5 },
    { type: 'diamond', points: 5, probability: 10 },
    { type: 'cherry', points: 4, probability: 20 },
    { type: 'coin', points: 3, probability: 15 },
    { type: 'lemon', points: 2, probability: 25 },
    { type: 'six', points: 0, probability: 25 }, // Dangerous symbol - no points, contributes to 666
  ],
  patternMultipliers: [
    { type: 'horizontal-3', multiplier: 2 },
    { type: 'horizontal-4', multiplier: 5 },
    { type: 'horizontal-5', multiplier: 10 },
    { type: 'vertical-3', multiplier: 3 },
    { type: 'diagonal-3', multiplier: 4 },
  ],
  probability666: 1.5,
  animationDurations: {
    spin: 1500,
    reveal: 300,
    scoreCount: 800,
  },
};
