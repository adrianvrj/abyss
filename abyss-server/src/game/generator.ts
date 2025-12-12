import { SymbolType, SymbolConfig, GenerateSymbolsResult } from './types';
import { GameConfig } from './types';
import { DEFAULT_GAME_CONFIG } from './config';
import * as crypto from 'crypto';

/**
 * Generate a random number between 0 and 1 using crypto
 */
function secureRandom(): number {
    return crypto.randomInt(0, 1000000) / 1000000;
}

/**
 * Check if 666 pattern should trigger based on probability
 */
export function check666Trigger(probability: number): boolean {
    return secureRandom() * 100 < probability;
}

/**
 * Generate a single symbol using weighted random selection
 */
export function generateWeightedSymbol(symbolConfigs: SymbolConfig[]): SymbolType {
    try {
        const totalWeight = symbolConfigs.reduce((sum, s) => sum + s.probability, 0);
        let random = secureRandom() * totalWeight;

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
        const randomIndex = crypto.randomInt(0, symbolConfigs.length);
        return symbolConfigs[randomIndex].type;
    }
}

/**
 * Generate 666 grid with three sixes ONLY in the middle 3 positions
 */
function generate666Grid(symbolConfigs: SymbolConfig[]): SymbolType[][] {
    const grid: SymbolType[][] = [];
    const nonSixSymbols = symbolConfigs.filter(s => s.type !== 'six');

    for (let row = 0; row < 3; row++) {
        grid[row] = [];
        for (let col = 0; col < 5; col++) {
            if (row === 1 && col >= 1 && col <= 3) {
                grid[row][col] = 'six';
            } else {
                grid[row][col] = generateWeightedSymbol(nonSixSymbols);
            }
        }
    }

    return grid;
}

/**
 * Generate symbols for a spin
 */
/**
 * Generate symbols for a spin
 * @param config Game configuration
 * @param force666 If true, forces the 666 pattern (Game Over)
 */
export function generateSymbols(config: GameConfig = DEFAULT_GAME_CONFIG, force666: boolean = false): GenerateSymbolsResult {
    if (force666) {
        const grid = generate666Grid(config.symbols);
        return {
            grid,
            is666: true,
        };
    }

    // Normal generation - exclude 'six' symbol completely
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
