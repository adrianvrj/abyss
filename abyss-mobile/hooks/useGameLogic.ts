import { useState, useCallback } from 'react';
import { SymbolType } from '../types';
import { GameConfig, DEFAULT_GAME_CONFIG } from '../constants/GameConfig';
import { generateSymbols } from '../utils/symbolGenerator';
import { detectPatterns, Pattern } from '../utils/patternDetector';
import { calculateScore } from '../utils/scoreCalculator';
import { persistGameState } from '../utils/gameStorage';
import { spin as contractSpin, getSessionData, endSession, consumeItem, ContractItem } from '../utils/abyssContract';
import { useGameFeedback } from './useGameFeedback';
import { calculate666Probability, hasBibliaProtection } from '../utils/probability666';
import { getLevelThreshold } from '../utils/levelThresholds';

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
  bibliaSaved: boolean; // Flag to show Biblia animation
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
  ownedItems: ContractItem[] = [],
  aegisAccount: any = null
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
      bibliaSaved: false,
    };
  });

  const spin = useCallback(async () => {
    setState(prev => {
      if (prev.spinsLeft <= 0 || prev.isSpinning || prev.gameOver) {
        return prev;
      }

      // Calculate dynamic 666 probability based on level
      const dynamic666Probability = calculate666Probability(prev.level);
      const configWithDynamicProbability = {
        ...config,
        probability666: dynamic666Probability
      };

      // Generate symbols with dynamic probability
      const { grid, is666 } = generateSymbols(configWithDynamicProbability);
      let scoreToAdd = 0;
      let patterns: Pattern[] = [];
      let hasBiblia = hasBibliaProtection(ownedItems);

      // Always play spin animation feedback (for both normal and 666)
      playSpinAnimation();

      if (is666) {
        // Check if player has Biblia protection
        if (hasBiblia && aegisAccount) {
          // Biblia protects - consume it (remove from inventory without score)
          consumeItem(sessionId, 40, 1, aegisAccount).then(() => {
            // Biblia was consumed, continue playing
          }).catch(error => {
            console.error('Failed to consume Biblia:', error);
          });

          // Continue as normal spin (Biblia saved the player)
          patterns = detectPatterns(grid, config);
          const scoreBreakdown = calculateScore(grid, patterns, config);
          scoreToAdd = Math.round(scoreBreakdown.totalScore * scoreMultiplier);

          patterns.forEach(pattern => {
            playPatternHit(pattern.type);
          });

          // Mark that Biblia saved the player (for animation)
          // This will be set in the state update below
        } else {
          // No protection - 666 triggered, instant loss
          scoreToAdd = 0; // This will reset the score
          playGameOver();

          // End session immediately for 666
          if (sessionId > 0) {
            endSession(sessionId).catch(error => {
              console.error('Failed to end session on 666:', error);
            });
          }
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
      const bibliaSavedPlayer = is666 && hasBiblia; // Biblia saved if 666 occurred and player had Biblia
      const isGameOver = bibliaSavedPlayer ? false : (newSpinsLeft <= 0 || is666); // Game over if no spins OR 666 (unless Biblia saved)

      const updatedState = {
        grid,
        score: prev.score, // Keep original score until animation ends
        spinsLeft: newSpinsLeft,
        isSpinning: true,
        patterns,
        is666: bibliaSavedPlayer ? false : is666, // Don't mark as 666 if Biblia saved
        gameOver: isGameOver,
        lastSpinScore: scoreToAdd,
        transactionStatus: 'pending' as const,
        level: prev.level,
        bibliaSaved: bibliaSavedPlayer, // Flag for Biblia animation
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
          // If Biblia saved, don't reset score to 0
          let newScore = (is666 && !bibliaSavedPlayer) ? 0 : previousState.score + scoreToAdd;

          // Check for level progression (same logic as contract)
          let newLevel = previousState.level;
          let finalSpinsLeft = newSpinsLeft;

          // Only check level progression if not 666 or if Biblia saved
          if (!is666 || bibliaSavedPlayer) {
            // Check if player leveled up
            while (newScore >= getLevelThreshold(newLevel)) {
              newLevel += 1;
            }

            // If leveled up, reset spins to 5
            if (newLevel > previousState.level) {
              finalSpinsLeft = 5;
              playLevelUp();
            }
          }

          const finalGameOver = bibliaSavedPlayer ? (finalSpinsLeft <= 0) : (finalSpinsLeft <= 0 || is666);

          setState(prev => ({
            ...prev,
            score: newScore,
            spinsLeft: finalSpinsLeft,
            level: newLevel,
            gameOver: finalGameOver,
            is666: bibliaSavedPlayer ? false : is666, // Don't keep 666 flag if Biblia saved
            isSpinning: false,
            transactionStatus: 'idle',
            bibliaSaved: false, // Reset flag after animation
          }));

          // End session if game is over (no spins left or 666)
          if (finalGameOver && sessionId > 0 && !is666) { // Don't call again if already called on 666
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
            is666: is666,
            timestamp: Date.now(),
          });

          // Call pattern callback after animation ends (only for non-666 spins)
          if (!is666 && onPatternsDetected && patterns.length > 0) {
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
      bibliaSaved: false,
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
