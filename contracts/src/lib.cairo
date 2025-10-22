use starknet::ContractAddress;

/// Game session data structure
#[derive(Drop, Serde, starknet::Store, Copy)]
pub struct GameSession {
    pub session_id: u32,
    pub player_address: ContractAddress,
    pub level: u32,
    pub score: u32,
    pub total_score: u32,
    pub spins_remaining: u32,
    pub is_competitive: bool, // True if this session counts for leaderboard
    pub is_active: bool, // True if session is still ongoing
    pub created_at: u64, // Timestamp when session was created
}

/// Leaderboard entry structure
#[derive(Drop, Serde, starknet::Store)]
pub struct LeaderboardEntry {
    pub player_address: ContractAddress,
    pub session_id: u32,
    pub level: u32,
    pub total_score: u32,
}

/// Interface for the Abyss Game contract
#[starknet::interface]
pub trait IAbyssGame<TContractState> {
    /// Create a new game session
    fn create_session(ref self: TContractState, player_address: ContractAddress, is_competitive: bool) -> u32;
    
    /// Update session score and check for level progression
    fn update_session_score(ref self: TContractState, session_id: u32, score_increase: u32);
    
    /// Get session data
    fn get_session_data(self: @TContractState, session_id: u32) -> GameSession;

    /// Get all active sessions for a player
    fn get_player_sessions(self: @TContractState, player_address: ContractAddress) -> Array<u32>;

    /// Get all competitive sessions for a player
    fn get_player_competitive_sessions(self: @TContractState, player_address: ContractAddress) -> Array<u32>;

    /// Get all non-competitive sessions for a player
    fn get_player_casual_sessions(self: @TContractState, player_address: ContractAddress) -> Array<u32>;

    /// End a session (mark as inactive) - Admin only
    fn end_session(ref self: TContractState, session_id: u32);

    /// End own session (mark as inactive) - Player can end their own session
    fn end_own_session(ref self: TContractState, session_id: u32);

    /// Get current level score threshold
    fn get_level_threshold(self: @TContractState, level: u32) -> u32;

    /// Get top 10 competitive sessions leaderboard
    fn get_leaderboard(self: @TContractState) -> Array<LeaderboardEntry>;
    
    /// Get admin address
    fn get_admin(self: @TContractState) -> ContractAddress;
    
    /// Get total number of sessions
    fn get_total_sessions(self: @TContractState) -> u32;
    
    /// Get all competitive sessions across all players
    fn get_all_competitive_sessions(self: @TContractState) -> Array<u32>;
    
    /// Get all casual sessions across all players
    fn get_all_casual_sessions(self: @TContractState) -> Array<u32>;
    
    /// Get total number of competitive sessions
    fn get_total_competitive_sessions(self: @TContractState) -> u32;
    
    /// Get total number of casual sessions
    fn get_total_casual_sessions(self: @TContractState) -> u32;
}

/// Abyss Game contract implementation
#[starknet::contract]
mod AbyssGame {
    use super::{GameSession, LeaderboardEntry, ContractAddress};
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use starknet::get_caller_address;
    use core::array::ArrayTrait;

    #[storage]
    struct Storage {
        // Admin address - only admin can update scores and reset players
        admin: ContractAddress,
        
        // Session data mapping: session_id -> GameSession
        sessions: Map<u32, GameSession>,
        
        // Player sessions count per player
        player_sessions_count: Map<ContractAddress, u32>,
        
        // Player sessions mapping: (player_address, index) -> session_id
        player_session: Map<(ContractAddress, u32), u32>,
        
        // Leaderboard entries stored as Map (more gas efficient)
        leaderboard: Map<u32, LeaderboardEntry>,
        leaderboard_count: u32,
        
        // Total number of sessions created
        total_sessions: u32,
        
        // Competitive sessions tracking
        total_competitive_sessions: u32,
        competitive_session: Map<u32, u32>, // index -> session_id
        
        // Casual sessions tracking  
        total_casual_sessions: u32,
        casual_session: Map<u32, u32>, // index -> session_id
    }

    #[constructor]
    fn constructor(ref self: ContractState, admin_address: ContractAddress) {
        self.admin.write(admin_address);
        self.total_sessions.write(0);
        self.total_competitive_sessions.write(0);
        self.total_casual_sessions.write(0);
        self.leaderboard_count.write(0);
    }

