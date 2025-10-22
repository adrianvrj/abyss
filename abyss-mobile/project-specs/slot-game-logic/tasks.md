# Implementation Plan - Slot Game Logic

## Overview
This task list provides step-by-step implementation of the slot game logic feature. Each task builds incrementally on the existing Abyss mobile game prototype, adding probability-based symbol generation, pattern detection, score calculation with multipliers, and the 666 losing condition.

---

## Tasks

- [ ] 1. Create game configuration constants
  - Create `constants/GameConfig.ts` file
  - Define `SymbolConfig` interface with type, points, and probability fields
  - Define `PatternMultiplier` interface with type and multiplier fields
  - Define `GameConfig` interface with symbols, patternMultipliers, probability666, and animationDurations
  - Implement `DEFAULT_GAME_CONFIG` constant with symbol values (seven: 7pts/5%, diamond: 5pts/10%, cherry: 4pts/20%, coin: 3pts/15%, lemon: 2pts/25%, six: 0pts/25%)
  - Set pattern multipliers (horizontal-3: 2x, horizontal-4: 5x, horizontal-5: 10x, vertical-3: 3x, diagonal-3: 4x)
  - Set 666 probability to 1.5%
  - Set animation durations (spin: 1500ms, reveal: 300ms, scoreCount: 800ms)
  - _Requirements: 1.1, 1.2, 1.4, 1.6, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 2. Implement weighted random symbol generator
  - [ ] 2.1 Create symbol generator utility
    - Create `utils/symbolGenerator.ts` file
    - Define `GenerateSymbolsResult` interface with grid and is666 fields
    - Implement `check666Trigger(probability: number): boolean` function using Math.random()
    - Implement `generateWeightedSymbol(symbolConfigs: SymbolConfig[]): SymbolType` function
    - Use cumulative probability distribution for weighted random selection
    - Add error handling for invalid probabilities
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 11.3, 11.4_
  - [ ] 2.2 Implement 666 grid generation
    - Implement `generate666Grid(): SymbolType[][]` function
    - Create 3x5 grid with three "six" symbols in middle row (positions [1][1], [1][2], [1][3])
    - Fill remaining positions with random symbols
    - Return complete 666 grid
    - _Requirements: 3.2, 3.6_
  - [ ] 2.3 Implement main symbol generation function
    - Implement `generateSymbols(config: GameConfig): GenerateSymbolsResult` function
    - First check if 666 triggers using check666Trigger
    - If 666 triggers, return result with 666 grid and is666: true
    - If not triggered, generate 3x5 grid using generateWeightedSymbol for each position
    - Return result with normal grid and is666: false
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 3.1, 3.7_

- [ ] 3. Implement pattern detection system
  - [ ] 3.1 Create pattern detector utility and types
    - Create `utils/patternDetector.ts` file
    - Define `Pattern` interface with type, positions (array of [row, col]), symbol, and multiplier fields
    - Define pattern type union: 'horizontal-3' | 'horizontal-4' | 'horizontal-5' | 'vertical-3' | 'diagonal-3'
    - _Requirements: 4.1, 4.6_
  - [ ] 3.2 Implement horizontal pattern detection
    - Implement `detectHorizontalPatterns(grid: SymbolType[][]): Pattern[]` function
    - For each row, check for 5-in-a-row (all 5 symbols match)
    - For each row, check for 4-in-a-row (sliding window of 4)
    - For each row, check for 3-in-a-row (sliding window of 3)
    - Store matching positions as [row, col] tuples
    - Return array of detected horizontal patterns
    - _Requirements: 4.2, 4.7_
  - [ ] 3.3 Implement vertical pattern detection
    - Implement `detectVerticalPatterns(grid: SymbolType[][]): Pattern[]` function
    - For each column (0-4), extract 3 symbols vertically
    - Check if all 3 symbols match
    - Store matching positions as [row, col] tuples
    - Return array of detected vertical patterns
    - _Requirements: 4.3_
  - [ ] 3.4 Implement diagonal pattern detection
    - Implement `detectDiagonalPatterns(grid: SymbolType[][]): Pattern[]` function
    - Check top-left to bottom-right diagonals (3 positions each, starting columns 0-2)
    - Check top-right to bottom-left diagonals (3 positions each, starting columns 2-4)
    - For each diagonal, verify all 3 symbols match
    - Store matching positions as [row, col] tuples
    - Return array of detected diagonal patterns
    - _Requirements: 4.4_
  - [ ] 3.5 Implement main pattern detection function
    - Implement `detectPatterns(grid: SymbolType[][], config: GameConfig): Pattern[]` function
    - Call detectHorizontalPatterns, detectVerticalPatterns, and detectDiagonalPatterns
    - Combine all detected patterns into single array
    - For each pattern, lookup and assign multiplier from config.patternMultipliers
    - Return complete patterns array with multipliers
    - Add try-catch error handling
    - _Requirements: 4.1, 4.5, 4.6, 11.4_

