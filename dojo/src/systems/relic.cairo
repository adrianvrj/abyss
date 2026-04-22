#[inline]
pub fn NAME() -> ByteArray {
    "Relic"
}

#[starknet::interface]
pub trait IRelic<T> {
    fn equip_relic(ref self: T, session_id: u32, relic_token_id: u256);
    fn activate_relic(ref self: T, session_id: u32);
}

#[dojo::contract]
pub mod Relic {
    use starknet::{ContractAddress, get_caller_address};
    use core::poseidon::poseidon_hash_span;
    use crate::constants::{MAX_CURRENT_SPINS, NAMESPACE};
    use crate::events::index::{MarketRefreshed, PhantomActivated, RelicActivated};
    use crate::helpers::inventory::InventoryImpl;
    use crate::helpers::market::MarketImpl;
    use crate::interfaces::relic_nft::{IRelicDispatcherTrait, IRelicERC721DispatcherTrait};
    use crate::store::StoreTrait;
    use crate::types::effect::RelicEffectType;
    use super::*;

    #[storage]
    struct Storage {}

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {}

    fn dojo_init(ref self: ContractState) {}

    fn roll_phantom_bonus_spins(session_id: u32, caller: ContractAddress, current_spin_marker: u32) -> u32 {
        let seed = poseidon_hash_span(
            array![session_id.into(), caller.into(), current_spin_marker.into(), 2.into()].span(),
        );
        let roll_u256: u256 = seed.into();
        let roll: u32 = (roll_u256.low % 100).try_into().unwrap();
        if roll < 40 {
            1
        } else if roll < 80 {
            2
        } else {
            3
        }
    }

    #[abi(embed_v0)]
    impl RelicImpl of IRelic<ContractState> {
        fn equip_relic(ref self: ContractState, session_id: u32, relic_token_id: u256) {
            let caller = get_caller_address();
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);

            let mut session = store.session(session_id);
            assert(session.player_address == caller, 'Not session owner');
            assert(session.is_active, 'Session not active');
            assert(session.equipped_relic == 0, 'Relic already equipped');

            // 1. Ownership Check
            let relic_erc721 = store.relic_erc721_disp();
            let owner = relic_erc721.owner_of(relic_token_id);
            assert(owner == caller, 'Not relic owner');

            // 2. Persistence
            session.equipped_relic = relic_token_id;
            // Clear pending effect from previous relic if any
            session.relic_pending_effect = RelicEffectType::NoEffect;
            store.set_session(@session);

            // 3. Event
            let relic_disp = store.relic_disp();
            let metadata = relic_disp.get_relic_metadata(relic_token_id);
            let charm_ids = InventoryImpl::collect_session_charm_ids(@store, session_id);
            let current_luck = InventoryImpl::calculate_effective_luck_with_charm_ids(
                @store, session_id, charm_ids.span(), @session,
            );
            store
                .emit_relic_equipped(
                    @crate::events::index::RelicEquipped {
                        session_id,
                        player: caller,
                        relic_token_id,
                        relic_id: metadata.relic_id,
                        current_luck,
                    },
                );
        }

        fn activate_relic(ref self: ContractState, session_id: u32) {
            let caller = get_caller_address();
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);

            let mut session = store.session(session_id);
            assert(session.player_address == caller, 'Not session owner');
            assert(session.is_active, 'Session not active');
            assert(session.equipped_relic != 0, 'No relic equipped');

            // 1. Fetch Metadata
            let relic_disp = store.relic_disp();
            let metadata = relic_disp.get_relic_metadata(session.equipped_relic);

            // 2. Cooldown Check
            // relic_last_used_spin uses 0 as "never used" and stores activations as
            // total_spins + 1 so activating before the first spin can still enter cooldown.
            let current_spin_marker = session.total_spins + 1;
            if metadata.relic_id == 1 {
                assert(session.relic_last_used_spin == 0, 'Mortis already used');
            }
            assert(
                session.relic_last_used_spin == 0
                    || current_spin_marker >= session.relic_last_used_spin
                    + metadata.cooldown_spins,
                'Relic on cooldown',
            );

            // 3. Apply Effect
            //
            // NOTE: we cache the session's charm ids exactly once and reuse them (along with
            // the in-memory `session`) for every luck re-compute in this function.
            let charm_ids = InventoryImpl::collect_session_charm_ids(@store, session_id);

            let effect = metadata.effect_type;
            if effect == RelicEffectType::RandomJackpot {
                session.relic_pending_effect = RelicEffectType::RandomJackpot;
            } else if effect == RelicEffectType::DoubleNextSpin {
                session.relic_pending_effect = RelicEffectType::DoubleNextSpin;
            } else if effect == RelicEffectType::ResetSpins {
                let bonus_spins = roll_phantom_bonus_spins(session_id, caller, current_spin_marker);
                let next_spins = session.spins_remaining + bonus_spins;
                session.spins_remaining =
                    if next_spins > MAX_CURRENT_SPINS { MAX_CURRENT_SPINS } else { next_spins };
                store
                    .emit_phantom_activated(
                        @PhantomActivated {
                            session_id,
                            player: caller,
                            bonus_spins,
                            new_spins: session.spins_remaining,
                        },
                    );
            } else if effect == RelicEffectType::FreeMarketRefresh {
                let mut sm = store.session_market(session_id);
                sm.refresh_count += 1;

                let refreshed_market = MarketImpl::refresh_market(
                    ref store, sm, session_id, caller,
                );
                let refresh_luck = InventoryImpl::calculate_effective_luck_with_charm_ids(
                    @store, session_id, charm_ids.span(), @session,
                );
                store
                    .emit_market_refreshed(
                        @MarketRefreshed {
                            session_id,
                            player: caller,
                            new_score: session.score,
                            slot_1: refreshed_market.item_slot_1,
                            slot_2: refreshed_market.item_slot_2,
                            slot_3: refreshed_market.item_slot_3,
                            slot_4: refreshed_market.item_slot_4,
                            slot_5: refreshed_market.item_slot_5,
                            slot_6: refreshed_market.item_slot_6,
                            current_luck: refresh_luck,
                        },
                    );
            } else if effect == RelicEffectType::Trigger666 {
                session.relic_pending_effect = RelicEffectType::Trigger666;
            }

            // 4. Update Cooldown
            session.relic_last_used_spin = current_spin_marker;
            store.set_session(@session);

            // 5. Event
            let activate_luck = InventoryImpl::calculate_effective_luck_with_charm_ids(
                @store, session_id, charm_ids.span(), @session,
            );
            store
                .emit_relic_activated(
                    @RelicActivated {
                        session_id,
                        player: caller,
                        relic_id: metadata.relic_id,
                        effect_type: effect,
                        cooldown_until_spin: session.relic_last_used_spin
                            + metadata.cooldown_spins
                            - 1,
                        current_luck: activate_luck,
                    },
                );
        }
    }
}
