# Abyss Game Contract - Architecture Documentation

## 📁 File Structure

```
contracts/
├── src/
│   └── lib.cairo           # Main contract implementation
├── modules/                # Modular components (prepared for future refactoring)
│   ├── game_types.cairo   # Game types and structs
│   ├── game_config.cairo  # Default configuration
│   ├── storage.cairo      # Storage structure
│   └── interfaces.cairo   # Contract interface
└── tests/
    └── test_simple.cairo  # Integration tests
```

## 🏗️ Contract Architecture

### Main Sections (in lib.cairo)

#### 1. **STORAGE** (Lines 88-119)
All contract state variables including:
- Admin address
- Session mappings
- Player session tracking
- Leaderboard storage
- Session type tracking (competitive/casual)

#### 2. **CONSTRUCTOR** (Lines 121-130)
Initializes:
- Admin address
- Session counters
- Leaderboard count
- Game configuration

#### 3. **PUBLIC INTERFACE IMPLEMENTATION** (Lines 133+)
All public-facing functions organized into sections:

##### A. Session Management
- `create_session()` - Create new game sessions
- `update_session_score()` - Update session scores
- `end_session()` - Admin can end any session
- `end_own_session()` - Player can end their own session

##### B. Session Queries
- `get_session_data()` - Get session information
- `get_player_sessions()` - Get all player sessions
- `get_player_competitive_sessions()` - Get competitive sessions
- `get_player_casual_sessions()` - Get casual sessions

##### C. Global Session Queries
- `get_all_competitive_sessions()` - All competitive sessions
- `get_all_casual_sessions()` - All casual sessions
- `get_total_sessions()` - Total session count
- `get_total_competitive_sessions()` - Competitive count
- `get_total_casual_sessions()` - Casual count

##### D. Game Logic
- `get_level_threshold()` - Level progression thresholds
- `get_admin()` - Get admin address

##### E. Leaderboard
- `get_leaderboard()` - Top 10 competitive sessions

#### 4. **INTERNAL IMPLEMENTATION** (Lines 333+)
Helper functions for leaderboard management:
- `update_leaderboard_if_better()` - Check and update if new best score
- `get_session_best_score_from_leaderboard()` - Retrieve session best
- `update_leaderboard()` - Update leaderboard entries

## 📊 Data Structures

### GameSession
- `session_id`: Unique session identifier
- `player_address`: Player who owns the session
- `level`: Current level (1+)
- `score`: Current level score
- `total_score`: Total accumulated score
- `spins_remaining`: Spins left before game over
- `is_competitive`: Whether counts for leaderboard
- `is_active`: Whether session is ongoing
- `created_at`: Timestamp (future use)

### LeaderboardEntry
- `player_address`: Player address
- `session_id`: Session that achieved this score
- `level`: Level reached
- `total_score`: Best score achieved

## 🎮 Game Mechanics

### Level Progression
- Level 1: 33 points
- Level 2: 66 points
- Level 3: 333 points
- Level 4: 666 points
- Level 5-10: Increasing thresholds
- Level 11+: 3000 × level

### Spins System
- Each player starts with 5 spins per level
- Each score update uses 1 spin
- If player levels up, spins reset to 5
- If spins reach 0 without leveling up, player loses
- Best scores remain on leaderboard

### Leaderboard Logic
- Only competitive sessions appear
- Only updates when session ends (not during gameplay)
- Shows top 10 scores
- Maintains best scores even after resets

## 🔒 Security

- **Admin Control**: Only admin can create/update/end sessions
- **Player Control**: Players can end their own sessions
- **Access Control**: All state-changing functions verify caller

## 🚀 Future Enhancements

The contract is prepared for modular refactoring:
- Game logic separated into modules
- Configurable game settings
- Extensible pattern detection system

DO NOT DELETE

```
sncast --account my_account deploy --class-hash 0x79cf94dd38882e02f1c17fc4a4e6f4fa7d389c180f22b92d9419f1627823eba --arguments  0x2095738a931a4da111842bc52c379bc7f49f5c2afb989d7e16ae5e0bdf5496,0x029d3844210f630db655dcc8fabf9286a1e21040438c915f13fc40a6a0b9b46f,0x05CC7fe1BfAAf3e05DFe1FD67397CeB3570D8869ddF96c5b5bC911289EeBa706 --network sepolia
```
```
sncast --account my_account declare --contract-name AbyssGame --network sepolia
```