- [ ] 4. Implement score calculation system
  - [ ] 4.1 Create score calculator utility
    - Create `utils/scoreCalculator.ts` file
    - Define `ScoreBreakdown` interface with baseScore, patternBonuses array, and totalScore fields
    - Define `PatternBonus` interface with pattern and bonus fields
    - _Requirements: 5.1, 5.6_
  - [ ] 4.2 Implement base score calculation
    - Implement `calculateBaseScore(grid: SymbolType[][], config: GameConfig): number` function
    - Iterate through all 15 grid positions (3 rows x 5 columns)
    - For each symbol, lookup points from config.symbols
    - Sum all symbol points to get base score
    - Handle six symbols returning 0 points
    - Add error handling for missing symbol configs
    - _Requirements: 5.2, 1.6, 11.5_
  - [ ] 4.3 Implement pattern bonus calculation
    - Implement `calculatePatternBonus(pattern: Pattern, config: GameConfig): number` function
    - Lookup symbol point value from config
    - Calculate symbol value in pattern: points × positions.length
    - Calculate bonus: symbolValueInPattern × (multiplier - 1)
    - Subtract 1 from multiplier to avoid double-counting base score
    - Return bonus points
    - _Requirements: 5.3, 5.4_
  - [ ] 4.4 Implement main score calculation function
    - Implement `calculateScore(grid: SymbolType[][], patterns: Pattern[], config: GameConfig): ScoreBreakdown` function
    - Calculate base score using calculateBaseScore
    - Map each pattern to pattern bonus using calculatePatternBonus
    - Sum all pattern bonuses
    - Calculate total score: baseScore + totalBonuses
    - Return ScoreBreakdown object with all components
    - Wrap in try-catch with fallback to 0 score
    - _Requirements: 5.1, 5.5, 5.6, 5.7, 11.5, 11.6_

- [ ] 5. Implement game state persistence
  - [ ] 5.1 Create game storage utility
    - Create `utils/gameStorage.ts` file
    - Define `PersistedGameState` interface with sessionId, score, spinsLeft, isComplete, is666, timestamp
    - Import AsyncStorage from '@react-native-async-storage/async-storage'
    - _Requirements: 9.1, 9.2, 9.3_
  - [ ] 5.2 Implement state persistence functions
    - Implement `persistGameState(state: PersistedGameState): Promise<void>` function
    - Create storage key using `game_state_${state.sessionId}` pattern
    - Serialize state to JSON and save to AsyncStorage
    - Add timestamp to state before saving
    - Add try-catch error handling with console logging
    - Implement `loadGameState(sessionId: number): Promise<PersistedGameState | null>` function
    - Load from AsyncStorage using session ID key
    - Parse JSON and validate structure
    - Return null if not found or corrupted
    - _Requirements: 9.1, 9.2, 9.4, 9.5, 9.6_

