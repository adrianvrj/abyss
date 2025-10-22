<div align="center">

<img src="./abyss-mobile/assets/images/icon.png" alt="Abyss" width="200"/>

# Abyss

**Dive into the Abyss - A Blockchain-Powered Slot Machine Game**

[![Starknet](https://img.shields.io/badge/Powered%20by-Starknet-FF4500?style=for-the-badge&logo=ethereum)](https://www.starknet.io)
[![React Native](https://img.shields.io/badge/React%20Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Cairo](https://img.shields.io/badge/Cairo-E95420?style=for-the-badge)](https://www.cairo-lang.org/)

*A thrilling roguelite slot game where skill meets luck on the blockchain*

[Play Now](#getting-started) • [Features](#features) • [Documentation](#documentation)

</div>

---

## 🎰 About

Abyss is a blockchain-powered slot machine game that combines classic casino gameplay with modern decentralized technology. Built on Starknet, it features:

- **🎮 Two Game Modes**: Free to Play for practice, Gambling for competitive stakes
- **📊 Global Leaderboard**: Compete with players worldwide
- **⬆️ Level Progression**: Unlock higher levels with increasing challenges
- **🎨 Pixel Art Aesthetic**: Retro-inspired visuals with modern UX
- **📱 Mobile-First**: Optimized for iOS and Android devices
- **🔒 Privacy-Focused**: Your wallet stays on your device, no personal data collected

## ✨ Features

### 🎮 Gameplay
- **Pattern Matching System**: Match 3+ symbols horizontally, vertically, or diagonally
- **Dynamic Multipliers**: 2x to 10x multipliers based on pattern type
- **Level Progression**: 10+ unique levels with increasing difficulty
- **Spins System**: 5 spins per level - strategize to advance before running out
- **666 Pattern**: Beware the cursed pattern that ends your game instantly!

### 🏆 Competition
- **Global Leaderboard**: Top 10 competitive players displayed in real-time
- **Session Tracking**: All game sessions recorded on-chain for transparency
- **Dual Modes**: Practice in Free to Play or compete in Gambling mode
- **Historical Stats**: Track your progress across levels and sessions

### 🛠️ Technical
- **Starknet Blockchain**: Secure, transparent game state management
- **Infinite Scalability**: No limit on concurrent players or sessions
- **Local Wallet**: Your keys never leave your device
- **Haptic Feedback**: Immersive tactile responses for every game event
- **Offline Tolerance**: Graceful handling of network interruptions

---

## 🎯 How to Play

1. **Launch the App** → Accept Terms of Service
2. **Choose Your Mode** → Free to Play (practice) or Gambling (competitive)
3. **Tap to Spin** → Watch the 5x3 grid reveal symbols
4. **Match Patterns** → Score points with 3+ matching symbols
5. **Level Up** → Reach the threshold before running out of spins
6. **Avoid 666** → Three sixes end your game immediately!
7. **Climb the Leaderboard** → Compete for the top 10 spots

---

## 🎨 Symbols & Scoring

| Symbol | Points | Rarity |
|--------|--------|--------|
| 🎰 Seven | 7 | Rare |
| 💎 Diamond | 5 | Uncommon |
| 🍒 Cherry | 4 | Common |
| 🪙 Coin | 3 | Common |
| 🍋 Lemon | 2 | Common |
| ⚠️ Six | 0 | Cursed |

### Pattern Multipliers
- **Horizontal 3-match**: 2x
- **Horizontal 4-match**: 5x
- **Horizontal 5-match**: 10x
- **Vertical 3-match**: 3x
- **Diagonal 3-match**: 4x

---

## 📱 Getting Started

### Prerequisites
- iOS 14.0+ or Android 8.0+
- Internet connection
- ~100MB storage space

### Installation

**iOS (App Store)**
```bash
# Coming soon to the App Store
```

**Android (Google Play)**
```bash
# Coming soon to Google Play
```

**Build from Source**
```bash
# Clone the repository
git clone https://github.com/yourusername/abyss.git
cd abyss/abyss-mobile

# Install dependencies
npm install

# Run on iOS
npm run ios

# Run on Android
npm run android
```

---

## 🏗️ Project Structure

```
abyss/
├── abyss-mobile/          # React Native mobile app
│   ├── app/              # Expo Router screens
│   ├── components/       # Reusable UI components
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Helper functions
│   ├── constants/       # Game configuration
│   ├── assets/          # Images, fonts, icons
│   └── legal/           # Privacy policy, app store docs
├── contracts/           # Cairo smart contracts
│   └── src/            # Contract source code
└── README.md           # This file
```

---

## 🔗 Smart Contract

The Abyss smart contract is deployed on Starknet and handles:
- Session creation and management
- Score tracking and validation
- Leaderboard updates
- Level progression logic

### Contract Functions

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

---

## 📖 Documentation

For more detailed information:
- **[Privacy Policy](./abyss-mobile/legal/PRIVACY_POLICY.md)** - Learn about our privacy practices
- **[App Store Submission](./abyss-mobile/legal/APP_STORE_SUBMISSION.md)** - App store details and marketing materials
- **[Smart Contract Documentation](#contract-functions)** - Full contract API reference

---

## 🤝 Community & Support

- **Telegram**: [Join our community](https://t.me/+JB4RkO3eZrFhNjYx)
- **Issues**: Report bugs or request features via GitHub Issues
- **Contributing**: Pull requests are welcome!

---

## ⚖️ Legal

### Entertainment Only
Abyss is designed purely for entertainment purposes. No real money gambling is involved.

### Privacy
We respect your privacy. Your wallet is created locally on your device, and we don't collect personal information. See our [Privacy Policy](./abyss-mobile/legal/PRIVACY_POLICY.md) for details.

---

## Acknowledgments

Built with:
- [Starknet](https://www.starknet.io) - Layer 2 scaling solution
- [React Native](https://reactnative.dev/) - Cross-platform mobile framework
- [Expo](https://expo.dev/) - React Native tooling
- [Cairo](https://www.cairo-lang.org/) - Smart contract language
= [Aegis](https://aegis.cavos.xyz)
---

<div align="center">

**Dive into the Abyss. Will you reach the top, or will the 666 claim you?**

Made with <3 by Cavos

</div>
