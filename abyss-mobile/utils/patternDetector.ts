import { SymbolType } from '../types';
import { GameConfig, PatternType } from '../constants/GameConfig';

export interface Pattern {
  type: PatternType;
  positions: [number, number][]; // [row, col] pairs
  symbol: SymbolType;
  multiplier: number;
}

/**
 * Detect horizontal patterns (3, 4, or 5 in a row)
 * Only the highest priority pattern per row is counted
 */
export function detectHorizontalPatterns(grid: SymbolType[][]): Pattern[] {
  const patterns: Pattern[] = [];

  for (let row = 0; row < 3; row++) {
    let bestPattern: Pattern | null = null;

    // Check for 5-in-a-row first (highest priority)
    if (grid[row].every(symbol => symbol === grid[row][0])) {
      bestPattern = {
        type: 'horizontal-5',
        positions: grid[row].map((_, col) => [row, col] as [number, number]),
        symbol: grid[row][0],
        multiplier: 0, // Set later
      };
    } else {
      // Check for 4-in-a-row (second priority)
      for (let col = 0; col <= 1; col++) {
        const subset = grid[row].slice(col, col + 4);
        if (subset.every(symbol => symbol === subset[0])) {
          bestPattern = {
            type: 'horizontal-4',
            positions: subset.map((_, i) => [row, col + i] as [number, number]),
            symbol: subset[0],
            multiplier: 0,
          };
          break; // Found 4-in-a-row, don't check for 3
        }
      }

      // Only check for 3-in-a-row if no 4-in-a-row was found
      if (!bestPattern) {
        for (let col = 0; col <= 2; col++) {
          const subset = grid[row].slice(col, col + 3);
          if (subset.every(symbol => symbol === subset[0])) {
            bestPattern = {
              type: 'horizontal-3',
              positions: subset.map((_, i) => [row, col + i] as [number, number]),
              symbol: subset[0],
              multiplier: 0,
            };
            break; // Found 3-in-a-row, stop checking
          }
        }
      }
    }

    // Add the best pattern found for this row
    if (bestPattern) {
      patterns.push(bestPattern);
    }
  }

  return patterns;
}

/**
 * Detect vertical patterns (3 in a column)
 */
export function detectVerticalPatterns(grid: SymbolType[][]): Pattern[] {
  const patterns: Pattern[] = [];

  for (let col = 0; col < 5; col++) {
    const column = [grid[0][col], grid[1][col], grid[2][col]];
    if (column.every(symbol => symbol === column[0])) {
      patterns.push({
        type: 'vertical-3',
        positions: column.map((_, row) => [row, col] as [number, number]),
        symbol: column[0],
        multiplier: 0,
      });
    }
  }

  return patterns;
}

/**
 * Detect diagonal patterns (3 symbols diagonally)
 */
export function detectDiagonalPatterns(grid: SymbolType[][]): Pattern[] {
  const patterns: Pattern[] = [];

  // Top-left to bottom-right diagonals
  for (let startCol = 0; startCol <= 2; startCol++) {
    const diagonal = [
      grid[0][startCol],
      grid[1][startCol + 1],
      grid[2][startCol + 2],
    ];
    if (diagonal.every(symbol => symbol === diagonal[0])) {
      patterns.push({
        type: 'diagonal-3',
        positions: [
          [0, startCol],
          [1, startCol + 1],
          [2, startCol + 2],
        ],
        symbol: diagonal[0],
        multiplier: 0,
      });
    }
  }

  // Top-right to bottom-left diagonals
  for (let startCol = 2; startCol <= 4; startCol++) {
    const diagonal = [
      grid[0][startCol],
      grid[1][startCol - 1],
      grid[2][startCol - 2],
    ];
    if (diagonal.every(symbol => symbol === diagonal[0])) {
      patterns.push({
        type: 'diagonal-3',
        positions: [
          [0, startCol],
          [1, startCol - 1],
          [2, startCol - 2],
        ],
        symbol: diagonal[0],
        multiplier: 0,
      });
    }
  }

  return patterns;
}

function getMultiplierForPattern(type: PatternType, config: GameConfig): number {
  const multiplierConfig = config.patternMultipliers.find(pm => pm.type === type);
  return multiplierConfig?.multiplier || 1;
}

/**
 * Detect jackpot pattern - all 15 cells have the same symbol
 */
export function detectJackpot(grid: SymbolType[][]): Pattern | null {
  const firstSymbol = grid[0][0];

  // Check if all 15 cells match the first symbol
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      if (grid[row][col] !== firstSymbol) {
        return null;
      }
    }
  }

  // All cells match - JACKPOT!
  const positions: [number, number][] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      positions.push([row, col]);
    }
  }

  return {
    type: 'jackpot',
    positions,
    symbol: firstSymbol,
    multiplier: 0, // Set later
  };
}

/**
 * Detect all patterns in the grid and assign multipliers
 */
export function detectPatterns(grid: SymbolType[][], config: GameConfig): Pattern[] {
  try {
    const patterns: Pattern[] = [];

    // Detect all normal patterns first
    patterns.push(...detectHorizontalPatterns(grid));
    patterns.push(...detectVerticalPatterns(grid));
    patterns.push(...detectDiagonalPatterns(grid));

    // Check for jackpot - adds bonus on top of other patterns
    const jackpot = detectJackpot(grid);
    if (jackpot) {
      patterns.push(jackpot);
    }

    // Add multipliers from config
    return patterns.map(pattern => ({
      ...pattern,
      multiplier: getMultiplierForPattern(pattern.type, config),
    }));
  } catch (error) {
    console.error('Error detecting patterns:', error);
    return [];
  }
}