- [ ] 6. Create custom game logic hook
  - [ ] 6.1 Create game logic hook file and interfaces
    - Create `hooks/useGameLogic.ts` file
    - Define `GameLogicState` interface with grid, score, spinsLeft, isSpinning, patterns, is666, gameOver, lastSpinScore
    - Define `GameLogicActions` interface with spin and reset functions
    - Import all utility functions (generateSymbols, detectPatterns, calculateScore)
    - Import persistGameState from gameStorage
    - _Requirements: 6.1, 6.7_
  - [ ] 6.2 Implement hook initialization
    - Create `useGameLogic(initialScore: number, initialSpins: number, config?: GameConfig)` hook
    - Initialize state with useState using GameLogicState interface
    - Set default config to DEFAULT_GAME_CONFIG if not provided
    - Generate initial random grid using generateSymbols
    - Initialize score and spinsLeft from parameters
    - _Requirements: 6.1, 6.8_
  - [ ] 6.3 Implement spin action
    - Create `spin` function using useCallback
    - Validate spinsLeft > 0, !isSpinning, and !gameOver before processing
    - If validation fails, return early
    - Set isSpinning to true
    - Use setTimeout with config.animationDurations.spin delay
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.2_
  - [ ] 6.4 Implement 666 handling in spin
    - Inside setTimeout callback, call generateSymbols(config)
    - Check if is666 is true in result
    - If 666 triggered: set score to 0, spinsLeft to 0, gameOver to true, is666 to true
    - Call persistGameState with final state and is666: true flag
    - Set isSpinning to false
    - Return early from spin handler
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 6.5, 9.6_
  - [ ] 6.5 Implement normal spin processing
    - If not 666, call detectPatterns(grid, config)
    - Call calculateScore(grid, patterns, config) to get score breakdown
    - Calculate newScore by adding totalScore to current score
    - Decrement spinsLeft by 1
    - Check if game over (spinsLeft === 0)
    - Update state with new grid, score, spinsLeft, patterns, gameOver flag
    - Call persistGameState with updated state
    - Set isSpinning to false
    - _Requirements: 6.5, 6.6, 6.7, 6.8, 9.1, 9.2_
  - [ ] 6.6 Implement reset action
    - Create `reset` function using useCallback
    - Reset state to initial values (initialScore, initialSpins)
    - Generate new random grid
    - Clear patterns, set is666 to false, gameOver to false
    - Return from hook: [state, { spin, reset }]
    - _Requirements: 6.1_

