import { SymbolType } from '../types';
import { GameConfig, SymbolConfig, DEFAULT_GAME_CONFIG } from '../constants/GameConfig';

export interface GenerateSymbolsResult {
  grid: SymbolType[][];
  is666: boolean;
}

/**
 * Check if 666 pattern should trigger based on probability
 */
export function check666Trigger(probability: number): boolean {
  return Math.random() * 100 < probability;
}

/**
 * Generate a single symbol using weighted random selection
 */
export function generateWeightedSymbol(symbolConfigs: SymbolConfig[]): SymbolType {
  try {
    const totalWeight = symbolConfigs.reduce((sum, s) => sum + s.probability, 0);
    let random = Math.random() * totalWeight;

    for (const config of symbolConfigs) {
      random -= config.probability;
      if (random <= 0) {
        return config.type;
      }
    }

    // Fallback to first symbol
    return symbolConfigs[0].type;
  } catch (error) {
    console.error('Error in generateWeightedSymbol:', error);
    // Fallback to uniform random
    const randomIndex = Math.floor(Math.random() * symbolConfigs.length);
    return symbolConfigs[randomIndex].type;
  }
}

/**
 * Generate 666 grid with three sixes ONLY in the middle 3 positions (row 1, cols 1-3)
 * Other positions must NOT be 'six'
 */
function generate666Grid(symbolConfigs: SymbolConfig[]): SymbolType[][] {
  const grid: SymbolType[][] = [];
  // Filter out 'six' from symbols for other positions
  const nonSixSymbols = symbolConfigs.filter(s => s.type !== 'six');

  for (let row = 0; row < 3; row++) {
    grid[row] = [];
    for (let col = 0; col < 5; col++) {
      // ONLY middle row (row 1), middle 3 positions (cols 1, 2, 3) get 'six'
      if (row === 1 && col >= 1 && col <= 3) {
        grid[row][col] = 'six';
      } else {
        // All other positions: generate from non-six symbols only
        grid[row][col] = generateWeightedSymbol(nonSixSymbols);
      }
    }
  }

  return grid;
}

/**
 * Generate symbols for a spin, checking for 666 pattern first
 */
export function generateSymbols(config: GameConfig = DEFAULT_GAME_CONFIG): GenerateSymbolsResult {
  // First check if 666 triggers
  const is666 = check666Trigger(config.probability666);

  if (is666) {
    const grid = generate666Grid(config.symbols);
    return {
      grid,
      is666: true,
    };
  }

  // Generate normal weighted random grid - EXCLUDE 'six' from normal spins
  const nonSixSymbols = config.symbols.filter(s => s.type !== 'six');
  const grid: SymbolType[][] = [];
  for (let row = 0; row < 3; row++) {
    grid[row] = [];
    for (let col = 0; col < 5; col++) {
      grid[row][col] = generateWeightedSymbol(nonSixSymbols);
    }
  }
  return {
    grid,
    is666: false,
  };
}
