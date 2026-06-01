#[inline]
pub fn NAME() -> ByteArray {
    "CharmMarket"
}

// Sale revenue split (percent of listing price).
pub const SALE_BURN_PERCENTAGE: u256 = 5;
pub const SALE_TEAM_PERCENTAGE: u256 = 2;
pub const HUNDRED: u256 = 100;

/// Split a sale `price` into (burn, team, seller) amounts.
/// burn = 5%, team = 2%, seller = remainder (93% + rounding dust).
pub fn compute_sale_split(price: u256) -> (u256, u256, u256) {
    let burn_amount = price * SALE_BURN_PERCENTAGE / HUNDRED;
    let team_amount = price * SALE_TEAM_PERCENTAGE / HUNDRED;
    let seller_amount = price - burn_amount - team_amount;
    (burn_amount, team_amount, seller_amount)
}

#[starknet::interface]
pub trait ICharmMarket<TContractState> {
    /// List an owned charm for sale at `price` (in CHIP wei). Escrows the NFT.
    /// Returns the new listing id.
    fn list_charm(ref self: TContractState, token_id: u256, price: u256) -> u64;
    /// Buy an active listing, paying its price in CHIP. Transfers the charm to the buyer.
    fn buy_charm(ref self: TContractState, listing_id: u64);
    /// Cancel an active listing you own and reclaim the escrowed charm.
    fn cancel_listing(ref self: TContractState, listing_id: u64);
}

#[dojo::contract]
pub mod CharmMarket {
    use dojo::event::EventStorage;
    use dojo::model::ModelStorage;
    use starknet::{get_block_timestamp, get_caller_address, get_contract_address};
    use crate::constants::{NAMESPACE, WORLD_RESOURCE};
    use crate::events::index::{CharmDelisted, CharmListed, CharmSold};
    use crate::interfaces::charm_nft::{ICharmDispatcher, ICharmDispatcherTrait};
    use crate::interfaces::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};
    use crate::interfaces::erc721::{IERC721Dispatcher, IERC721DispatcherTrait};
    use crate::models::index::{CharmListing, CharmMarketState};
    use crate::store::StoreTrait;
    use crate::systems::token::{IChipDispatcher, IChipDispatcherTrait};
    use super::ICharmMarket;

    #[abi(embed_v0)]
    impl CharmMarketImpl of ICharmMarket<ContractState> {
        fn list_charm(ref self: ContractState, token_id: u256, price: u256) -> u64 {
            assert(price > 0, 'Price must be positive');

            let caller = get_caller_address();
            let this = get_contract_address();
            let mut world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            let config = store.config();

            let charm = IERC721Dispatcher { contract_address: config.charm_nft };
            assert(charm.owner_of(token_id) == caller, 'Not charm owner');

            // Resolve the charm type so the UI can render the listing directly.
            let charm_meta = ICharmDispatcher { contract_address: config.charm_nft }
                .get_charm_metadata(token_id);
            assert(charm_meta.charm_id != 0, 'Invalid charm');

            // Escrow the NFT.
            charm.transfer_from(caller, this, token_id);

            let mut market_state: CharmMarketState = world.read_model(WORLD_RESOURCE);
            let listing_id = market_state.next_listing_id + 1;
            market_state.next_listing_id = listing_id;
            market_state.active_count += 1;
            world.write_model(@market_state);

            let listing = CharmListing {
                listing_id,
                seller: caller,
                token_id,
                charm_id: charm_meta.charm_id,
                price,
                active: true,
                created_at: get_block_timestamp(),
            };
            world.write_model(@listing);

            world
                .emit_event(
                    @CharmListed {
                        seller: caller,
                        listing_id,
                        token_id,
                        charm_id: charm_meta.charm_id,
                        price,
                    },
                );

            listing_id
        }

        fn buy_charm(ref self: ContractState, listing_id: u64) {
            let caller = get_caller_address();
            let mut world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            let config = store.config();

            let mut listing: CharmListing = world.read_model(listing_id);
            assert(listing.active, 'Listing not active');
            assert(listing.seller != caller, 'Cannot buy own listing');

            let price = listing.price;
            let chip = IERC20Dispatcher { contract_address: config.chip_token };

            // Pull payment into escrow.
            chip.transfer_from(caller, get_contract_address(), price);

            // Split: burn + team fee, remainder to seller.
            let (burn_amount, team_amount, seller_amount) = super::compute_sale_split(price);

            if burn_amount > 0 {
                IChipDispatcher { contract_address: config.chip_token }.burn(burn_amount);
            }
            if team_amount > 0 {
                chip.transfer(config.team, team_amount);
            }
            if seller_amount > 0 {
                chip.transfer(listing.seller, seller_amount);
            }

            // Release the escrowed charm to the buyer.
            let charm = IERC721Dispatcher { contract_address: config.charm_nft };
            charm.transfer_from(get_contract_address(), caller, listing.token_id);

            listing.active = false;
            world.write_model(@listing);

            let mut market_state: CharmMarketState = world.read_model(WORLD_RESOURCE);
            if market_state.active_count > 0 {
                market_state.active_count -= 1;
                world.write_model(@market_state);
            }

            world
                .emit_event(
                    @CharmSold {
                        buyer: caller,
                        seller: listing.seller,
                        listing_id,
                        token_id: listing.token_id,
                        charm_id: listing.charm_id,
                        price,
                    },
                );
        }

        fn cancel_listing(ref self: ContractState, listing_id: u64) {
            let caller = get_caller_address();
            let mut world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            let config = store.config();

            let mut listing: CharmListing = world.read_model(listing_id);
            assert(listing.active, 'Listing not active');
            assert(listing.seller == caller, 'Not listing owner');

            let charm = IERC721Dispatcher { contract_address: config.charm_nft };
            charm.transfer_from(get_contract_address(), caller, listing.token_id);

            listing.active = false;
            world.write_model(@listing);

            let mut market_state: CharmMarketState = world.read_model(WORLD_RESOURCE);
            if market_state.active_count > 0 {
                market_state.active_count -= 1;
                world.write_model(@market_state);
            }

            world
                .emit_event(
                    @CharmDelisted {
                        seller: caller, listing_id, token_id: listing.token_id,
                    },
                );
        }
    }
}
