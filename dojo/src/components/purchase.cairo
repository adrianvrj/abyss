#[starknet::component]
pub mod PurchaseComponent {
    use bundle::models::bundle::BundleAssert;
    use dojo::world::WorldStorage;
    use ekubo::components::clear::IClearDispatcherTrait;
    use ekubo::interfaces::erc20::IERC20Dispatcher as EkuboERC20Dispatcher;
    use ekubo::interfaces::router::{IRouterDispatcherTrait, RouteNode, TokenAmount};
    use ekubo::types::i129::i129;
    use ekubo::types::keys::PoolKey;
    use starknet::ContractAddress;
    use crate::interfaces::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};
    use crate::store::{Store, StoreTrait};
    use crate::systems::token::{IChipDispatcher, IChipDispatcherTrait};

    pub const HUNDRED: u256 = 100;

    #[storage]
    pub struct Storage {}

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {}

    fn split_amounts(
        total_amount: u256, burn_percentage: u8, treasury_percentage: u8,
    ) -> (u256, u256, u256) {
        let burn_amount = total_amount * burn_percentage.into() / HUNDRED;
        let treasury_amount = total_amount * treasury_percentage.into() / HUNDRED;
        let team_amount = total_amount - burn_amount - treasury_amount;
        (burn_amount, treasury_amount, team_amount)
    }

    fn swap_and_burn_chip(store: @Store, quote_token: ContractAddress, burn_amount_quote: u256) {
        if burn_amount_quote == 0 {
            return;
        }

        let config = store.config();
        let chip_address = config.chip_token;
        let quote = IERC20Dispatcher { contract_address: quote_token };
        let router = store.ekubo_router();

        quote.transfer(router.contract_address, burn_amount_quote);

        let (token0, token1) = if quote.contract_address < chip_address {
            (quote.contract_address, chip_address)
        } else {
            (chip_address, quote.contract_address)
        };

        let route_node = RouteNode {
            pool_key: PoolKey {
                token0,
                token1,
                fee: config.pool_fee,
                tick_spacing: config.pool_tick_spacing,
                extension: config.pool_extension,
            },
            sqrt_ratio_limit: config.pool_sqrt,
            skip_ahead: 0,
        };
        let token_amount = TokenAmount {
            token: quote.contract_address, amount: i129 { mag: burn_amount_quote.low, sign: false },
        };

        router.swap(route_node, token_amount);

        let clearer = store.ekubo_clearer();
        clearer.clear_minimum(EkuboERC20Dispatcher { contract_address: chip_address }, 0);
        clearer.clear(EkuboERC20Dispatcher { contract_address: quote.contract_address });

        let this = starknet::get_contract_address();
        let chip = store.chip_disp();
        let burn_amount = chip.balance_of(this);
        if burn_amount > 0 {
            let chip_token = IChipDispatcher { contract_address: chip_address };
            chip_token.burn(burn_amount);
        }
    }

    #[generate_trait]
    pub impl InternalImpl<
        TContractState, +HasComponent<TContractState>, +Drop<TContractState>,
    > of PurchaseTrait<TContractState> {
        fn execute(
            ref self: ComponentState<TContractState>,
            world: WorldStorage,
            bundle_id: u32,
            quantity: u32,
        ) {
            let store = StoreTrait::new(world);
            let bundle = store.bundle(bundle_id);
            bundle.assert_does_exist();

            if bundle.price == 0 {
                return;
            }

            let total_amount = bundle.price * quantity.into();
            let config = store.config();
            let (burn_amount_quote, treasury_amount, team_amount) = split_amounts(
                total_amount, config.burn_percentage, config.treasury_percentage,
            );

            swap_and_burn_chip(@store, bundle.payment_token, burn_amount_quote);

            let quote = IERC20Dispatcher { contract_address: bundle.payment_token };
            if treasury_amount > 0 {
                quote.transfer(config.treasury, treasury_amount);
            }
            if team_amount > 0 {
                quote.transfer(config.team, team_amount);
            }
        }
    }

    #[cfg(test)]
    mod tests {
        use super::split_amounts;

        #[test]
        fn split_amounts_follow_requested_percentages() {
            let total_amount: u256 = 1_000;
            let (burn_amount, treasury_amount, team_amount) = split_amounts(total_amount, 50, 30);
            assert_eq!(burn_amount, 500);
            assert_eq!(treasury_amount, 300);
            assert_eq!(team_amount, 200);
        }

        #[test]
        fn split_amounts_assign_rounding_remainder_to_team() {
            let total_amount: u256 = 101;
            let (burn_amount, treasury_amount, team_amount) = split_amounts(total_amount, 50, 30);
            assert_eq!(burn_amount, 50);
            assert_eq!(treasury_amount, 30);
            assert_eq!(team_amount, 21);
            assert_eq!(burn_amount + treasury_amount + team_amount, total_amount);
        }
    }
}
