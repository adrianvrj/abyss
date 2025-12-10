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

    // Start spinning - get stop function for sound
    const { stopSpinSound } = playSpinAnimation();
    setState(prev => ({
      ...prev,
      isSpinning: true,
      transactionStatus: 'pending',
      patterns: [], // Clear previous patterns
      is666: false,
      bibliaSaved: false,
    }));

    try {
      // Call Server API - Animation runs while we wait
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://abyss-server-gilt.vercel.app';
      console.log('Spinning against:', API_URL);

      const response = await fetch(`${API_URL}/api/spin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server error');
      }

      // Stop the spin sound now that we have a response
      stopSpinSound();

      // Small delay after server response for animation to settle (optional, can remove)
      await new Promise(resolve => setTimeout(resolve, 500));


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

    } catch (error: any) {
      console.error('Spin failed:', error);
      // Stop the sound on error too
      stopSpinSound();

      // Check if this is a "no spins" error - treat as game over
      const errorMessage = error?.message || '';
      const isNoSpinsError = errorMessage.toLowerCase().includes('no spins') ||
        errorMessage.toLowerCase().includes('spins left');

      if (isNoSpinsError) {
        // Treat as game over
        setState(prev => ({
          ...prev,
          isSpinning: false,
          spinsLeft: 0,
          gameOver: true,
          transactionStatus: 'error',
        }));
      } else {
        // Regular error - revert state
        setState(prev => ({
          ...prev,
          isSpinning: false,
          transactionStatus: 'error',
        }));
      }
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
