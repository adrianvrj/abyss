

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

    use starknet::get_caller_address;
    use crate::constants::NAMESPACE;
    use crate::store::{StoreTrait};
    use crate::interfaces::relic_nft::{IRelicERC721DispatcherTrait};
    use crate::interfaces::relic_nft::{IRelicDispatcherTrait};
    use crate::types::effect::RelicEffectType;
    use crate::events::index::RelicActivated;
    use super::*;

    #[storage]
    struct Storage {}

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {}

    fn dojo_init(ref self: ContractState) {}

    #[abi(embed_v0)]
    impl RelicImpl of IRelic<ContractState> {
        fn equip_relic(ref self: ContractState, session_id: u32, relic_token_id: u256) {
            let caller = get_caller_address();
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);

            let mut session = store.session(session_id);
            assert(session.player_address == caller, 'Not session owner');
            assert(session.is_active, 'Session not active');

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
            store.emit_relic_equipped(
                @crate::events::index::RelicEquipped {
                    session_id,
                    player: caller,
                    relic_token_id,
                    relic_id: metadata.relic_id,
                    current_luck: session.luck,
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
            // last_used_spin is spin count where it was last active
            assert(
                session.total_spins >= session.relic_last_used_spin + metadata.cooldown_spins,
                'Relic on cooldown'
            );

            // 3. Apply Effect
            let effect = metadata.effect_type;
            if effect == RelicEffectType::RandomJackpot {
                session.relic_pending_effect = RelicEffectType::RandomJackpot;
            } else if effect == RelicEffectType::DoubleNextSpin {
                session.relic_pending_effect = RelicEffectType::DoubleNextSpin;
            } else if effect == RelicEffectType::ResetSpins {
                session.spins_remaining = 5; // Reset to base 5
            } else if effect == RelicEffectType::FreeMarketRefresh {
                // Handled in Market system or simply set a flag? 
                // For now, let's say it gives one free refresh by setting refresh_count back
                let mut sm = store.session_market(session_id);
                if sm.refresh_count > 0 { sm.refresh_count -= 1; }
                store.set_session_market(@sm);
            } else if effect == RelicEffectType::Trigger666 {
                session.relic_pending_effect = RelicEffectType::Trigger666;
            }

            // 4. Update Cooldown
            session.relic_last_used_spin = session.total_spins;
            store.set_session(@session);

            // 5. Event
            store.emit_relic_activated(
                @RelicActivated {
                    session_id,
                    player: caller,
                    relic_id: metadata.relic_id,
                    effect_type: effect,
                    cooldown_until_spin: session.total_spins + metadata.cooldown_spins,
                    current_luck: session.luck,
                }
            );
        }
    }
}
