# Abyss Game
Roguelite slot game on Starknet with infinite player support, level progression, leaderboards, and player reset functionality.

## Features

- **Infinite Players**: No limit on number of players
- **Level Progression**: Dynamic level system with increasing score thresholds
- **Spins System**: 5 spins per level - lose if you run out without leveling up
- **Historical Leaderboard**: Top 10 players with persistent best scores (only updates when player achieves new best)
- **Player Reset**: Reset player progress while preserving leaderboard history
- **Real-time Updates**: Automatic leaderboard updates only for new best scores
- **Admin Control**: Only admin can update scores and reset players

## Contract Functions

### Session Management
- `create_session()` - Create a new game session **[ADMIN ONLY]**
- `update_session_score()` - Update session score and check level progression **[ADMIN ONLY]**
- `get_session_data()` - Get complete session information
- `end_session()` - End a session (mark as inactive) **[ADMIN ONLY]**
- `end_own_session()` - End your own session (mark as inactive) **[PLAYER]**

### Player Session Queries
- `get_player_sessions()` - Get all active sessions for a player
- `get_player_competitive_sessions()` - Get all competitive sessions for a player
- `get_player_casual_sessions()` - Get all casual sessions for a player

### Global Session Queries
- `get_all_competitive_sessions()` - Get all competitive sessions across all players
- `get_all_casual_sessions()` - Get all casual sessions across all players

### Statistics
- `get_total_sessions()` - Get total number of sessions
- `get_total_competitive_sessions()` - Get total number of competitive sessions
- `get_total_casual_sessions()` - Get total number of casual sessions

### Game Information
- `get_level_threshold()` - Get score needed for any level
- `get_leaderboard()` - Get top 10 competitive sessions leaderboard
- `get_admin()` - Get admin address

## Level Thresholds

- Level 1: 33 points
- Level 2: 66 points
- Level 3: 333 points
- Level 4: 666 points
- Level 5: 999 points
- Level 6: 1333 points
- Level 7: 1666 points
- Level 8: 1999 points
- Level 9: 2333 points
- Level 10: 2666 points
- Beyond level 10: 3000 × level

## How the Leaderboard Works

The leaderboard maintains the **final scores of completed competitive sessions**:

1. **Session Completion**: Leaderboard only updates when a competitive session ends
2. **Final Score**: Shows the total score achieved when the session was completed
3. **No Live Updates**: Leaderboard doesn't change during gameplay, only on session end
4. **Top 10**: Only the 10 highest final scores from completed sessions
5. **Competitive Only**: Only competitive sessions can appear in the leaderboard

### Example Scenario:
- Player starts competitive session → Leaderboard unchanged
- Player scores 100 points → Leaderboard unchanged (still playing)
- Player scores 200 more points → Leaderboard unchanged (still playing)
- Player ends session → Leaderboard updates with final score 300
- Player starts new session → Leaderboard unchanged (new session in progress)

## Session System

The game now supports multiple concurrent sessions per player:

### Session Types
- **Competitive Sessions**: Count towards the leaderboard, compete for rankings
- **Casual Sessions**: For practice or fun, don't affect leaderboard

### Session Management
```cairo
// Create competitive session
let session_id = dispatcher.create_session(player_address, true);

// Create casual session  
let casual_id = dispatcher.create_session(player_address, false);

// Update session score
dispatcher.update_session_score(session_id, 50);

// Get player's competitive sessions only
let competitive_sessions = dispatcher.get_player_competitive_sessions(player_address);

// Get player's casual sessions only
let casual_sessions = dispatcher.get_player_casual_sessions(player_address);

// Get all competitive sessions globally
let all_competitive = dispatcher.get_all_competitive_sessions();
```

### Session Tracking
- Each player can have unlimited active sessions
- Sessions are tracked globally by type (competitive/casual)
- Only competitive sessions appear in the leaderboard
- Sessions maintain independent progress (level, score, spins)

## Spins System

The game implements a spins-based progression system:

1. **Starting Spins**: Each player starts with 5 spins per level
2. **Spin Usage**: Each `update_player_score()` call uses 1 spin
3. **Level Progression**: When a player reaches the next level threshold, spins reset to 5
4. **Game Over**: If a player runs out of spins without leveling up, they lose
5. **Reset on Loss**: When a player loses, they can be reset by admin (preserving leaderboard history)

### Spin Mechanics:
- **Level 1**: 5 spins to reach 33 points → Level 2
- **Level 2**: 5 spins to reach 66 points → Level 3
- **Level 3**: 5 spins to reach 333 points → Level 4
- And so on...

### Example Gameplay:
```
Player starts: 5 spins, Level 1, 0 points
Spin 1: +10 points → 4 spins left, 10 total
Spin 2: +15 points → 3 spins left, 25 total
Spin 3: +20 points → 2 spins left, 45 total
Spin 4: +25 points → 1 spin left, 70 total (Level 2!)
Spin 5: +10 points → 5 spins refilled, Level 2, 80 total
```

## Admin System

The contract implements an admin system for security:

1. **Admin Setup**: Admin address is set during contract deployment
2. **Admin Functions**: Only the admin can call `update_player_score()` and `reset_player()`
3. **Public Functions**: All other functions (`get_player_data`, `get_leaderboard`, etc.) are public
4. **Security**: Prevents unauthorized score manipulation and player resets

### Deployment
```cairo
// Deploy with admin address
let admin_address = ContractAddress::from_felt252(123.into());
let contract = deploy("AbyssGame", @array![admin_address]);
```

### Admin Usage
```cairo
// Only admin can update scores
dispatcher.update_player_score(player_address, 100);

// Only admin can reset players  
dispatcher.reset_player(player_address);

// Anyone can read data
let player_data = dispatcher.get_player_data(player_address);
let leaderboard = dispatcher.get_leaderboard();
```
