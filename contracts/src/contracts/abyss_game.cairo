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

/// Item effect type - defines what the item modifies
/// Using u8 instead of enum for easier serialization
pub type ItemEffectType = u8;

pub mod ItemEffectTypeValues {
    pub const ScoreMultiplier: u8 = 0;
    pub const PatternMultiplierBoost: u8 = 1;
    pub const SymbolProbabilityBoost: u8 = 2;
    pub const DirectScoreBonus: u8 = 3;
    pub const SpinBonus: u8 = 4;
    pub const LevelProgressionBonus: u8 = 5;
}

/// Item definition
#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct Item {
    pub item_id: u32,
    pub name: felt252,
    pub description: felt252,
    pub price: u32,
    pub sell_price: u32,
    pub effect_type: ItemEffectType,
    pub effect_value: u32,
    pub target_symbol: felt252, // For SymbolProbabilityBoost: 'seven', 'diamond', 'cherry', 'lemon', 'coin', 'six'
}

/// Player item inventory entry
#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct PlayerItem {
    pub item_id: u32,
    pub quantity: u32,
}

/// Market state for a session
#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct SessionMarket {
    pub refresh_count: u32,
    pub item_slot_1: u32,
    pub item_slot_2: u32,
    pub item_slot_3: u32,
    pub item_slot_4: u32,
    pub item_slot_5: u32,
    pub item_slot_6: u32,
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

    // Item shop functions
    /// Buy an item from the market for a session using score
    fn buy_item_from_market(ref self: TContractState, session_id: u32, market_slot: u32);

    /// Sell an item from a session for score
    fn sell_item(ref self: TContractState, session_id: u32, item_id: u32, quantity: u32);

    /// Refresh the market items for a session
    fn refresh_market(ref self: TContractState, session_id: u32);

    /// Get the current market state for a session
    fn get_session_market(self: @TContractState, session_id: u32) -> SessionMarket;

    /// Get all items owned by a session
    fn get_session_items(self: @TContractState, session_id: u32) -> Array<PlayerItem>;

    /// Get information about a specific item
    fn get_item_info(self: @TContractState, item_id: u32) -> Item;

    /// Get total number of available items in the shop
    fn get_total_items(self: @TContractState) -> u32;

    /// Get quantity of a specific item in session inventory
    fn get_session_item_quantity(self: @TContractState, session_id: u32, item_id: u32) -> u32;

    /// Get total inventory count for a session
    fn get_session_inventory_count(self: @TContractState, session_id: u32) -> u32;

    /// Get refresh cost for a session
    fn get_refresh_cost(self: @TContractState, session_id: u32) -> u32;
}


