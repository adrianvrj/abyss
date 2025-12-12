import { useState, useCallback } from 'react';
import { SymbolType } from '../types';
import { GameConfig, DEFAULT_GAME_CONFIG } from '../constants/GameConfig';
import { Pattern } from '../utils/patternDetector';
import { getLevelThreshold } from '../utils/levelThresholds';
import { useGameFeedback } from './useGameFeedback';
import { persistGameState, clearGameState } from '../utils/gameStorage';
import { sellItem } from '../utils/abyssContract';
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

// Callbacks to update GameSessionContext after game events
export interface ContextUpdateCallbacks {
  adjustScore: (delta: number) => void;
  updateLevel: (newLevel: number) => void;
  updateSpins: (newSpins: number) => void;
  resetSpinsForLevelUp: () => void; // 5 + bonusSpins
}

export function useGameLogic(
  initialScore: number,
  initialSpins: number,
  sessionId: number,
  config: GameConfig = DEFAULT_GAME_CONFIG,
  onPatternsDetected?: (patterns: Pattern[]) => void,
  scoreMultiplier: number = 1.0,
  ownedItems: any[] = [],
  aegisAccount: any = null,
  contextCallbacks?: ContextUpdateCallbacks, // NEW: callbacks to update context
  currentBonusSpins: number = 0 // NEW: for persistence
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
    // Constants
    const MIN_SPIN_DURATION_MS = 1200; // 1.2 seconds minimum (User requested speed up)

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
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://abyss-server-gilt.vercel.app';
      console.log('Spinning against:', API_URL);

      // --- MOCK 666 TRIGGER FOR TESTING ---
      // Comment out the fetch and uncomment this block to simulate 666
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

      // --- END MOCK ---

      if (data.error) {
        throw new Error(data.error);
      }

      // Ensure minimum 2 second spin animation
      const elapsed = Date.now() - spinStartTime;
      if (elapsed < MIN_SPIN_DURATION_MS) {
        await new Promise(resolve => setTimeout(resolve, MIN_SPIN_DURATION_MS - elapsed));
      }

      // Stop sound immediately before reveal
      stopSpinSound();

      // Calculate new state
      let newSpinsLeft = state.spinsLeft - 1;
      let newLevel = state.level;
      const newScore = state.score + data.score;
      const earnedScore = data.score; // Delta to add

      // Client-side level calculation for animation trigger
      if (!data.is666 || data.bibliaUsed) {
        while (newScore >= getLevelThreshold(newLevel)) {
          newLevel += 1;
        }
      }

      // If leveled up, reset spins to 5 + bonusSpins via context callback
      const didLevelUp = newLevel > state.level;
      if (didLevelUp) {
        playLevelUp();
        // Use context callback to get 5 + bonusSpins
        if (contextCallbacks) {
          contextCallbacks.updateLevel(newLevel);
          contextCallbacks.resetSpinsForLevelUp();
        }
        // We'll calculate newSpinsLeft after context update, but for local state use 5
        newSpinsLeft = 5; // Minimum, actual value will come from context
      } else {
        // Regular spin - just decrement
        if (contextCallbacks) {
          contextCallbacks.updateSpins(newSpinsLeft);
        }
      }

      // Update context with earned score
      if (contextCallbacks && earnedScore > 0) {
        contextCallbacks.adjustScore(earnedScore);
      }

      // Play pattern feedback if any (Game Over feedback is delayed to match visuals)
      if (!data.is666 || data.bibliaUsed) {
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
        }
      }

      // Update state
      setState(prev => ({
        ...prev,
        grid: data.grid,
        score: newScore,
        spinsLeft: newSpinsLeft,
        isSpinning: false, // Visuals stop here (triggers SlotGrid useEffect)
        patterns: data.patterns,
        is666: data.is666,
        gameOver: isGameOver,
        lastSpinScore: data.score,
        transactionStatus: 'success',
        level: newLevel,
        bibliaSaved: data.bibliaUsed,
      }));

      // CONSUME BIBLIA: If Biblia saved the player, sell it from inventory (async, fire-and-forget)
      if (data.bibliaUsed && aegisAccount) {
        // Find Biblia item in ownedItems (effect_type 6 = SixSixSixProtection)
        const bibliaItem = ownedItems.find((item: any) => item.effect_type === 6);
        if (bibliaItem) {
          console.log(`[Biblia] Consuming Biblia (item_id=${bibliaItem.item_id})`);
          sellItem(sessionId, bibliaItem.item_id, 1, aegisAccount)
            .then((txHash) => console.log(`[Biblia] Consumed: ${txHash}`))
            .catch((err) => console.error('[Biblia] Failed to consume:', err));
        }
      }

      // Feedback: Play Game Over haptics slightly delayed to sync with reel slam
      if (data.is666 && !data.bibliaUsed) {
        // 50ms delay allows React to render the "stopped" grid state
        setTimeout(() => playGameOver(), 50);
      }

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
          bonusSpins: currentBonusSpins, // Persist current bonus spins
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
      // If dead by 666, stay dead. If dead by spins, allow revival if spins added.
      gameOver: (prev.gameOver && prev.is666) ? true : newSpins <= 0,
      level: newLevel || prev.level,
    }));
  }, []);

  return [state, { spin, reset, updateState }];
}