- [ ] 7. Update game screen with logic integration
  - [ ] 7.1 Integrate useGameLogic hook
    - Update `app/game.tsx` to import useGameLogic hook
    - Replace existing useState for gameState with useGameLogic hook
    - Pass initialScore and initialSpins from URL params to hook
    - Destructure state and actions from hook return
    - Update grid display to use state.grid from hook
    - Update score display to use state.score from hook
    - Update spins display to use state.spinsLeft from hook
    - _Requirements: 6.1, 6.7, 6.8_
  - [ ] 7.2 Add spin button component
    - Create `components/SpinButton.tsx` file
    - Accept onPress, disabled, and isSpinning props
    - Display "SPIN" text using PixelifySans font
    - Disable button when isSpinning or disabled is true
    - Style with orange color (#FF841C) and appropriate size for landscape
    - Return Pressable component with animation feedback
    - _Requirements: 6.1, 6.2, 7.2_
  - [ ] 7.3 Add SpinButton to game screen
    - Import SpinButton component in game.tsx
    - Add SpinButton at bottom center of screen
    - Pass state.isSpinning to isSpinning prop
    - Pass state.spinsLeft === 0 || state.gameOver to disabled prop
    - Pass actions.spin to onPress prop
    - Position absolutely at bottom of screen with proper spacing
    - _Requirements: 6.1, 6.2, 6.3, 7.2_

- [ ] 8. Implement spin animations
  - [ ] 8.1 Create spin animation hook
    - Create `hooks/useSpinAnimation.ts` file
    - Create `useSpinAnimation(isSpinning: boolean)` hook
    - Use useSharedValue from react-native-reanimated for animation value
    - When isSpinning changes to true, start rotation/blur animation
    - Use withTiming for smooth 1500ms animation
    - Return animated value for use in components
    - _Requirements: 7.1, 7.2, 7.6, 12.6_
  - [ ] 8.2 Create pattern highlight hook
    - Create `usePatternHighlight(patterns: Pattern[])` hook in same file
    - Create Map of position keys to animated values
    - For each pattern position, create fade-in/glow animation
    - Trigger animations when patterns array changes
    - Return Map of position animations for highlighting
    - _Requirements: 7.6, 12.6_
  - [ ] 8.3 Apply animations to SlotGrid
    - Update `components/SlotGrid.tsx` to accept isSpinning prop
    - Import useSpinAnimation hook
    - Apply blur/rotation effect to symbols when spinning
    - Use Animated.View wrapper for each symbol
    - Ensure animations run at 60fps using native driver
    - _Requirements: 7.1, 7.3, 7.6, 12.4, 12.6_
  - [ ] 8.4 Add pattern highlighting to grid
    - Update SlotGrid to accept patterns prop
    - Import usePatternHighlight hook
    - Apply glow/highlight effect to symbols in winning patterns
    - Use different color or opacity for highlighted symbols
    - Trigger highlight after spin animation completes
    - _Requirements: 7.6, 12.6_

- [ ] 9. Implement score animation
  - [ ] 9.1 Create score counter hook
    - Create `hooks/useScoreCountUp.ts` file
    - Implement `useScoreCountUp(targetScore: number, duration: number)` hook
    - Use useSharedValue for animated score value
    - Animate from current to target using withTiming
    - Return current animated score value
    - _Requirements: 7.8, 12.6_
  - [ ] 9.2 Create animated score display component
    - Create `components/ScoreDisplay.tsx` file
    - Accept score and label props
    - Use useScoreCountUp hook for animation
    - Display animated score with PixelifySans font
    - Format score with proper rounding
    - Style with orange color (#FF841C)
    - _Requirements: 5.7, 7.8_
  - [ ] 9.3 Replace score text with ScoreDisplay
    - Update game.tsx to import ScoreDisplay
    - Replace static score Text with ScoreDisplay component
    - Pass state.score to score prop
    - Ensure animation triggers on score changes
    - _Requirements: 5.7, 7.8_

- [ ] 10. Implement 666 loss animation
  - [ ] 10.1 Create 666 animation component
    - Create `components/Loss666Animation.tsx` file
    - Accept visible prop (state.is666)
    - Implement screen shake effect using transform animations
    - Add red flash overlay with fade animation
    - Display "666" text in large Ramagothic font
    - Auto-hide after animation completes
    - _Requirements: 3.5, 7.5_
  - [ ] 10.2 Add 666 animation to game screen
    - Import Loss666Animation in game.tsx
    - Add component with visible={state.is666} prop
    - Position as full-screen overlay with high z-index
    - Ensure it displays above all other content
    - _Requirements: 3.5, 7.5_

- [ ] 11. Implement game over modal
  - [ ] 11.1 Create game outcome calculator
    - Create `utils/gameOutcome.ts` file
    - Define `GameOutcome` interface with sessionId, finalScore, spinsUsed, totalPatternsMatched, bestPattern, is666Loss, result
    - Implement `calculateGameOutcome(state: GameLogicState, initialSpins: number): GameOutcome` function
    - Determine win/loss based on final score (use 0 as threshold for prototype)
    - Find best pattern from all spins (track separately or use highest multiplier)
    - Calculate total spins used: initialSpins - state.spinsLeft
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - [ ] 11.2 Create GameOverModal component
    - Create `components/GameOverModal.tsx` file
    - Accept visible, outcome, onClose props
    - Display modal with dark overlay
    - Show final score, spins used, patterns matched statistics
    - Display WIN/LOSS/TOTAL LOSS message based on outcome
    - If is666Loss, show special "666 - TOTAL LOSS" message
    - Add "Play Again" button that calls onClose
    - Style with PixelifySans font and orange/white colors
    - _Requirements: 10.6, 10.7_
  - [ ] 11.3 Add GameOverModal to game screen
    - Import GameOverModal in game.tsx
    - Calculate outcome when state.gameOver is true
    - Add GameOverModal with visible={state.gameOver} prop
    - Pass calculated outcome to outcome prop
    - Implement onClose handler that calls actions.reset
    - _Requirements: 10.1, 10.6, 10.7_

- [ ] 12. Add configuration validation
  - Create `utils/configValidator.ts` file
  - Implement `validateGameConfig(config: GameConfig): boolean` function
  - Check all symbol probabilities sum to 100
  - Validate all point values are >= 0
  - Validate 666 probability is between 0 and 100
  - Validate pattern multipliers are > 1
  - Return true if valid, false otherwise
  - Log specific validation errors to console
  - Call validator in useGameLogic hook initialization
  - _Requirements: 8.7, 11.1, 11.2_

- [ ] 13. Add performance monitoring
  - Create `utils/performanceMonitor.ts` file
  - Implement `measurePerformance<T>(fn: () => T, label: string, budget: number): T` function
  - Use Performance.now() to measure execution time
  - Execute provided function and capture result
  - Log warning if execution exceeds budget
  - Return function result
  - Wrap generateSymbols calls with 50ms budget
  - Wrap detectPatterns calls with 100ms budget
  - Wrap calculateScore calls with 50ms budget
  - _Requirements: 12.1, 12.2, 12.3, 12.5_

- [ ] 14. Update type definitions
  - Update `types/index.ts` file
  - Add Pattern interface export
  - Add GameLogicState interface export
  - Add GameLogicActions interface export
  - Add ScoreBreakdown interface export
  - Add GameOutcome interface export
  - Add PersistedGameState interface export
  - Ensure all game logic types are exported and available
  - _Requirements: All requirements - type safety_

- [ ] 15. Install required dependencies
  - Run `npx expo install @react-native-async-storage/async-storage`
  - Verify react-native-reanimated is already installed (from previous implementation)
  - Verify all imports resolve correctly
  - Run `npx tsc --noEmit` to check for TypeScript errors
  - _Requirements: 9.1, 7.1_

- [ ] 16. Integration testing and polish
  - Test complete spin flow from button press to score update
  - Verify 666 pattern triggers approximately 1.5% of the time (test with 100+ spins)
  - Verify pattern detection works for all pattern types
  - Test that six symbols give 0 points in score calculation
  - Verify score calculation matches expected values with multipliers
  - Test game over modal appears when spins reach 0
  - Test 666 animation displays correctly on trigger
  - Verify state persists correctly to AsyncStorage
  - Test reset functionality returns game to initial state
  - Verify all animations run smoothly at 60fps
  - Test on both iOS and Android
  - _Requirements: All requirements validation_

---

## Implementation Notes

### Development Workflow
1. Implement core utilities first (tasks 1-5)
2. Create game logic hook (task 6)
3. Integrate with UI (tasks 7-11)
4. Add validation and monitoring (tasks 12-13)
5. Polish and test (tasks 14-16)

### Testing Between Tasks
- Test each utility function independently before moving to next task
- Use console.log to verify calculations during development
- Test probability distributions with large sample sizes (1000+ iterations)
- Verify animations don't block main thread

### Dependencies Installation
```bash
npx expo install @react-native-async-storage/async-storage
```

### Expected Game Flow
1. Player taps SPIN button
2. Spinning animation plays (1.5s)
3. 666 check occurs (1.5% chance)
   - If 666: Instant loss animation, score=0, game over
   - If not 666: Continue to step 4
4. Symbols revealed with stagger
5. Patterns detected and highlighted
6. Score calculated and animated
7. State persisted
8. If spins=0, show game over modal
9. Ready for next spin or reset

### Performance Targets
- Symbol generation: <50ms
- Pattern detection: <100ms
- Score calculation: <50ms
- Total spin processing: <200ms (excluding animations)
- Animation frame rate: 60fps

### Code Style
- Use TypeScript strict mode
- Use functional programming for utilities (pure functions)
- Use React hooks for stateful logic
- Prefer const over let
- Use explicit return types
- Add JSDoc comments for complex functions