    #[abi(embed_v0)]
    impl AbyssGameImpl of super::IAbyssGame<ContractState> {
        fn create_session(ref self: ContractState, player_address: ContractAddress, is_competitive: bool) -> u32 {
            // Only admin can create sessions
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin can create sessions');
            
            // Generate new session ID
            let session_id = self.total_sessions.read() + 1;
            self.total_sessions.write(session_id);
            
            // Create new session
            let new_session = GameSession {
                session_id,
                player_address,
                level: 1,
                score: 0,
                total_score: 0,
                spins_remaining: 5,
                is_competitive,
                is_active: true,
                created_at: 0, // TODO: Add timestamp support
            };
            
            // Save session
            self.sessions.entry(session_id).write(new_session);
            
            // Add session to player's session list
            let session_count = self.player_sessions_count.entry(player_address).read();
            self.player_sessions_count.entry(player_address).write(session_count + 1);
            self.player_session.entry((player_address, session_count)).write(session_id);
            
            // Add session to global tracking by type
            if is_competitive {
                let competitive_count = self.total_competitive_sessions.read();
                self.total_competitive_sessions.write(competitive_count + 1);
                self.competitive_session.entry(competitive_count).write(session_id);
            } else {
                let casual_count = self.total_casual_sessions.read();
                self.total_casual_sessions.write(casual_count + 1);
                self.casual_session.entry(casual_count).write(session_id);
            }
            
            session_id
        }

        fn update_session_score(ref self: ContractState, session_id: u32, score_increase: u32) {
            // Only admin can update session scores
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin can update scores.');

            // Get session data
            let mut session = self.sessions.entry(session_id).read();
            assert(session.is_active, 'Session is not active');
            
            // Check if session has spins remaining
            assert(session.spins_remaining > 0, 'No spins left');
            
            // Use one spin
            session.spins_remaining -= 1;
            
            // Update scores
            session.score += score_increase;
            session.total_score += score_increase;
            
            // Check for level progression
            let mut new_level = session.level;
            while session.score >= Self::get_level_threshold(@self, new_level) {
                new_level += 1;
            }
            
            // Update level if progressed
            if new_level > session.level {
                session.level = new_level;
                // Give 5 spins for new level
                session.spins_remaining = 5;
            }
            
            // Save updated session
            self.sessions.entry(session_id).write(session);
            
            // Note: Leaderboard is only updated when session ends, not during gameplay
        }

        fn get_session_data(self: @ContractState, session_id: u32) -> GameSession {
            self.sessions.entry(session_id).read()
        }

        fn get_player_sessions(self: @ContractState, player_address: ContractAddress) -> Array<u32> {
            let mut sessions_array = ArrayTrait::new();
            let sessions_count = self.player_sessions_count.entry(player_address).read();
            let mut i = 0;
            while i < sessions_count {
                let session_id = self.player_session.entry((player_address, i)).read();
                sessions_array.append(session_id);
                i += 1;
            };
            sessions_array
        }

        fn get_player_competitive_sessions(self: @ContractState, player_address: ContractAddress) -> Array<u32> {
            let mut competitive_sessions = ArrayTrait::new();
            let sessions_count = self.player_sessions_count.entry(player_address).read();
            let mut i = 0;
            while i < sessions_count {
                let session_id = self.player_session.entry((player_address, i)).read();
                let session_data = self.sessions.entry(session_id).read();
                if session_data.is_competitive && session_data.is_active {
                    competitive_sessions.append(session_id);
                };
                i += 1;
            };
            competitive_sessions
        }

        fn get_player_casual_sessions(self: @ContractState, player_address: ContractAddress) -> Array<u32> {
            let mut casual_sessions = ArrayTrait::new();
            let sessions_count = self.player_sessions_count.entry(player_address).read();
            let mut i = 0;
            while i < sessions_count {
                let session_id = self.player_session.entry((player_address, i)).read();
                let session_data = self.sessions.entry(session_id).read();
                if !session_data.is_competitive && session_data.is_active {
                    casual_sessions.append(session_id);
                };
                i += 1;
            };
            casual_sessions
        }

        fn end_own_session(ref self: ContractState, session_id: u32) {
            // Get caller address
            let caller = get_caller_address();
            
            // Get session data
            let mut session = self.sessions.entry(session_id).read();
            
            // Verify caller is the session owner
            assert(caller == session.player_address, 'Only owner can end');
            
            // Mark session as inactive
            session.is_active = false;
            self.sessions.entry(session_id).write(session);
            
            // Update leaderboard only when competitive session ends
            if session.is_competitive {
                InternalImpl::update_leaderboard_if_better(ref self, session);
            }
        }

        fn end_session(ref self: ContractState, session_id: u32) {
            // Only admin can end sessions
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin can end');
            
            let mut session = self.sessions.entry(session_id).read();
            session.is_active = false;
            self.sessions.entry(session_id).write(session);
            
            // Update leaderboard only when competitive session ends
            if session.is_competitive {
                InternalImpl::update_leaderboard_if_better(ref self, session);
            }
        }

