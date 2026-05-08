use core::num::traits::Zero;
use core::poseidon::hades_permutation;
use starknet::ContractAddress;
use crate::constants::{MARKET_CHARM_APPEAR_CHANCE, TOTAL_ITEMS};
use crate::interfaces::charm_nft::ICharmDispatcherTrait;
use crate::store::{Store, StoreTrait};

#[generate_trait]
pub impl MarketImpl of MarketTrait {
    fn is_retired_market_item(item_id: u32) -> bool {
        // Retired ids are sparsely clustered between 10 and 39. Short-circuit the common
        // case (everything else) before running the 5 equality checks.
        if item_id < 10 || item_id > 39 {
            return false;
        }
        item_id == 10 || item_id == 19 || item_id == 23 || item_id == 24 || item_id == 39
    }

    fn has_value(values: Span<u32>, target: u32) -> bool {
        let len = values.len();
        let mut i: u32 = 0;
        while i != len {
            if *values.at(i) == target {
                return true;
            }
            i += 1;
        }
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
        }
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
        }

        owned_charm_ids
    }

    /// Calculate refresh cost based on refresh count.
    fn get_refresh_cost(refresh_count: u32) -> u32 {
        2 + ((refresh_count * (refresh_count + 3)) / 2)
    }

    fn has_recent_market_item(
        recent_items: (u32, u32, u32, u32, u32, u32), target: u32,
    ) -> bool {
        let (item_1, item_2, item_3, item_4, item_5, item_6) = recent_items;
        target != 0
            && (item_1 == target
                || item_2 == target
                || item_3 == target
                || item_4 == target
                || item_5 == target
                || item_6 == target)
    }

    fn unique_loadout_charm_ids(
        loadout: crate::models::index::SessionCharmLoadout,
    ) -> (u32, u32, u32, u32) {
        let mut count: u32 = 0;
        let mut charm_id_1: u32 = 0;
        let mut charm_id_2: u32 = 0;
        let mut charm_id_3: u32 = 0;

        if loadout.charm_id_1 > 0 {
            charm_id_1 = loadout.charm_id_1;
            count = 1;
        }
        if loadout.charm_id_2 > 0 && loadout.charm_id_2 != charm_id_1 {
            if count == 0 {
                charm_id_1 = loadout.charm_id_2;
            } else {
                charm_id_2 = loadout.charm_id_2;
            }
            count += 1;
        }
        if loadout.charm_id_3 > 0
            && loadout.charm_id_3 != charm_id_1
            && loadout.charm_id_3 != charm_id_2 {
            if count == 0 {
                charm_id_1 = loadout.charm_id_3;
            } else if count == 1 {
                charm_id_2 = loadout.charm_id_3;
            } else {
                charm_id_3 = loadout.charm_id_3;
            }
            count += 1;
        }

        (count, charm_id_1, charm_id_2, charm_id_3)
    }

    fn get_loadout_charm_at(
        loadout_charm_ids: (u32, u32, u32, u32), index: u32,
    ) -> u32 {
        let (_, charm_id_1, charm_id_2, charm_id_3) = loadout_charm_ids;
        if index == 0 {
            charm_id_1
        } else if index == 1 {
            charm_id_2
        } else {
            charm_id_3
        }
    }

    fn has_generated_value(
        generated_count: u32,
        slot_1: u32,
        slot_2: u32,
        slot_3: u32,
        slot_4: u32,
        slot_5: u32,
        slot_6: u32,
        target: u32,
    ) -> bool {
        if generated_count > 0 && slot_1 == target {
            return true;
        }
        if generated_count > 1 && slot_2 == target {
            return true;
        }
        if generated_count > 2 && slot_3 == target {
            return true;
        }
        if generated_count > 3 && slot_4 == target {
            return true;
        }
        if generated_count > 4 && slot_5 == target {
            return true;
        }
        if generated_count > 5 && slot_6 == target {
            return true;
        }
        false
    }

    fn generate_market_slot_item(
        slot_seed: felt252,
        loadout_charm_ids: (u32, u32, u32, u32),
        session_charm_ids: Span<u32>,
        recent_items: (u32, u32, u32, u32, u32, u32),
        nonce: u32,
    ) -> u32 {
        let (seed, _, _) = hades_permutation(slot_seed, nonce.into(), 2);
        let roll: u256 = seed.into();
        let roll_low: u128 = roll.low;

        let (loadout_charm_count, _, _, _) = loadout_charm_ids;
        if loadout_charm_count > 0 {
            let charm_roll: u32 = (roll_low % 100).try_into().unwrap();
            if charm_roll < MARKET_CHARM_APPEAR_CHANCE {
                let charm_index: u32 = ((roll_low / 100) % loadout_charm_count.into())
                    .try_into()
                    .unwrap();
                let charm_id = Self::get_loadout_charm_at(loadout_charm_ids, charm_index);
                let charm_item_id = 1000 + charm_id;
                if charm_id > 0
                    && !Self::has_value(session_charm_ids, charm_id)
                    && !Self::has_recent_market_item(recent_items, charm_item_id) {
                    return charm_item_id;
                }
            }
        }

        let item_id: u32 = (roll_low % TOTAL_ITEMS.into()).try_into().unwrap() + 1;
        if Self::is_retired_market_item(item_id)
            || Self::has_recent_market_item(recent_items, item_id) {
            return 0;
        }

        item_id
    }

    /// Refresh the session market with 6 new random items.
    /// Caller passes in a pre-loaded `sm` (already mutated with updated `refresh_count`).
    fn refresh_market(
        ref store: Store,
        mut sm: crate::models::index::SessionMarket,
        session_id: u32,
        player: ContractAddress,
    ) -> crate::models::index::SessionMarket {
        let nonce = sm.refresh_count;
        // Loadout acts as the candidate pool. Empty loadout → no charms in the market.
        let loadout = store.session_charm_loadout(session_id);
        let loadout_charm_ids = Self::unique_loadout_charm_ids(loadout);
        let (loadout_charm_count, _, _, _) = loadout_charm_ids;
        // Only fetch session charms when we might actually consult them — charm candidates
        // are only generated when the loadout is non-empty.
        let session_charm_ids: Array<u32> = if loadout_charm_count > 0 {
            crate::helpers::inventory::InventoryImpl::collect_session_charm_ids(
                @store, session_id,
            )
        } else {
            array![]
        };
        let recent_items = (
            sm.item_slot_1,
            sm.item_slot_2,
            sm.item_slot_3,
            sm.item_slot_4,
            sm.item_slot_5,
            sm.item_slot_6,
        );

        let mut generated_count: u32 = 0;
        let mut item_slot_1: u32 = 0;
        let mut item_slot_2: u32 = 0;
        let mut item_slot_3: u32 = 0;
        let mut item_slot_4: u32 = 0;
        let mut item_slot_5: u32 = 0;
        let mut item_slot_6: u32 = 0;
        let (base_seed, _, _) = hades_permutation(session_id.into(), player.into(), 2);
        let mut slot: u32 = 0;
        while slot != 6 {
            let (slot_seed, _, _) = hades_permutation(base_seed, slot.into(), 2);
            let mut attempts: u32 = 0;
            let mut candidate: u32 = 0;
            let mut is_duplicate = false;

            while attempts != 20 {
                candidate =
                    Self::generate_market_slot_item(
                        slot_seed,
                        loadout_charm_ids,
                        session_charm_ids.span(),
                        recent_items,
                        nonce + (attempts * 100),
                    );

                is_duplicate =
                    candidate != 0
                        && Self::has_generated_value(
                        generated_count,
                        item_slot_1,
                        item_slot_2,
                        item_slot_3,
                        item_slot_4,
                        item_slot_5,
                        item_slot_6,
                        candidate,
                    );
                if candidate != 0 && !is_duplicate {
                    break;
                }
                attempts += 1;
            }

            if candidate == 0 || is_duplicate {
                candidate = 1;
                while candidate <= TOTAL_ITEMS
                    && (Self::has_recent_market_item(recent_items, candidate)
                        || Self::has_generated_value(
                            generated_count,
                            item_slot_1,
                            item_slot_2,
                            item_slot_3,
                            item_slot_4,
                            item_slot_5,
                            item_slot_6,
                            candidate,
                        )) {
                    candidate += 1;
                }
            }

            if slot == 0 {
                item_slot_1 = candidate;
            } else if slot == 1 {
                item_slot_2 = candidate;
            } else if slot == 2 {
                item_slot_3 = candidate;
            } else if slot == 3 {
                item_slot_4 = candidate;
            } else if slot == 4 {
                item_slot_5 = candidate;
            } else {
                item_slot_6 = candidate;
            }
            generated_count += 1;
            slot += 1;
        }

        sm.item_slot_1 = item_slot_1;
        sm.item_slot_2 = item_slot_2;
        sm.item_slot_3 = item_slot_3;
        sm.item_slot_4 = item_slot_4;
        sm.item_slot_5 = item_slot_5;
        sm.item_slot_6 = item_slot_6;
        sm.purchased_mask = 0;

        store.set_session_market(@sm);

        sm
    }
}
