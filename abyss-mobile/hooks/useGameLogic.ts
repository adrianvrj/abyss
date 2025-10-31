import { useState, useCallback } from 'react';
import { SymbolType } from '../types';
import { GameConfig, DEFAULT_GAME_CONFIG } from '../constants/GameConfig';
import { generateSymbols } from '../utils/symbolGenerator';
import { detectPatterns, Pattern } from '../utils/patternDetector';
import { calculateScore } from '../utils/scoreCalculator';
import { persistGameState } from '../utils/gameStorage';
import { spin as contractSpin, getSessionData, endSession } from '../utils/abyssContract';
import { useGameFeedback } from './useGameFeedback';

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
  scoreMultiplier: number = 1.0
): [GameLogicState, GameLogicActions] {
  const { playPatternHit, playLevelUp, playSpin, playSpinAnimation, playGameOver } = useGameFeedback();
  
  const [state, setState] = useState<GameLogicState>(() => {
    const { grid } = generateSymbols(config);
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
    };
  });

  const spin = useCallback(async () => {
    setState(prev => {
      if (prev.spinsLeft <= 0 || prev.isSpinning || prev.gameOver) {
        return prev;
      }
      
      // Generate symbols and calculate score immediately
      const { grid, is666 } = generateSymbols(config);
      let scoreToAdd = 0;
      let patterns: Pattern[] = [];

      if (is666) {
        // 666 triggered - instant loss
        scoreToAdd = 0; // This will reset the score
        playGameOver();

        // End session immediately for 666
        if (sessionId > 0) {
          endSession(sessionId).catch(error => {
            console.error('Failed to end session on 666:', error);
          });
        }
      } else {
        // Normal spin - calculate score
        patterns = detectPatterns(grid, config);
        const scoreBreakdown = calculateScore(grid, patterns, config);
        // Apply score multiplier from items
        scoreToAdd = Math.round(scoreBreakdown.totalScore * scoreMultiplier);

        patterns.forEach(pattern => {
          playPatternHit(pattern.type);
        });

        // Play continuous spin animation feedback
        playSpinAnimation();
      }

      // Store previous state for rollback
      const previousState = {
        score: prev.score,
        spinsLeft: prev.spinsLeft,
        level: prev.level,
        gameOver: prev.gameOver
      };

      // Update state immediately but keep original score (only update spins)
      const newSpinsLeft = prev.spinsLeft - 1;
      const isGameOver = newSpinsLeft <= 0;

      const updatedState = {
        grid,
        score: prev.score, // Keep original score until animation ends
        spinsLeft: newSpinsLeft,
        isSpinning: true,
        patterns,
        is666: false,
        gameOver: isGameOver,
        lastSpinScore: scoreToAdd,
        transactionStatus: 'pending' as const,
        level: prev.level,
      };

      // Start transaction in parallel with animation
      let transactionPromise: Promise<void> | null = null;
      
      if (sessionId > 0) {
        transactionPromise = contractSpin(sessionId, scoreToAdd)
          .then(async (txHash) => {
            setState(prev => ({ 
              ...prev, 
              transactionStatus: 'success',
              transactionHash: txHash
            }));
          })
          .catch(error => {
            console.error('Contract spin failed:', error);
            
            // Rollback to previous state on transaction failure
            setState(prev => ({
              ...prev,
              score: previousState.score,
              spinsLeft: previousState.spinsLeft,
              level: previousState.level,
              gameOver: previousState.gameOver,
              transactionStatus: 'error',
              isSpinning: false
            }));
          });
      }

      // Start animation (runs in parallel with transaction)
      setTimeout(async () => {
        try {
          // Update score only when animation ends
          const newScore = previousState.score + scoreToAdd;
          
          // Check for level progression (same logic as contract)
          let newLevel = previousState.level;
          let finalSpinsLeft = newSpinsLeft;
          
          // Level thresholds (matching contract logic)
          const levelThresholds = [33, 66, 333, 666, 999, 1333, 1666, 1999, 2333, 2666];
          
          // Check if player leveled up
          while (newScore >= (levelThresholds[newLevel - 1] || 3000 * newLevel)) {
            newLevel += 1;
          }
          
          // If leveled up, reset spins to 5
          if (newLevel > previousState.level) {
            finalSpinsLeft = 5;
            playLevelUp();
          }
          
          const finalGameOver = finalSpinsLeft <= 0;

          setState(prev => ({
            ...prev,
            score: newScore,
            spinsLeft: finalSpinsLeft,
            level: newLevel,
            gameOver: finalGameOver,
            isSpinning: false,
            transactionStatus: 'idle'
          }));

          // End session if game is over (no spins left)
          if (finalGameOver && sessionId > 0) {
            endSession(sessionId).catch(error => {
              console.error('Failed to end session on game over:', error);
            });
          }

          // Persist final state
          persistGameState({
            sessionId,
            score: newScore,
            spinsLeft: finalSpinsLeft,
            isComplete: finalGameOver,
            is666: false,
            timestamp: Date.now(),
          });

          // Call pattern callback after animation ends
          if (onPatternsDetected && patterns.length > 0) {
            onPatternsDetected(patterns);
          }
          
        } catch (error) {
          console.error('Animation error:', error);
          setState(prev => ({ ...prev, isSpinning: false }));
        }
      }, 6000); // Animation duration

      return updatedState;
    });
  }, [config, sessionId]);

  const reset = useCallback(() => {
    const { grid } = generateSymbols(config);
    setState({
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
    });
  }, [initialScore, initialSpins, config]);

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