        fn get_level_threshold(self: @ContractState, level: u32) -> u32 {
            if level == 1 {
                33
            } else if level == 2 {
                66
            } else if level == 3 {
                333
            } else if level == 4 {
                666
            } else if level == 5 {
                999
            } else if level == 6 {
                1333
            } else if level == 7 {
                1666
            } else if level == 8 {
                1999
            } else if level == 9 {
                2333
            } else if level == 10 {
                2666
            } else {
                // For levels beyond 10, use a pattern: base * level
                let base_score = 3000;
                base_score * level
            }
        }

        fn get_leaderboard(self: @ContractState) -> Array<LeaderboardEntry> {
            let mut leaderboard_array = ArrayTrait::new();
            let leaderboard_len = self.leaderboard_count.read();
            let max_entries = if leaderboard_len > 10 { 10 } else { leaderboard_len };
            
            let mut i = 0;
            while i < max_entries {
                let entry = self.leaderboard.entry(i).read();
                leaderboard_array.append(entry);
                i += 1;
            };
            
            leaderboard_array
        }


        fn get_admin(self: @ContractState) -> ContractAddress {
            self.admin.read()
        }

        fn get_total_sessions(self: @ContractState) -> u32 {
            self.total_sessions.read()
        }

        fn get_all_competitive_sessions(self: @ContractState) -> Array<u32> {
            let mut competitive_sessions = ArrayTrait::new();
            let total_competitive = self.total_competitive_sessions.read();
            let mut i = 0;
            while i < total_competitive {
                let session_id = self.competitive_session.entry(i).read();
                let session_data = self.sessions.entry(session_id).read();
                if session_data.is_active {
                    competitive_sessions.append(session_id);
                };
                i += 1;
            };
            competitive_sessions
        }

        fn get_all_casual_sessions(self: @ContractState) -> Array<u32> {
            let mut casual_sessions = ArrayTrait::new();
            let total_casual = self.total_casual_sessions.read();
            let mut i = 0;
            while i < total_casual {
                let session_id = self.casual_session.entry(i).read();
                let session_data = self.sessions.entry(session_id).read();
                if session_data.is_active {
                    casual_sessions.append(session_id);
                };
                i += 1;
            };
            casual_sessions
        }

        fn get_total_competitive_sessions(self: @ContractState) -> u32 {
            self.total_competitive_sessions.read()
        }

        fn get_total_casual_sessions(self: @ContractState) -> u32 {
            self.total_casual_sessions.read()
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        /// Update the leaderboard only if this is a new best score for the session
        fn update_leaderboard_if_better(ref self: ContractState, session: GameSession) {
            let new_score = session.total_score;
            let new_level = session.level;
            
            // Check if this session already has a better score in the leaderboard
            let current_best_score = Self::get_session_best_score_from_leaderboard(@self, session.session_id);
            
            // Only update if this is a new best score
            if new_score > current_best_score {
                Self::update_leaderboard(ref self, session.player_address, session.session_id, new_score, new_level);
            }
        }

        /// Get session's best score from leaderboard
        fn get_session_best_score_from_leaderboard(self: @ContractState, session_id: u32) -> u32 {
            let leaderboard_len = self.leaderboard_count.read();
            let mut i = 0;
            while i < leaderboard_len {
                let entry = self.leaderboard.entry(i).read();
                if entry.session_id == session_id {
                    return entry.total_score;
                };
                i += 1;
            };
            0 // Session not in leaderboard
        }

        /// Update the leaderboard with a new session entry
        fn update_leaderboard(ref self: ContractState, player_address: ContractAddress, session_id: u32, new_score: u32, new_level: u32) {
            let current_count = self.leaderboard_count.read();
            let mut insert_position = current_count; // Default to append
            let mut should_insert = true;
            
            // Find the correct position to insert
            let mut i = 0;
            while i < current_count {
                let entry = self.leaderboard.entry(i).read();
                if new_score > entry.total_score || (new_score == entry.total_score && new_level > entry.level) {
                    insert_position = i;
                    should_insert = true;
                    break;
                };
                i += 1;
            };
            
            // If leaderboard is full (10 entries) and new score doesn't qualify, don't insert
            if current_count >= 10 && insert_position >= 10 {
                should_insert = false;
            };
            
            if should_insert {
                // Shift entries down if inserting in middle
                let mut j = current_count;
                while j > insert_position {
                    if j < 10 { // Only shift if within bounds
                        let entry_to_move = self.leaderboard.entry(j - 1).read();
                        self.leaderboard.entry(j).write(entry_to_move);
                    };
                    j -= 1;
                };
                
                // Insert new entry
                let new_entry = LeaderboardEntry {
                    player_address,
                    session_id,
                    level: new_level,
                    total_score: new_score,
                };
                self.leaderboard.entry(insert_position).write(new_entry);
                
                // Update count if adding new entry
                if current_count < 10 {
                    self.leaderboard_count.write(current_count + 1);
                };
            }
        }
    }
}