use starknet::ContractAddress;

#[derive(Drop, Serde, starknet::Store, Copy)]
pub struct GameSession {
    pub session_id: u32,
    pub player_address: ContractAddress,
    pub level: u32,
    pub score: u32,
    pub total_score: u32,
    pub spins_remaining: u32,
    pub is_competitive: bool,
    pub is_active: bool,
    pub created_at: u64,
    pub chips_claimed: bool,
    pub equipped_relic: u256,
    pub relic_last_used_spin: u32,
    pub relic_pending_effect: u8,
    pub total_spins: u32,
    // Soul Charms system
    pub luck: u32, // Current luck value from charms
    pub blocked_666_this_session: bool, // For Chaos Orb conditional effect
    pub tickets: u32, // Ticket system for item purchasing
    // Dynamic Symbol Scores (Cumulative Item Buffs)
    pub score_seven: u32,
    pub score_diamond: u32,
    pub score_cherry: u32,
    pub score_coin: u32,
    pub score_lemon: u32,
}

#[derive(Drop, Serde, starknet::Store)]
pub struct LeaderboardEntry {
    pub player_address: ContractAddress,
    pub session_id: u32,
    pub level: u32,
    pub total_score: u32,
}

pub type ItemEffectType = u8;

pub mod ItemEffectTypeValues {
    pub const ScoreMultiplier: u8 = 0;
    pub const PatternMultiplierBoost: u8 = 1;
    pub const SymbolProbabilityBoost: u8 = 2;
    pub const DirectScoreBonus: u8 = 3;
    pub const SpinBonus: u8 = 4;
    pub const LevelProgressionBonus: u8 = 5;
    pub const SixSixSixProtection: u8 = 6;
}

pub type RelicEffectType = u8;

pub mod RelicEffectTypeValues {
    pub const NoEffect: u8 = 255;
    pub const RandomJackpot: u8 = 0;
    pub const Trigger666: u8 = 1;
    pub const DoubleNextSpin: u8 = 2;
    pub const ResetSpins: u8 = 3;
    pub const FreeMarketRefresh: u8 = 4;
}

#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct Item {
    pub item_id: u32,
    pub name: felt252,
    pub description: felt252,
    pub price: u32,
    pub sell_price: u32,
    pub effect_type: ItemEffectType,
    pub effect_value: u32,
    pub target_symbol: felt252,
}

#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct PlayerItem {
    pub item_id: u32,
    pub quantity: u32,
}

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

// ═══════════════════════════════════════════════════════════════════════════
// SPIN RESULT AND VRF TYPES
// ═══════════════════════════════════════════════════════════════════════════

/// Symbol types for the slot machine grid
pub mod SymbolType {
    pub const SEVEN: u8 = 1;
    pub const DIAMOND: u8 = 2;
    pub const CHERRY: u8 = 3;
    pub const COIN: u8 = 4;
    pub const LEMON: u8 = 5;
    pub const SIX: u8 = 6;
}

#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct SpinResult {
    pub session_id: u32,
    pub grid: [u8; 15],
    pub score: u32,
    pub patterns_count: u8,
    pub is_666: bool,
    pub is_jackpot: bool,
    pub is_pending: bool,
    pub biblia_used: bool,
}

#[starknet::interface]
pub trait IAbyssGame<TContractState> {
    fn create_session(
        ref self: TContractState, player_address: ContractAddress, payment_token: ContractAddress,
    ) -> u32;
    fn get_session_data(self: @TContractState, session_id: u32) -> GameSession;
    fn get_player_sessions(self: @TContractState, player_address: ContractAddress) -> Array<u32>;
    fn get_player_competitive_sessions(
        self: @TContractState, player_address: ContractAddress,
    ) -> Array<u32>;
    fn end_own_session(ref self: TContractState, session_id: u32);

    fn get_level_threshold(self: @TContractState, level: u32) -> u32;
    fn get_leaderboard(self: @TContractState) -> Array<LeaderboardEntry>;
    fn get_admin(self: @TContractState) -> ContractAddress;
    fn get_total_sessions(self: @TContractState) -> u32;
    fn buy_item_from_market(ref self: TContractState, session_id: u32, market_slot: u32);
    fn sell_item(ref self: TContractState, session_id: u32, item_id: u32, quantity: u32);
    fn refresh_market(ref self: TContractState, session_id: u32);
    fn get_session_market(self: @TContractState, session_id: u32) -> SessionMarket;
    fn get_session_items(self: @TContractState, session_id: u32) -> Array<PlayerItem>;
    fn get_item_info(self: @TContractState, item_id: u32) -> Item;
    fn get_666_probability(self: @TContractState, level: u32) -> u32;
    fn get_session_item_quantity(self: @TContractState, session_id: u32, item_id: u32) -> u32;
    fn get_session_inventory_count(self: @TContractState, session_id: u32) -> u32;
    fn get_refresh_cost(self: @TContractState, session_id: u32) -> u32;
    fn is_market_slot_purchased(self: @TContractState, session_id: u32, market_slot: u32) -> bool;
    fn claim_prize(ref self: TContractState);
    fn get_prize_pool(self: @TContractState) -> u256;
    fn get_treasury(self: @TContractState) -> ContractAddress;
    // VRF Spin functions
    fn request_spin(ref self: TContractState, session_id: u32);
    fn get_last_spin_result(self: @TContractState, session_id: u32) -> SpinResult;
    fn claim_chips(ref self: TContractState, session_id: u32);
    fn get_chips_to_claim(self: @TContractState, session_id: u32) -> u256;
    fn get_available_beast_sessions(self: @TContractState, player: ContractAddress) -> u32;
    fn set_chip_token_address(ref self: TContractState, address: ContractAddress);
    fn set_beast_nft_address(ref self: TContractState, address: ContractAddress);
    fn set_chip_emission_rate(ref self: TContractState, rate: u32);
    fn set_chip_boost_multiplier(ref self: TContractState, multiplier: u32);
    fn set_token_pair_id(ref self: TContractState, token: ContractAddress, pair_id: felt252);
    fn set_pragma_oracle(ref self: TContractState, oracle: ContractAddress);
    fn get_usd_cost_in_token(self: @TContractState, token: ContractAddress) -> u256;
    // Relic system
    fn equip_relic(ref self: TContractState, session_id: u32, relic_token_id: u256);
    fn activate_relic(ref self: TContractState, session_id: u32);
    fn set_relic_nft_address(ref self: TContractState, address: ContractAddress);
    // Prize distribution (admin)
    fn add_prize_token(ref self: TContractState, token: ContractAddress);
    fn distribute_prizes(ref self: TContractState);
    fn get_prize_token_balances(self: @TContractState) -> Array<(ContractAddress, u256)>;
    // Soul Charms system
    fn set_charm_nft_address(ref self: TContractState, address: ContractAddress);
    fn get_session_luck(self: @TContractState, session_id: u32) -> u32;
    fn get_charm_drop_chance(self: @TContractState, session_id: u32) -> u32;
    fn mint_all_charms(ref self: TContractState, recipient: ContractAddress); // Admin only
    fn update_item_price(ref self: TContractState, item_id: u32, price: u32, sell_price: u32);
    fn update_item_effect_value(ref self: TContractState, item_id: u32, new_value: u32);
    fn initialize_items(ref self: TContractState);
}


#[starknet::contract]
pub mod AbyssGame {
    use core::array::{ArrayTrait, SpanTrait};
    use core::dict::{Felt252Dict, Felt252DictTrait};
    use core::num::traits::Zero;
    use core::poseidon::poseidon_hash_span;
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use openzeppelin::token::erc721::interface::{IERC721Dispatcher, IERC721DispatcherTrait};
    use openzeppelin::upgrades::UpgradeableComponent;
    use openzeppelin::upgrades::interface::IUpgradeable;
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use starknet::{ClassHash, get_block_timestamp, get_caller_address};
    use crate::modules::cartridge_vrf::{
        IVrfProviderDispatcher, IVrfProviderDispatcherTrait, Source,
    };
    use super::{
        ContractAddress, GameSession, Item, LeaderboardEntry, PlayerItem, RelicEffectTypeValues,
        SessionMarket,
    };

    // Upgradeable component
    component!(path: UpgradeableComponent, storage: upgradeable, event: UpgradeableEvent);

    impl UpgradeableInternalImpl = UpgradeableComponent::InternalImpl<ContractState>;

    // IChip interface for minting CHIP tokens
    #[starknet::interface]
    trait IChip<TContractState> {
        fn mint(ref self: TContractState, recipient: ContractAddress, amount: u256);
    }

    // Pragma Oracle interface for price feeds
    #[derive(Drop, Serde)]
    pub enum DataType {
        SpotEntry: felt252,
        FutureEntry: (felt252, u64),
        GenericEntry: felt252,
    }

    #[derive(Drop, Serde)]
    pub struct PragmaPricesResponse {
        pub price: u128,
        pub decimals: u32,
        pub last_updated_timestamp: u64,
        pub num_sources_aggregated: u32,
        pub expiration_timestamp: Option<u64>,
    }

    #[starknet::interface]
    trait IPragmaABI<TContractState> {
        fn get_data_median(self: @TContractState, data_type: DataType) -> PragmaPricesResponse;
    }

    // Relic NFT interface
    #[derive(Drop, Serde, Copy)]
    pub struct RelicMetadata {
        pub relic_id: u32,
        pub name: felt252,
        pub description: felt252,
        pub effect_type: u8,
        pub cooldown_spins: u32,
        pub rarity: u8,
        pub image_uri: felt252,
        pub strength: u8,
        pub dexterity: u8,
        pub intelligence: u8,
        pub vitality: u8,
        pub wisdom: u8,
        pub charisma: u8,
        pub luck: u8,
    }

    #[starknet::interface]
    trait IRelic<TContractState> {
        fn get_relic_metadata(self: @TContractState, token_id: u256) -> RelicMetadata;
    }

    #[starknet::interface]
    trait IRelicERC721<TContractState> {
        fn owner_of(self: @TContractState, token_id: u256) -> ContractAddress;
    }

    // Soul Charm NFT interface
    #[derive(Drop, Serde, Copy)]
    pub struct CharmMetadata {
        pub charm_id: u32,
        pub name: felt252,
        pub description: felt252,
        pub effect_type: u8,
        pub effect_value: u32,
        pub effect_value_2: u32,
        pub condition_type: u8,
        pub rarity: u8,
        pub shop_cost: u32,
    }

    #[starknet::interface]
    trait ICharm<TContractState> {
        fn get_player_charms(self: @TContractState, player: ContractAddress) -> Array<u256>;
        fn get_charm_metadata(self: @TContractState, token_id: u256) -> CharmMetadata;
        fn get_charm_type_info(self: @TContractState, charm_id: u32) -> CharmMetadata;
        fn mint_random_charm_of_rarity(
            ref self: TContractState, player: ContractAddress, rarity: u8, random_seed: felt252,
        ) -> u256;
        fn get_charms_by_rarity(self: @TContractState, rarity: u8) -> Array<u32>;
        fn mint_charm(ref self: TContractState, player: ContractAddress, charm_id: u32) -> u256;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STORAGE: All contract state variables
    // ═══════════════════════════════════════════════════════════════════════════
    #[storage]
    struct Storage {
        #[substorage(v0)]
        upgradeable: UpgradeableComponent::Storage,
        admin: ContractAddress,
        chip_token: ContractAddress,
        treasury: ContractAddress,
        prize_pool: u256,
        has_claimed: Map<ContractAddress, bool>,
        sessions: Map<u32, GameSession>,
        player_sessions_count: Map<ContractAddress, u32>,
        player_session: Map<(ContractAddress, u32), u32>,
        leaderboard: Map<u32, LeaderboardEntry>,
        leaderboard_count: u32,
        total_sessions: u32,
        total_competitive_sessions: u32,
        competitive_session: Map<u32, u32>,
        items: Map<u32, Item>,
        total_items: u32,
        session_inventory: Map<(u32, u32), u32>,
        session_item_ids: Map<(u32, u32), u32>,
        session_item_count: Map<u32, u32>,
        session_markets: Map<u32, SessionMarket>,
        market_slot_purchased: Map<(u32, u32), bool>,
        nonce: u64,
        vrf_provider_address: ContractAddress,
        last_spin_results: Map<u32, super::SpinResult>,
        beast_nft_address: ContractAddress,
        beast_sessions_used: Map<ContractAddress, u32>,
        chip_emission_rate: u32,
        chip_boost_multiplier: u32,
        pragma_oracle: ContractAddress,
        token_pair_ids: Map<ContractAddress, felt252>,
        relic_nft_address: ContractAddress,
        // Prize distribution tokens
        prize_tokens: Map<u32, ContractAddress>,
        prize_tokens_count: u32,
        prizes_distributed: bool,
        // Soul Charms system
        charm_nft_address: ContractAddress,
        session_charm_ids: Map<(u32, u32), u32>, // (session_id, index) -> charm_id (in session)
        session_charm_count: Map<u32, u32>, // session_id -> count (in session)
        // Owned charms cache for market generation
        session_owned_charm_ids: Map<(u32, u32), u32>,
        session_owned_charm_count: Map<u32, u32> // session_id -> count (owned by player)
    }

    // Events for frontend receipt reading (LootSurvivor pattern)
    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        UpgradeableEvent: UpgradeableComponent::Event,
        CharmMinted: CharmMinted,
        SpinCompleted: SpinCompleted,
        ItemPurchased: ItemPurchased,
        ItemSold: ItemSold,
        MarketRefreshed: MarketRefreshed,
        RelicActivated: RelicActivated,
        RelicEquipped: RelicEquipped,
        BibliaDiscarded: BibliaDiscarded,
    }

    #[derive(Drop, starknet::Event)]
    struct CharmMinted {
        #[key]
        player: ContractAddress,
        #[key]
        session_id: u32,
        charm_id: u32,
        rarity: u8,
        token_id: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct SpinCompleted {
        #[key]
        session_id: u32,
        grid: [u8; 15],
        score_gained: u32,
        new_total_score: u32,
        new_level: u32,
        spins_remaining: u32,
        is_active: bool,
        is_666: bool,
        is_jackpot: bool,
        biblia_used: bool,
        current_luck: u32,
        symbol_scores: [u32; 5],
    }

    #[derive(Drop, starknet::Event)]
    struct ItemPurchased {
        #[key]
        session_id: u32,
        item_id: u32,
        price: u32,
        new_score: u32,
        new_spins: u32,
        new_tickets: u32,
        is_charm: bool,
        current_luck: u32,
    }

    #[derive(Drop, starknet::Event)]
    struct ItemSold {
        #[key]
        session_id: u32,
        item_id: u32,
        sell_price: u32,
        new_score: u32,
        new_tickets: u32,
        current_luck: u32,
    }

