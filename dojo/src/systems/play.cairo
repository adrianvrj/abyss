use starknet::ContractAddress;
use crate::constants::CHIP_SCORE_DIVISOR;
use crate::models::index::{Config, Item, Session, SessionMarket, SpinResult};

#[inline]
pub fn NAME() -> ByteArray {
    "Play"
}

#[inline(always)]
pub fn get_total_chip_units(score: u32, bonus_units: u32) -> u32 {
    (score / CHIP_SCORE_DIVISOR) + bonus_units
}

#[inline(always)]
pub fn get_chip_payout_amount(
    score: u32, bonus_units: u32, chip_emission_rate: u32, chip_boost_multiplier: u32,
) -> u256 {
    (get_total_chip_units(score, bonus_units).into()
        * chip_emission_rate.into()
        * chip_boost_multiplier.into()) * 1_000_000_000_000_000_000
}

#[starknet::interface]
pub trait IPlay<T> {
    fn create_session(ref self: T, player: ContractAddress, payment_token: ContractAddress) -> u32;
    fn claim_beast_session(ref self: T, player: ContractAddress) -> u32;
    fn mint_session(ref self: T, player: ContractAddress, quantity: u32);
    fn request_spin(ref self: T, session_id: u32);
    fn end_session(ref self: T, session_id: u32);
    fn claim_chips(ref self: T, session_id: u32);
    // View Functions
    fn get_config(self: @T) -> Config;
    fn get_item_info(self: @T, item_id: u32) -> Item;
    fn get_session(self: @T, session_id: u32) -> Session;
    fn get_player_sessions(self: @T, player: ContractAddress) -> Span<u32>;
    fn get_beast_sessions_used(self: @T, player: ContractAddress) -> u32;
    fn get_available_beast_sessions(self: @T, player: ContractAddress) -> u32;
    fn get_usd_cost_in_token(self: @T, payment_token: ContractAddress) -> u256;
    fn get_session_luck(self: @T, session_id: u32) -> u32;
    fn get_session_inventory_count(self: @T, session_id: u32) -> u32;
    fn get_charm_drop_chance(self: @T, session_id: u32) -> u32;
    fn get_chips_to_claim(self: @T, session_id: u32) -> u256;
    fn get_session_chip_payout(self: @T, session_id: u32) -> u256;
    fn get_session_chip_bonus_units(self: @T, session_id: u32) -> u32;
    fn get_session_item_purchase_price(self: @T, session_id: u32, item_id: u32) -> u32;
    fn get_session_items(self: @T, session_id: u32) -> Span<(u32, u32)>;
    fn get_spin_result(self: @T, session_id: u32) -> SpinResult;
    fn get_level_threshold(self: @T, level: u32) -> u32;
    fn get_666_probability(self: @T, level: u32) -> u32;
    fn get_session_market(self: @T, session_id: u32) -> SessionMarket;
    fn is_market_slot_purchased(self: @T, session_id: u32, slot: u32) -> bool;
}

