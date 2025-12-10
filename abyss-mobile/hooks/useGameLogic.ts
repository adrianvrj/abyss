import { useState, useCallback } from 'react';
import { SymbolType } from '../types';
import { GameConfig, DEFAULT_GAME_CONFIG } from '../constants/GameConfig';
import { Pattern } from '../utils/patternDetector';
import { getLevelThreshold } from '../utils/levelThresholds';
import { useGameFeedback } from './useGameFeedback';
// Note: Local game logic imports removed in favor of server-side logic

export interface GameLogicState {
  grid: SymbolType[][];
  score: number;
  spinsLeft: number;
  isSpinning: boolean;
  patterns: Pattern[];
  is666: boolean;
  gameOver: boolean;
  lastSpinScore: number;
  transactionStatus: 'idle' | 'pending' | 'success' | 'error';
  transactionHash?: string;
  level: number;
  bibliaSaved: boolean;
}

export interface GameLogicActions {
  spin: () => Promise<void>;
  reset: () => void;
  updateState: (newScore: number, newSpins: number, newLevel?: number) => void;
  onPatternsDetected?: (patterns: Pattern[]) => void;
}

export function useGameLogic(
  initialScore: number,
  initialSpins: number,
  sessionId: number,
  config: GameConfig = DEFAULT_GAME_CONFIG,
  onPatternsDetected?: (patterns: Pattern[]) => void,
  scoreMultiplier: number = 1.0,
  ownedItems: any[] = [],
  aegisAccount: any = null
): [GameLogicState, GameLogicActions] {
  const { playPatternHit, playLevelUp, playSpin, playSpinAnimation, playGameOver } = useGameFeedback();

  // Initialize state with empty grid (will be filled by server or default)
  const [state, setState] = useState<GameLogicState>(() => {
    // Initial static grid
    const grid: SymbolType[][] = Array(3).fill(Array(5).fill('diamond'));
    return {
      grid,
      score: initialScore,
      spinsLeft: initialSpins,
      isSpinning: false,
      patterns: [],
      is666: false,
      gameOver: false,
      lastSpinScore: 0,
      transactionStatus: 'idle',
      level: 1,
      bibliaSaved: false,
    };
  });

  const spin = useCallback(async () => {
    if (state.spinsLeft <= 0 || state.isSpinning || state.gameOver) {
      return;
    }

    // Start spinning
    playSpinAnimation();
    setState(prev => ({
      ...prev,
      isSpinning: true,
      transactionStatus: 'pending',
      patterns: [], // Clear previous patterns
      is666: false,
      bibliaSaved: false,
    }));

    try {
      // 1. Minimum animation time (parallel with request)
      const animationTimer = new Promise(resolve => setTimeout(resolve, 6000));

      // 2. Call Server API
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/spin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          // Server fetches items from chain, so we don't strictly need to send them
          // but if we implemented item logic strictly on server, we should rely on chain data.
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server error');
      }

      // 3. Wait for animation to finish
      await animationTimer;

      // 4. Update State with Server Result
      setState(prev => {
        let newLevel = prev.level;
        const newScore = prev.score + data.score;

        // Client-side level calculation for animation trigger
        // (Server tracks official level, but we predict it here for UI feedback)
        // Only if not 666 (or if saved by Biblia)
        if (!data.is666 || data.bibliaUsed) {
          while (newScore >= getLevelThreshold(newLevel)) {
            newLevel += 1;
          }
        }

        if (newLevel > prev.level) {
          playLevelUp();
        }

        // Feedback
        if (data.is666 && !data.bibliaUsed) {
          playGameOver();
        } else {
          data.patterns.forEach((p: Pattern) => playPatternHit(p.type));
          if (onPatternsDetected && data.patterns.length > 0) {
            onPatternsDetected(data.patterns);
          }
        }

        return {
          ...prev,
          grid: data.grid,
          score: newScore, // Accumulate total score
          spinsLeft: data.spinsRemaining, // Server tells us exact spins
          isSpinning: false,
          patterns: data.patterns,
          is666: data.is666,
          gameOver: data.gameOver,
          lastSpinScore: data.score,
          transactionStatus: 'success',
          transactionHash: data.transactionHash,
          level: newLevel,
          bibliaSaved: data.bibliaUsed,
        };
      });

    } catch (error) {
      console.error('Spin failed:', error);
      // Revert state
      setState(prev => ({
        ...prev,
        isSpinning: false,
        transactionStatus: 'error',
      }));
    }
  }, [sessionId, state.spinsLeft, state.isSpinning, state.gameOver, state.score, state.level, onPatternsDetected]);

  const reset = useCallback(() => {
    // Reset logic
    setState(prev => ({
      ...prev,
      isSpinning: false,
      gameOver: false,
      is666: false,
    }));
  }, []);

  const updateState = useCallback((newScore: number, newSpins: number, newLevel?: number) => {
    setState(prev => ({
      ...prev,
      score: newScore,
      spinsLeft: newSpins,
      gameOver: newSpins <= 0,
      level: newLevel || prev.level,
    }));
  }, []);

  return [state, { spin, reset, updateState }];
}