/// Abyss Game contract implementation
#[starknet::contract]
pub mod AbyssGame {
    use super::{GameSession, LeaderboardEntry, ContractAddress, Item, PlayerItem, SessionMarket};
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use starknet::get_caller_address;
    use starknet::get_block_timestamp;
    use core::array::ArrayTrait;
    use core::poseidon::poseidon_hash_span;
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};

    // ═══════════════════════════════════════════════════════════════════════════
    // STORAGE: All contract state variables
    // ═══════════════════════════════════════════════════════════════════════════
    #[storage]
    struct Storage {
        // Admin address - only admin can update scores and reset players
        admin: ContractAddress,

        // Chip token address (ERC20)
        chip_token: ContractAddress,

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

        // Item shop storage
        items: Map<u32, Item>,
        total_items: u32,

        // Session inventory
        session_inventory: Map<(u32, u32), u32>,
        session_item_ids: Map<(u32, u32), u32>,
        session_item_count: Map<u32, u32>,

        // Market storage
        session_markets: Map<u32, SessionMarket>,
        nonce: u64,
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR: Initialize contract with admin address
    // ═══════════════════════════════════════════════════════════════════════════
    #[constructor]
    fn constructor(ref self: ContractState, admin_address: ContractAddress, chip_token_address: ContractAddress) {
        self.admin.write(admin_address);
        self.chip_token.write(chip_token_address);
        self.total_sessions.write(0);
        self.total_competitive_sessions.write(0);
        self.total_casual_sessions.write(0);
        self.leaderboard_count.write(0);
        self.nonce.write(0);

        // Initialize items
        InternalImpl::initialize_items(ref self);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC INTERFACE IMPLEMENTATION
    // ═══════════════════════════════════════════════════════════════════════════
    #[abi(embed_v0)]
    impl AbyssGameImpl of super::IAbyssGame<ContractState> {
        // ─────────────────────────────────────────────────────────────────────────
        // SESSION MANAGEMENT: Create and manage game sessions
        // ─────────────────────────────────────────────────────────────────────────
        fn create_session(ref self: ContractState, player_address: ContractAddress, is_competitive: bool) -> u32 {
            // Anyone can create a session for themselves
            let caller = get_caller_address();
            assert(caller == player_address, 'Can only create own session');

            // If competitive session, transfer 1 CHIP token to admin
            if is_competitive {
                let chip_token = IERC20Dispatcher { contract_address: self.chip_token.read() };
                let one_chip: u256 = 1_000_000_000_000_000_000; // 1 CHIP (18 decimals)
                let admin = self.admin.read();

                // Transfer 1 CHIP from player to admin
                let transfer_success = chip_token.transfer_from(caller, admin, one_chip);
                assert(transfer_success, 'CHIP transfer failed');
            }

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

            // Initialize market for the session
            InternalImpl::initialize_market(ref self, session_id);

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

        // ─────────────────────────────────────────────────────────────────────────
        // SESSION END FUNCTIONS: Allow players/admins to end sessions
        // ─────────────────────────────────────────────────────────────────────────
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

        // ─────────────────────────────────────────────────────────────────────────
        // GAME LOGIC: Level thresholds and game mechanics
        // ─────────────────────────────────────────────────────────────────────────
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

        // ─────────────────────────────────────────────────────────────────────────
        // ITEM SHOP: Buy and sell items with market system
        // ─────────────────────────────────────────────────────────────────────────
        fn buy_item_from_market(ref self: ContractState, session_id: u32, market_slot: u32) {
            let caller = get_caller_address();
            let mut session = self.sessions.entry(session_id).read();

            // Verify caller is session owner
            assert(caller == session.player_address, 'Only owner can buy items');
            assert(session.is_active, 'Session is not active');
            assert(market_slot >= 1 && market_slot <= 6, 'Invalid market slot');

            // Check inventory limit (max 6 unique items)
            let unique_item_count = self.session_item_count.entry(session_id).read();

            // Get item from market slot
            let market = self.session_markets.entry(session_id).read();
            let item_id = if market_slot == 1 {
                market.item_slot_1
            } else if market_slot == 2 {
                market.item_slot_2
            } else if market_slot == 3 {
                market.item_slot_3
            } else if market_slot == 4 {
                market.item_slot_4
            } else if market_slot == 5 {
                market.item_slot_5
            } else {
                market.item_slot_6
            };

            assert(item_id > 0, 'Market slot is empty');

            // Get item info
            let item = self.items.entry(item_id).read();
            assert(item.item_id == item_id, 'Item does not exist');

            // Check if item already owned (only 1 of each item allowed)
            let current_quantity = self.session_inventory.entry((session_id, item_id)).read();
            assert(current_quantity == 0, 'Item already owned');

            // Calculate total cost
            let total_cost = item.price;
            assert(session.score >= total_cost, 'Insufficient score');

            // Deduct score from both score and total_score
            session.score -= total_cost;
            session.total_score -= total_cost;

            // Apply SpinBonus effect immediately if applicable (SpinBonus = 4)
            if item.effect_type == 4 {
                session.spins_remaining += item.effect_value;
            }

            self.sessions.entry(session_id).write(session);

            // Check if item was previously owned (exists in item_ids array)
            let mut item_exists_in_array = false;
            let mut i = 0;
            while i < unique_item_count {
                if self.session_item_ids.entry((session_id, i)).read() == item_id {
                    item_exists_in_array = true;
                    break;
                }
                i += 1;
            };

            // Only add to array if it doesn't exist yet
            if !item_exists_in_array {
                // Check inventory limit (max 6 unique items)
                assert(unique_item_count < 6, 'Inventory full (max 6 items)');

                self.session_item_ids.entry((session_id, unique_item_count)).write(item_id);
                self.session_item_count.entry(session_id).write(unique_item_count + 1);
            }

            // Set item quantity to 1
            self.session_inventory.entry((session_id, item_id)).write(1);
        }

        fn refresh_market(ref self: ContractState, session_id: u32) {
            let caller = get_caller_address();
            let mut session = self.sessions.entry(session_id).read();

            // Verify caller is session owner
            assert(caller == session.player_address, 'Only owner can refresh');
            assert(session.is_active, 'Session is not active');

            // Calculate refresh cost
            let market = self.session_markets.entry(session_id).read();
            let refresh_cost = 5 + (market.refresh_count * 2);

            assert(session.score >= refresh_cost, 'Insufficient score');

            // Deduct score from both score and total_score
            session.score -= refresh_cost;
            session.total_score -= refresh_cost;
            self.sessions.entry(session_id).write(session);

            // Generate new market items
            InternalImpl::generate_market_items(ref self, session_id, market.refresh_count + 1);
        }

        fn get_session_market(self: @ContractState, session_id: u32) -> SessionMarket {
            self.session_markets.entry(session_id).read()
        }

        fn sell_item(ref self: ContractState, session_id: u32, item_id: u32, quantity: u32) {
            let caller = get_caller_address();
            let mut session = self.sessions.entry(session_id).read();

            // Verify caller is session owner
            assert(caller == session.player_address, 'Only owner can sell items');
            assert(session.is_active, 'Session is not active');
            assert(quantity > 0, 'Quantity must be positive');

            // Check if session owns the item
            let current_quantity = self.session_inventory.entry((session_id, item_id)).read();
            assert(current_quantity >= quantity, 'Insufficient items');

            // Get item info
            let item = self.items.entry(item_id).read();
            assert(item.item_id == item_id, 'Item does not exist');

            // Calculate sell value
            let total_value = item.sell_price * quantity;

            // Add score to both score and total_score
            session.score += total_value;
            session.total_score += total_value;

            self.sessions.entry(session_id).write(session);

            // Remove item from inventory
            let new_quantity = current_quantity - quantity;
            self.session_inventory.entry((session_id, item_id)).write(new_quantity);
        }

        fn get_session_items(self: @ContractState, session_id: u32) -> Array<PlayerItem> {
            let mut items_array = ArrayTrait::new();
            let item_count = self.session_item_count.entry(session_id).read();

            let mut i = 0;
            while i < item_count {
                let item_id = self.session_item_ids.entry((session_id, i)).read();
                let quantity = self.session_inventory.entry((session_id, item_id)).read();
                if quantity > 0 {
                    items_array.append(PlayerItem { item_id, quantity });
                }
                i += 1;
            };

            items_array
        }

        fn get_item_info(self: @ContractState, item_id: u32) -> Item {
            self.items.entry(item_id).read()
        }

        fn get_total_items(self: @ContractState) -> u32 {
            self.total_items.read()
        }

        fn get_session_item_quantity(self: @ContractState, session_id: u32, item_id: u32) -> u32 {
            self.session_inventory.entry((session_id, item_id)).read()
        }

        fn get_session_inventory_count(self: @ContractState, session_id: u32) -> u32 {
            self.session_item_count.entry(session_id).read()
        }

        fn get_refresh_cost(self: @ContractState, session_id: u32) -> u32 {
            let market = self.session_markets.entry(session_id).read();
            5 + (market.refresh_count * 2)
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

        /// Initialize all shop items
        fn initialize_items(ref self: ContractState) {
            // ═══════════════════════════════════════════════════════════════════
            // SEVEN RUN ITEMS
            // ═══════════════════════════════════════════════════════════════════

            // Item 1: Seven Score Boost (Low tier)
            self.items.entry(1).write(Item {
                item_id: 1,
                name: 'Chilly Pepper',
                description: '+5 points to seven',
                price: 15,
                sell_price: 11,
                effect_type: 3, // DirectScoreBonus
                effect_value: 5,
                target_symbol: 'seven',
            });

            // Item 7: Seven Probability Boost (Mid tier)
            self.items.entry(7).write(Item {
                item_id: 7,
                name: 'Nerd Glasses',
                description: '+15% seven probability',
                price: 45,
                sell_price: 33,
                effect_type: 2, // SymbolProbabilityBoost
                effect_value: 15,
                target_symbol: 'seven',
            });

            // Item 11: Seven Probability Boost (High tier)
            self.items.entry(11).write(Item {
                item_id: 11,
                name: 'Ghost Mask',
                description: '+25% seven probability',
                price: 120,
                sell_price: 90,
                effect_type: 2, // SymbolProbabilityBoost
                effect_value: 25,
                target_symbol: 'seven',
            });

            // ═══════════════════════════════════════════════════════════════════
            // DIAMOND RUN ITEMS
            // ═══════════════════════════════════════════════════════════════════

            // Item 2: Diamond Score Boost (Low tier)
            self.items.entry(2).write(Item {
                item_id: 2,
                name: 'Milk',
                description: '+3 points to diamond',
                price: 20,
                sell_price: 15,
                effect_type: 3, // DirectScoreBonus
                effect_value: 3,
                target_symbol: 'diamond',
            });

            // Item 8: Diamond Probability Boost (Mid tier)
            self.items.entry(8).write(Item {
                item_id: 8,
                name: 'Ace of Spades',
                description: '+12% diamond probability',
                price: 50,
                sell_price: 37,
                effect_type: 2, // SymbolProbabilityBoost
                effect_value: 12,
                target_symbol: 'diamond',
            });

            // ═══════════════════════════════════════════════════════════════════
            // CHERRY RUN ITEMS
            // ═══════════════════════════════════════════════════════════════════

            // Item 3: Cherry Score Boost (Low tier)
            self.items.entry(3).write(Item {
                item_id: 3,
                name: 'Magic Dice',
                description: '+8 points to cherry',
                price: 30,
                sell_price: 22,
                effect_type: 3, // DirectScoreBonus
                effect_value: 8,
                target_symbol: 'cherry',
            });

            // Item 12: Cherry Probability Boost (Low tier)
            self.items.entry(12).write(Item {
                item_id: 12,
                name: 'Skull',
                description: '+10% cherry probability',
                price: 40,
                sell_price: 30,
                effect_type: 2, // SymbolProbabilityBoost
                effect_value: 10,
                target_symbol: 'cherry',
            });

            // Item 13: Cherry Score Boost (Mid tier)
            self.items.entry(13).write(Item {
                item_id: 13,
                name: 'Pig Bank',
                description: '+12 points to cherry',
                price: 85,
                sell_price: 63,
                effect_type: 3, // DirectScoreBonus
                effect_value: 12,
                target_symbol: 'cherry',
            });

            // Item 16: Cherry Probability Boost (Mid tier)
            self.items.entry(16).write(Item {
                item_id: 16,
                name: 'Weird Hand',
                description: '+18% cherry probability',
                price: 95,
                sell_price: 71,
                effect_type: 2, // SymbolProbabilityBoost
                effect_value: 18,
                target_symbol: 'cherry',
            });

            // Item 20: Cherry Score Boost (High tier)
            self.items.entry(20).write(Item {
                item_id: 20,
                name: 'Smelly Boots',
                description: '+20 points to cherry',
                price: 200,
                sell_price: 150,
                effect_type: 3, // DirectScoreBonus
                effect_value: 20,
                target_symbol: 'cherry',
            });

            // ═══════════════════════════════════════════════════════════════════
            // LEMON RUN ITEMS
            // ═══════════════════════════════════════════════════════════════════

            // Item 4: Lemon Score Boost (Mid tier)
            self.items.entry(4).write(Item {
                item_id: 4,
                name: 'Old Cassette',
                description: '+6 points to lemon',
                price: 35,
                sell_price: 26,
                effect_type: 3, // DirectScoreBonus
                effect_value: 6,
                target_symbol: 'lemon',
            });

            // Item 14: Lemon Score Boost (Low tier)
            self.items.entry(14).write(Item {
                item_id: 14,
                name: 'Old Wig',
                description: '+4 points to lemon',
                price: 25,
                sell_price: 18,
                effect_type: 3, // DirectScoreBonus
                effect_value: 4,
                target_symbol: 'lemon',
            });

            // ═══════════════════════════════════════════════════════════════════
            // COIN RUN ITEMS
            // ═══════════════════════════════════════════════════════════════════

            // Item 17: Coin Probability Boost (Mid tier)
            self.items.entry(17).write(Item {
                item_id: 17,
                name: 'Golden Globe',
                description: '+14% coin probability',
                price: 55,
                sell_price: 41,
                effect_type: 2, // SymbolProbabilityBoost
                effect_value: 14,
                target_symbol: 'coin',
            });

            // Item 19: Coin Score Boost (Mid tier)
            self.items.entry(19).write(Item {
                item_id: 19,
                name: 'Old Phone',
                description: '+10 points to coin',
                price: 75,
                sell_price: 56,
                effect_type: 3, // DirectScoreBonus
                effect_value: 10,
                target_symbol: 'coin',
            });

            // ═══════════════════════════════════════════════════════════════════
            // PATTERN MULTIPLIER ITEMS
            // ═══════════════════════════════════════════════════════════════════

            // Item 5: Pattern Boost (Low tier)
            self.items.entry(5).write(Item {
                item_id: 5,
                name: 'Bat Boomerang',
                description: '+15% pattern multiplier',
                price: 40,
                sell_price: 30,
                effect_type: 1, // PatternMultiplierBoost
                effect_value: 15,
                target_symbol: '',
            });

            // Item 6: Pattern Boost (Mid tier)
            self.items.entry(6).write(Item {
                item_id: 6,
                name: 'Holy Eye',
                description: '+30% pattern multiplier',
                price: 90,
                sell_price: 67,
                effect_type: 1, // PatternMultiplierBoost
                effect_value: 30,
                target_symbol: '',
            });

            // Item 15: Pattern Boost (High tier)
            self.items.entry(15).write(Item {
                item_id: 15,
                name: 'Amulet',
                description: '+50% pattern multiplier',
                price: 150,
                sell_price: 112,
                effect_type: 1, // PatternMultiplierBoost
                effect_value: 50,
                target_symbol: '',
            });

            // Item 21: Pattern Boost (Very High tier)
            self.items.entry(21).write(Item {
                item_id: 21,
                name: 'Bloody Wrench',
                description: '+80% pattern multiplier',
                price: 280,
                sell_price: 210,
                effect_type: 1, // PatternMultiplierBoost
                effect_value: 80,
                target_symbol: '',
            });

            // ═══════════════════════════════════════════════════════════════════
            // SPIN ITEMS
            // ═══════════════════════════════════════════════════════════════════

            // Item 9: Extra Spin (Low tier)
            self.items.entry(9).write(Item {
                item_id: 9,
                name: 'Devil Onion',
                description: '+1 extra spin',
                price: 25,
                sell_price: 18,
                effect_type: 4, // SpinBonus
                effect_value: 1,
                target_symbol: '',
            });

            // Item 10: Spin Bundle (Mid tier)
            self.items.entry(10).write(Item {
                item_id: 10,
                name: 'Red Button',
                description: '+3 extra spins',
                price: 65,
                sell_price: 48,
                effect_type: 4, // SpinBonus
                effect_value: 3,
                target_symbol: '',
            });

            // Item 18: Mega Spin Bundle (High tier)
            self.items.entry(18).write(Item {
                item_id: 18,
                name: 'Pyramid',
                description: '+5 extra spins',
                price: 110,
                sell_price: 82,
                effect_type: 4, // SpinBonus
                effect_value: 5,
                target_symbol: '',
            });

            // Item 23: Super Spin Bundle (Very High tier)
            self.items.entry(23).write(Item {
                item_id: 23,
                name: 'Devil Seal',
                description: '+10 extra spins',
                price: 200,
                sell_price: 150,
                effect_type: 4, // SpinBonus
                effect_value: 10,
                target_symbol: '',
            });

            // ═══════════════════════════════════════════════════════════════════
            // SPECIAL ITEMS
            // ═══════════════════════════════════════════════════════════════════

            // Item 22: Removed (was score multiplier)
            self.items.entry(22).write(Item {
                item_id: 22,
                name: 'Car Keys',
                description: '+100% pattern multiplier',
                price: 400,
                sell_price: 300,
                effect_type: 1, // PatternMultiplierBoost
                effect_value: 100,
                target_symbol: '',
            });

            // Item 24: Legendary Item
            self.items.entry(24).write(Item {
                item_id: 24,
                name: 'Holy Grail',
                description: '+150% pattern multiplier',
                price: 800,
                sell_price: 600,
                effect_type: 1, // PatternMultiplierBoost
                effect_value: 150,
                target_symbol: '',
            });

            // ═══════════════════════════════════════════════════════════════════
            // NEW ITEMS FOR COMPLETE RUNS
            // ═══════════════════════════════════════════════════════════════════

            // Item 25: Seven Score Boost (High tier)
            self.items.entry(25).write(Item {
                item_id: 25,
                name: 'Hockey Mask',
                description: '+15 points to seven',
                price: 180,
                sell_price: 135,
                effect_type: 3, // DirectScoreBonus
                effect_value: 15,
                target_symbol: 'seven',
            });

            // Item 26: Diamond Score Boost (High tier)
            self.items.entry(26).write(Item {
                item_id: 26,
                name: 'Rune',
                description: '+12 points to diamond',
                price: 160,
                sell_price: 120,
                effect_type: 3, // DirectScoreBonus
                effect_value: 12,
                target_symbol: 'diamond',
            });

            // Item 27: Diamond Probability Boost (High tier)
            self.items.entry(27).write(Item {
                item_id: 27,
                name: 'Bloody knife',
                description: '+22% diamond probability',
                price: 130,
                sell_price: 97,
                effect_type: 2, // SymbolProbabilityBoost
                effect_value: 22,
                target_symbol: 'diamond',
            });

            // Item 28: Cherry Probability Boost (High tier)
            self.items.entry(28).write(Item {
                item_id: 28,
                name: 'Devil Head',
                description: '+28% cherry probability',
                price: 220,
                sell_price: 165,
                effect_type: 2, // SymbolProbabilityBoost
                effect_value: 28,
                target_symbol: 'cherry',
            });

            // Item 29: Lemon Probability Boost (Mid tier)
            self.items.entry(29).write(Item {
                item_id: 29,
                name: 'Cigarettes',
                description: '+16% lemon probability',
                price: 70,
                sell_price: 52,
                effect_type: 2, // SymbolProbabilityBoost
                effect_value: 16,
                target_symbol: 'lemon',
            });

            // Item 30: Lemon Score Boost (High tier)
            self.items.entry(30).write(Item {
                item_id: 30,
                name: 'Soul Contract',
                description: '+18 points to lemon',
                price: 170,
                sell_price: 127,
                effect_type: 3, // DirectScoreBonus
                effect_value: 18,
                target_symbol: 'lemon',
            });

            // Item 31: Coin Probability Boost (High tier)
            self.items.entry(31).write(Item {
                item_id: 31,
                name: 'Beer Can',
                description: '+25% coin probability',
                price: 140,
                sell_price: 105,
                effect_type: 2, // SymbolProbabilityBoost
                effect_value: 25,
                target_symbol: 'coin',
            });

            // Item 32: Coin Score Boost (High tier)
            self.items.entry(32).write(Item {
                item_id: 32,
                name: 'Memory Card',
                description: '+22 points to coin',
                price: 250,
                sell_price: 187,
                effect_type: 3, // DirectScoreBonus
                effect_value: 22,
                target_symbol: 'coin',
            });

            self.total_items.write(32);
        }

        /// Initialize market for a new session
        fn initialize_market(ref self: ContractState, session_id: u32) {
            Self::generate_market_items(ref self, session_id, 0);
        }

        /// Generate random market items for a session
        fn generate_market_items(ref self: ContractState, session_id: u32, refresh_count: u32) {
            // Increment nonce for randomness
            let current_nonce = self.nonce.read();
            self.nonce.write(current_nonce + 1);

            // Generate 6 random item IDs
            let item_1 = Self::generate_random_item_id(@self, session_id, current_nonce, 1);
            let item_2 = Self::generate_random_item_id(@self, session_id, current_nonce, 2);
            let item_3 = Self::generate_random_item_id(@self, session_id, current_nonce, 3);
            let item_4 = Self::generate_random_item_id(@self, session_id, current_nonce, 4);
            let item_5 = Self::generate_random_item_id(@self, session_id, current_nonce, 5);
            let item_6 = Self::generate_random_item_id(@self, session_id, current_nonce, 6);

            // Save market state
            let market = SessionMarket {
                refresh_count,
                item_slot_1: item_1,
                item_slot_2: item_2,
                item_slot_3: item_3,
                item_slot_4: item_4,
                item_slot_5: item_5,
                item_slot_6: item_6,
            };

            self.session_markets.entry(session_id).write(market);
        }

        /// Generate a random item ID (1-24)
        fn generate_random_item_id(self: @ContractState, session_id: u32, nonce: u64, slot: u32) -> u32 {
            let timestamp = get_block_timestamp();
            let total_items = self.total_items.read();

            // Create array for hashing
            let mut hash_data = ArrayTrait::new();
            hash_data.append(session_id.into());
            hash_data.append(nonce.into());
            hash_data.append(slot.into());
            hash_data.append(timestamp.into());

            // Hash the data
            let hash_result = poseidon_hash_span(hash_data.span());

            // Convert to u256 for modulo operation
            let hash_u256: u256 = hash_result.into();
            let total_items_u256: u256 = total_items.into();

            // Get random number between 1 and total_items
            let random_u256 = (hash_u256 % total_items_u256) + 1;

            // Convert back to u32
            let item_id: u32 = random_u256.try_into().unwrap();

            item_id
        }
    }
}