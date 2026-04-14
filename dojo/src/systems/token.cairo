use starknet::ContractAddress;

#[inline]
pub fn NAME() -> ByteArray {
    "Chip"
}

const MINTER_ROLE: felt252 = selector!("MINTER_ROLE");

#[starknet::interface]
pub trait IChip<TContractState> {
    fn mint(ref self: TContractState, recipient: ContractAddress, amount: u256);
    fn burn(ref self: TContractState, amount: u256);
}

#[dojo::contract]
pub mod Chip {
    use dojo::world::{IWorldDispatcherTrait, WorldStorageTrait};
    use openzeppelin::access::accesscontrol::{AccessControlComponent, DEFAULT_ADMIN_ROLE};
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::token::erc20::{DefaultConfig, ERC20Component};
    use starknet::{ContractAddress, get_caller_address};
    use crate::constants::{CHIP_TOTAL_SUPPLY, NAMESPACE};
    use crate::interfaces::erc20::IERC20Metadata;
    use crate::systems::play::NAME as PLAY_NAME;
    use crate::systems::treasury::NAME as TREASURY_NAME;
    use super::{IChip, MINTER_ROLE};

    component!(path: ERC20Component, storage: erc20, event: ERC20Event);
    component!(path: AccessControlComponent, storage: accesscontrol, event: AccessControlEvent);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);

    #[abi(embed_v0)]
    impl AccessControlImpl =
        AccessControlComponent::AccessControlImpl<ContractState>;
    #[abi(embed_v0)]
    impl ERC20Impl = ERC20Component::ERC20Impl<ContractState>;
    #[abi(embed_v0)]
    impl ERC20CamelOnlyImpl = ERC20Component::ERC20CamelOnlyImpl<ContractState>;
    impl ERC20InternalImpl = ERC20Component::InternalImpl<ContractState>;
    impl AccessControlInternalImpl = AccessControlComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc20: ERC20Component::Storage,
        #[substorage(v0)]
        accesscontrol: AccessControlComponent::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC20Event: ERC20Component::Event,
        #[flat]
        AccessControlEvent: AccessControlComponent::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
    }

    fn dojo_init(ref self: ContractState) {
        let world = self.world(@NAMESPACE());
        self.erc20.initializer("CHIP", "CHIP");
        self.accesscontrol.initializer();

        let treasury_address = world.dns_address(@TREASURY_NAME()).expect('Treasury not found!');
        let play_address = world.dns_address(@PLAY_NAME()).expect('Play not found!');

        self.accesscontrol._grant_role(DEFAULT_ADMIN_ROLE, treasury_address);
        self.accesscontrol._grant_role(MINTER_ROLE, play_address);

        let this = starknet::get_contract_address();
        let instance_name: felt252 = this.into();
        world
            .dispatcher
            .register_external_contract(
                namespace: NAMESPACE(),
                contract_name: "ERC20",
                instance_name: format!("{}", instance_name),
                contract_address: this,
                block_number: 1,
            );
    }

    impl ERC20HooksImpl of ERC20Component::ERC20HooksTrait<ContractState> {}

    #[abi(embed_v0)]
    impl ERC20MetadataImpl of IERC20Metadata<ContractState> {
        fn name(self: @ContractState) -> felt252 {
            'CHIP'
        }

        fn symbol(self: @ContractState) -> felt252 {
            'CHIP'
        }

        fn decimals(self: @ContractState) -> u8 {
            18
        }
    }

    #[abi(embed_v0)]
    impl ChipImpl of IChip<ContractState> {
        fn mint(ref self: ContractState, recipient: ContractAddress, amount: u256) {
            self.accesscontrol.assert_only_role(MINTER_ROLE);

            // Enforce hard cap
            let total_supply = self.erc20.total_supply();
            assert(total_supply + amount <= CHIP_TOTAL_SUPPLY, 'CHIP: max supply exceeded');

            self.erc20.mint(recipient, amount);
        }

        fn burn(ref self: ContractState, amount: u256) {
            self.erc20.burn(get_caller_address(), amount);
        }
    }
}
