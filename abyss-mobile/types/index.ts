export type SymbolType = 'diamond' | 'cherry' | 'lemon' | 'seven' | 'six' | 'coin';

export interface Session {
  id: number;
  score: number;
  mode?: 'casual' | 'competitive';
}

export interface GameState {
  sessionId: number;
  score: number;
  spinsLeft: number;
  grid: SymbolType[][];
}

export interface RouteParams {
  mode?: string;
  sessionId?: string;
  score?: string;
}

export type ModeType = 'casual' | 'competitive';

// Re-export game logic types
export type { Pattern } from '../utils/patternDetector';
export type { ScoreBreakdown, PatternBonus } from '../utils/scoreCalculator';
export type { GameLogicState, GameLogicActions } from '../hooks/useGameLogic';
export type { PersistedGameState } from '../utils/gameStorage';
export type { GameConfig, SymbolConfig, PatternMultiplier, PatternType } from '../constants/GameConfig';
