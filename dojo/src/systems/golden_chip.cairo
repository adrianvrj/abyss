use starknet::ContractAddress;

#[inline]
pub fn NAME() -> ByteArray {
    "GoldenChip"
}

#[starknet::interface]
pub trait IGoldenChip<TContractState> {
    fn mint(ref self: TContractState) -> u256;
    fn admin_mint(ref self: TContractState, to: ContractAddress, quantity: u32);
    fn consume_weekly_runs(ref self: TContractState, player: ContractAddress, quantity: u32);
    fn get_available_weekly_runs(self: @TContractState, player: ContractAddress) -> u32;
    fn get_weekly_claimed(self: @TContractState, player: ContractAddress, epoch: u64) -> u32;
    fn get_mint_price(self: @TContractState) -> u256;
    fn get_max_supply(self: @TContractState) -> u32;
    fn set_max_supply(ref self: TContractState, max_supply: u32);
    fn set_base_uri(ref self: TContractState, base_uri: ByteArray);
    fn set_mint_price(ref self: TContractState, price: u256);
}

#[dojo::contract]
pub mod GoldenChip {
    use dojo::world::{IWorldDispatcherTrait, WorldStorageTrait};
    use ekubo::components::clear::IClearDispatcherTrait;
    use ekubo::interfaces::erc20::IERC20Dispatcher as EkuboERC20Dispatcher;
    use ekubo::interfaces::router::{IRouterDispatcherTrait, RouteNode, TokenAmount};
    use ekubo::types::i129::i129;
    use ekubo::types::keys::PoolKey;
    use openzeppelin::access::accesscontrol::{AccessControlComponent, DEFAULT_ADMIN_ROLE};
    use openzeppelin::interfaces::token::erc721::{IERC721, IERC721Metadata};
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::token::erc721::{ERC721Component, ERC721HooksEmptyImpl};
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address};
    use crate::constants::{
        GOLDEN_CHIP_BASE_URI, GOLDEN_CHIP_INITIAL_SUPPLY, GOLDEN_CHIP_MINT_PRICE,
        GOLDEN_CHIP_WEEK_SECONDS, GOLDEN_CHIP_WEEKLY_RUNS, NAMESPACE,
    };
    use crate::interfaces::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};
    use crate::store::StoreTrait;
    use crate::systems::setup::NAME as SETUP_NAME;
    use crate::systems::token::{IChipDispatcher, IChipDispatcherTrait};
    use crate::systems::treasury::NAME as TREASURY_NAME;
    use super::IGoldenChip;

    const HUNDRED: u256 = 100;

    component!(path: ERC721Component, storage: erc721, event: ERC721Event);
    component!(path: AccessControlComponent, storage: accesscontrol, event: AccessControlEvent);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    #[abi(embed_v0)]
    impl AccessControlImpl =
        AccessControlComponent::AccessControlImpl<ContractState>;
    impl AccessControlInternalImpl = AccessControlComponent::InternalImpl<ContractState>;
    impl ERC721StandardImpl = ERC721Component::ERC721Impl<ContractState>;
    impl ERC721InternalImpl = ERC721Component::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc721: ERC721Component::Storage,
        #[substorage(v0)]
        accesscontrol: AccessControlComponent::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        base_uri: ByteArray,
        next_token_id: u64,
        max_supply: u32,
        mint_price: u256,
        weekly_claimed: Map<(ContractAddress, u64), u32>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC721Event: ERC721Component::Event,
        #[flat]
        AccessControlEvent: AccessControlComponent::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
    }

    fn current_epoch() -> u64 {
        starknet::get_block_timestamp() / GOLDEN_CHIP_WEEK_SECONDS
    }

    fn split_amounts(
        total_amount: u256, burn_percentage: u8, treasury_percentage: u8,
    ) -> (u256, u256, u256) {
        let burn_amount = total_amount * burn_percentage.into() / HUNDRED;
        let treasury_amount = total_amount * treasury_percentage.into() / HUNDRED;
        let team_amount = total_amount - burn_amount - treasury_amount;
        (burn_amount, treasury_amount, team_amount)
    }

    fn swap_and_burn_chip(
        ref self: ContractState, quote_token: ContractAddress, burn_amount_quote: u256,
    ) {
        if burn_amount_quote == 0 {
            return;
        }

        let world = self.world(@NAMESPACE());
        let store = StoreTrait::new(world);
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

    fn collect_payment(ref self: ContractState, payer: ContractAddress, amount: u256) {
        if amount == 0 {
            return;
        }

        let world = self.world(@NAMESPACE());
        let store = StoreTrait::new(world);
        let config = store.config();
        let quote_token = config.quote_token;
        let this = starknet::get_contract_address();
        let token = IERC20Dispatcher { contract_address: quote_token };
        let (burn_amount, treasury_amount, team_amount) = split_amounts(
            amount, config.burn_percentage, config.treasury_percentage,
        );

        token.transfer_from(payer, this, amount);
        swap_and_burn_chip(ref self, quote_token, burn_amount);

        if treasury_amount > 0 {
            token.transfer(config.treasury, treasury_amount);
        }
        if team_amount > 0 {
            token.transfer(config.team, team_amount);
        }
    }

    fn mint_to(ref self: ContractState, to: ContractAddress) -> u256 {
        let token_id_u64 = self.next_token_id.read() + 1;
        self.next_token_id.write(token_id_u64);
        let token_id: u256 = token_id_u64.into();
        self.erc721.mint(to, token_id);
        token_id
    }

    fn assert_admin(self: @ContractState) {
        let caller = get_caller_address();
        if self.accesscontrol.has_role(DEFAULT_ADMIN_ROLE, caller) {
            return;
        }

        let world = self.world(@NAMESPACE());
        let store = StoreTrait::new(world);
        assert(caller == store.config().admin, 'Caller is missing role');
    }

    fn dojo_init(ref self: ContractState) {
        let world = self.world(@NAMESPACE());
        self.erc721.initializer("Abyss Golden Chip", "GCHIP", "");
        self.accesscontrol.initializer();

        let treasury_address = world.dns_address(@TREASURY_NAME()).expect('Treasury not found!');
        self.accesscontrol._grant_role(DEFAULT_ADMIN_ROLE, treasury_address);
        self.base_uri.write(GOLDEN_CHIP_BASE_URI());
        self.max_supply.write(GOLDEN_CHIP_INITIAL_SUPPLY);
        self.mint_price.write(GOLDEN_CHIP_MINT_PRICE);

        let this = starknet::get_contract_address();
        let instance_name: felt252 = this.into();
        world
            .dispatcher
            .register_external_contract(
                namespace: NAMESPACE(),
                contract_name: "ERC721",
                instance_name: format!("{}", instance_name),
                contract_address: this,
                block_number: 1,
            );
    }

    #[abi(embed_v0)]
    impl ERC721MetadataImpl of IERC721Metadata<ContractState> {
        fn name(self: @ContractState) -> ByteArray {
            self.erc721.name()
        }

        fn symbol(self: @ContractState) -> ByteArray {
            self.erc721.symbol()
        }

        fn token_uri(self: @ContractState, token_id: u256) -> ByteArray {
            let owner = self.erc721.owner_of(token_id);
            if (owner.into() == 0) {
                return "";
            }

            let base_uri = self.base_uri.read();
            if base_uri.len() == 0 {
                return "";
            }

            let token_id_u64: u64 = token_id.try_into().expect('Invalid token ID');
            let contract_felt: felt252 = starknet::get_contract_address().into();

            base_uri
                + format!("{}", token_id_u64)
                + "?tokenId="
                + format!("{}", token_id_u64)
                + "&contract="
                + format!("{}", contract_felt)
        }
    }

    #[abi(embed_v0)]
    impl GoldenChipImpl of IGoldenChip<ContractState> {
        fn mint(ref self: ContractState) -> u256 {
            let caller = get_caller_address();
            let current_supply: u32 = self.next_token_id.read().try_into().unwrap();
            assert(current_supply < self.max_supply.read(), 'Sold out');

            collect_payment(ref self, caller, self.mint_price.read());
            mint_to(ref self, caller)
        }

        fn admin_mint(ref self: ContractState, to: ContractAddress, quantity: u32) {
            assert_admin(@self);
            assert(quantity > 0, 'Invalid quantity');

            let current_supply: u32 = self.next_token_id.read().try_into().unwrap();
            assert(current_supply + quantity <= self.max_supply.read(), 'Sold out');

            let mut minted = 0;
            loop {
                if minted == quantity {
                    break;
                }
                mint_to(ref self, to);
                minted += 1;
            };
        }

        fn consume_weekly_runs(
            ref self: ContractState, player: ContractAddress, quantity: u32,
        ) {
            let caller = get_caller_address();
            let world = self.world(@NAMESPACE());
            let setup_address = world.dns_address(@SETUP_NAME()).expect('Setup not found!');
            assert(caller == setup_address, 'Only setup can consume');
            assert(quantity > 0, 'Invalid quantity');

            let available = Self::get_available_weekly_runs(@self, player);
            assert(quantity <= available, 'Weekly limit exceeded');

            let epoch = current_epoch();
            let claimed = self.weekly_claimed.entry((player, epoch)).read();
            self.weekly_claimed.entry((player, epoch)).write(claimed + quantity);
        }

        fn get_available_weekly_runs(self: @ContractState, player: ContractAddress) -> u32 {
            if self.erc721.balance_of(player) == 0 {
                return 0;
            }

            let claimed = self.weekly_claimed.entry((player, current_epoch())).read();
            if claimed >= GOLDEN_CHIP_WEEKLY_RUNS {
                0
            } else {
                GOLDEN_CHIP_WEEKLY_RUNS - claimed
            }
        }

        fn get_weekly_claimed(self: @ContractState, player: ContractAddress, epoch: u64) -> u32 {
            self.weekly_claimed.entry((player, epoch)).read()
        }

        fn get_mint_price(self: @ContractState) -> u256 {
            self.mint_price.read()
        }

        fn get_max_supply(self: @ContractState) -> u32 {
            self.max_supply.read()
        }

        fn set_max_supply(ref self: ContractState, max_supply: u32) {
            assert_admin(@self);
            let current_supply: u32 = self.next_token_id.read().try_into().unwrap();
            assert(max_supply >= current_supply, 'Below current supply');
            self.max_supply.write(max_supply);
        }

        fn set_base_uri(ref self: ContractState, base_uri: ByteArray) {
            assert_admin(@self);
            self.base_uri.write(base_uri);
        }

        fn set_mint_price(ref self: ContractState, price: u256) {
            assert_admin(@self);
            self.mint_price.write(price);
        }
    }
}
