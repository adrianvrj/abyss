import { Session, SymbolType } from '../types';

export const MOCK_SESSIONS: Record<'casual' | 'competitive', Session[]> = {
  casual: [
    { id: 1, score: 30, mode: 'casual' },
    { id: 2, score: 99, mode: 'casual' },
  ],
  competitive: [
    { id: 11, score: 80, mode: 'competitive' },
    { id: 12, score: 150, mode: 'competitive' },
  ],
};

export const SYMBOLS: SymbolType[] = ['diamond', 'cherry', 'lemon', 'seven', 'six', 'coin'];

export const generateRandomGrid = (): SymbolType[][] => {
  const grid: SymbolType[][] = [];

  for (let row = 0; row < 3; row++) {
    grid[row] = [];
    for (let col = 0; col < 5; col++) {
      const randomIndex = Math.floor(Math.random() * SYMBOLS.length);
      grid[row][col] = SYMBOLS[randomIndex];
    }
  }

  return grid;
};
