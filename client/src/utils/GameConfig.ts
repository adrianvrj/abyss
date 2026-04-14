export type SymbolType = 'seven' | 'diamond' | 'cherry' | 'coin' | 'lemon' | 'six';

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
    probability666: number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
    symbols: [
        { type: 'seven', points: 7, probability: 10 },
        { type: 'diamond', points: 5, probability: 15 },
        { type: 'cherry', points: 4, probability: 20 },
        { type: 'coin', points: 3, probability: 25 },
        { type: 'lemon', points: 2, probability: 30 },
        { type: 'six', points: 0, probability: 0 }, // Only appears on 666
    ],
    patternMultipliers: [
        { type: 'horizontal-3', multiplier: 1.5 },
        { type: 'horizontal-4', multiplier: 3 },
        { type: 'horizontal-5', multiplier: 6 },
        { type: 'vertical-3', multiplier: 2 },
        { type: 'diagonal-3', multiplier: 2.5 },
        { type: 'jackpot', multiplier: 10 },
    ],
    probability666: 1.5,
};


// Symbol display info
export const SYMBOL_INFO: Record<SymbolType, { name: string; emoji: string; color: string; image: string }> = {
    'seven': { name: 'Seven', emoji: '7️⃣', color: '#FFD700', image: '/images/seven.png' },
    'diamond': { name: 'Diamond', emoji: '💎', color: '#00BFFF', image: '/images/diamond.png' },
    'cherry': { name: 'Cherry', emoji: '🍒', color: '#FF4444', image: '/images/cherry.png' },
    'coin': { name: 'Coin', emoji: '🪙', color: '#FFB347', image: '/images/coin.png' },
    'lemon': { name: 'Lemon', emoji: '🍋', color: '#FFFF00', image: '/images/lemon.png' },
    'six': { name: 'Six', emoji: '6️⃣', color: '#8B0000', image: '/images/six.png' },
};
