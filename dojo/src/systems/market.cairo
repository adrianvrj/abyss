#[inline]
pub fn NAME() -> ByteArray {
    "Market"
}

#[starknet::interface]
pub trait IMarket<T> {
    fn buy_item(ref self: T, session_id: u32, market_slot: u32);
    fn sell_item(ref self: T, session_id: u32, item_id: u32, quantity: u32);
    fn refresh_market(ref self: T, session_id: u32);
}

#[dojo::contract]
pub mod Market {
    use starknet::get_caller_address;
    use crate::constants::NAMESPACE;
    use crate::events::index::{ItemPurchased, ItemSold, MarketRefreshed};
    use crate::helpers::inventory::InventoryImpl;
    use crate::helpers::market::MarketImpl;
    use crate::interfaces::charm_nft::ICharmDispatcherTrait;
    use crate::models::index::MarketSlotPurchased;
    use crate::store::StoreTrait;
    use super::*;

    #[storage]
    struct Storage {}

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {}

    fn dojo_init(ref self: ContractState) {}

    #[abi(embed_v0)]
    impl MarketSystemsImpl of IMarket<ContractState> {
        fn buy_item(ref self: ContractState, session_id: u32, market_slot: u32) {
            let caller = get_caller_address();
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);

            let mut session = store.session(session_id);
            assert(session.player_address == caller, 'Not session owner');
            assert(session.is_active, 'Session not active');

            // 1. Slot check
            let msp = store.market_slot_purchased(session_id, market_slot);
            assert(!msp.purchased, 'Slot already purchased');

            // 2. Item Fetching
            let market = store.session_market(session_id);
            let item_id = if market_slot == 0 {
                market.item_slot_1
            } else if market_slot == 1 {
                market.item_slot_2
            } else if market_slot == 2 {
                market.item_slot_3
            } else if market_slot == 3 {
                market.item_slot_4
            } else if market_slot == 4 {
                market.item_slot_5
            } else if market_slot == 5 {
                market.item_slot_6
            } else {
                assert(false, 'Invalid slot');
                0
            };

            let mut purchase_price: u32 = 0;
            let mut is_charm = false;

            if item_id >= 1000 {
                is_charm = true;
                let charm_id = item_id - 1000;
                assert(
                    !InventoryImpl::has_charm_in_session(@store, session_id, charm_id),
                    'Charm already active',
                );

                let charm_meta = store.charm_disp().get_charm_type_info(charm_id);
                purchase_price = charm_meta.shop_cost;
                assert(session.tickets >= purchase_price, 'Not enough tickets');

                session.tickets -= purchase_price;
                if charm_meta.effect_type == 9 {
                    session.spins_remaining += charm_meta.effect_value;
                }

                InventoryImpl::add_charm_to_session(ref store, session_id, charm_id);
                session.luck = InventoryImpl::calculate_base_luck(@store, session_id);
                store.set_session(@session);
            } else {
                let item = store.item(item_id);
                purchase_price = item.price;
                assert(session.tickets >= purchase_price, 'Not enough tickets');

                let existing = store.inventory(session_id, item_id);
                assert(existing.quantity == 0, 'Item already owned');

                session.tickets -= purchase_price;
                if item.effect_type == 4 {
                    session.spins_remaining += item.effect_value;
                }
                store.set_session(@session);

                InventoryImpl::add_item_to_inventory(ref store, session_id, item_id);
                store.set_session(@session);
            }

            // 5. State Persistence
            store
                .set_market_slot_purchased(
                    @MarketSlotPurchased { session_id, slot: market_slot, purchased: true },
                );

            // 6. Event Emission
            store
                .emit_item_purchased(
                    @ItemPurchased {
                        session_id,
                        player: caller,
                        item_id,
                        price: purchase_price,
                        new_score: session.score,
                        new_spins: session.spins_remaining,
                        new_tickets: session.tickets,
                        is_charm,
                        current_luck: InventoryImpl::calculate_effective_luck(@store, session_id),
                    },
                );
        }

        fn sell_item(ref self: ContractState, session_id: u32, item_id: u32, quantity: u32) {
            let caller = get_caller_address();
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);

            let mut session = store.session(session_id);
            assert(session.player_address == caller, 'Not session owner');
            assert(session.is_active, 'Session not active');

            let mut sell_price: u32 = 0;

            if item_id >= 1000 {
                let charm_id = item_id - 1000;
                assert(
                    InventoryImpl::has_charm_in_session(@store, session_id, charm_id),
                    'Charm not active',
                );

                let charm_meta = store.charm_disp().get_charm_type_info(charm_id);
                if charm_meta.effect_type == 9 {
                    assert(
                        session.spins_remaining >= charm_meta.effect_value,
                        'Cannot sell: spins used',
                    );
                    session.spins_remaining -= charm_meta.effect_value;
                }

                sell_price = charm_meta.shop_cost / 2;
                session.tickets += sell_price;
                InventoryImpl::remove_charm_from_session(ref store, session_id, charm_id);
                session.luck = InventoryImpl::calculate_base_luck(@store, session_id);
                store.set_session(@session);
            } else {
                let item = store.item(item_id);
                sell_price = item.sell_price;

                let inv = store.inventory(session_id, item_id);
                assert(inv.quantity >= quantity, 'Not enough items');

                let mut q = quantity;
                while q > 0 {
                    InventoryImpl::remove_item_from_inventory(ref store, session_id, item_id);
                    session.tickets += sell_price;
                    q -= 1;
                }

                store.set_session(@session);
            }

            store
                .emit_item_sold(
                    @ItemSold {
                        session_id,
                        player: caller,
                        item_id,
                        sell_price: sell_price * quantity,
                        new_score: session.score,
                        new_tickets: session.tickets,
                        current_luck: InventoryImpl::calculate_effective_luck(@store, session_id),
                    },
                );
        }

        fn refresh_market(ref self: ContractState, session_id: u32) {
            let caller = get_caller_address();
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);

            let mut session = store.session(session_id);
            assert(session.player_address == caller, 'Not session owner');
            assert(session.is_active, 'Session not active');

            let mut sm = store.session_market(session_id);
            let cost = crate::helpers::market::MarketImpl::get_refresh_cost(sm.refresh_count);
            assert(session.score >= cost, 'Not enough score');

            // Deduct cost and increment refresh count
            session.score -= cost;
            sm.refresh_count += 1;
            store.set_session(@session);
            store.set_session_market(@sm);

            // Execute refresh helper
            crate::helpers::market::MarketImpl::refresh_market(ref store, session_id);

            // Emit refresh event
            let refreshed_market = store.session_market(session_id);
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
                        current_luck: InventoryImpl::calculate_effective_luck(@store, session_id),
                    },
                );
        }
    }
}
