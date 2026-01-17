import { DEFAULT_GAME_CONFIG, GameConfig, PatternType, SymbolType as GameConfigSymbolType } from './GameConfig';
import { SYMBOLS } from '@/lib/constants';

export interface Pattern {
    type: PatternType;
    positions: [number, number][]; // [row, col] pairs
    symbolId: number;
    multiplier: number;
    score: number;
}

// Convert 1D grid (15) to 2D grid (3x5)
export function convertToMatrix(grid: number[]): number[][] {
    const matrix: number[][] = [];
    for (let i = 0; i < 3; i++) {
        const row: number[] = [];
        for (let j = 0; j < 5; j++) {
            row.push(grid[i * 5 + j]);
        }
        matrix.push(row);
    }
    return matrix;
}

function getSymbolType(id: number): GameConfigSymbolType {
    const name = SYMBOLS[id]?.name.toLowerCase();
    return name as GameConfigSymbolType;
}

// Score bonuses from inventory items (DirectScoreBonus)
export interface ScoreBonuses {
    seven: number;
    diamond: number;
    cherry: number;
    coin: number;
    lemon: number;
}

const DEFAULT_BONUSES: ScoreBonuses = { seven: 0, diamond: 0, cherry: 0, coin: 0, lemon: 0 };

function calculateScore(symbolId: number, patternType: PatternType, symbolCount: number, config: GameConfig, bonuses: ScoreBonuses = DEFAULT_BONUSES, symbolScores?: number[]): number {
    const symbolType = getSymbolType(symbolId);
    const symbolConfig = config.symbols.find(s => s.type === symbolType);
    const multiplierConfig = config.patternMultipliers.find(pm => pm.type === patternType);

    if (!symbolConfig || !multiplierConfig) return 0;

    let baseScore = 0;

    // If dynamic symbolScores are provided, use them directly (they include cumulative upgrades)
    if (symbolScores && symbolScores.length === 5) {
        // Map symbol types to score indices: 0: seven, 1: diamond, 2: cherry, 3: coin, 4: lemon
        const scoreIndices: Record<string, number> = {
            'seven': 0, 'diamond': 1, 'cherry': 2, 'coin': 3, 'lemon': 4
        };
        const index = scoreIndices[symbolType] ?? -1;
        if (index >= 0) {
            baseScore = symbolScores[index] * symbolCount;
        } else {
            // Fallback for symbols not in the upgradable list (e.g. if any)
            baseScore = symbolConfig.points * symbolCount;
        }
    } else {
        // Fallback to old logic: ((Symbol Points + Bonus) * Count)
        const bonus = bonuses[symbolType as keyof ScoreBonuses] || 0;
        baseScore = (symbolConfig.points + bonus) * symbolCount;
    }

    return Math.floor(baseScore * multiplierConfig.multiplier);
}

export function detectPatterns(flatGrid: number[], config: GameConfig = DEFAULT_GAME_CONFIG, bonuses: ScoreBonuses = DEFAULT_BONUSES, symbolScores?: number[]): Pattern[] {
    const grid = convertToMatrix(flatGrid);
    const patterns: Pattern[] = [];

    // Horizontal
    for (let row = 0; row < 3; row++) {
        let bestPattern: Pattern | null = null;

        // 5 in a row
        if (grid[row].every(s => s === grid[row][0])) {
            bestPattern = {
                type: 'horizontal-5',
                positions: grid[row].map((_, col) => [row, col]),
                symbolId: grid[row][0],
                multiplier: 0, score: 0
            };
        } else {
            // 4 in a row
            for (let col = 0; col <= 1; col++) {
                const subset = grid[row].slice(col, col + 4);
                if (subset.every(s => s === subset[0])) {
                    bestPattern = {
                        type: 'horizontal-4',
                        positions: subset.map((_, i) => [row, col + i]),
                        symbolId: subset[0],
                        multiplier: 0, score: 0
                    };
                    break;
                }
            }
            if (!bestPattern) {
                // 3 in a row
                for (let col = 0; col <= 2; col++) {
                    const subset = grid[row].slice(col, col + 3);
                    if (subset.every(s => s === subset[0])) {
                        bestPattern = {
                            type: 'horizontal-3',
                            positions: subset.map((_, i) => [row, col + i]),
                            symbolId: subset[0],
                            multiplier: 0, score: 0
                        };
                        break;
                    }
                }
            }
        }
        if (bestPattern) patterns.push(bestPattern);
    }

    // Vertical
    for (let col = 0; col < 5; col++) {
        const column = [grid[0][col], grid[1][col], grid[2][col]];
        if (column.every(s => s === column[0])) {
            patterns.push({
                type: 'vertical-3',
                positions: column.map((_, r) => [r, col]),
                symbolId: column[0],
                multiplier: 0, score: 0
            });
        }
    }

    // Diagonals (Top-Left to Bottom-Right)
    for (let startCol = 0; startCol <= 2; startCol++) {
        const diagonal = [grid[0][startCol], grid[1][startCol + 1], grid[2][startCol + 2]];
        if (diagonal.every(s => s === diagonal[0])) {
            patterns.push({
                type: 'diagonal-3',
                positions: [[0, startCol], [1, startCol + 1], [2, startCol + 2]],
                symbolId: diagonal[0],
                multiplier: 0, score: 0
            });
        }
    }

    // Diagonals (Top-Right to Bottom-Left)
    for (let startCol = 2; startCol <= 4; startCol++) {
        const diagonal = [grid[0][startCol], grid[1][startCol - 1], grid[2][startCol - 2]];
        if (diagonal.every(s => s === diagonal[0])) {
            patterns.push({
                type: 'diagonal-3',
                positions: [[0, startCol], [1, startCol - 1], [2, startCol - 2]],
                symbolId: diagonal[0],
                multiplier: 0, score: 0
            });
        }
    }

    // Jackpot (All Same)
    const first = grid[0][0];
    let isJackpot = true;
    for (let r = 0; r < 3; r++) { for (let c = 0; c < 5; c++) { if (grid[r][c] !== first) isJackpot = false; } }
    if (isJackpot) {
        const positions: [number, number][] = [];
        for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) positions.push([r, c]);
        patterns.push({
            type: 'jackpot',
            positions,
            symbolId: first,
            multiplier: 0, score: 0
        });
    }

    // Calculate Scores & Multipliers
    return patterns.map(p => {
        const score = calculateScore(p.symbolId, p.type, p.positions.length, config, bonuses, symbolScores);
        const mult = config.patternMultipliers.find(pm => pm.type === p.type)?.multiplier || 0;
        return { ...p, score, multiplier: mult };
    });
}
