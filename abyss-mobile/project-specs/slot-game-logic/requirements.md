# Requirements Document - Slot Game Logic

## Introduction

This feature implements the core game logic for the Abyss slot machine game, transforming the existing static UI prototype into a fully functional gambling game. The system will handle spin mechanics, symbol probability distribution, pattern matching for win conditions, score calculation with multipliers, and a special "666" losing condition.

The game logic builds upon the existing 3x5 grid interface and integrates probability-based symbol generation, where each symbol (diamond, cherry, lemon, seven, six, coin) has unique appearance rates and point values. Players will trigger spins, symbols will be randomly generated based on configured probabilities, patterns will be detected for win multipliers, and scores will be calculated. The special "666" pattern serves as a complete loss condition, adding risk to gameplay.

This implementation is designed to work independently of blockchain integration initially, using local state management, but will be structured to facilitate future smart contract integration for competitive mode gameplay.

## Requirements

### Requirement 1: Symbol Configuration System
**User Story:** As a game designer, I want each symbol to have configurable point values and appearance probabilities, so that I can balance gameplay and control game economics.

#### Acceptance Criteria
1. WHEN the game initializes THEN the system SHALL load symbol configuration defining point values for each symbol type
2. WHEN the game initializes THEN the system SHALL load probability weights for each symbol (diamond, cherry, lemon, seven, six, coin)
3. WHEN calculating total probability THEN the system SHALL ensure all symbol probabilities sum to a value that accounts for the 666 probability
4. IF a symbol configuration is missing THEN the system SHALL use default balanced values
5. WHEN a symbol lands on the grid THEN the system SHALL award points based on that symbol's configured value
6. WHEN a "six" symbol lands THEN the system SHALL award 0 points (six is a neutral/dangerous symbol)

**Symbol Configuration Structure:**
- Seven: Highest value, lowest probability
- Diamond: High value, low probability
- Cherry: Medium value, medium probability
- Coin: Medium value, medium probability
- Lemon: Low value, high probability
- Six: No value (0 points), high probability, dangerous symbol

---

### Requirement 2: Weighted Random Symbol Generation
**User Story:** As a player, I want each spin to generate symbols based on their configured probabilities, so that gameplay feels fair and symbols appear at expected rates.

#### Acceptance Criteria
1. WHEN a spin is triggered THEN the system SHALL generate 15 symbols (3 rows x 5 columns) using weighted random selection
2. WHEN selecting each symbol THEN the system SHALL respect probability weights from symbol configuration
3. WHEN generating symbols THEN the system SHALL independently calculate each grid position (no dependencies between positions)
4. IF the 666 pattern is generated THEN the system SHALL override the normal grid with three "six" symbols in a row
5. WHEN 666 pattern check completes THEN the system SHALL return either normal symbol grid OR 666 pattern grid

---

### Requirement 3: 666 Losing Condition
**User Story:** As a player, I want a chance of hitting the 666 pattern that makes me lose everything, so that the game has high-stakes risk and excitement.

#### Acceptance Criteria
1. WHEN a spin occurs THEN the system SHALL first check if 666 pattern triggers based on configured probability (e.g., 1-5%)
2. IF 666 pattern triggers THEN the system SHALL display three "six" symbols in a specific row position
3. WHEN 666 pattern is detected THEN the system SHALL set player score to 0
4. WHEN 666 pattern is detected THEN the system SHALL set remaining spins to 0 (game over)
5. WHEN 666 pattern is detected THEN the system SHALL display a special losing animation/message
6. WHEN 666 pattern occurs THEN the system SHALL log the event for analytics
7. IF 666 does not trigger THEN the system SHALL proceed with normal symbol generation

---

### Requirement 4: Pattern Detection System
**User Story:** As a player, I want matching symbol patterns to award multipliers, so that I can win bigger prizes for lucky spins.

#### Acceptance Criteria
1. WHEN a spin completes THEN the system SHALL analyze the grid for winning patterns
2. WHEN checking patterns THEN the system SHALL detect horizontal line matches (3, 4, or 5 matching symbols in a row)
3. WHEN checking patterns THEN the system SHALL detect vertical line matches (3 matching symbols in a column)
4. WHEN checking patterns THEN the system SHALL detect diagonal matches (3 matching symbols diagonally)
5. WHEN multiple patterns exist THEN the system SHALL identify all winning patterns
6. WHEN pattern matching completes THEN the system SHALL return list of detected patterns with their positions
7. IF no patterns match THEN the system SHALL return empty pattern list

**Pattern Types:**
- 3-in-a-row horizontal: 2x multiplier
- 4-in-a-row horizontal: 5x multiplier
- 5-in-a-row horizontal: 10x multiplier
- 3-in-a-column vertical: 3x multiplier
- 3-diagonal: 4x multiplier

---

### Requirement 5: Score Calculation with Multipliers
**User Story:** As a player, I want my score calculated based on symbols landed and patterns matched, so that I can see my winnings from each spin.

#### Acceptance Criteria
1. WHEN a spin completes THEN the system SHALL calculate base score from all landed symbols
2. WHEN calculating base score THEN the system SHALL sum point values for all 15 symbols in the grid
3. WHEN patterns are detected THEN the system SHALL calculate pattern bonuses by multiplying symbol values in pattern by pattern multiplier
4. WHEN multiple patterns overlap THEN the system SHALL apply highest multiplier to overlapping symbols
5. WHEN total spin score is calculated THEN the system SHALL add base score plus all pattern bonuses
6. WHEN score calculation completes THEN the system SHALL add spin score to player's total score
7. WHEN score updates THEN the system SHALL trigger UI update to display new score

---

