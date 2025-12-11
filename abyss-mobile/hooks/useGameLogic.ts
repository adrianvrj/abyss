import { useState, useCallback } from 'react';
import { SymbolType } from '../types';
import { GameConfig, DEFAULT_GAME_CONFIG } from '../constants/GameConfig';
import { Pattern } from '../utils/patternDetector';
import { getLevelThreshold } from '../utils/levelThresholds';
import { useGameFeedback } from './useGameFeedback';
import { persistGameState, clearGameState } from '../utils/gameStorage';
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

    // Start spinning - track start time for minimum animation duration
    const spinStartTime = Date.now();
    const MIN_SPIN_DURATION_MS = 2000; // 2 seconds minimum

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
          currentLevel: state.level,
          currentScore: state.score,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server error');
      }

      // Ensure minimum 2 second spin animation
      const elapsed = Date.now() - spinStartTime;
      if (elapsed < MIN_SPIN_DURATION_MS) {
        await new Promise(resolve => setTimeout(resolve, MIN_SPIN_DURATION_MS - elapsed));
      }

      // Stop the spin sound after minimum duration
      stopSpinSound();

      // Calculate new state
      let newSpinsLeft = state.spinsLeft - 1;
      let newLevel = state.level;
      const newScore = state.score + data.score;

      // Client-side level calculation for animation trigger
      if (!data.is666 || data.bibliaUsed) {
        while (newScore >= getLevelThreshold(newLevel)) {
          newLevel += 1;
        }
      }

      // If leveled up, reset spins to 5
      if (newLevel > state.level) {
        newSpinsLeft = 5;
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

      // Determine if game is over
      const isGameOver = data.gameOver || newSpinsLeft <= 0;

      // If game is over, call end-session API to write final score to blockchain
      if (isGameOver) {
        try {
          console.log(`[EndSession] Ending session ${sessionId} with score=${newScore}, level=${newLevel}`);
          const endResponse = await fetch(`${API_URL}/api/end-session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId,
              finalScore: newScore,
              finalLevel: newLevel,
            }),
          });
          const endData = await endResponse.json();
          console.log('[EndSession] Response:', endData);
        } catch (endError) {
          console.error('[EndSession] Failed to end session:', endError);
          // Don't throw - game still ended, just blockchain write failed
        }
      }

      // Update state
      setState(prev => ({
        ...prev,
        grid: data.grid,
        score: newScore,
        spinsLeft: newSpinsLeft,
        isSpinning: false,
        patterns: data.patterns,
        is666: data.is666,
        gameOver: isGameOver,
        lastSpinScore: data.score,
        transactionStatus: 'success',
        level: newLevel,
        bibliaSaved: data.bibliaUsed,
      }));

      // Persist state to AsyncStorage for recovery if app closes
      if (isGameOver) {
        // Clear saved state when game ends
        await clearGameState(sessionId);
      } else {
        // Save current progress
        await persistGameState({
          sessionId,
          score: newScore,
          level: newLevel,
          spinsLeft: newSpinsLeft,
          isComplete: false,
          is666: data.is666,
          timestamp: Date.now(),
        });
      }

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