#[dojo::contract]
pub mod Play {
    use core::num::traits::Zero;
    use core::poseidon::poseidon_hash_span;
    use dojo::world::WorldStorageTrait;
    use leaderboard::components::rankable::RankableComponent;
    use openzeppelin::access::accesscontrol::AccessControlComponent;
    use openzeppelin::introspection::src5::SRC5Component;
    use starknet::{ContractAddress, get_caller_address};
    use crate::constants::{
        DEFAULT_SCORE_CHERRY, DEFAULT_SCORE_COIN, DEFAULT_SCORE_DIAMOND, DEFAULT_SCORE_LEMON,
        DEFAULT_SCORE_SEVEN, DEFAULT_SPINS, DEFAULT_TICKETS, NAMESPACE,
    };
    use crate::helpers::inventory::InventoryImpl;
    use crate::helpers::items::get_item_purchase_price;
    use crate::helpers::pricing::PricingImpl;
    use crate::helpers::probability::get_666_probability as get_level_666_probability;
    use crate::helpers::scoring::get_level_threshold;
    use crate::interfaces::charm_nft::ICharmDispatcherTrait;
    use crate::interfaces::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};
    use crate::interfaces::relic_nft::{IRelicERC721Dispatcher, IRelicERC721DispatcherTrait};
    use crate::interfaces::vrf::{IVrfProviderDispatcherTrait, Source};
    use crate::models::index::{
        Config, Item, PlayerSessionEntry, Session, SessionChipBonus, SessionItemPurchaseCount,
        SpinResult,
    };
    use crate::store::{Store, StoreTrait};
    use crate::systems::collection_system::{
        ICollectionDispatcher, ICollectionDispatcherTrait, NAME as COLLECTION_NAME,
    };
    use crate::systems::setup::NAME as SETUP_NAME;
    use crate::types::effect::RelicEffectType;
    use super::*;

    const LEADERBOARD_ID: felt252 = 1;
    const BIBLIA_ITEM_ID: u32 = 40;
    const CASH_OUT_ITEM_ID: u32 = 41;

    // Components
    component!(path: AccessControlComponent, storage: accesscontrol, event: AccessControlEvent);
    impl AccessControlInternalImpl = AccessControlComponent::InternalImpl<ContractState>;
    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    component!(path: RankableComponent, storage: rankable, event: RankableEvent);
    impl RankableInternalImpl = RankableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        accesscontrol: AccessControlComponent::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        #[substorage(v0)]
        rankable: RankableComponent::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        AccessControlEvent: AccessControlComponent::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
        #[flat]
        RankableEvent: RankableComponent::Event,
    }

    fn dojo_init(ref self: ContractState) {
        let _world = self.world(@NAMESPACE());
        self.accesscontrol.initializer();
    }

    #[abi(embed_v0)]
    impl PlayImpl of IPlay<ContractState> {
        fn create_session(
            ref self: ContractState, player: ContractAddress, payment_token: ContractAddress,
        ) -> u32 {
            let caller = get_caller_address();
            assert(caller == player, 'Can only create own session');

            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut config: Config = store.config();

            let amount_required = PricingImpl::get_usd_cost_in_token(@store, payment_token);
            if amount_required > 0 {
                let token_disp = IERC20Dispatcher { contract_address: payment_token };
                token_disp.transfer_from(player, starknet::get_contract_address(), amount_required);

                // Distribute revenue: 80% treasury, 20% team
                let team_amount = (amount_required * 20) / 100;
                let treasury_amount = amount_required - team_amount;

                token_disp.transfer(config.treasury, treasury_amount);
                token_disp.transfer(config.team, team_amount);
            }

            let session_id = InternalImpl::mint_competitive_session(
                ref store, ref config, world, player,
            );
            store.set_config(@config);
            session_id
        }

        fn claim_beast_session(ref self: ContractState, player: ContractAddress) -> u32 {
            let caller = get_caller_address();
            assert(caller == player, 'Not owner');

            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut config: Config = store.config();
            let zero_addr: ContractAddress = Zero::zero();
            assert(config.beast_nft != zero_addr, 'Beast collection not configured');

            let beast_erc721 = IRelicERC721Dispatcher { contract_address: config.beast_nft };
            assert(beast_erc721.balance_of(player) > 0, 'No Beast NFT held');

            let mut usage = store.beast_sessions_used(player);
            assert(usage.count < 1, 'Beast session already claimed');
            usage.player = player;
            usage.count = 1;
            store.set_beast_sessions_used(@usage);

            let session_id = InternalImpl::mint_competitive_session(
                ref store, ref config, world, player,
            );
            store.set_config(@config);
            session_id
        }

        fn mint_session(ref self: ContractState, player: ContractAddress, quantity: u32) {
            let world = self.world(@NAMESPACE());
            let caller = get_caller_address();
            let setup_address = world.dns_address(@SETUP_NAME()).expect('Setup not found!');
            assert(caller == setup_address, 'Only setup can mint');

            let mut store = StoreTrait::new(world);
            let mut config = store.config();

            let mut i: u32 = 0;
            while i < quantity {
                InternalImpl::mint_competitive_session(ref store, ref config, world, player);
                i += 1;
            }

            store.set_config(@config);
        }

        fn request_spin(ref self: ContractState, session_id: u32) {
            let caller = get_caller_address();
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);

            let mut session = store.session(session_id);
            let mut session_chip_bonus = store.session_chip_bonus(session_id);
            if session_chip_bonus.session_id == 0 {
                session_chip_bonus.session_id = session_id;
            }
            assert(session.player_address == caller, 'Not session owner');
            assert(session.is_active, 'Session not active');
            assert(session.spins_remaining > 0, 'No spins remaining');

            let mut force_jackpot = false;
            if session.relic_pending_effect == RelicEffectType::RandomJackpot {
                force_jackpot = true;
                session.relic_pending_effect = RelicEffectType::NoEffect;
            }

            let vrf = store.vrf_disp();
            let random_word = vrf.consume_random(Source::Nonce(caller));

            let spin_modifiers = InventoryImpl::get_spin_cycle_modifiers(@store, session_id, @session);
            let luck = spin_modifiers.effective_luck;
            let prob_bonuses = spin_modifiers.probability_bonuses;
            let coin_probability_penalty = spin_modifiers.coin_probability_penalty;
            let retrigger_bonuses = spin_modifiers.retrigger_bonuses;
            let pattern_bonuses = spin_modifiers.pattern_bonuses;
            let symbol_scores = spin_modifiers.symbol_scores;
            let probability_666 = get_level_666_probability(session.level);

            let (score_gained, pats_count, mut is_666, is_jackpot, grid, (m7, md, mc, m_coin, ml)) =
                crate::components::spinnable::SpinnableImpl::execute_spin(
                random_word,
                luck,
                prob_bonuses,
                coin_probability_penalty,
                probability_666,
                retrigger_bonuses,
                pattern_bonuses,
                symbol_scores,
                force_jackpot,
            );

            let mut final_score = score_gained;
            if session.relic_pending_effect == RelicEffectType::DoubleNextSpin {
                final_score *= 5;
                session.relic_pending_effect = RelicEffectType::NoEffect;
            }

            let mut next_item_count = spin_modifiers.item_count;
            let mut biblia_used = false;
            let mut biblia_discarded = false;
            let mut cash_out_succeeded = false;
            let mut cash_out_failed = false;
            if is_666 {
                let cash_out_inventory = store.inventory(session_id, CASH_OUT_ITEM_ID);
                if cash_out_inventory.quantity > 0 {
                    InventoryImpl::remove_item_from_inventory(
                        ref store, session_id, CASH_OUT_ITEM_ID,
                    );
                    let cash_out_seed = poseidon_hash_span(
                        array![
                            session_id.into(), random_word, caller.into(), CASH_OUT_ITEM_ID.into(),
                        ]
                            .span(),
                    );
                    let cash_out_roll_u256: u256 = cash_out_seed.into();
                    cash_out_succeeded = (cash_out_roll_u256 % 100) < 50;
                    cash_out_failed = !cash_out_succeeded;
                    if cash_out_succeeded {
                        is_666 = false;
                    }
                    if cash_out_inventory.quantity == 1 {
                        next_item_count -= 1;
                    }
                } else {
                    let biblia_inventory = store.inventory(session_id, BIBLIA_ITEM_ID);
                    if biblia_inventory.quantity > 0 {
                        let biblia_seed = poseidon_hash_span(
                            array![
                                session_id.into(), random_word, caller.into(), BIBLIA_ITEM_ID.into(),
                            ]
                                .span(),
                        );
                        let biblia_roll_u256: u256 = biblia_seed.into();
                        biblia_discarded = (biblia_roll_u256 % 100) < 50;
                        if biblia_discarded {
                            InventoryImpl::remove_item_from_inventory(
                                ref store, session_id, BIBLIA_ITEM_ID,
                            );
                        }
                        is_666 = false;
                        biblia_used = true;
                        if biblia_discarded && biblia_inventory.quantity == 1 {
                            next_item_count -= 1;
                        }
                    }
                }
            }

            if cash_out_succeeded || cash_out_failed {
                store
                    .emit_cash_out_resolved(
                        @crate::events::index::CashOutResolved {
                            session_id,
                            player: caller,
                            succeeded: cash_out_succeeded,
                        },
                    );
            }

            session.total_spins += 1;
            session.spins_remaining -= 1;
            session.luck = spin_modifiers.base_luck;

            if is_666 {
                session.score = 0;
                session.total_score = 0;
                session.blocked_666_this_session = true;
            } else {
                session.score += final_score;
                session.total_score += final_score;

                // Accumulate DirectScoreBonus: symbol value increases per pattern hit
                let (b7, bd, bc, b_coin, bl) = spin_modifiers.direct_score_bonuses;
                session.score_seven += m7 * b7;
                session.score_diamond += md * bd;
                session.score_cherry += mc * bc;
                session.score_coin += m_coin * b_coin;
                session.score_lemon += ml * bl;

                session_chip_bonus.bonus_units +=
                    md * spin_modifiers.diamond_chip_bonus_per_pattern;
            }

            if cash_out_succeeded {
                session.spins_remaining = 0;
                session.is_active = false;
            } else if cash_out_failed {
                session.spins_remaining = (session.spins_remaining + 1) / 2;
            }

            loop {
                let threshold = get_level_threshold(session.level);
                if session.score < threshold {
                    break;
                }
                session.level += 1;
                session.tickets += 1;
                session.spins_remaining = DEFAULT_SPINS;
            }

            if session.is_active && session.spins_remaining == 0 {
                session.is_active = false;
                InternalImpl::submit_leaderboard_score(
                    ref self, world, session_id, session.player_address, session.total_score,
                );
            }

            if !session.is_active {
                store.set_session(@session);
                store.set_session_chip_bonus(@session_chip_bonus);
                InternalImpl::process_end_session_rewards(
                    ref store, ref session, session_id, random_word,
                );
            }

            store.set_session(@session);
            store.set_session_chip_bonus(@session_chip_bonus);
            let (collection_address, _) = world
                .dns(@COLLECTION_NAME())
                .expect('Collection not found!');
            let collection = ICollectionDispatcher { contract_address: collection_address };
            collection.update(session_id.into());
            let spin_result = SpinResult {
                session_id,
                cell_0: *grid.at(0),
                cell_1: *grid.at(1),
                cell_2: *grid.at(2),
                cell_3: *grid.at(3),
                cell_4: *grid.at(4),
                cell_5: *grid.at(5),
                cell_6: *grid.at(6),
                cell_7: *grid.at(7),
                cell_8: *grid.at(8),
                cell_9: *grid.at(9),
                cell_10: *grid.at(10),
                cell_11: *grid.at(11),
                cell_12: *grid.at(12),
                cell_13: *grid.at(13),
                cell_14: *grid.at(14),
                score: final_score,
                patterns_count: pats_count,
                is_666,
                is_jackpot,
                is_pending: false,
                biblia_used,
            };
            store.set_spin_result(@spin_result);
            let next_effective_luck = InventoryImpl::calculate_effective_luck_from_spin_modifiers(
                @spin_modifiers,
                pats_count,
                session.spins_remaining,
                next_item_count,
                session.score,
                session.level,
                session.blocked_666_this_session,
            );

            // SYNC LEADERBOARD (Will be done via Torii indexing Session model)

            store
                .emit_spin_completed(
                    @crate::events::index::SpinCompleted {
                        session_id,
                        player: caller,
                        cell_0: spin_result.cell_0,
                        cell_1: spin_result.cell_1,
                        cell_2: spin_result.cell_2,
                        cell_3: spin_result.cell_3,
                        cell_4: spin_result.cell_4,
                        cell_5: spin_result.cell_5,
                        cell_6: spin_result.cell_6,
                        cell_7: spin_result.cell_7,
                        cell_8: spin_result.cell_8,
                        cell_9: spin_result.cell_9,
                        cell_10: spin_result.cell_10,
                        cell_11: spin_result.cell_11,
                        cell_12: spin_result.cell_12,
                        cell_13: spin_result.cell_13,
                        cell_14: spin_result.cell_14,
                        score_gained: final_score,
                        new_total_score: session.total_score,
                        new_level: session.level,
                        spins_remaining: session.spins_remaining,
                        is_active: session.is_active,
                        is_666,
                        is_jackpot,
                        biblia_used,
                        current_luck: next_effective_luck,
                        score_seven: session.score_seven,
                        score_diamond: session.score_diamond,
                        score_cherry: session.score_cherry,
                        score_coin: session.score_coin,
                        score_lemon: session.score_lemon,
                    },
                );
            if biblia_used {
                store
                    .emit_biblia_discarded(
                        @crate::events::index::BibliaDiscarded {
                            session_id,
                            player: caller,
                            discarded: biblia_discarded,
                        },
                    );
            }
        }

        fn end_session(ref self: ContractState, session_id: u32) {
            let caller = get_caller_address();
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);

            let mut session = store.session(session_id);
            assert(session.player_address == caller, 'Not session owner');
            assert(session.is_active, 'Session already ended');

            session.is_active = false;
            InternalImpl::process_end_session_rewards(ref store, ref session, session_id, 0);
            InternalImpl::submit_leaderboard_score(
                ref self, world, session_id, session.player_address, session.total_score,
            );
            store.set_session(@session);
            let (collection_address, _) = world
                .dns(@COLLECTION_NAME())
                .expect('Collection not found!');
            let collection = ICollectionDispatcher { contract_address: collection_address };
            collection.update(session_id.into());

            store.emit_session_ended(session_id, caller, session.total_score, session.level);
        }

        fn claim_chips(ref self: ContractState, session_id: u32) {
            let caller = get_caller_address();
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);

            let mut session = store.session(session_id);
            assert(session.player_address == caller, 'Not session owner');
            assert(!session.is_active, 'Session still active');
            assert(!session.chips_claimed, 'Chips already claimed');

            InternalImpl::process_end_session_rewards(ref store, ref session, session_id, 0);
            store.set_session(@session);
            let (collection_address, _) = world
                .dns(@COLLECTION_NAME())
                .expect('Collection not found!');
            let collection = ICollectionDispatcher { contract_address: collection_address };
            collection.update(session_id.into());
        }

        // ═══════════════════════════════════════════════════════════════════
        // View Functions Implementation
        // ═══════════════════════════════════════════════════════════════════

        fn get_config(self: @ContractState) -> Config {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            store.config()
        }

        fn get_item_info(self: @ContractState, item_id: u32) -> Item {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            store.item(item_id)
        }

        fn get_session(self: @ContractState, session_id: u32) -> Session {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            store.session(session_id)
        }

        fn get_player_sessions(self: @ContractState, player: ContractAddress) -> Span<u32> {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);

            let sessions = store.player_sessions(player);
            let mut session_ids: Array<u32> = array![];
            let mut i: u32 = 0;
            while i < sessions.count {
                let entry = store.player_session_entry(player, i);
                session_ids.append(entry.session_id);
                i += 1;
            }

            session_ids.span()
        }

        fn get_beast_sessions_used(self: @ContractState, player: ContractAddress) -> u32 {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            let usage = store.beast_sessions_used(player);
            usage.count
        }

        fn get_available_beast_sessions(self: @ContractState, player: ContractAddress) -> u32 {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            let config = store.config();
            let usage = store.beast_sessions_used(player);
            let zero_addr: ContractAddress = Zero::zero();

            if config.beast_nft == zero_addr {
                return 0;
            }

            let beast_erc721 = IRelicERC721Dispatcher { contract_address: config.beast_nft };
            let balance_u256 = beast_erc721.balance_of(player);
            if balance_u256 > 0 && usage.count < 1 {
                1
            } else {
                0
            }
        }

        fn get_usd_cost_in_token(self: @ContractState, payment_token: ContractAddress) -> u256 {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            PricingImpl::get_usd_cost_in_token(@store, payment_token)
        }

        fn get_session_luck(self: @ContractState, session_id: u32) -> u32 {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            InventoryImpl::calculate_effective_luck(@store, session_id)
        }

        fn get_session_inventory_count(self: @ContractState, session_id: u32) -> u32 {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            let item_idx = store.session_item_index(session_id);
            let mut count: u32 = 0;
            let mut i: u32 = 0;
            while i < item_idx.count {
                let entry = store.session_item_entry(session_id, i);
                if entry.item_id < 1000 {
                    let inv = store.inventory(session_id, entry.item_id);
                    if inv.quantity > 0 {
                        count += 1;
                    }
                }
                i += 1;
            }
            count
        }

        fn get_charm_drop_chance(self: @ContractState, session_id: u32) -> u32 {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            let session = store.session(session_id);
            let effective_luck = InventoryImpl::calculate_effective_luck(@store, session_id);
            let mut total_chance = (session.score / 125) + effective_luck;
            if total_chance > 50 {
                total_chance = 50;
            }
            total_chance
        }

        fn get_chips_to_claim(self: @ContractState, session_id: u32) -> u256 {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            let session = store.session(session_id);

            if session.is_active || session.chips_claimed {
                return 0.into();
            }

            Self::get_session_chip_payout(self, session_id)
        }

        fn get_session_chip_payout(self: @ContractState, session_id: u32) -> u256 {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            let session = store.session(session_id);
            let config = store.config();
            let session_chip_bonus = store.session_chip_bonus(session_id);
            get_chip_payout_amount(
                session.score,
                session_chip_bonus.bonus_units,
                config.chip_emission_rate,
                config.chip_boost_multiplier,
            )
        }

        fn get_session_chip_bonus_units(self: @ContractState, session_id: u32) -> u32 {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            store.session_chip_bonus(session_id).bonus_units
        }

        fn get_session_item_purchase_price(self: @ContractState, session_id: u32, item_id: u32) -> u32 {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            let item = store.item(item_id);
            let purchase_count = store.session_item_purchase_count(session_id, item_id);
            get_item_purchase_price(item_id, item.price, purchase_count.count)
        }

        fn get_session_items(self: @ContractState, session_id: u32) -> Span<(u32, u32)> {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);

            let item_idx = store.session_item_index(session_id);
            let mut items_out: Array<(u32, u32)> = array![];
            let mut i: u32 = 0;
            while i < item_idx.count {
                let entry = store.session_item_entry(session_id, i);
                let inv = store.inventory(session_id, entry.item_id);
                items_out.append((entry.item_id, inv.quantity));
                i += 1;
            }

            let charm_idx = store.session_charms(session_id);
            let mut j: u32 = 0;
            while j < charm_idx.count {
                let entry = store.session_charm_entry(session_id, j);
                if entry.charm_id > 0 {
                    items_out.append((entry.charm_id + 1000, 1));
                }
                j += 1;
            }

            items_out.span()
        }

        fn get_spin_result(self: @ContractState, session_id: u32) -> SpinResult {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            store.spin_result(session_id)
        }

        fn get_level_threshold(self: @ContractState, level: u32) -> u32 {
            get_level_threshold(level)
        }

        fn get_666_probability(self: @ContractState, level: u32) -> u32 {
            get_level_666_probability(level)
        }

        fn get_session_market(self: @ContractState, session_id: u32) -> SessionMarket {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            store.session_market(session_id)
        }

        fn is_market_slot_purchased(self: @ContractState, session_id: u32, slot: u32) -> bool {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            let msp = store.market_slot_purchased(session_id, slot);
            msp.purchased
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn mint_competitive_session(
            ref store: Store,
            ref config: Config,
            world: dojo::world::WorldStorage,
            player: ContractAddress,
        ) -> u32 {
            let (collection_address, _) = world
                .dns(@COLLECTION_NAME())
                .expect('Collection not found!');
            let collection = ICollectionDispatcher { contract_address: collection_address };
            let session_id: u32 = collection
                .mint(player, false)
                .try_into()
                .expect('Invalid session ID');

            config.total_competitive_sessions += 1;

            let session = Session {
                session_id,
                player_address: player,
                level: 1,
                score: 0,
                total_score: 0,
                spins_remaining: DEFAULT_SPINS,
                is_competitive: true,
                is_active: true,
                created_at: starknet::get_block_timestamp(),
                chips_claimed: false,
                equipped_relic: 0,
                relic_last_used_spin: 0,
                relic_pending_effect: RelicEffectType::NoEffect,
                total_spins: 0,
                luck: 0,
                blocked_666_this_session: false,
                tickets: DEFAULT_TICKETS,
                score_seven: DEFAULT_SCORE_SEVEN,
                score_diamond: DEFAULT_SCORE_DIAMOND,
                score_cherry: DEFAULT_SCORE_CHERRY,
                score_coin: DEFAULT_SCORE_COIN,
                score_lemon: DEFAULT_SCORE_LEMON,
            };
            store.set_session(@session);
            store.set_session_chip_bonus(@SessionChipBonus { session_id, bonus_units: 0 });
            store
                .set_session_item_purchase_count(
                    @SessionItemPurchaseCount { session_id, item_id: BIBLIA_ITEM_ID, count: 0 },
                );

            let mut ps = store.player_sessions(player);
            let ps_idx = ps.count;
            ps.count += 1;
            store.set_player_sessions(@ps);
            store
                .set_player_session_entry(
                    @PlayerSessionEntry { player, index: ps_idx, session_id },
                );

            crate::helpers::market::MarketImpl::refresh_market(
                ref store, session_id, player,
            );
            store.emit_session_created(session_id, player, true);
            session_id
        }

        fn submit_leaderboard_score(
            ref self: ContractState,
            world: dojo::world::WorldStorage,
            session_id: u32,
            player: ContractAddress,
            score: u32,
        ) {
            self
                .rankable
                .submit(
                    world: world,
                    leaderboard_id: LEADERBOARD_ID,
                    game_id: session_id.into(),
                    player_id: player.into(),
                    score: score.into(),
                    time: starknet::get_block_timestamp(),
                    to_store: true,
                );
        }

        fn process_end_session_rewards(
            ref store: Store, ref session: Session, session_id: u32, random_word: felt252,
        ) {
            if !session.is_active && !session.chips_claimed {
                let config = store.config();
                let session_chip_bonus = store.session_chip_bonus(session_id);
                let chip_amount = get_chip_payout_amount(
                    session.score,
                    session_chip_bonus.bonus_units,
                    config.chip_emission_rate,
                    config.chip_boost_multiplier,
                );

                let zero_addr: ContractAddress = Zero::zero();
                if chip_amount > 0 && config.chip_token != zero_addr {
                    let chip_disp = store.chip_disp();
                    chip_disp.mint(session.player_address, chip_amount);
                }

                if config.charm_nft != zero_addr {
                    let effective_luck = InventoryImpl::calculate_effective_luck(
                        @store, session_id,
                    );
                    let mut total_chance = (session.score / 125) + effective_luck;
                    if total_chance > 50 {
                        total_chance = 50;
                    }

                    let charm_seed = poseidon_hash_span(
                        array![session_id.into(), random_word, session.player_address.into()]
                            .span(),
                    );
                    let charm_roll_u256: u256 = charm_seed.into();
                    let charm_roll: u32 = (charm_roll_u256 % 100).try_into().unwrap();

                    if charm_roll < total_chance {
                        let rarity_roll: u32 = ((charm_roll_u256 / 100) % 100).try_into().unwrap();
                        let rarity: u8 = if rarity_roll < 3 {
                            2
                        } else if rarity_roll < 15 {
                            1
                        } else {
                            0
                        };

                        let charm_disp = store.charm_disp();
                        let token_id = charm_disp
                            .mint_random_charm_of_rarity(
                                session.player_address, rarity, charm_seed,
                            );
                        let charm_meta = charm_disp.get_charm_metadata(token_id);
                        store
                            .emit_charm_minted(
                                @crate::events::index::CharmMinted {
                                    session_id,
                                    player: session.player_address,
                                    charm_id: charm_meta.charm_id,
                                    rarity,
                                    token_id,
                                },
                            );
                    }
                }

                // This field effectively guards all end-of-session rewards, not only chips.
                // Marking it after processing prevents repeated claim attempts from minting
                // duplicate charms when the chip payout is zero.
                session.chips_claimed = true;
            }
        }
    }
}