    #[derive(Drop, starknet::Event)]
    struct MarketRefreshed {
        #[key]
        session_id: u32,
        new_score: u32,
        slot_1: u32,
        slot_2: u32,
        slot_3: u32,
        slot_4: u32,
        slot_5: u32,
        slot_6: u32,
        current_luck: u32,
    }

    #[derive(Drop, starknet::Event)]
    struct RelicActivated {
        #[key]
        session_id: u32,
        relic_id: u32,
        effect_type: u8,
        cooldown_until_spin: u32,
        current_luck: u32,
    }

    #[derive(Drop, starknet::Event)]
    struct RelicEquipped {
        #[key]
        session_id: u32,
        relic_token_id: u256,
        relic_id: u32,
        current_luck: u32,
    }

    #[derive(Drop, starknet::Event)]
    struct BibliaDiscarded {
        #[key]
        session_id: u32,
        discarded: bool,
    }

    // Implement IUpgradeable - only admin can upgrade
    #[abi(embed_v0)]
    impl UpgradeableImpl of IUpgradeable<ContractState> {
        fn upgrade(ref self: ContractState, new_class_hash: ClassHash) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin can upgrade');
            self.upgradeable.upgrade(new_class_hash);
        }
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin_address: ContractAddress,
        chip_token_address: ContractAddress,
        treasury_address: ContractAddress,
        vrf_provider_address: ContractAddress,
        pragma_oracle_address: ContractAddress,
    ) {
        self.admin.write(admin_address);
        self.chip_token.write(chip_token_address);
        self.treasury.write(treasury_address);
        self.vrf_provider_address.write(vrf_provider_address);
        self.pragma_oracle.write(pragma_oracle_address);
        self.prize_pool.write(0);
        self.total_sessions.write(0);
        self.total_competitive_sessions.write(0);
        self.leaderboard_count.write(0);
        self.nonce.write(0);
        // Monetization defaults
        self.chip_emission_rate.write(1); // 1 CHIP per 20 score = 5 per 100
        self.chip_boost_multiplier.write(1); // 1x multiplier initially
        InternalImpl::initialize_items(ref self);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC INTERFACE IMPLEMENTATION
    // ═══════════════════════════════════════════════════════════════════════════
    #[abi(embed_v0)]
    impl AbyssGameImpl of super::IAbyssGame<ContractState> {
        fn create_session(
            ref self: ContractState,
            player_address: ContractAddress,
            payment_token: ContractAddress,
        ) -> u32 {
            let caller = get_caller_address();
            assert(caller == player_address, 'Can only create own session');

            // Check for free Beast sessions
            let free_sessions = Self::get_available_beast_sessions(@self, player_address);

            if free_sessions > 0 {
                // Use free Beast session
                let used = self.beast_sessions_used.entry(player_address).read();
                self.beast_sessions_used.entry(player_address).write(used + 1);
            } else {
                // PAYMENT REQUIRED - Calculate $1 USD in payment_token
                let payment_amount = InternalImpl::get_usd_cost_in_token(@self, payment_token);

                // Transfer payment from player to contract
                let contract_addr = starknet::get_contract_address();
                IERC20Dispatcher { contract_address: payment_token }
                    .transfer_from(caller, contract_addr, payment_amount);

                // Distribute revenue: 50% prize, 30% treasury, 20% team (admin)
                InternalImpl::distribute_revenue(ref self, payment_token, payment_amount);
            }
            let session_id = self.total_sessions.read() + 1;
            self.total_sessions.write(session_id);
            let new_session = GameSession {
                session_id,
                player_address,
                level: 1,
                score: 0,
                total_score: 0,
                spins_remaining: 5,
                is_competitive: true,
                is_active: true,
                created_at: 0,
                chips_claimed: false,
                // Relic fields
                equipped_relic: 0, // No relic equipped
                relic_last_used_spin: 0,
                relic_pending_effect: RelicEffectTypeValues::NoEffect,
                total_spins: 0, // No spins performed yet 
                luck: 0,
                blocked_666_this_session: false,
                tickets: 8,
                score_seven: 7,
                score_diamond: 5,
                score_cherry: 4,
                score_coin: 3,
                score_lemon: 2,
            };
            self.sessions.entry(session_id).write(new_session);
            let session_count = self.player_sessions_count.entry(player_address).read();
            self.player_sessions_count.entry(player_address).write(session_count + 1);
            self.player_session.entry((player_address, session_count)).write(session_id);
            let competitive_count = self.total_competitive_sessions.read();
            self.total_competitive_sessions.write(competitive_count + 1);
            self.competitive_session.entry(competitive_count).write(session_id);
            InternalImpl::initialize_market(ref self, session_id);
            session_id
        }


        fn get_session_data(self: @ContractState, session_id: u32) -> GameSession {
            self.sessions.entry(session_id).read()
        }

        fn get_player_sessions(
            self: @ContractState, player_address: ContractAddress,
        ) -> Array<u32> {
            let mut sessions_array = ArrayTrait::new();
            let sessions_count = self.player_sessions_count.entry(player_address).read();
            let mut i = 0;
            while i < sessions_count {
                let session_id = self.player_session.entry((player_address, i)).read();
                sessions_array.append(session_id);
                i += 1;
            }
            sessions_array
        }

        fn get_player_competitive_sessions(
            self: @ContractState, player_address: ContractAddress,
        ) -> Array<u32> {
            let mut competitive_sessions = ArrayTrait::new();
            let sessions_count = self.player_sessions_count.entry(player_address).read();
            let mut i = 0;
            while i < sessions_count {
                let session_id = self.player_session.entry((player_address, i)).read();
                let session_data = self.sessions.entry(session_id).read();
                if session_data.is_competitive && session_data.is_active {
                    competitive_sessions.append(session_id);
                }
                i += 1;
            }
            competitive_sessions
        }

        fn end_own_session(ref self: ContractState, session_id: u32) {
            let caller = get_caller_address();
            let mut session = self.sessions.entry(session_id).read();
            assert(caller == session.player_address, 'Only owner can end');
            session.is_active = false;
            self.sessions.entry(session_id).write(session);
            if session.is_competitive {
                InternalImpl::update_leaderboard_if_better(ref self, session);
            }
        }


        fn get_level_threshold(self: @ContractState, level: u32) -> u32 {
            if level == 0 {
                0
            } else if level == 1 {
                33
            } else if level == 2 {
                66
            } else if level == 3 {
                100
            } else if level == 4 {
                150
            } else if level == 5 {
                250
            } else if level == 6 {
                400
            } else if level == 7 {
                800
            } else if level == 8 {
                1200
            } else if level == 9 {
                2400
            } else if level == 10 {
                4800
            } else {
                let mut result: u32 = 4800;
                let mut i: u32 = 10;
                while i < level {
                    result = result * 2;
                    i += 1;
                }
                result
            }
        }


        fn get_leaderboard(self: @ContractState) -> Array<LeaderboardEntry> {
            let mut leaderboard_array = ArrayTrait::new();
            let leaderboard_len = self.leaderboard_count.read();
            let max_entries = if leaderboard_len > 10 {
                10
            } else {
                leaderboard_len
            };

            let mut i = 0;
            while i < max_entries {
                let entry = self.leaderboard.entry(i).read();
                leaderboard_array.append(entry);
                i += 1;
            }

            leaderboard_array
        }


        fn get_admin(self: @ContractState) -> ContractAddress {
            self.admin.read()
        }

        fn get_total_sessions(self: @ContractState) -> u32 {
            self.total_sessions.read()
        }

        // ─────────────────────────────────────────────────────────────────────────
        // ITEM SHOP: Buy and sell items with market system
        // ─────────────────────────────────────────────────────────────────────────
        fn buy_item_from_market(ref self: ContractState, session_id: u32, market_slot: u32) {
            let caller = get_caller_address();
            let mut session = self.sessions.entry(session_id).read();
            assert(caller == session.player_address, 'Only owner can buy items');
            assert(session.is_active, 'Session is not active');
            assert(market_slot >= 1 && market_slot <= 6, 'Invalid market slot');
            let slot_purchased = self.market_slot_purchased.entry((session_id, market_slot)).read();
            assert(!slot_purchased, 'Item already purchased');

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

            // Check if this is a charm (item_id >= 1000)
            if item_id >= 1000 {
                // It's a charm!
                let charm_id = item_id - 1000;
                let charm_count = self.session_charm_count.entry(session_id).read();

                // Check if charm already in session
                let mut charm_already_owned = false;
                let mut i: u32 = 0;
                while i < charm_count {
                    if self.session_charm_ids.entry((session_id, i)).read() == charm_id {
                        charm_already_owned = true;
                        break;
                    }
                    i += 1;
                }
                assert(!charm_already_owned, 'Charm already in session');

                // Fetch charm metadata from Charm contract
                let charm_nft_address = self.charm_nft_address.read();
                let charm_meta = ICharmDispatcher { contract_address: charm_nft_address }
                    .get_charm_type_info(charm_id);

                // Check cost from metadata
                let charm_cost = charm_meta.shop_cost;
                assert(session.tickets >= charm_cost, 'Insufficient tickets');

                // Deduct cost
                session.tickets -= charm_cost;
                if charm_meta.effect_type == 7 { // LuckBoost
                    session.luck += charm_meta.effect_value;
                } else if charm_meta.effect_type == 9 {
                    session.spins_remaining += charm_meta.effect_value;
                    if charm_meta.effect_value_2 > 0 {
                        session.luck += charm_meta.effect_value_2;
                    }
                }

                self.sessions.entry(session_id).write(session);

                self.session_charm_ids.entry((session_id, charm_count)).write(charm_id);
                self.session_charm_count.entry(session_id).write(charm_count + 1);

                self.market_slot_purchased.entry((session_id, market_slot)).write(true);

                self
                    .emit(
                        ItemPurchased {
                            session_id,
                            item_id, // This is charm_id + 1000
                            price: charm_cost,
                            new_score: session.score,
                            new_spins: session.spins_remaining,
                            new_tickets: session.tickets,
                            is_charm: true,
                            current_luck: InternalImpl::calculate_effective_luck(@self, session_id),
                        },
                    );
            } else {
                // Regular item purchase
                let unique_item_count = self.session_item_count.entry(session_id).read();
                let item = self.items.entry(item_id).read();
                assert(item.item_id == item_id, 'Item does not exist');

                let mut item_already_owned = false;
                let mut i: u32 = 0;
                while i < unique_item_count {
                    if self.session_item_ids.entry((session_id, i)).read() == item_id {
                        item_already_owned = true;
                        break;
                    }
                    i += 1;
                }
                assert(!item_already_owned, 'Item already owned');
                assert(unique_item_count < 7, 'Inventory full');

                let total_cost = item.price;
                assert(session.tickets >= total_cost, 'Insufficient tickets');
                session.tickets -= total_cost;

                // Handle spin bonus items
                if item.effect_type == 4 {
                    session.spins_remaining += item.effect_value;
                }

                self.sessions.entry(session_id).write(session);
                self.market_slot_purchased.entry((session_id, market_slot)).write(true);
                self.session_item_ids.entry((session_id, unique_item_count)).write(item_id);
                self.session_item_count.entry(session_id).write(unique_item_count + 1);

                // Emit ItemPurchased event for frontend receipt reading
                self
                    .emit(
                        ItemPurchased {
                            session_id,
                            item_id,
                            price: total_cost,
                            new_score: session.score,
                            new_spins: session.spins_remaining,
                            new_tickets: session.tickets,
                            is_charm: false,
                            current_luck: InternalImpl::calculate_effective_luck(@self, session_id),
                        },
                    );
            }
        }

        fn refresh_market(ref self: ContractState, session_id: u32) {
            let caller = get_caller_address();
            let mut session = self.sessions.entry(session_id).read();
            assert(caller == session.player_address, 'Only owner can refresh');
            assert(session.is_active, 'Session is not active');
            let market = self.session_markets.entry(session_id).read();

            // Check for FreeMarketRefresh Relic effect (effect_type = 4)
            let is_free = session.relic_pending_effect == RelicEffectTypeValues::FreeMarketRefresh;

            if is_free {
                // Free refresh - clear the pending effect
                session.relic_pending_effect = RelicEffectTypeValues::NoEffect;
            } else {
                let refresh_cost = self.get_refresh_cost(session_id);
                assert(session.score >= refresh_cost, 'Insufficient score');
                session.score -= refresh_cost;
                session.total_score = session.score; // Mirror
            }

            self.sessions.entry(session_id).write(session);
            self.market_slot_purchased.entry((session_id, 1)).write(false);
            self.market_slot_purchased.entry((session_id, 2)).write(false);
            self.market_slot_purchased.entry((session_id, 3)).write(false);
            self.market_slot_purchased.entry((session_id, 4)).write(false);
            self.market_slot_purchased.entry((session_id, 5)).write(false);
            self.market_slot_purchased.entry((session_id, 6)).write(false);
            InternalImpl::generate_market_items(ref self, session_id, market.refresh_count + 1);

            // Read the new market to emit in event
            let new_market = self.session_markets.entry(session_id).read();

            // Emit MarketRefreshed event for frontend receipt reading
            self
                .emit(
                    MarketRefreshed {
                        session_id,
                        new_score: session.score,
                        slot_1: new_market.item_slot_1,
                        slot_2: new_market.item_slot_2,
                        slot_3: new_market.item_slot_3,
                        slot_4: new_market.item_slot_4,
                        slot_5: new_market.item_slot_5,
                        slot_6: new_market.item_slot_6,
                        current_luck: InternalImpl::calculate_effective_luck(@self, session_id),
                    },
                );
        }

        fn get_session_market(self: @ContractState, session_id: u32) -> SessionMarket {
            self.session_markets.entry(session_id).read()
        }

        fn sell_item(ref self: ContractState, session_id: u32, item_id: u32, quantity: u32) {
            let caller = get_caller_address();
            let mut session = self.sessions.entry(session_id).read();
            assert(caller == session.player_address, 'Only owner can sell items');
            assert(session.is_active, 'Session is not active');

            // Handle Charms (ID >= 1000)
            if item_id >= 1000 {
                let charm_id = item_id - 1000;
                let charm_count = self.session_charm_count.entry(session_id).read();
                let mut charm_index: Option<u32> = Option::None;
                let mut i = 0;
                while i < charm_count {
                    if self.session_charm_ids.entry((session_id, i)).read() == charm_id {
                        charm_index = Option::Some(i);
                        break;
                    }
                    i += 1;
                }
                assert(charm_index.is_some(), 'Charm not owned');
                let found_index = charm_index.unwrap();

                // Fetch charm metadata from Charm contract
                let charm_nft_address = self.charm_nft_address.read();
                let charm_meta = ICharmDispatcher { contract_address: charm_nft_address }
                    .get_charm_type_info(charm_id);

                // Exploit Check: If charm gave spins, ensure they haven't been used beyond
                // threshold
                // Check if effect type implies spins (9 = ExtraSpinWithLuck)
                if charm_meta.effect_type == 9 {
                    let extra_spins = charm_meta.effect_value_2;
                    if extra_spins > 0 {
                        assert(session.spins_remaining >= extra_spins, 'Cannot sell: spins used');
                        session.spins_remaining -= extra_spins;
                    }
                }

                // Remove Luck Buff
                if charm_meta.effect_type == 7 || charm_meta.effect_type == 9 {
                    let luck_boost = charm_meta.effect_value;
                    if session.luck >= luck_boost {
                        session.luck -= luck_boost;
                    } else {
                        session.luck = 0; // Safe fallback
                    }
                }

                // Refund 50%
                let cost = charm_meta.shop_cost;
                let refund = cost / 2;
                session.tickets += refund;

                self.sessions.entry(session_id).write(session);

                // Remove from array (Swap and Pop)
                let last_index = charm_count - 1;
                if found_index != last_index {
                    let last_charm_id = self
                        .session_charm_ids
                        .entry((session_id, last_index))
                        .read();
                    self.session_charm_ids.entry((session_id, found_index)).write(last_charm_id);
                }
                self.session_charm_ids.entry((session_id, last_index)).write(0);
                self.session_charm_count.entry(session_id).write(last_index);

                // Emit ItemSold
                self
                    .emit(
                        ItemSold {
                            session_id,
                            item_id,
                            sell_price: refund,
                            new_score: session.score,
                            new_tickets: session.tickets,
                            current_luck: InternalImpl::calculate_effective_luck(@self, session_id),
                        },
                    );
                return;
            }

            let item_count = self.session_item_count.entry(session_id).read();
            let mut item_index: Option<u32> = Option::None;
            let mut i = 0;
            while i < item_count {
                if self.session_item_ids.entry((session_id, i)).read() == item_id {
                    item_index = Option::Some(i);
                    break;
                }
                i += 1;
            }
            assert(item_index.is_some(), 'Item not owned');
            let found_index = item_index.unwrap();
            let item = self.items.entry(item_id).read();
            assert(item.item_id == item_id, 'Item does not exist');
            let total_value = item.sell_price;
            session.tickets += total_value;
            self.sessions.entry(session_id).write(session);
            let mut j = found_index;
            while j < item_count - 1 {
                let next_item_id = self.session_item_ids.entry((session_id, j + 1)).read();
                self.session_item_ids.entry((session_id, j)).write(next_item_id);
                j += 1;
            }
            self.session_item_ids.entry((session_id, item_count - 1)).write(0);
            self.session_item_count.entry(session_id).write(item_count - 1);

            // Emit ItemSold event for frontend receipt reading
            self
                .emit(
                    ItemSold {
                        session_id,
                        item_id,
                        sell_price: total_value,
                        new_score: session.score,
                        new_tickets: session.tickets,
                        current_luck: InternalImpl::calculate_effective_luck(@self, session_id),
                    },
                );
        }

        fn get_session_items(self: @ContractState, session_id: u32) -> Array<PlayerItem> {
            let mut items_array = ArrayTrait::new();
            let item_count = self.session_item_count.entry(session_id).read();

            let mut i = 0;
            while i < item_count {
                let item_id = self.session_item_ids.entry((session_id, i)).read();
                if item_id > 0 {
                    items_array.append(PlayerItem { item_id, quantity: 1 });
                }
                i += 1;
            }

            // Include Charms in the session items list (ID >= 1000)
            let charm_count = self.session_charm_count.entry(session_id).read();
            let mut j = 0;
            while j < charm_count {
                let charm_id = self.session_charm_ids.entry((session_id, j)).read();
                if charm_id > 0 {
                    // Charms have IDs >= 1000 to distinguish them in frontend
                    items_array.append(PlayerItem { item_id: charm_id + 1000, quantity: 1 });
                }
                j += 1;
            }

            items_array
        }

        fn get_item_info(self: @ContractState, item_id: u32) -> Item {
            self.items.entry(item_id).read()
        }

        fn get_666_probability(self: @ContractState, level: u32) -> u32 {
            if level <= 2 {
                0
            } else {
                // +1.5% per level starting from level 3
                (level - 2) * 15
            }
        }

        fn get_session_item_quantity(self: @ContractState, session_id: u32, item_id: u32) -> u32 {
            self.session_inventory.entry((session_id, item_id)).read()
        }

        fn get_session_inventory_count(self: @ContractState, session_id: u32) -> u32 {
            self.session_item_count.entry(session_id).read()
        }

        fn is_market_slot_purchased(
            self: @ContractState, session_id: u32, market_slot: u32,
        ) -> bool {
            self.market_slot_purchased.entry((session_id, market_slot)).read()
        }

        fn get_refresh_cost(self: @ContractState, session_id: u32) -> u32 {
            let market = self.session_markets.entry(session_id).read();
            let count = market.refresh_count;

            // Progressive cost formula: 2 + (count * (count + 3)) / 2
            // 0 -> 2
            // 1 -> 4
            // 2 -> 7
            // 3 -> 11
            // ...
            let cost = 2 + (count * (count + 3)) / 2;
            cost
        }

        // ─────────────────────────────────────────────────────────────────────────
        // PRIZE POOL: Claim prizes for top 3 leaderboard
        // ─────────────────────────────────────────────────────────────────────────
        fn claim_prize(ref self: ContractState) {
            let caller = get_caller_address();

            // Check if already claimed
            assert(!self.has_claimed.entry(caller).read(), 'Prize already claimed');

            // Get leaderboard
            let leaderboard_count = self.leaderboard_count.read();
            assert(leaderboard_count >= 3, 'Not enough players');

            // Find caller's position in top 3
            let mut position: u32 = 0;
            let mut found = false;
            let mut i: u32 = 0;
            while i < 3 && i < leaderboard_count {
                let entry = self.leaderboard.entry(i).read();
                if entry.player_address == caller {
                    position = i;
                    found = true;
                    break;
                }
                i += 1;
            }

            assert(found, 'Not in top 3');

            // Calculate prize based on position
            let total_pool = self.prize_pool.read();
            let prize_amount = if position == 0 {
                // 1st place: 60%
                (total_pool * 60) / 100
            } else if position == 1 {
                // 2nd place: 30%
                (total_pool * 30) / 100
            } else {
                // 3rd place: 10%
                (total_pool * 10) / 100
            };

            // Mark as claimed
            self.has_claimed.entry(caller).write(true);

            // Transfer prize
            let chip_token = IERC20Dispatcher { contract_address: self.chip_token.read() };
            let transfer_success = chip_token.transfer(caller, prize_amount);
            assert(transfer_success, 'Prize transfer failed');

            // Deduct from prize pool
            let new_pool = total_pool - prize_amount;
            self.prize_pool.write(new_pool);
        }

        fn get_prize_pool(self: @ContractState) -> u256 {
            self.prize_pool.read()
        }

        fn get_treasury(self: @ContractState) -> ContractAddress {
            self.treasury.read()
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // VRF SPIN FUNCTIONS (Cartridge VRF - Synchronous)
        // ═══════════════════════════════════════════════════════════════════════════
        fn request_spin(ref self: ContractState, session_id: u32) {
            let caller = get_caller_address();
            let mut session = self.sessions.entry(session_id).read();
            assert(caller == session.player_address, 'Only owner can spin');
            assert(session.is_active, 'Session is not active');
            assert(session.spins_remaining > 0, 'No spins left');
            session.total_spins += 1;
            session.spins_remaining -= 1;
            if session.relic_pending_effect == RelicEffectTypeValues::ResetSpins {
                let spin_bonus = InternalImpl::get_inventory_spin_bonus(@self, session_id);
                session.spins_remaining = 5 + spin_bonus;
                session.relic_pending_effect = RelicEffectTypeValues::NoEffect;
            }
            let vrf_address = self.vrf_provider_address.read();
            let vrf = IVrfProviderDispatcher { contract_address: vrf_address };
            let random_word = vrf.consume_random(Source::Nonce(caller));
            let force_jackpot = session
                .relic_pending_effect == RelicEffectTypeValues::RandomJackpot;
            let force_666 = session.relic_pending_effect == RelicEffectTypeValues::Trigger666;
            let (mut grid, mut is_666, mut is_jackpot) = if force_jackpot {
                session.relic_pending_effect = RelicEffectTypeValues::NoEffect;
                InternalImpl::generate_jackpot_grid(@self, random_word)
            } else if force_666 {
                session.relic_pending_effect = RelicEffectTypeValues::NoEffect;
                InternalImpl::generate_666_grid(@self, random_word)
            } else {
                InternalImpl::generate_grid_from_random(
                    @self, random_word, session.level, session_id,
                )
            };

            let mut biblia_used = false;
            if is_666 {
                let has_biblia = InternalImpl::has_item_in_inventory(@self, session_id, 40);
                if has_biblia {
                    let biblia_seed = poseidon_hash_span(
                        array![random_word, 'biblia_check'].span(),
                    );
                    let biblia_roll: u256 = biblia_seed.into();
                    let should_discard = (biblia_roll % 100) < 50;

                    if should_discard {
                        InternalImpl::remove_item_from_inventory(ref self, session_id, 40);
                    }

                    self.emit(BibliaDiscarded { session_id, discarded: should_discard });

                    is_666 = false;
                    biblia_used = true;
                    // Track for Chaos Orb charm effect
                    session.blocked_666_this_session = true;
                } else {
                    grid = InternalImpl::force_666_pattern(grid);
                }
            }
            let (mut score, patterns_count) = InternalImpl::calculate_spin_result(
                ref self, grid, session_id,
            );

            // Reload symbol scores from storage as they might have been updated by scaling items
            let updated_session = self.sessions.entry(session_id).read();
            session.score_seven = updated_session.score_seven;
            session.score_diamond = updated_session.score_diamond;
            session.score_cherry = updated_session.score_cherry;
            session.score_coin = updated_session.score_coin;
            session.score_lemon = updated_session.score_lemon;
            InternalImpl::update_luck_from_patterns(ref self, session_id, patterns_count);
            if session.relic_pending_effect == RelicEffectTypeValues::DoubleNextSpin {
                score = score * 2;
                session.relic_pending_effect = RelicEffectTypeValues::NoEffect;
            }
            let new_score = session.score + score;
            session.score = new_score;
            session.total_score = new_score; // Mirror for ABI compatibility
            loop {
                // Check if current score meets threshold for NEXT level
                let threshold = Self::get_level_threshold(@self, session.level);
                if session.score < threshold {
                    break;
                }

                // Level Up!
                session.level += 1;

                // Rewards
                let gain: u32 = 1;
                session.tickets += gain;
                let spin_bonus = InternalImpl::get_inventory_spin_bonus(@self, session_id);
                session.spins_remaining = 5 + spin_bonus;
            }
            if is_666 {
                session.score = 0;
                session.total_score = 0;
            }
            if session.is_active && session.spins_remaining == 0 {
                session.is_active = false;
            }

            // Auto-mint CHIP and Soul Charm when session ends
            if !session.is_active && !session.chips_claimed {
                let base_chips = session.score / 333;
                let emission_rate = self.chip_emission_rate.read();
                let multiplier = self.chip_boost_multiplier.read();
                let chip_amount: u256 = (base_chips * emission_rate * multiplier).into()
                    * 1_000_000_000_000_000_000;

                if chip_amount > 0 {
                    let chip_token = self.chip_token.read();
                    IChipDispatcher { contract_address: chip_token }
                        .mint(session.player_address, chip_amount);
                }

                // ═══════════════════════════════════════════════════════════════════
                // SOUL CHARM MINTING - Based on score (moved from claim_chips)
                // ═══════════════════════════════════════════════════════════════════
                let charm_nft_addr = self.charm_nft_address.read();
                if charm_nft_addr.is_non_zero() {
                    // Calculate mint probability: min(score / 125, 50)% + luck bonus
                    let charm_score = session.score;
                    let base_chance = charm_score / 125;
                    let luck_bonus = session.luck; // Luck from equipped charms
                    let total_chance: u32 = if base_chance + luck_bonus > 50 {
                        50
                    } else {
                        base_chance + luck_bonus
                    };

                    // Generate random number for mint check using VRF random word
                    let mut charm_hash_data = ArrayTrait::new();
                    charm_hash_data.append(session_id.into());
                    charm_hash_data.append(random_word);
                    charm_hash_data.append(session.player_address.into());
                    let charm_hash_result = poseidon_hash_span(charm_hash_data.span());
                    let charm_hash_u256: u256 = charm_hash_result.into();
                    let charm_roll: u32 = (charm_hash_u256 % 100).try_into().unwrap();

                    if charm_roll < total_chance {
                        // Fixed rarity: 3% Legendary, 12% Epic, 25% Rare, 60% Common
                        let rarity_roll: u32 = ((charm_hash_u256 / 100) % 100).try_into().unwrap();
                        let legendary_threshold: u32 = 3;
                        let epic_threshold: u32 = 15; // 3 + 12
                        let rare_threshold: u32 = 40; // 3 + 12 + 25

                        let rarity: u8 = if rarity_roll < legendary_threshold {
                            3 // Legendary
                        } else if rarity_roll < epic_threshold {
                            2 // Epic
                        } else if rarity_roll < rare_threshold {
                            1 // Rare
                        } else {
                            0 // Common
                        };

                        // Mint the charm
                        let token_id = ICharmDispatcher { contract_address: charm_nft_addr }
                            .mint_random_charm_of_rarity(
                                session.player_address, rarity, charm_hash_result,
                            );

                        // Get charm_id from the minted token
                        let charm_meta = ICharmDispatcher { contract_address: charm_nft_addr }
                            .get_charm_metadata(token_id);

                        // Emit event for frontend to catch
                        self
                            .emit(
                                CharmMinted {
                                    player: session.player_address,
                                    session_id,
                                    charm_id: charm_meta.charm_id,
                                    rarity,
                                    token_id,
                                },
                            );
                    }
                }

                session.chips_claimed = true;
            }

            self.sessions.entry(session_id).write(session);
            let spin_result = super::SpinResult {
                session_id,
                grid,
                score,
                patterns_count,
                is_666,
                is_jackpot,
                is_pending: false,
                biblia_used,
            };
            self.last_spin_results.entry(session_id).write(spin_result);

            // Emit SpinCompleted event for frontend receipt reading
            self
                .emit(
                    SpinCompleted {
                        session_id,
                        grid,
                        score_gained: score,
                        new_total_score: session.total_score,
                        new_level: session.level,
                        spins_remaining: session.spins_remaining,
                        is_active: session.is_active,
                        is_666,
                        is_jackpot,
                        biblia_used,
                        current_luck: InternalImpl::calculate_effective_luck(@self, session_id),
                        symbol_scores: [
                            session.score_seven, session.score_diamond, session.score_cherry,
                            session.score_coin, session.score_lemon,
                        ],
                    },
                );

            if !session.is_active && session.is_competitive {
                InternalImpl::update_leaderboard_if_better(ref self, session);
            }
        }
        fn get_last_spin_result(self: @ContractState, session_id: u32) -> super::SpinResult {
            self.last_spin_results.entry(session_id).read()
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // CHIP MONETIZATION FUNCTIONS
        // ═══════════════════════════════════════════════════════════════════════════

        fn claim_chips(ref self: ContractState, session_id: u32) {
            let caller = get_caller_address();
            let mut session = self.sessions.entry(session_id).read();

            // Verify ownership and state
            assert(session.player_address == caller, 'Not session owner');
            assert(!session.is_active, 'Session still active');
            assert(!session.chips_claimed, 'Already claimed');

            // Calculate CHIP amount: floor(score / 20) * emission_rate * multiplier
            let base_chips = session.score / 333;
            let emission_rate = self.chip_emission_rate.read();
            let multiplier = self.chip_boost_multiplier.read();
            let chip_amount: u256 = (base_chips * emission_rate * multiplier).into()
                * 1_000_000_000_000_000_000;

            // Mint CHIP to player (18 decimals)
            if chip_amount > 0 {
                let chip_token = self.chip_token.read();
                IChipDispatcher { contract_address: chip_token }.mint(caller, chip_amount);
            }

            // ═══════════════════════════════════════════════════════════════════
            // SOUL CHARM MINTING - Based on score
            // ═══════════════════════════════════════════════════════════════════
            let charm_nft_addr = self.charm_nft_address.read();
            if charm_nft_addr.is_non_zero() {
                // Calculate mint probability: min(score / 125, 50)%
                let score = session.total_score;
                let mint_chance = score / 125;
                let total_chance: u32 = if mint_chance > 50 {
                    50
                } else {
                    mint_chance
                };

                // Generate random number for mint check
                let timestamp = get_block_timestamp();
                let mut hash_data = ArrayTrait::new();
                hash_data.append(session_id.into());
                hash_data.append(timestamp.into());
                hash_data.append(caller.into());
                let hash_result = poseidon_hash_span(hash_data.span());
                let hash_u256: u256 = hash_result.into();
                let roll: u32 = (hash_u256 % 100).try_into().unwrap();

                if roll < total_chance {
                    // Fixed rarity: 3% Legendary, 12% Epic, 25% Rare, 60% Common
                    let rarity_roll: u32 = ((hash_u256 / 100) % 100).try_into().unwrap();
                    let legendary_threshold: u32 = 3;
                    let epic_threshold: u32 = 15; // 3 + 12
                    let rare_threshold: u32 = 40; // 3 + 12 + 25

                    let rarity: u8 = if rarity_roll < legendary_threshold {
                        3 // Legendary
                    } else if rarity_roll < epic_threshold {
                        2 // Epic
                    } else if rarity_roll < rare_threshold {
                        1 // Rare
                    } else {
                        0 // Common
                    };

                    // Mint the charm
                    let token_id = ICharmDispatcher { contract_address: charm_nft_addr }
                        .mint_random_charm_of_rarity(caller, rarity, hash_result);

                    // Get charm_id from the minted token
                    let charm_meta = ICharmDispatcher { contract_address: charm_nft_addr }
                        .get_charm_metadata(token_id);

                    // Emit event for frontend to catch
                    self
                        .emit(
                            CharmMinted {
                                player: caller,
                                session_id,
                                charm_id: charm_meta.charm_id,
                                rarity,
                                token_id,
                            },
                        );
                }
            }

            // Mark as claimed
            session.chips_claimed = true;
            self.sessions.entry(session_id).write(session);
        }

        fn get_chips_to_claim(self: @ContractState, session_id: u32) -> u256 {
            let session = self.sessions.entry(session_id).read();

            if session.is_active || session.chips_claimed {
                return 0;
            }

            let base_chips = session.score / 333;
            let emission_rate = self.chip_emission_rate.read();
            let multiplier = self.chip_boost_multiplier.read();
            (base_chips * emission_rate * multiplier).into() * 1_000_000_000_000_000_000
        }

        fn get_available_beast_sessions(self: @ContractState, player: ContractAddress) -> u32 {
            let beast_nft = self.beast_nft_address.read();

            // If no Beast NFT configured, return 0
            if beast_nft.is_zero() {
                return 0;
            }

            // Get Beast balance (2 free sessions per Beast)
            let beast_balance: u256 = IERC721Dispatcher { contract_address: beast_nft }
                .balance_of(player);
            let total_free: u32 = (beast_balance * 2).try_into().unwrap_or(0);
            let used = self.beast_sessions_used.entry(player).read();

            if total_free > used {
                return total_free - used;
            }
            0
        }

        fn set_beast_nft_address(ref self: ContractState, address: ContractAddress) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            self.beast_nft_address.write(address);
        }

        fn set_chip_emission_rate(ref self: ContractState, rate: u32) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            self.chip_emission_rate.write(rate);
        }

        fn set_chip_boost_multiplier(ref self: ContractState, multiplier: u32) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            self.chip_boost_multiplier.write(multiplier);
        }

        fn set_chip_token_address(ref self: ContractState, address: ContractAddress) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            self.chip_token.write(address);
        }

