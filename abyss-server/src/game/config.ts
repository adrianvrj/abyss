import { GameConfig } from './types';

export const DEFAULT_GAME_CONFIG: GameConfig = {
    symbols: [
        { type: 'seven', points: 7, probability: 5 },
        { type: 'diamond', points: 5, probability: 10 },
        { type: 'cherry', points: 4, probability: 20 },
        { type: 'coin', points: 3, probability: 15 },
        { type: 'lemon', points: 2, probability: 25 },
        { type: 'six', points: 0, probability: 25 }, // Dangerous symbol
    ],
    patternMultipliers: [
        { type: 'horizontal-3', multiplier: 1.5 },  // was 2
        { type: 'horizontal-4', multiplier: 3 },    // was 5
        { type: 'horizontal-5', multiplier: 6 },    // was 10
        { type: 'vertical-3', multiplier: 2 },      // was 3
        { type: 'diagonal-3', multiplier: 2.5 },    // was 4
    ],
    probability666: 1.5,
};
