use core::num::traits::Zero;
use core::poseidon::poseidon_hash_span;
use starknet::ContractAddress;
use crate::constants::{MARKET_CHARM_APPEAR_CHANCE, TOTAL_ITEMS};
use crate::interfaces::charm_nft::ICharmDispatcherTrait;
use crate::store::{Store, StoreTrait};

#[generate_trait]
pub impl MarketImpl of MarketTrait {
    fn is_retired_market_item(item_id: u32) -> bool {
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

    /// Generate a random item ID for a market slot.
    fn generate_random_item_id(session_id: u32, slot: u32, nonce: u32) -> u32 {
        let seed = poseidon_hash_span(array![session_id.into(), slot.into(), nonce.into()].span());
        let roll: u256 = seed.into();
        let item_id: u32 = (roll.low % TOTAL_ITEMS.into()).try_into().unwrap() + 1;
        item_id
    }

    /// Calculate refresh cost based on refresh count.
    fn get_refresh_cost(refresh_count: u32) -> u32 {
        2 + ((refresh_count * (refresh_count + 3)) / 2)
    }

    fn get_recent_market_items(market: crate::models::index::SessionMarket) -> Array<u32> {
        let mut recent_items: Array<u32> = array![];
        let slots = array![
            market.item_slot_1,
            market.item_slot_2,
            market.item_slot_3,
            market.item_slot_4,
            market.item_slot_5,
            market.item_slot_6,
        ];

        let mut i: u32 = 0;
        while i < slots.len() {
            let item_id = *slots.at(i);
            if item_id > 0 && !Self::has_value(recent_items.span(), item_id) {
                recent_items.append(item_id);
            }
            i += 1;
        }

        recent_items
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
        let seed = poseidon_hash_span(
            array![session_id.into(), player.into(), slot.into(), nonce.into()].span(),
        );
        let roll: u256 = seed.into();
        let roll_low: u128 = roll.low;

        if owned_charm_ids.len() > 0 {
            let charm_roll: u32 = (roll_low % 100).try_into().unwrap();
            if charm_roll < MARKET_CHARM_APPEAR_CHANCE {
                let charm_index: u32 = ((roll_low / 100) % owned_charm_ids.len().into())
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

        let item_id = Self::generate_random_item_id(session_id, slot + 1, nonce);
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
        let owned_charm_ids = Self::get_owned_charm_ids(@store, player);
        // Only fetch session charms when we might actually consult them — charm candidates
        // are only generated when the player owns charms via the NFT contract.
        let session_charm_ids: Array<u32> = if owned_charm_ids.len() > 0 {
            crate::helpers::inventory::InventoryImpl::collect_session_charm_ids(
                @store, session_id,
            )
        } else {
            array![]
        };
        let recent_items = Self::get_recent_market_items(sm);

        let mut generated_items: Array<u32> = array![];
        let mut slot: u32 = 0;
        while slot != 6 {
            let mut attempts: u32 = 0;
            let mut candidate: u32 = 0;

            while attempts != 20 {
                candidate =
                    Self::generate_market_slot_item(
                        session_id,
                        player,
                        owned_charm_ids.span(),
                        session_charm_ids.span(),
                        recent_items.span(),
                        slot,
                        nonce + (attempts * 100),
                    );

                if candidate != 0 && !Self::has_value(generated_items.span(), candidate) {
                    break;
                }
                attempts += 1;
            }

            if candidate == 0 || Self::has_value(generated_items.span(), candidate) {
                candidate = 1;
                while candidate <= TOTAL_ITEMS
                    && (Self::has_value(recent_items.span(), candidate)
                        || Self::has_value(generated_items.span(), candidate)) {
                    candidate += 1;
                }
            }

            generated_items.append(candidate);
            slot += 1;
        }

        sm.item_slot_1 = *generated_items.at(0);
        sm.item_slot_2 = *generated_items.at(1);
        sm.item_slot_3 = *generated_items.at(2);
        sm.item_slot_4 = *generated_items.at(3);
        sm.item_slot_5 = *generated_items.at(4);
        sm.item_slot_6 = *generated_items.at(5);

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