        fn set_token_pair_id(ref self: ContractState, token: ContractAddress, pair_id: felt252) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            self.token_pair_ids.entry(token).write(pair_id);
        }

        fn set_pragma_oracle(ref self: ContractState, oracle: ContractAddress) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            self.pragma_oracle.write(oracle);
        }

        fn update_item_price(ref self: ContractState, item_id: u32, price: u32, sell_price: u32) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            let mut item = self.items.entry(item_id).read();
            assert(item.item_id == item_id, 'Item does not exist');
            item.price = price;
            item.sell_price = sell_price;
            self.items.entry(item_id).write(item);
        }

        fn update_item_effect_value(ref self: ContractState, item_id: u32, new_value: u32) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            let mut item = self.items.entry(item_id).read();
            assert(item.item_id == item_id, 'Item does not exist');
            item.effect_value = new_value;
            self.items.entry(item_id).write(item);
        }

        fn initialize_items(ref self: ContractState) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            InternalImpl::initialize_items(ref self);
        }

        fn get_usd_cost_in_token(self: @ContractState, token: ContractAddress) -> u256 {
            InternalImpl::get_usd_cost_in_token(self, token)
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // RELIC SYSTEM
        // ═══════════════════════════════════════════════════════════════════════════

        fn equip_relic(ref self: ContractState, session_id: u32, relic_token_id: u256) {
            let mut session = self.sessions.entry(session_id).read();
            let caller = get_caller_address();

            assert(session.player_address == caller, 'Not your session');
            assert(session.is_active, 'Session not active');

            // Verify NFT ownership
            let relic_nft = self.relic_nft_address.read();
            assert(!relic_nft.is_zero(), 'Relic NFT not set');

            let nft_owner = IRelicERC721Dispatcher { contract_address: relic_nft }
                .owner_of(relic_token_id);
            assert(nft_owner == caller, 'Not relic owner');

            // A relic can only be equipped ONCE per session
            assert(session.equipped_relic == 0, 'Relic already equipped');

            session.equipped_relic = relic_token_id;
            // Set to 0 - activate_relic handles first use case (relic_last_used_spin == 0)
            session.relic_last_used_spin = 0;
            self.sessions.entry(session_id).write(session);

            // Get relic_id from metadata for the event
            let metadata = IRelicDispatcher { contract_address: relic_nft }
                .get_relic_metadata(relic_token_id);

            // Emit RelicEquipped event for frontend receipt reading
            self
                .emit(
                    RelicEquipped {
                        session_id,
                        relic_token_id,
                        relic_id: metadata.relic_id,
                        current_luck: InternalImpl::calculate_effective_luck(@self, session_id),
                    },
                );
        }

        fn activate_relic(ref self: ContractState, session_id: u32) {
            let mut session = self.sessions.entry(session_id).read();
            let caller = get_caller_address();

            assert(session.player_address == caller, 'Not your session');
            assert(session.is_active, 'Session not active');
            assert(session.equipped_relic != 0, 'No relic equipped');

            // Fetch relic metadata from NFT contract
            let relic_nft = self.relic_nft_address.read();
            let metadata = IRelicDispatcher { contract_address: relic_nft }
                .get_relic_metadata(session.equipped_relic);

            // Check cooldown (skip if relic was never used before - relic_last_used_spin == 0 means
            // first use)
            if session.relic_last_used_spin > 0 {
                let spins_since_last_use = session.total_spins - session.relic_last_used_spin;
                assert(spins_since_last_use >= metadata.cooldown_spins, 'Relic on cooldown');
            }

            // Queue the effect for next action
            session.relic_pending_effect = metadata.effect_type;
            session.relic_last_used_spin = session.total_spins;

            self.sessions.entry(session_id).write(session);

            // Emit RelicActivated event for frontend receipt reading
            self
                .emit(
                    RelicActivated {
                        session_id,
                        relic_id: metadata.relic_id,
                        effect_type: metadata.effect_type,
                        cooldown_until_spin: session.total_spins + metadata.cooldown_spins,
                        current_luck: InternalImpl::calculate_effective_luck(@self, session_id),
                    },
                );
        }

        fn set_relic_nft_address(ref self: ContractState, address: ContractAddress) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            self.relic_nft_address.write(address);
        }

        // ─────────────────────────────────────────────────────────────────────────
        // SOUL CHARMS SYSTEM
        // ─────────────────────────────────────────────────────────────────────────

        fn set_charm_nft_address(ref self: ContractState, address: ContractAddress) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            self.charm_nft_address.write(address);
        }

        fn get_session_luck(self: @ContractState, session_id: u32) -> u32 {
            InternalImpl::calculate_effective_luck(self, session_id)
        }

        /// Get the probability (0-100) of receiving a charm at end of session
        /// Based on score: min(score / 125, 50)%
        fn get_charm_drop_chance(self: @ContractState, session_id: u32) -> u32 {
            let session = self.sessions.entry(session_id).read();
            let mint_chance = session.total_score / 125;

            if mint_chance > 50 {
                50
            } else {
                mint_chance
            }
        }

        // ─────────────────────────────────────────────────────────────────────────
        // PRIZE DISTRIBUTION: Admin functions for multi-token prize distribution
        // ─────────────────────────────────────────────────────────────────────────

        fn add_prize_token(ref self: ContractState, token: ContractAddress) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');

            // Check if token already exists
            let count = self.prize_tokens_count.read();
            let mut i: u32 = 0;
            while i < count {
                let existing = self.prize_tokens.entry(i).read();
                assert(existing != token, 'Token already added');
                i += 1;
            }

            // Add new token
            self.prize_tokens.entry(count).write(token);
            self.prize_tokens_count.write(count + 1);
        }

        fn distribute_prizes(ref self: ContractState) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            assert(!self.prizes_distributed.read(), 'Prizes already distributed');

            let leaderboard_count = self.leaderboard_count.read();
            assert(leaderboard_count >= 5, 'Need at least 5 players');

            // Get top 5 players
            let player1 = self.leaderboard.entry(0).read().player_address;
            let player2 = self.leaderboard.entry(1).read().player_address;
            let player3 = self.leaderboard.entry(2).read().player_address;
            let player4 = self.leaderboard.entry(3).read().player_address;
            let player5 = self.leaderboard.entry(4).read().player_address;

            // Distribution percentages: 40%, 25%, 18%, 10%, 7%
            let token_count = self.prize_tokens_count.read();
            let contract_address = starknet::get_contract_address();

            let mut t: u32 = 0;
            while t < token_count {
                let token_addr = self.prize_tokens.entry(t).read();
                let token = IERC20Dispatcher { contract_address: token_addr };
                let balance = token.balance_of(contract_address);

                if balance > 0 {
                    // Calculate amounts for each position
                    let amount1 = (balance * 40) / 100; // 1st: 40%
                    let amount2 = (balance * 25) / 100; // 2nd: 25%
                    let amount3 = (balance * 18) / 100; // 3rd: 18%
                    let amount4 = (balance * 10) / 100; // 4th: 10%
                    let amount5 = (balance * 7) / 100; // 5th: 7%

                    // Transfer to each player
                    if amount1 > 0 {
                        token.transfer(player1, amount1);
                    }
                    if amount2 > 0 {
                        token.transfer(player2, amount2);
                    }
                    if amount3 > 0 {
                        token.transfer(player3, amount3);
                    }
                    if amount4 > 0 {
                        token.transfer(player4, amount4);
                    }
                    if amount5 > 0 {
                        token.transfer(player5, amount5);
                    }
                }
                t += 1;
            }

            // Mark as distributed
            self.prizes_distributed.write(true);

            // Reset CHIP prize pool tracker
            self.prize_pool.write(0);
        }

        fn get_prize_token_balances(self: @ContractState) -> Array<(ContractAddress, u256)> {
            let mut balances: Array<(ContractAddress, u256)> = ArrayTrait::new();
            let token_count = self.prize_tokens_count.read();
            let contract_address = starknet::get_contract_address();

            let mut i: u32 = 0;
            while i < token_count {
                let token_addr = self.prize_tokens.entry(i).read();
                let token = IERC20Dispatcher { contract_address: token_addr };
                let balance = token.balance_of(contract_address);
                balances.append((token_addr, balance));
                i += 1;
            }

            balances
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // ADMIN CHARM MINTING
        // ═══════════════════════════════════════════════════════════════════════════
        fn mint_all_charms(ref self: ContractState, recipient: ContractAddress) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');

            let charm_nft_addr = self.charm_nft_address.read();
            assert(charm_nft_addr.is_non_zero(), 'Charm NFT not set');
            let charm_dispatcher = ICharmDispatcher { contract_address: charm_nft_addr };

            // Rarity 0 to 3
            let mut rarity: u8 = 0;
            while rarity <= 3 {
                let charms = charm_dispatcher.get_charms_by_rarity(rarity);
                let charms_span = charms.span();
                let mut i: u32 = 0;
                while i < charms_span.len() {
                    let charm_id = *charms_span.at(i);
                    // We call mint_charm - note that AbyssGame acts as the caller, so it must be
                    // authorized in Charm contract
                    charm_dispatcher.mint_charm(recipient, charm_id);
                    i += 1;
                }
                rarity += 1;
            };
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        // ═══════════════════════════════════════════════════════════════════════════
        // LUCK CALCULATION
        // ═══════════════════════════════════════════════════════════════════════════
        fn calculate_effective_luck(self: @ContractState, session_id: u32) -> u32 {
            let session = self.sessions.entry(session_id).read();
            let mut luck = session.luck; // Base luck from static charms (Type 7, 9)

            let charm_count = self.session_charm_count.entry(session_id).read();
            let charm_nft_address = self.charm_nft_address.read();

            let mut k = 0;
            while k < charm_count {
                let charm_id = self.session_charm_ids.entry((session_id, k)).read();

                // Fetch generic metadata for conditional checks
                let charm_meta = ICharmDispatcher { contract_address: charm_nft_address }
                    .get_charm_type_info(charm_id);

                // Charm ID 12: Ethereal Chain (Special Case: Per Pattern - not standard condition)
                if charm_id == 12 {
                    let last_spin = self.last_spin_results.entry(session_id).read();
                    luck += (last_spin.patterns_count.into() * 6);
                }
                let condition = charm_meta.condition_type;
                let val = charm_meta.effect_value;
                if condition == 1 {
                    let last_spin = self.last_spin_results.entry(session_id).read();
                    if last_spin.patterns_count == 0 {
                        luck += val;
                    }
                } else if condition == 2 {
                    if session.spins_remaining <= 2 {
                        luck += val;
                    }
                } else if condition == 3 {
                    let item_count = self.session_item_count.entry(session_id).read();
                    luck += (item_count * val);
                } else if condition == 4 {
                    // LowScore (e.g. Bone Dice)
                    if session.score < 100 {
                        luck += val;
                    }
                } else if condition == 5 {
                    // HighLevel (e.g. Shadow Lantern)
                    if session.level >= 5 {
                        luck += val;
                    }
                } else if (condition == 6) && (session.blocked_666_this_session) {
                    luck += val;
                }

                k += 1;
            }
            luck
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // VRF GRID GENERATION AND PATTERN DETECTION
        // ═══════════════════════════════════════════════════════════════════════════
        fn generate_grid_from_random(
            self: @ContractState, random_word: felt252, level: u32, session_id: u32,
        ) -> ([u8; 15], bool, bool) {
            let mut grid_dict: Felt252Dict<u8> = Default::default();
            let mut is_jackpot = true;
            let mut first_symbol: u8 = 0;

            // Get effective luck
            let luck = Self::calculate_effective_luck(self, session_id);

            // Cap luck bias at 50% to prevent guaranteed patterns
            let luck_bias_chance: u32 = if luck > 50 {
                50
            } else {
                luck
            };

            let (p7, pd, pc, p_coin, pl) = Self::get_inventory_probability_bonuses(
                self, session_id,
            );
            let prob_seven = 10 + p7;
            let prob_diamond = 15 + pd;
            let prob_cherry = 20 + pc;
            let prob_coin = 25 + p_coin;
            let prob_lemon = 30 + pl;
            let total_prob = prob_seven + prob_diamond + prob_cherry + prob_coin + prob_lemon;
            let thresh_seven = prob_seven;
            let thresh_diamond = thresh_seven + prob_diamond;
            let thresh_cherry = thresh_diamond + prob_cherry;
            let thresh_coin = thresh_cherry + prob_coin;

            let mut i: u32 = 0;
            while i < 15 {
                let position_seed = poseidon_hash_span(array![random_word, i.into()].span());
                let seed_value: u256 = position_seed.into();

                // Luck bias: chance to copy symbol from adjacent cell to form patterns
                let luck_roll: u32 = ((seed_value / 1000) % 100).try_into().unwrap();
                let mut symbol: u8 = 0;

                if luck_bias_chance > 0 && luck_roll < luck_bias_chance && i > 0 {
                    // Copy symbol from an adjacent cell based on position
                    // This increases pattern formation probability
                    let copy_from = Self::get_pattern_neighbor(i);
                    if copy_from < i {
                        symbol = grid_dict.get(copy_from.into());
                    }
                }

                // If no luck bias applied, use normal random symbol
                if symbol == 0 {
                    let symbol_roll: u32 = (seed_value % total_prob.into()).try_into().unwrap();
                    symbol =
                        if symbol_roll < thresh_seven {
                            super::SymbolType::SEVEN
                        } else if symbol_roll < thresh_diamond {
                            super::SymbolType::DIAMOND
                        } else if symbol_roll < thresh_cherry {
                            super::SymbolType::CHERRY
                        } else if symbol_roll < thresh_coin {
                            super::SymbolType::COIN
                        } else {
                            super::SymbolType::LEMON
                        };
                }

                grid_dict.insert(i.into(), symbol);

                // Track if all symbols are the same (jackpot)
                if i == 0 {
                    first_symbol = symbol;
                } else if symbol != first_symbol {
                    is_jackpot = false;
                }

                i += 1;
            }

            // Check for 666 based on level probability
            let probability_666 = Self::get_666_probability_internal(self, level);
            let roll_666_seed = poseidon_hash_span(array![random_word, 999.into()].span());
            let roll_666: u256 = roll_666_seed.into();
            let is_666 = (roll_666 % 1000) < probability_666.into();

            let grid = [
                grid_dict.get(0), grid_dict.get(1), grid_dict.get(2), grid_dict.get(3),
                grid_dict.get(4), grid_dict.get(5), grid_dict.get(6), grid_dict.get(7),
                grid_dict.get(8), grid_dict.get(9), grid_dict.get(10), grid_dict.get(11),
                grid_dict.get(12), grid_dict.get(13), grid_dict.get(14),
            ];

            (grid, is_666, is_jackpot)
        }

        /// Get the best neighbor cell to copy for pattern formation
        /// Grid layout (5x3):
        ///   [0]  [1]  [2]  [3]  [4]   <- Row 0
        ///   [5]  [6]  [7]  [8]  [9]   <- Row 1
        ///   [10] [11] [12] [13] [14]  <- Row 2
        fn get_pattern_neighbor(index: u32) -> u32 {
            // Prioritize horizontal patterns (same row, previous cell)
            // Then vertical patterns (same column, row above)
            // Then diagonal patterns
            if index % 5 > 0 {
                // Can copy from left (horizontal pattern)
                index - 1
            } else if index >= 5 {
                // Can copy from above (vertical pattern)
                index - 5
            } else {
                // First cell, no neighbor
                0
            }
        }

        /// Get value from grid at index
        fn get_grid_value(grid: [u8; 15], index: u32) -> u8 {
            *grid.span().at(index)
        }

        /// Generate a jackpot grid (all 15 cells same symbol)
        fn generate_jackpot_grid(
            self: @ContractState, random_word: felt252,
        ) -> ([u8; 15], bool, bool) {
            let symbol_roll: u256 = random_word.into();
            // Symbols are 1-6. 6 is SIX/Death.
            // We want 1-5 (Safe symbols: SEVEN, DIAMOND, CHERRY, COIN, LEMON)
            // Roll % 5 gives 0-4. +1 gives 1-5.
            let symbol = ((symbol_roll % 5) + 1).try_into().unwrap();
            let grid: [u8; 15] = [
                symbol, symbol, symbol, symbol, symbol, symbol, symbol, symbol, symbol, symbol,
                symbol, symbol, symbol, symbol, symbol,
            ];
            (grid, false, true)
        }

        /// Generate a 666 grid (normal grid but forced 666 pattern)
        fn generate_666_grid(self: @ContractState, random_word: felt252) -> ([u8; 15], bool, bool) {
            let mut temp_values = array![];
            let mut i: u32 = 0;
            while i < 15 {
                if i == 6 || i == 7 || i == 8 {
                    temp_values.append(super::SymbolType::SIX);
                } else {
                    let symbol_seed = poseidon_hash_span(array![random_word, i.into()].span());
                    let symbol_roll: u256 = symbol_seed.into();
                    let symbol = ((symbol_roll % 8) + 1).try_into().unwrap();
                    temp_values.append(symbol);
                }
                i += 1;
            }

            let final_span = temp_values.span();
            let grid = [
                *final_span.at(0), *final_span.at(1), *final_span.at(2), *final_span.at(3),
                *final_span.at(4), *final_span.at(5), *final_span.at(6), *final_span.at(7),
                *final_span.at(8), *final_span.at(9), *final_span.at(10), *final_span.at(11),
                *final_span.at(12), *final_span.at(13), *final_span.at(14),
            ];

            (grid, true, false) // is 666, not jackpot
        }

        fn force_666_pattern(grid: [u8; 15]) -> [u8; 15] {
            let mut temp_values = array![];
            let mut i: u32 = 0;
            let span = grid.span();
            while i < 15 {
                if i == 6 || i == 7 || i == 8 {
                    temp_values.append(super::SymbolType::SIX);
                } else {
                    temp_values.append(*span.at(i));
                }
                i += 1;
            }
            let final_span = temp_values.span();
            [
                *final_span.at(0), *final_span.at(1), *final_span.at(2), *final_span.at(3),
                *final_span.at(4), *final_span.at(5), *final_span.at(6), *final_span.at(7),
                *final_span.at(8), *final_span.at(9), *final_span.at(10), *final_span.at(11),
                *final_span.at(12), *final_span.at(13), *final_span.at(14),
            ]
        }

        fn get_grid_from_random(random_word: felt252) -> ([u8; 15], bool, bool) {
            // Check for 666 (Jackpot) - 1.5% probability
            let prob_seed = poseidon_hash_span(array![random_word, '666'].span());
            let prob_roll: u256 = prob_seed.into();
            let is_666_roll = (prob_roll % 1000) < 15; // 1.5% chance

            let mut temp_values = array![];
            let mut i: u32 = 0;
            while i < 15 {
                if is_666_roll && (i == 6 || i == 7 || i == 8) {
                    temp_values.append(super::SymbolType::SIX);
                } else {
                    let symbol_seed = poseidon_hash_span(array![random_word, i.into()].span());
                    let symbol_roll: u256 = symbol_seed.into();
                    let symbol = ((symbol_roll % 8) + 1).try_into().unwrap();
                    temp_values.append(symbol);
                }
                i += 1;
            }

            let final_span = temp_values.span();
            let grid = [
                *final_span.at(0), *final_span.at(1), *final_span.at(2), *final_span.at(3),
                *final_span.at(4), *final_span.at(5), *final_span.at(6), *final_span.at(7),
                *final_span.at(8), *final_span.at(9), *final_span.at(10), *final_span.at(11),
                *final_span.at(12), *final_span.at(13), *final_span.at(14),
            ];

            (grid, is_666_roll, false)
        }


        fn try_upgrade_symbol_score(
            ref self: ContractState,
            session_id: u32,
            symbol: u8,
            scaling_factors: (u32, u32, u32, u32, u32),
        ) {
            let (b7, bd, bc, b_coin, bl) = scaling_factors;
            let mut session = self.sessions.entry(session_id).read();
            let mut updated = false;

            if symbol == super::SymbolType::SEVEN && b7 > 0 {
                session.score_seven += b7;
                updated = true;
            } else if symbol == super::SymbolType::DIAMOND && bd > 0 {
                session.score_diamond += bd;
                updated = true;
            } else if symbol == super::SymbolType::CHERRY && bc > 0 {
                session.score_cherry += bc;
                updated = true;
            } else if symbol == super::SymbolType::COIN && b_coin > 0 {
                session.score_coin += b_coin;
                updated = true;
            } else if symbol == super::SymbolType::LEMON && bl > 0 {
                session.score_lemon += bl;
                updated = true;
            }

            if updated {
                self.sessions.entry(session_id).write(session);
            }
        }

        fn calculate_spin_result(
            ref self: ContractState, grid: [u8; 15], session_id: u32,
        ) -> (u32, u8) {
            let mut total_score: u32 = 0;
            let mut patterns_count: u8 = 0;
            let g = grid.span();

            // Get charm retrigger bonuses
            let (h3_retrigger, diag_retrigger, all_retrigger, jackpot_retrigger) =
                Self::get_charm_retrigger_bonuses(
                @self, session_id,
            );
            // Vertical patterns use all_retrigger since there's no specific vertical charm
            let vert_retrigger = all_retrigger;

            // Get scaling factors for cumulative updates
            let scaling_factors = Self::get_inventory_scaling_factors(@self, session_id);

            // Get symbol scores snapshot for atomic calculation
            let session = self.sessions.entry(session_id).read();
            let symbol_scores = (
                session.score_seven,
                session.score_diamond,
                session.score_cherry,
                session.score_coin,
                session.score_lemon,
            );

            // Fetch pattern bonuses once to avoid redundant calls in helpers
            let (h3_bonus, h4_bonus, h5_bonus, diag_bonus, _) = Self::get_inventory_pattern_bonuses(
                @self, session_id,
            );
            let horizontal_bonuses = (h3_bonus, h4_bonus, h5_bonus);

            // === HORIZONTAL PATTERNS (per row) ===
            // Row 0: indices 0-4
            let (score, pats) = Self::check_horizontal_line(
                ref self, g, 0, session_id, scaling_factors, symbol_scores, horizontal_bonuses,
            );
            // Apply H3 retrigger (multiplies score and pattern count)
            total_score += score * h3_retrigger;
            patterns_count += pats * h3_retrigger.try_into().unwrap();

            // Row 1: indices 5-9
            let (score, pats) = Self::check_horizontal_line(
                ref self, g, 5, session_id, scaling_factors, symbol_scores, horizontal_bonuses,
            );
            total_score += score * h3_retrigger;
            patterns_count += pats * h3_retrigger.try_into().unwrap();

            // Row 2: indices 10-14
            let (score, pats) = Self::check_horizontal_line(
                ref self, g, 10, session_id, scaling_factors, symbol_scores, horizontal_bonuses,
            );
            total_score += score * h3_retrigger;
            patterns_count += pats * h3_retrigger.try_into().unwrap();

            // === VERTICAL PATTERNS (3 in a column) ===
            // Server parity: vertical-3 = 2x, so points * 3 * 2 = points * 6
            // Columns 0-4
            let mut i: u32 = 0;
            while i < 5 {
                let idx = i;
                if *g.at(idx) == *g.at(idx + 5) && *g.at(idx + 5) == *g.at(idx + 10) {
                    total_score += Self::get_score_from_snapshot(*g.at(idx), symbol_scores)
                        * 6
                        * vert_retrigger;
                    patterns_count += vert_retrigger.try_into().unwrap();
                    Self::try_upgrade_symbol_score(
                        ref self, session_id, *g.at(idx), scaling_factors,
                    );
                }
                i += 1;
            }

            // === DIAGONAL PATTERNS (3 in a row) ===
            // Server parity: diagonal-3 = 2.5x, so (points * 3 * 5) / 2 = (points * 15) / 2
            // Diagonal bonus already fetched above (diag_bonus)

            // Top-left to bottom-right diagonals
            // 0, 6, 12 | 1, 7, 13 | 2, 8, 14
            // Starts: 0, 1, 2. Offsets: +0, +6, +12
            let mut j: u32 = 0;
            while j < 3 {
                let idx = j;
                if *g.at(idx) == *g.at(idx + 6) && *g.at(idx + 6) == *g.at(idx + 12) {
                    let base = (Self::get_score_from_snapshot(*g.at(idx), symbol_scores) * 15) / 2;
                    total_score += (base * (100 + diag_bonus) / 100) * diag_retrigger;
                    patterns_count += diag_retrigger.try_into().unwrap();
                    Self::try_upgrade_symbol_score(
                        ref self, session_id, *g.at(idx), scaling_factors,
                    );
                }
                j += 1;
            }

            let mut k: u32 = 2;
            while k < 5 {
                let idx = k;
                if *g.at(idx) == *g.at(idx + 4) && *g.at(idx + 4) == *g.at(idx + 8) {
                    let base = (Self::get_score_from_snapshot(*g.at(idx), symbol_scores) * 15) / 2;
                    total_score += (base * (100 + diag_bonus) / 100) * diag_retrigger;
                    patterns_count += diag_retrigger.try_into().unwrap();
                    Self::try_upgrade_symbol_score(
                        ref self, session_id, *g.at(idx), scaling_factors,
                    );
                }
                k += 1;
            }

            // Check for Jackpot (all 15 symbols identical) and apply retrigger
            if jackpot_retrigger > 1 {
                let first = *g.at(0);
                let mut is_jp = true;
                let mut m: u32 = 1;
                while m < 15 {
                    if *g.at(m) != first {
                        is_jp = false;
                        break;
                    }
                    m += 1;
                }

                if is_jp {
                    total_score = total_score * jackpot_retrigger;
                }
            }

            (total_score, patterns_count)
        }

        /// Check horizontal line for 3, 4, or 5 matches
        /// Server parity: 3=1.5x, 4=3x, 5=6x (using count * points * multiplier)
        /// Now applies PatternMultiplier bonuses from inventory
        fn check_horizontal_line(
            ref self: ContractState,
            g: Span<u8>,
            start: u32,
            session_id: u32,
            scaling_factors: (u32, u32, u32, u32, u32),
            symbol_scores: (u32, u32, u32, u32, u32),
            bonuses: (u32, u32, u32),
        ) -> (u32, u8) {
            let mut score: u32 = 0;
            let mut patterns: u8 = 0;

            // Unpack pre-calculated bonuses
            let (h3_bonus, h4_bonus, h5_bonus) = bonuses;

            // Check for 5 in a row: points * 5 * 6 = points * 30
            if *g.at(start) == *g.at(start + 1)
                && *g.at(start + 1) == *g.at(start + 2)
                && *g.at(start + 2) == *g.at(start + 3)
                && *g.at(start + 3) == *g.at(start + 4) {
                let base = Self::get_score_from_snapshot(*g.at(start), symbol_scores) * 30;
                score += base * (100 + h5_bonus) / 100;
                patterns += 1;
                Self::try_upgrade_symbol_score(ref self, session_id, *g.at(start), scaling_factors);
            } // Check for 4 in a row: points * 4 * 3 = points * 12
            else if *g.at(start) == *g.at(start + 1)
                && *g.at(start + 1) == *g.at(start + 2)
                && *g.at(start + 2) == *g.at(start + 3) {
                let base = Self::get_score_from_snapshot(*g.at(start), symbol_scores) * 12;
                score += base * (100 + h4_bonus) / 100;
                patterns += 1;
                Self::try_upgrade_symbol_score(ref self, session_id, *g.at(start), scaling_factors);
            } else if *g.at(start + 1) == *g.at(start + 2)
                && *g.at(start + 2) == *g.at(start + 3)
                && *g.at(start + 3) == *g.at(start + 4) {
                let base = Self::get_score_from_snapshot(*g.at(start + 1), symbol_scores) * 12;
                score += base * (100 + h4_bonus) / 100;
                patterns += 1;
                Self::try_upgrade_symbol_score(
                    ref self, session_id, *g.at(start + 1), scaling_factors,
                );
            } // Check for 3 in a row: (points * 3 * 3) / 2 = (points * 9) / 2
            else if *g.at(start) == *g.at(start + 1) && *g.at(start + 1) == *g.at(start + 2) {
                let base = (Self::get_score_from_snapshot(*g.at(start), symbol_scores) * 9) / 2;
                score += base * (100 + h3_bonus) / 100;
                patterns += 1;
                Self::try_upgrade_symbol_score(ref self, session_id, *g.at(start), scaling_factors);
            } else if *g.at(start + 1) == *g.at(start + 2) && *g.at(start + 2) == *g.at(start + 3) {
                let base = (Self::get_score_from_snapshot(*g.at(start + 1), symbol_scores) * 9) / 2;
                score += base * (100 + h3_bonus) / 100;
                patterns += 1;
                Self::try_upgrade_symbol_score(
                    ref self, session_id, *g.at(start + 1), scaling_factors,
                );
            } else if *g.at(start + 2) == *g.at(start + 3) && *g.at(start + 3) == *g.at(start + 4) {
                let base = (Self::get_score_from_snapshot(*g.at(start + 2), symbol_scores) * 9) / 2;
                score += base * (100 + h3_bonus) / 100;
                patterns += 1;
                Self::try_upgrade_symbol_score(
                    ref self, session_id, *g.at(start + 2), scaling_factors,
                );
            }

            (score, patterns)
        }


        /// Get current symbol score from session
        fn get_symbol_score_from_session(self: @ContractState, session_id: u32, symbol: u8) -> u32 {
            let session = self.sessions.entry(session_id).read();
            if symbol == super::SymbolType::SEVEN {
                session.score_seven
            } else if symbol == super::SymbolType::DIAMOND {
                session.score_diamond
            } else if symbol == super::SymbolType::CHERRY {
                session.score_cherry
            } else if symbol == super::SymbolType::COIN {
                session.score_coin
            } else {
                session.score_lemon
            }
        }

        fn get_score_from_snapshot(symbol: u8, scores: (u32, u32, u32, u32, u32)) -> u32 {
            let (s7, sd, sc, sco, sl) = scores;
            if symbol == super::SymbolType::SEVEN {
                s7
            } else if symbol == super::SymbolType::DIAMOND {
                sd
            } else if symbol == super::SymbolType::CHERRY {
                sc
            } else if symbol == super::SymbolType::COIN {
                sco
            } else {
                sl
            }
        }

        /// Get 666 probability for a given level (per 1000)
        fn get_666_probability_internal(self: @ContractState, level: u32) -> u32 {
            // Server parity: (level - 2) * 1.5% = (level - 2) * 15 per mille
            if level <= 2 {
                0
            } else {
                (level - 2) * 15
            }
        }

        /// Get all scaling factors (cumulative buffs) from inventory items
        fn get_inventory_scaling_factors(
            self: @ContractState, session_id: u32,
        ) -> (u32, u32, u32, u32, u32) {
            let mut b7: u32 = 0;
            let mut bd: u32 = 0;
            let mut bc: u32 = 0;
            let mut b_coin: u32 = 0;
            let mut bl: u32 = 0;

            let count = self.session_item_count.entry(session_id).read();
            let mut i: u32 = 0;
            while i < count {
                let item_id = self.session_item_ids.entry((session_id, i)).read();
                let item = self.items.entry(item_id).read();

                if item.effect_type == 3 { // DirectScoreBonus
                    if item.target_symbol == 'seven' {
                        b7 += item.effect_value;
                    } else if item.target_symbol == 'diamond' {
                        bd += item.effect_value;
                    } else if item.target_symbol == 'cherry' {
                        bc += item.effect_value;
                    } else if item.target_symbol == 'coin' {
                        b_coin += item.effect_value;
                    } else if item.target_symbol == 'lemon' {
                        bl += item.effect_value;
                    }
                }
                i += 1;
            }
            (b7, bd, bc, b_coin, bl)
        }

        fn get_inventory_probability_bonuses(
            self: @ContractState, session_id: u32,
        ) -> (u32, u32, u32, u32, u32) {
            let mut p7: u32 = 0;
            let mut pd: u32 = 0;
            let mut pc: u32 = 0;
            let mut p_coin: u32 = 0;
            let mut pl: u32 = 0;

            let count = self.session_item_count.entry(session_id).read();
            let mut i: u32 = 0;
            while i < count {
                let item_id = self.session_item_ids.entry((session_id, i)).read();
                let item = self.items.entry(item_id).read();

                if item.effect_type == 2 { // SymbolProbabilityBoost
                    if item.target_symbol == 'seven' {
                        p7 += item.effect_value;
                    } else if item.target_symbol == 'diamond' {
                        pd += item.effect_value;
                    } else if item.target_symbol == 'cherry' {
                        pc += item.effect_value;
                    } else if item.target_symbol == 'coin' {
                        p_coin += item.effect_value;
                    } else if item.target_symbol == 'lemon' {
                        pl += item.effect_value;
                    }
                }
                i += 1;
            }
            (p7, pd, pc, p_coin, pl)
        }

        fn get_inventory_pattern_bonuses(
            self: @ContractState, session_id: u32,
        ) -> (u32, u32, u32, u32, u32) {
            let mut h3: u32 = 0; // horizontal-3
            let mut h4: u32 = 0; // horizontal-4
            let mut h5: u32 = 0; // horizontal-5
            let mut diag: u32 = 0; // diagonal
            let mut jp: u32 = 0; // jackpot

            let count = self.session_item_count.entry(session_id).read();
            let mut i: u32 = 0;
            while i < count {
                let item_id = self.session_item_ids.entry((session_id, i)).read();
                let item = self.items.entry(item_id).read();

                if item.effect_type == 1 { // PatternMultiplier
                    if item.target_symbol == 'horizontal-3' {
                        h3 += item.effect_value;
                    } else if item.target_symbol == 'horizontal-4' {
                        h4 += item.effect_value;
                    } else if item.target_symbol == 'horizontal-5' {
                        h5 += item.effect_value;
                    } else if item.target_symbol == 'diagonal' {
                        diag += item.effect_value;
                    } else if item.target_symbol == 'jackpot' {
                        jp += item.effect_value;
                    }
                }
                i += 1;
            }
            (h3, h4, h5, diag, jp)
        }

        /// Get pattern retrigger bonuses from session charms
        /// Returns (h3_retrigger, diag_retrigger, all_retrigger, jackpot_retrigger)
        /// Retrigger means patterns trigger X extra times (value = multiplier, e.g. 2 = trigger
        /// twice)
        fn get_charm_retrigger_bonuses(
            self: @ContractState, session_id: u32,
        ) -> (u32, u32, u32, u32) {
            let mut h3_retrigger: u32 = 1; // Default 1x (no retrigger)
            let mut diag_retrigger: u32 = 1; // Default 1x
            let mut all_retrigger: u32 = 1; // Default 1x
            let mut jackpot_retrigger: u32 = 1; // Default 1x

            let charm_count = self.session_charm_count.entry(session_id).read();
            let mut i: u32 = 0;
            while i < charm_count {
                let charm_id = self.session_charm_ids.entry((session_id, i)).read();
                let charm_nft_address = self.charm_nft_address.read();
                let charm_meta = ICharmDispatcher { contract_address: charm_nft_address }
                    .get_charm_type_info(charm_id);
                if charm_id == 19 {
                    jackpot_retrigger = 2;
                }
                if charm_meta.effect_type == 8 {
                    let retrigger_val = charm_meta.effect_value;
                    let pattern_type = charm_meta.effect_value_2;

                    if pattern_type == 0 { // All patterns
                        all_retrigger = retrigger_val;
                    } else if pattern_type == 1 { // H3
                        h3_retrigger = retrigger_val;
                    } else if pattern_type == 3 { // Diagonal
                        diag_retrigger = retrigger_val;
                    } else if pattern_type == 5 { // Jackpot
                        jackpot_retrigger = retrigger_val;
                    }
                }

                i += 1;
            }

            // If all_retrigger is set, it overrides individual retriggers
            if all_retrigger > 1 {
                if h3_retrigger < all_retrigger {
                    h3_retrigger = all_retrigger;
                }
                if diag_retrigger < all_retrigger {
                    diag_retrigger = all_retrigger;
                }
                if jackpot_retrigger < all_retrigger {
                    jackpot_retrigger = all_retrigger;
                }
            }

            (h3_retrigger, diag_retrigger, all_retrigger, jackpot_retrigger)
        }


        fn has_item_in_inventory(self: @ContractState, session_id: u32, item_id: u32) -> bool {
            let item_count = self.session_item_count.entry(session_id).read();
            let mut i: u32 = 0;
            while i < item_count {
                if self.session_item_ids.entry((session_id, i)).read() == item_id {
                    return true;
                }
                i += 1;
            }
            false
        }

        /// Remove an item from session inventory (for Biblia consumption)
        fn remove_item_from_inventory(ref self: ContractState, session_id: u32, item_id: u32) {
            let item_count = self.session_item_count.entry(session_id).read();
            let mut found_index: Option<u32> = Option::None;
            let mut i: u32 = 0;
            while i < item_count {
                if self.session_item_ids.entry((session_id, i)).read() == item_id {
                    found_index = Option::Some(i);
                    break;
                }
                i += 1;
            }

            if let Option::Some(idx) = found_index {
                {
                    // Shift all items after the found index
                    let mut j = idx;
                    while j < item_count - 1 {
                        let next_item_id = self.session_item_ids.entry((session_id, j + 1)).read();
                        self.session_item_ids.entry((session_id, j)).write(next_item_id);
                        j += 1;
                    }
                    // Clear last slot and decrement count
                    self.session_item_ids.entry((session_id, item_count - 1)).write(0);
                    self.session_item_count.entry(session_id).write(item_count - 1);
                }
            }
        }

        fn get_inventory_spin_bonus(self: @ContractState, session_id: u32) -> u32 {
            let item_count = self.session_item_count.entry(session_id).read();
            let mut total_bonus: u32 = 0;
            let mut i: u32 = 0;
            while i < item_count {
                match self.session_item_ids.entry((session_id, i)).read() {
                    // Bonus Spin Items
                    9 => total_bonus += 1,
                    10 => total_bonus += 3,
                    18 => total_bonus += 5,
                    23 => total_bonus += 10,
                    _ => {},
                }
                i += 1;
            }
            total_bonus
        }

        // Update luck based on patterns hit (for Ethereal Chain - Charm 15)
        fn update_luck_from_patterns(ref self: ContractState, session_id: u32, patterns_count: u8) {
            // Charm 15: Ethereal Chain - +6 Luck per pattern hit
            if patterns_count > 0 {
                let has_charm_15 = Self::has_charm_in_session(@self, session_id, 15);
                if has_charm_15 {
                    let mut session = self.sessions.entry(session_id).read();
                    let bonus_luck: u32 = patterns_count.into() * 6;
                    session.luck += bonus_luck;
                    self.sessions.entry(session_id).write(session);
                }
            }
        }

        fn has_charm_in_session(self: @ContractState, session_id: u32, charm_id: u32) -> bool {
            let charm_count = self.session_charm_count.entry(session_id).read();
            let mut k = 0;
            let mut found = false;
            while k < charm_count {
                if self.session_charm_ids.entry((session_id, k)).read() == charm_id {
                    found = true;
                    break;
                }
                k += 1;
            }
            found
        }


        /// Update the leaderboard only if this is a new best score for the session
        fn update_leaderboard_if_better(ref self: ContractState, session: GameSession) {
            let new_score = session.score;
            let new_level = session.level;

            // Check if this session already has a better score in the leaderboard
            let current_best_score = Self::get_session_best_score_from_leaderboard(
                @self, session.session_id,
            );

            // Only update if this is a new best score
            if new_score > current_best_score {
                Self::update_leaderboard(
                    ref self, session.player_address, session.session_id, new_score, new_level,
                );
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
                }
                i += 1;
            }
            0 // Session not in leaderboard
        }

        /// Update the leaderboard with a new session entry
        fn update_leaderboard(
            ref self: ContractState,
            player_address: ContractAddress,
            session_id: u32,
            new_score: u32,
            new_level: u32,
        ) {
            let current_count = self.leaderboard_count.read();

            // First, check if player already has an entry in the leaderboard
            let mut player_existing_position: Option<u32> = Option::None;
            let mut player_existing_score: u32 = 0;
            let mut i = 0;
            while i < current_count {
                let entry = self.leaderboard.entry(i).read();
                if entry.player_address == player_address {
                    player_existing_position = Option::Some(i);
                    player_existing_score = entry.total_score;
                    break;
                }
                i += 1;
            }

            if let Option::Some(pos) = player_existing_position {
                {
                    if player_existing_score >= new_score {
                        // Player already has a better score, do nothing
                        return;
                    } else {
                        // Player has a worse score, remove the old entry
                        // Shift all entries after the old position up
                        let mut j = pos;
                        while j < current_count - 1 {
                            let next_entry = self.leaderboard.entry(j + 1).read();
                            self.leaderboard.entry(j).write(next_entry);
                            j += 1;
                        }
                        // Decrease count since we removed an entry
                        self.leaderboard_count.write(current_count - 1);
                    }
                }
            }
            // Now insert the new score in the correct position
            let updated_count = self.leaderboard_count.read();
            let mut insert_position = updated_count; // Default to append
            let mut should_insert = true;

            // Find the correct position to insert
            let mut i = 0;
            while i < updated_count {
                let entry = self.leaderboard.entry(i).read();
                if new_score > entry.total_score
                    || (new_score == entry.total_score && new_level > entry.level) {
                    insert_position = i;
                    should_insert = true;
                    break;
                }
                i += 1;
            }

            // If leaderboard is full (10 entries) and new score doesn't qualify, don't insert
            if updated_count >= 10 && insert_position >= 10 {
                should_insert = false;
            }

            if should_insert {
                // Shift entries down if inserting in middle
                let mut j = updated_count;
                while j > insert_position {
                    if j < 10 { // Only shift if within bounds
                        let entry_to_move = self.leaderboard.entry(j - 1).read();
                        self.leaderboard.entry(j).write(entry_to_move);
                    }
                    j -= 1;
                }

                // Insert new entry
                let new_entry = LeaderboardEntry {
                    player_address, session_id, level: new_level, total_score: new_score,
                };
                self.leaderboard.entry(insert_position).write(new_entry);

                // Update count if adding new entry
                if updated_count < 10 {
                    self.leaderboard_count.write(updated_count + 1);
                };
            }
        }

        /// Initialize all shop items
        fn initialize_items(ref self: ContractState) {
            // ═══════════════════════════════════════════════════════════════════
            // SEVEN RUN ITEMS
            // ═══════════════════════════════════════════════════════════════════

            // Item 1: Seven Score Boost (Low tier)
            self
                .items
                .entry(1)
                .write(
                    Item {
                        item_id: 1,
                        name: 'Chilly Pepper',
                        description: '+1 to seven score on pattern',
                        price: 1,
                        sell_price: 1,
                        effect_type: 3, // DirectScoreBonus
                        effect_value: 1,
                        target_symbol: 'seven',
                    },
                );

            // Item 7: Seven Probability Boost (Mid tier)
            self
                .items
                .entry(7)
                .write(
                    Item {
                        item_id: 7,
                        name: 'Nerd Glasses',
                        description: '+15% seven probability',
                        price: 2,
                        sell_price: 1,
                        effect_type: 2, // SymbolProbabilityBoost
                        effect_value: 15,
                        target_symbol: 'seven',
                    },
                );

            // Item 11: Seven Probability Boost (High tier)
            self
                .items
                .entry(11)
                .write(
                    Item {
                        item_id: 11,
                        name: 'Ghost Mask',
                        description: '+25% seven probability',
                        price: 3,
                        sell_price: 1,
                        effect_type: 2, // SymbolProbabilityBoost
                        effect_value: 25,
                        target_symbol: 'seven',
                    },
                );

            // ═══════════════════════════════════════════════════════════════════
            // DIAMOND RUN ITEMS
            // ═══════════════════════════════════════════════════════════════════

            // Item 2: Diamond Score Boost (Low tier)
            self
                .items
                .entry(2)
                .write(
                    Item {
                        item_id: 2,
                        name: 'Milk',
                        description: '+1 to diamond score on pattern',
                        price: 1,
                        sell_price: 1,
                        effect_type: 3, // DirectScoreBonus
                        effect_value: 1,
                        target_symbol: 'diamond',
                    },
                );

            // Item 8: Diamond Probability Boost (Mid tier)
            self
                .items
                .entry(8)
                .write(
                    Item {
                        item_id: 8,
                        name: 'Ace of Spades',
                        description: '+12% diamond probability',
                        price: 1,
                        sell_price: 1,
                        effect_type: 2, // SymbolProbabilityBoost
                        effect_value: 12,
                        target_symbol: 'diamond',
                    },
                );

            // ═══════════════════════════════════════════════════════════════════
            // CHERRY RUN ITEMS
            // ═══════════════════════════════════════════════════════════════════

            // Item 3: Cherry Score Boost (Low tier)
            self
                .items
                .entry(3)
                .write(
                    Item {
                        item_id: 3,
                        name: 'Magic Dice',
                        description: '+1 to cherry score on pattern',
                        price: 1,
                        sell_price: 1,
                        effect_type: 3, // DirectScoreBonus
                        effect_value: 1,
                        target_symbol: 'cherry',
                    },
                );

            // Item 12: Cherry Probability Boost (Low tier)
            self
                .items
                .entry(12)
                .write(
                    Item {
                        item_id: 12,
                        name: 'Skull',
                        description: '+10% cherry probability',
                        price: 1,
                        sell_price: 1,
                        effect_type: 2, // SymbolProbabilityBoost
                        effect_value: 10,
                        target_symbol: 'cherry',
                    },
                );

            // Item 13: Cherry Score Boost (Mid tier)
            self
                .items
                .entry(13)
                .write(
                    Item {
                        item_id: 13,
                        name: 'Pig Bank',
                        description: '+2 to cherry score on pattern',
                        price: 2,
                        sell_price: 1,
                        effect_type: 3, // DirectScoreBonus
                        effect_value: 2,
                        target_symbol: 'cherry',
                    },
                );

            // Item 16: Cherry Probability Boost (Mid tier)
            self
                .items
                .entry(16)
                .write(
                    Item {
                        item_id: 16,
                        name: 'Weird Hand',
                        description: '+18% cherry probability',
                        price: 2,
                        sell_price: 1,
                        effect_type: 2, // SymbolProbabilityBoost
                        effect_value: 18,
                        target_symbol: 'cherry',
                    },
                );

            // Item 20: Cherry Score Boost (High tier)
            self
                .items
                .entry(20)
                .write(
                    Item {
                        item_id: 20,
                        name: 'Smelly Boots',
                        description: '+3 to cherry score on pattern',
                        price: 3,
                        sell_price: 1,
                        effect_type: 3, // DirectScoreBonus
                        effect_value: 3,
                        target_symbol: 'cherry',
                    },
                );

            // ═══════════════════════════════════════════════════════════════════
            // LEMON RUN ITEMS
            // ═══════════════════════════════════════════════════════════════════

            // Item 4: Lemon Score Boost (Mid tier)
            self
                .items
                .entry(4)
                .write(
                    Item {
                        item_id: 4,
                        name: 'Old Cassette',
                        description: '+1 to lemon score on pattern',
                        price: 1,
                        sell_price: 1,
                        effect_type: 3, // DirectScoreBonus
                        effect_value: 1,
                        target_symbol: 'lemon',
                    },
                );

            // Item 14: Lemon Score Boost (Low tier)
            self
                .items
                .entry(14)
                .write(
                    Item {
                        item_id: 14,
                        name: 'Old Wig',
                        description: '+2 to lemon score on pattern',
                        price: 1,
                        sell_price: 1,
                        effect_type: 3, // DirectScoreBonus
                        effect_value: 2,
                        target_symbol: 'lemon',
                    },
                );

            // ═══════════════════════════════════════════════════════════════════
            // COIN RUN ITEMS
            // ═══════════════════════════════════════════════════════════════════

            // Item 17: Coin Probability Boost (Mid tier)
            self
                .items
                .entry(17)
                .write(
                    Item {
                        item_id: 17,
                        name: 'Golden Globe',
                        description: '+14% coin probability',
                        price: 1,
                        sell_price: 1,
                        effect_type: 2, // SymbolProbabilityBoost
                        effect_value: 14,
                        target_symbol: 'coin',
                    },
                );

            // Item 19: Coin Score Boost (Mid tier)
            self
                .items
                .entry(19)
                .write(
                    Item {
                        item_id: 19,
                        name: 'Old Phone',
                        description: '+2 to coin score on pattern',
                        price: 2,
                        sell_price: 1,
                        effect_type: 3, // DirectScoreBonus
                        effect_value: 2,
                        target_symbol: 'coin',
                    },
                );

            // ═══════════════════════════════════════════════════════════════════
            // PATTERN MULTIPLIER ITEMS
            // ═══════════════════════════════════════════════════════════════════

            // Item 5: Pattern Boost (Low tier)
            self
                .items
                .entry(5)
                .write(
                    Item {
                        item_id: 5,
                        name: 'Bat Boomerang',
                        description: '+15% pattern multiplier',
                        price: 2,
                        sell_price: 1,
                        effect_type: 1, // PatternMultiplierBoost
                        effect_value: 15,
                        target_symbol: '',
                    },
                );

            // Item 6: Pattern Boost (Mid tier)
            self
                .items
                .entry(6)
                .write(
                    Item {
                        item_id: 6,
                        name: 'Holy Eye',
                        description: '+30% pattern multiplier',
                        price: 3,
                        sell_price: 1,
                        effect_type: 1, // PatternMultiplierBoost
                        effect_value: 30,
                        target_symbol: '',
                    },
                );

            // Item 15: Pattern Boost (High tier)
            self
                .items
                .entry(15)
                .write(
                    Item {
                        item_id: 15,
                        name: 'Amulet',
                        description: '+50% pattern multiplier',
                        price: 4,
                        sell_price: 2,
                        effect_type: 1, // PatternMultiplierBoost
                        effect_value: 50,
                        target_symbol: '',
                    },
                );

            // Item 21: Pattern Boost (Very High tier)
            self
                .items
                .entry(21)
                .write(
                    Item {
                        item_id: 21,
                        name: 'Bloody Wrench',
                        description: '+80% pattern multiplier',
                        price: 5,
                        sell_price: 2,
                        effect_type: 1, // PatternMultiplierBoost
                        effect_value: 80,
                        target_symbol: '',
                    },
                );

            // ═══════════════════════════════════════════════════════════════════
            // SPIN ITEMS
            // ═══════════════════════════════════════════════════════════════════

            // Item 9: Extra Spin (Low tier)
            self
                .items
                .entry(9)
                .write(
                    Item {
                        item_id: 9,
                        name: 'Devil Onion',
                        description: '+1 extra spin',
                        price: 2,
                        sell_price: 1,
                        effect_type: 4, // SpinBonus
                        effect_value: 1,
                        target_symbol: '',
                    },
                );

            // Item 10: Spin Bundle (Mid tier)
            self
                .items
                .entry(10)
                .write(
                    Item {
                        item_id: 10,
                        name: 'Red Button',
                        description: '+3 extra spins',
                        price: 4,
                        sell_price: 2,
                        effect_type: 4, // SpinBonus
                        effect_value: 3,
                        target_symbol: '',
                    },
                );

            // Item 18: Mega Spin Bundle (High tier)
            self
                .items
                .entry(18)
                .write(
                    Item {
                        item_id: 18,
                        name: 'Pyramid',
                        description: '+5 extra spins',
                        price: 6,
                        sell_price: 3,
                        effect_type: 4, // SpinBonus
                        effect_value: 5,
                        target_symbol: '',
                    },
                );

            // Item 23: Super Spin Bundle (Very High tier)
            self
                .items
                .entry(23)
                .write(
                    Item {
                        item_id: 23,
                        name: 'Devil Seal',
                        description: '+10 extra spins',
                        price: 7,
                        sell_price: 3,
                        effect_type: 4, // SpinBonus
                        effect_value: 10,
                        target_symbol: '',
                    },
                );

            // ═══════════════════════════════════════════════════════════════════
            // SPECIAL ITEMS
            // ═══════════════════════════════════════════════════════════════════

            // Item 22: Removed (was score multiplier)
            self
                .items
                .entry(22)
                .write(
                    Item {
                        item_id: 22,
                        name: 'Car Keys',
                        description: '+100% pattern multiplier',
                        price: 6,
                        sell_price: 3,
                        effect_type: 1, // PatternMultiplierBoost
                        effect_value: 100,
                        target_symbol: '',
                    },
                );

            // Item 24: Legendary Item
            self
                .items
                .entry(24)
                .write(
                    Item {
                        item_id: 24,
                        name: 'Holy Grail',
                        description: '+150% pattern multiplier',
                        price: 7,
                        sell_price: 3,
                        effect_type: 1, // PatternMultiplierBoost
                        effect_value: 150,
                        target_symbol: '',
                    },
                );

            // ═══════════════════════════════════════════════════════════════════
            // NEW ITEMS FOR COMPLETE RUNS
            // ═══════════════════════════════════════════════════════════════════

            // Item 25: Seven Score Boost (High tier)
            self
                .items
                .entry(25)
                .write(
                    Item {
                        item_id: 25,
                        name: 'Hockey Mask',
                        description: '+2 to seven score on pattern',
                        price: 3,
                        sell_price: 1,
                        effect_type: 3, // DirectScoreBonus
                        effect_value: 2,
                        target_symbol: 'seven',
                    },
                );

            // Item 26: Diamond Score Boost (High tier)
            self
                .items
                .entry(26)
                .write(
                    Item {
                        item_id: 26,
                        name: 'Rune',
                        description: '+2 to diamond score on pattern',
                        price: 3,
                        sell_price: 1,
                        effect_type: 3, // DirectScoreBonus
                        effect_value: 2,
                        target_symbol: 'diamond',
                    },
                );

            // Item 27: Diamond Probability Boost (High tier)
            self
                .items
                .entry(27)
                .write(
                    Item {
                        item_id: 27,
                        name: 'Bloody knife',
                        description: '+22% diamond probability',
                        price: 2,
                        sell_price: 1,
                        effect_type: 2, // SymbolProbabilityBoost
                        effect_value: 22,
                        target_symbol: 'diamond',
                    },
                );

            // Item 28: Cherry Probability Boost (High tier)
            self
                .items
                .entry(28)
                .write(
                    Item {
                        item_id: 28,
                        name: 'Devil Head',
                        description: '+28% cherry probability',
                        price: 4,
                        sell_price: 2,
                        effect_type: 2, // SymbolProbabilityBoost
                        effect_value: 28,
                        target_symbol: 'cherry',
                    },
                );

            // Item 29: Lemon Probability Boost (Mid tier)
            self
                .items
                .entry(29)
                .write(
                    Item {
                        item_id: 29,
                        name: 'Cigarettes',
                        description: '+16% lemon probability',
                        price: 2,
                        sell_price: 1,
                        effect_type: 2, // SymbolProbabilityBoost
                        effect_value: 16,
                        target_symbol: 'lemon',
                    },
                );

            // Item 30: Lemon Score Boost (High tier)
            self
                .items
                .entry(30)
                .write(
                    Item {
                        item_id: 30,
                        name: 'Soul Contract',
                        description: '+3 to lemon score on pattern',
                        price: 3,
                        sell_price: 1,
                        effect_type: 3, // DirectScoreBonus
                        effect_value: 3,
                        target_symbol: 'lemon',
                    },
                );

            // Item 31: Coin Probability Boost (High tier)
            self
                .items
                .entry(31)
                .write(
                    Item {
                        item_id: 31,
                        name: 'Beer Can',
                        description: '+25% coin probability',
                        price: 3,
                        sell_price: 1,
                        effect_type: 2, // SymbolProbabilityBoost
                        effect_value: 25,
                        target_symbol: 'coin',
                    },
                );

            // Item 32: Coin Score Boost (High tier)
            self
                .items
                .entry(32)
                .write(
                    Item {
                        item_id: 32,
                        name: 'Memory Card',
                        description: '+3 to coin score on pattern',
                        price: 4,
                        sell_price: 2,
                        effect_type: 3, // DirectScoreBonus
                        effect_value: 3,
                        target_symbol: 'coin',
                    },
                );

            // ═══════════════════════════════════════════════════════════════════
            // ADDITIONAL SEVEN ITEMS
            // ═══════════════════════════════════════════════════════════════════

            // Item 33: Seven Score Boost (Very High tier)
            self
                .items
                .entry(33)
                .write(
                    Item {
                        item_id: 33,
                        name: 'Ticket',
                        description: '+3 to seven score on pattern',
                        price: 4,
                        sell_price: 2,
                        effect_type: 3, // DirectScoreBonus
                        effect_value: 3,
                        target_symbol: 'seven',
                    },
                );

            // Item 34: Seven Probability Boost (Very High tier)
            self
                .items
                .entry(34)
                .write(
                    Item {
                        item_id: 34,
                        name: 'Devil Train',
                        description: '+35% seven probability',
                        price: 5,
                        sell_price: 2,
                        effect_type: 2, // SymbolProbabilityBoost
                        effect_value: 35,
                        target_symbol: 'seven',
                    },
                );

            // ═══════════════════════════════════════════════════════════════════
            // ADDITIONAL DIAMOND ITEMS
            // ═══════════════════════════════════════════════════════════════════

            // Item 35: Diamond Score Boost (Very High tier)
            self
                .items
                .entry(35)
                .write(
                    Item {
                        item_id: 35,
                        name: 'Fake Dollar',
                        description: '+3 to diamond score on pattern',
                        price: 4,
                        sell_price: 1,
                        effect_type: 3, // DirectScoreBonus
                        effect_value: 3,
                        target_symbol: 'diamond',
                    },
                );

            // Item 36: Diamond Probability Boost (Very High tier)
            self
                .items
                .entry(36)
                .write(
                    Item {
                        item_id: 36,
                        name: 'Bull Skull',
                        description: '+30% diamond probability',
                        price: 4,
                        sell_price: 2,
                        effect_type: 2, // SymbolProbabilityBoost
                        effect_value: 30,
                        target_symbol: 'diamond',
                    },
                );

            // ═══════════════════════════════════════════════════════════════════
            // ADDITIONAL LEMON ITEMS
            // ═══════════════════════════════════════════════════════════════════

            // Item 37: Lemon Probability Boost (High tier)
            self
                .items
                .entry(37)
                .write(
                    Item {
                        item_id: 37,
                        name: 'Fake Coin',
                        description: '+24% lemon probability',
                        price: 2,
                        sell_price: 1,
                        effect_type: 2, // SymbolProbabilityBoost
                        effect_value: 24,
                        target_symbol: 'lemon',
                    },
                );

            // Item 38: Lemon Score Boost (Very High tier)
            self
                .items
                .entry(38)
                .write(
                    Item {
                        item_id: 38,
                        name: 'Pocket Watch',
                        description: '+4 to lemon score on pattern',
                        price: 4,
                        sell_price: 2,
                        effect_type: 3, // DirectScoreBonus
                        effect_value: 4,
                        target_symbol: 'lemon',
                    },
                );

            // ═══════════════════════════════════════════════════════════════════
            // ADDITIONAL COIN ITEMS
            // ═══════════════════════════════════════════════════════════════════

            // Item 39: Coin Score Boost (Low tier)
            self
                .items
                .entry(39)
                .write(
                    Item {
                        item_id: 39,
                        name: 'Knight Helmet',
                        description: '+1 to coin score on pattern',
                        price: 1,
                        sell_price: 1,
                        effect_type: 3, // DirectScoreBonus
                        effect_value: 1,
                        target_symbol: 'coin',
                    },
                );

            // ═══════════════════════════════════════════════════════════════════
            // SPECIAL PROTECTION ITEM
            // ═══════════════════════════════════════════════════════════════════
            self
                .items
                .entry(40)
                .write(
                    Item {
                        item_id: 40,
                        name: 'La Biblia',
                        description: 'Protects from 666 pattern',
                        price: 3,
                        sell_price: 1,
                        effect_type: 6, // Special: 666 Protection (new type)
                        effect_value: 1, // Single use
                        target_symbol: 'six',
                    },
                );

            self.total_items.write(40);
        }

        /// Initialize market for a new session
        fn initialize_market(ref self: ContractState, session_id: u32) {
            Self::generate_market_items(ref self, session_id, 0);
        }

        /// Generate random market items for a session
        /// Charms owned by the player have a 30% chance to appear in each slot
        fn generate_market_items(ref self: ContractState, session_id: u32, refresh_count: u32) {
            // Increment nonce for randomness
            let current_nonce = self.nonce.read();
            self.nonce.write(current_nonce + 1);

            // Get player's owned charms from charm contract
            let session = self.sessions.entry(session_id).read();
            let player_address = session.player_address;
            let charm_nft_addr = self.charm_nft_address.read();

            // Get owned charm token IDs using cross-contract call
            let mut owned_charm_ids: Array<u32> = ArrayTrait::new();

            if charm_nft_addr.is_non_zero() {
                // Call charm contract to get player's owned charm tokens
                let charm_dispatcher = ICharmDispatcher { contract_address: charm_nft_addr };
                let player_token_ids = charm_dispatcher.get_player_charms(player_address);

                // Get the charm_id for each token
                let mut i: u32 = 0;
                while i < player_token_ids.len() {
                    let token_id = *player_token_ids.at(i);
                    let charm_meta = charm_dispatcher.get_charm_metadata(token_id);

                    // Check if this charm_id is already in our list
                    let charm_id = charm_meta.charm_id;
                    let mut already_added = false;
                    let mut j: u32 = 0;
                    while j < owned_charm_ids.len() {
                        if *owned_charm_ids.at(j) == charm_id {
                            already_added = true;
                            break;
                        }
                        j += 1;
                    }

                    if !already_added {
                        owned_charm_ids.append(charm_id);
                    }
                    i += 1;
                };
            }

            // Store owned charms count for generate_market_slot_item to use
            self.session_owned_charm_count.entry(session_id).write(owned_charm_ids.len());
            let mut idx: u32 = 0;
            while idx < owned_charm_ids.len() {
                self
                    .session_owned_charm_ids
                    .entry((session_id, idx))
                    .write(*owned_charm_ids.at(idx));
                idx += 1;
            }

            // Generate 6 unique random items
            let mut generated_items: Array<u32> = ArrayTrait::new();
            let mut slot: u32 = 1;

            while slot <= 6 {
                let mut attempts: u32 = 0;
                let mut unique_item: u32 = 0;

                // Try to find a unique item
                while attempts < 5 {
                    // Use different nonce/seed modification for each attempt to get different
                    // result
                    let attempt_modifier: u64 = (attempts * 100).into();
                    let item = Self::generate_market_slot_item(
                        @self, session_id, current_nonce + attempt_modifier, slot,
                    );

                    // Check if already generated
                    let mut is_dup = false;
                    let mut k = 0;
                    while k < generated_items.len() {
                        if *generated_items.at(k) == item {
                            is_dup = true;
                            break;
                        }
                        k += 1;
                    }

                    if !is_dup {
                        unique_item = item;
                        break;
                    }

                    attempts += 1;
                }

                // If we failed to find a unique item after retries, just take the last one
                // generated (duplicates better than crash)
                if unique_item == 0 {
                    unique_item =
                        Self::generate_market_slot_item(
                            @self, session_id, current_nonce + 500, slot,
                        );
                }

                generated_items.append(unique_item);
                slot += 1;
            }

            // Clear purchased status for all slots (new market)
            self.market_slot_purchased.entry((session_id, 1)).write(false);
            self.market_slot_purchased.entry((session_id, 2)).write(false);
            self.market_slot_purchased.entry((session_id, 3)).write(false);
            self.market_slot_purchased.entry((session_id, 4)).write(false);
            self.market_slot_purchased.entry((session_id, 5)).write(false);
            self.market_slot_purchased.entry((session_id, 6)).write(false);

            // Save market state
            let market = SessionMarket {
                refresh_count,
                item_slot_1: *generated_items.at(0),
                item_slot_2: *generated_items.at(1),
                item_slot_3: *generated_items.at(2),
                item_slot_4: *generated_items.at(3),
                item_slot_5: *generated_items.at(4),
                item_slot_6: *generated_items.at(5),
            };

            self.session_markets.entry(session_id).write(market);
        }

        fn generate_market_slot_item(
            self: @ContractState, session_id: u32, nonce: u64, slot: u32,
        ) -> u32 {
            let timestamp = get_block_timestamp();

            // Create hash for this slot
            let mut hash_data = ArrayTrait::new();
            hash_data.append(session_id.into());
            hash_data.append(nonce.into());
            hash_data.append(slot.into());
            hash_data.append(timestamp.into());
            let hash_result = poseidon_hash_span(hash_data.span());
            let hash_u256: u256 = hash_result.into();

            // Get count of charms player owns
            let owned_count = self.session_owned_charm_count.entry(session_id).read();

            // 30% chance to show an owned charm
            let charm_roll: u32 = (hash_u256 % 100).try_into().unwrap();

            if charm_roll < 30 && owned_count > 0 {
                // Pick a random owned charm
                let owned_index: u32 = ((hash_u256 / 100) % owned_count.into()).try_into().unwrap();
                let charm_id = self.session_owned_charm_ids.entry((session_id, owned_index)).read();

                // Check if this charm is already in the session
                let session_charm_count = self.session_charm_count.entry(session_id).read();
                let mut charm_in_session = false;
                let mut i: u32 = 0;
                while i < session_charm_count {
                    if self.session_charm_ids.entry((session_id, i)).read() == charm_id {
                        charm_in_session = true;
                        break;
                    }
                    i += 1;
                }

                // Only show if not already in session
                if !charm_in_session && charm_id > 0 {
                    // Return charm as item_id >= 1000
                    return 1000 + charm_id;
                }
            }

            // Otherwise, return a regular item
            Self::generate_random_item_id(self, session_id, nonce, slot)
        }

        /// Generate a random item ID (1-24)
        fn generate_random_item_id(
            self: @ContractState, session_id: u32, nonce: u64, slot: u32,
        ) -> u32 {
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

        // ═══════════════════════════════════════════════════════════════════════════
        // PAYMENT SYSTEM FUNCTIONS
        // ═══════════════════════════════════════════════════════════════════════════

        fn get_usd_cost_in_token(self: @ContractState, token: ContractAddress) -> u256 {
            let one_usd: u256 = 1_000_000_000_000_000_000; // 1 USD in 18 decimals

            // Get pair ID for this token
            let pair_id = self.token_pair_ids.entry(token).read();
            assert(pair_id != 0, 'Token not supported');
            let oracle = self.pragma_oracle.read();
            let data_type = DataType::SpotEntry(pair_id);
            let response = IPragmaABIDispatcher { contract_address: oracle }
                .get_data_median(data_type);
            let token_price: u256 = response.price.into();
            let price_decimals: u256 = response.decimals.into();
            let _token_decimals: u256 = 18;
            let numerator = one_usd * Self::pow(10, price_decimals.try_into().unwrap());
            let amount = numerator / token_price;
            amount
        }

        fn distribute_revenue(ref self: ContractState, token: ContractAddress, total_amount: u256) {
            let prize_amount = (total_amount * 50) / 100;
            let treasury_amount = (total_amount * 30) / 100;
            let team_amount = (total_amount * 20) / 100;
            let treasury = self.treasury.read();
            let team = self.admin.read();
            let token_dispatcher = IERC20Dispatcher { contract_address: token };
            token_dispatcher.transfer(treasury, treasury_amount);
            token_dispatcher.transfer(team, team_amount);
            let current_prize_pool = self.prize_pool.read();
            self.prize_pool.write(current_prize_pool + prize_amount);
        }

        fn pow(base: u256, exp: u32) -> u256 {
            if exp == 0 {
                return 1;
            }
            let mut result: u256 = base;
            let mut i: u32 = 1;
            while i < exp {
                result = result * base;
                i += 1;
            }
            result
        }
    }
}
