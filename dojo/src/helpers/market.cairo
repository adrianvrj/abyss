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

    fn get_recent_market_items(market: crate::models::index::SessionMarket) -> Array<u32> {
        let mut recent_items: Array<u32> = array![];

        if market.item_slot_1 > 0 {
            recent_items.append(market.item_slot_1);
        }
        if market.item_slot_2 > 0 && !Self::has_value(recent_items.span(), market.item_slot_2) {
            recent_items.append(market.item_slot_2);
        }
        if market.item_slot_3 > 0 && !Self::has_value(recent_items.span(), market.item_slot_3) {
            recent_items.append(market.item_slot_3);
        }
        if market.item_slot_4 > 0 && !Self::has_value(recent_items.span(), market.item_slot_4) {
            recent_items.append(market.item_slot_4);
        }
        if market.item_slot_5 > 0 && !Self::has_value(recent_items.span(), market.item_slot_5) {
            recent_items.append(market.item_slot_5);
        }
        if market.item_slot_6 > 0 && !Self::has_value(recent_items.span(), market.item_slot_6) {
            recent_items.append(market.item_slot_6);
        }

        recent_items
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
        session_id: u32,
        player: ContractAddress,
        owned_charm_ids: Span<u32>,
        session_charm_ids: Span<u32>,
        excluded_ids: Span<u32>,
        slot: u32,
        nonce: u32,
    ) -> u32 {
        let (s0, _, _) = hades_permutation(session_id.into(), player.into(), 2);
        let (s1, _, _) = hades_permutation(s0, slot.into(), 2);
        let (seed, _, _) = hades_permutation(s1, nonce.into(), 2);
        let roll: u256 = seed.into();
        let roll_low: u128 = roll.low;

        let owned_charm_count = owned_charm_ids.len();
        if owned_charm_count > 0 {
            let charm_roll: u32 = (roll_low % 100).try_into().unwrap();
            if charm_roll < MARKET_CHARM_APPEAR_CHANCE {
                let charm_index: u32 = ((roll_low / 100) % owned_charm_count.into())
                    .try_into()
                    .unwrap();
                let charm_id = *owned_charm_ids.at(charm_index);
                let charm_item_id = 1000 + charm_id;
                if charm_id > 0
                    && !Self::has_value(session_charm_ids, charm_id)
                    && !Self::has_value(excluded_ids, charm_item_id) {
                    return charm_item_id;
                }
            }
        }

        let item_id: u32 = (roll_low % TOTAL_ITEMS.into()).try_into().unwrap() + 1;
        if Self::is_retired_market_item(item_id) || Self::has_value(excluded_ids, item_id) {
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
        let mut loadout_charm_ids: Array<u32> = array![];
        if loadout.charm_id_1 > 0 {
            loadout_charm_ids.append(loadout.charm_id_1);
        }
        if loadout.charm_id_2 > 0
            && !Self::has_value(loadout_charm_ids.span(), loadout.charm_id_2) {
            loadout_charm_ids.append(loadout.charm_id_2);
        }
        if loadout.charm_id_3 > 0
            && !Self::has_value(loadout_charm_ids.span(), loadout.charm_id_3) {
            loadout_charm_ids.append(loadout.charm_id_3);
        }
        // Only fetch session charms when we might actually consult them — charm candidates
        // are only generated when the loadout is non-empty.
        let session_charm_ids: Array<u32> = if loadout_charm_ids.len() > 0 {
            crate::helpers::inventory::InventoryImpl::collect_session_charm_ids(
                @store, session_id,
            )
        } else {
            array![]
        };
        let recent_items = Self::get_recent_market_items(sm);

        let mut generated_count: u32 = 0;
        let mut item_slot_1: u32 = 0;
        let mut item_slot_2: u32 = 0;
        let mut item_slot_3: u32 = 0;
        let mut item_slot_4: u32 = 0;
        let mut item_slot_5: u32 = 0;
        let mut item_slot_6: u32 = 0;
        let mut slot: u32 = 0;
        while slot != 6 {
            let mut attempts: u32 = 0;
            let mut candidate: u32 = 0;

            while attempts != 20 {
                candidate =
                    Self::generate_market_slot_item(
                        session_id,
                        player,
                        loadout_charm_ids.span(),
                        session_charm_ids.span(),
                        recent_items.span(),
                        slot,
                        nonce + (attempts * 100),
                    );

                if candidate != 0
                    && !Self::has_generated_value(
                        generated_count,
                        item_slot_1,
                        item_slot_2,
                        item_slot_3,
                        item_slot_4,
                        item_slot_5,
                        item_slot_6,
                        candidate,
                    ) {
                    break;
                }
                attempts += 1;
            }

            if candidate == 0
                || Self::has_generated_value(
                    generated_count,
                    item_slot_1,
                    item_slot_2,
                    item_slot_3,
                    item_slot_4,
                    item_slot_5,
                    item_slot_6,
                    candidate,
                ) {
                candidate = 1;
                while candidate <= TOTAL_ITEMS
                    && (Self::has_value(recent_items.span(), candidate)
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

        store.set_session_market(@sm);

        // Clear purchased flags. Skip writes for slots already marked unpurchased —
        // writes are ~4× more expensive than reads in Dojo storage.
        let mut slot: u32 = 0;
        while slot != 6 {
            let existing = store.market_slot_purchased(session_id, slot);
            if existing.purchased {
                store
                    .set_market_slot_purchased(
                        @crate::models::index::MarketSlotPurchased {
                            session_id, slot, purchased: false,
                        },
                    );
            }
            slot += 1;
        };

        sm
    }
}
