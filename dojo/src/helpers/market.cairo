use core::poseidon::poseidon_hash_span;
use core::num::traits::Zero;
use starknet::ContractAddress;
use crate::constants::{TOTAL_ITEMS};
use crate::store::{Store, StoreTrait};
use crate::interfaces::charm_nft::{ICharmDispatcherTrait};

#[generate_trait]
pub impl MarketImpl of MarketTrait {
    fn has_value(values: Span<u32>, target: u32) -> bool {
        let mut i: u32 = 0;
        while i < values.len() {
            if *values.at(i) == target {
                return true;
            }
            i += 1;
        };
        false
    }

    fn has_session_charm(store: @Store, session_id: u32, charm_id: u32) -> bool {
        let charm_idx = store.session_charms(session_id);
        let mut i: u32 = 0;
        while i < charm_idx.count {
            let entry = store.session_charm_entry(session_id, i);
            if entry.charm_id == charm_id {
                return true;
            }
            i += 1;
        };
        false
    }

    fn get_owned_charm_ids(store: @Store, player: ContractAddress) -> Array<u32> {
        let config = store.config();
        let zero_addr: ContractAddress = Zero::zero();
        let mut owned_charm_ids: Array<u32> = array![];

        if config.charm_nft == zero_addr {
            return owned_charm_ids;
        }

        let charm_disp = store.charm_disp();
        let player_token_ids = charm_disp.get_player_charms(player);

        let mut i: u32 = 0;
        while i < player_token_ids.len() {
            let token_id = *player_token_ids.at(i);
            let charm_meta = charm_disp.get_charm_metadata(token_id);
            let charm_id = charm_meta.charm_id;
            if charm_id > 0 && !Self::has_value(owned_charm_ids.span(), charm_id) {
                owned_charm_ids.append(charm_id);
            }
            i += 1;
        };

        owned_charm_ids
    }

    /// Generate a random item ID for a market slot.
    fn generate_random_item_id(session_id: u32, slot: u32, nonce: u32) -> u32 {
        let seed = poseidon_hash_span(
            array![session_id.into(), slot.into(), nonce.into()].span(),
        );
        let roll: u256 = seed.into();
        let item_id: u32 = (roll % TOTAL_ITEMS.into()).try_into().unwrap() + 1;
        item_id
    }

    /// Calculate refresh cost based on refresh count.
    fn get_refresh_cost(refresh_count: u32) -> u32 {
        2 + ((refresh_count * (refresh_count + 3)) / 2)
    }

    fn generate_market_slot_item(
        store: @Store, session_id: u32, player: ContractAddress, slot: u32, nonce: u32,
    ) -> u32 {
        let seed = poseidon_hash_span(
            array![session_id.into(), player.into(), slot.into(), nonce.into()].span(),
        );
        let roll: u256 = seed.into();
        let owned_charm_ids = Self::get_owned_charm_ids(store, player);

        if owned_charm_ids.len() > 0 {
            let charm_roll: u32 = (roll % 100).try_into().unwrap();
            if charm_roll < 30 {
                let charm_index: u32 =
                    ((roll / 100) % owned_charm_ids.len().into()).try_into().unwrap();
                let charm_id = *owned_charm_ids.at(charm_index);
                if charm_id > 0 && !Self::has_session_charm(store, session_id, charm_id) {
                    return 1000 + charm_id;
                }
            }
        }

        Self::generate_random_item_id(session_id, slot + 1, nonce)
    }

    /// Refresh the session market with 6 new random items.
    fn refresh_market(ref store: Store, session_id: u32) {
        let session = store.session(session_id);
        let mut sm = store.session_market(session_id);
        let nonce = sm.refresh_count;

        let mut generated_items: Array<u32> = array![];
        let mut slot: u32 = 0;
        while slot < 6 {
            let mut attempts: u32 = 0;
            let mut candidate: u32 = 0;

            while attempts < 5 {
                candidate = Self::generate_market_slot_item(
                    @store,
                    session_id,
                    session.player_address,
                    slot,
                    nonce + (attempts * 100),
                );

                if !Self::has_value(generated_items.span(), candidate) {
                    break;
                }
                attempts += 1;
            };

            if candidate == 0 || Self::has_value(generated_items.span(), candidate) {
                candidate = Self::generate_market_slot_item(
                    @store,
                    session_id,
                    session.player_address,
                    slot,
                    nonce + 500 + slot,
                );
            }

            generated_items.append(candidate);
            slot += 1;
        };

        sm.item_slot_1 = *generated_items.at(0);
        sm.item_slot_2 = *generated_items.at(1);
        sm.item_slot_3 = *generated_items.at(2);
        sm.item_slot_4 = *generated_items.at(3);
        sm.item_slot_5 = *generated_items.at(4);
        sm.item_slot_6 = *generated_items.at(5);
        
        store.set_session_market(@sm);

        // Clear purchased flags
        let mut slot: u32 = 0;
        while slot < 6 {
            store.set_market_slot_purchased(
                @crate::models::index::MarketSlotPurchased { session_id, slot, purchased: false }
            );
            slot += 1;
        };
    }
}