### Requirement 6: Spin Mechanics and State Management
**User Story:** As a player, I want to trigger spins and see my remaining spins decrease, so that I can track my game progress.

#### Acceptance Criteria
1. WHEN player initiates spin THEN the system SHALL check if spins remaining > 0
2. IF spins remaining = 0 THEN the system SHALL disable spin action and display "No spins remaining"
3. WHEN spin is triggered THEN the system SHALL decrement spins remaining by 1
4. WHEN spin is triggered THEN the system SHALL generate new symbol grid
5. WHEN new grid is generated THEN the system SHALL check for 666 pattern first
6. WHEN symbols are finalized THEN the system SHALL detect patterns and calculate score
7. WHEN spin processing completes THEN the system SHALL update game state (grid, score, spins)
8. WHEN game state updates THEN the system SHALL trigger UI re-render

---

### Requirement 7: Spin Animation and Visual Feedback
**User Story:** As a player, I want to see smooth animations when spinning, so that the game feels polished and exciting.

#### Acceptance Criteria
1. WHEN spin is triggered THEN the system SHALL play spinning animation for symbols
2. WHEN symbols are spinning THEN the system SHALL disable additional spin inputs
3. WHEN animation duration reaches midpoint THEN the system SHALL calculate final symbol values
4. WHEN animation completes THEN the system SHALL reveal final symbols with stagger effect
5. IF 666 pattern occurs THEN the system SHALL play special losing animation
6. IF winning pattern detected THEN the system SHALL highlight winning symbols with animation
7. WHEN all animations complete THEN the system SHALL re-enable spin input
8. WHEN score changes THEN the system SHALL animate score counter incrementing

---

### Requirement 8: Game Configuration and Balance
**User Story:** As a game designer, I want configurable game parameters, so that I can tune gameplay balance and economics.

#### Acceptance Criteria
1. WHEN game initializes THEN the system SHALL load configuration for symbol probabilities
2. WHEN game initializes THEN the system SHALL load configuration for symbol point values
3. WHEN game initializes THEN the system SHALL load configuration for pattern multipliers
4. WHEN game initializes THEN the system SHALL load configuration for 666 probability
5. WHEN game initializes THEN the system SHALL load configuration for animation durations
6. IF configuration is missing THEN the system SHALL use hardcoded default values
7. WHEN configuration changes THEN the system SHALL validate all values are within acceptable ranges

**Default Configuration:**
```
Symbol Probabilities (total = 100):
- Lemon: 25%
- Six: 25%
- Cherry: 20%
- Coin: 15%
- Diamond: 10%
- Seven: 5%

Symbol Point Values:
- Seven: 7 points
- Diamond: 5 points
- Cherry: 4 points
- Coin: 3 points
- Lemon: 2 points
- Six: 0 points (dangerous symbol)

666 Probability: 1.5%

Note: Six symbols give no points and contribute to the 666 instant loss pattern
```

---

### Requirement 9: Game State Persistence
**User Story:** As a player, I want my game state saved during gameplay, so that I don't lose progress if the app closes.

#### Acceptance Criteria
1. WHEN score changes THEN the system SHALL persist updated score to local storage
2. WHEN spins remaining changes THEN the system SHALL persist updated count to local storage
3. WHEN session ends (0 spins or 666) THEN the system SHALL mark session as complete in storage
4. WHEN player returns to session THEN the system SHALL load persisted game state
5. IF persisted state is corrupted THEN the system SHALL reset to initial session state
6. WHEN 666 occurs THEN the system SHALL persist final state with loss flag

---

### Requirement 10: Win/Loss Outcome Tracking
**User Story:** As a player, I want to see my final outcome when the game ends, so that I know if I won or lost the session.

#### Acceptance Criteria
1. WHEN spins reach 0 THEN the system SHALL calculate final outcome
2. WHEN calculating outcome THEN the system SHALL compare final score to initial entry amount (future: from smart contract)
3. IF final score > entry amount THEN the system SHALL mark session as WIN
4. IF final score < entry amount THEN the system SHALL mark session as LOSS
5. IF 666 occurred THEN the system SHALL mark session as TOTAL LOSS
6. WHEN outcome is determined THEN the system SHALL display outcome modal with statistics
7. WHEN outcome modal displays THEN the system SHALL show: final score, spins used, best pattern hit, total patterns matched

---

### Requirement 11: Input Validation and Error Handling
**User Story:** As a developer, I want robust error handling for game logic, so that edge cases don't crash the game.

#### Acceptance Criteria
1. WHEN spin is triggered THEN the system SHALL validate game state is active
2. IF game state is invalid THEN the system SHALL log error and prevent spin
3. WHEN generating symbols THEN the system SHALL validate probability weights are valid numbers
4. IF probability calculation fails THEN the system SHALL log error and use uniform distribution
5. WHEN calculating score THEN the system SHALL validate all numeric values
6. IF score calculation fails THEN the system SHALL log error and award 0 points for that spin
7. WHEN any error occurs THEN the system SHALL display user-friendly error message
8. WHEN critical error occurs THEN the system SHALL allow player to restart session

---

### Requirement 12: Performance Optimization
**User Story:** As a player, I want instant feedback when spinning, so that the game feels responsive.

#### Acceptance Criteria
1. WHEN calculating symbol generation THEN the system SHALL complete in < 50ms
2. WHEN detecting patterns THEN the system SHALL complete in < 100ms
3. WHEN calculating scores THEN the system SHALL complete in < 50ms
4. WHEN updating UI THEN the system SHALL trigger re-render in < 16ms (60fps)
5. IF calculations exceed performance budget THEN the system SHALL log performance warning
6. WHEN running animations THEN the system SHALL maintain 60fps frame rate
