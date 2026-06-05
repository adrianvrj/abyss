#[inline]
pub fn NAME() -> ByteArray {
    "Treasury"
}

#[starknet::interface]
pub trait ITreasury<TContractState> {
    fn mint_chip_to_rewards_vault(ref self: TContractState, amount: u256);
}

#[starknet::interface]
trait IAccessControl<TContractState> {
    fn has_role(self: @TContractState, role: felt252, account: starknet::ContractAddress) -> bool;
    fn grant_role(ref self: TContractState, role: felt252, account: starknet::ContractAddress);
}

#[dojo::contract]
pub mod Treasury {
    use dojo::world::WorldStorageTrait;
    use openzeppelin::access::accesscontrol::AccessControlComponent;
    use openzeppelin::introspection::src5::SRC5Component;
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use crate::constants::NAMESPACE;
    use crate::interfaces::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};
    use crate::store::StoreTrait;
    use crate::systems::rewards_vault::NAME as REWARDS_VAULT_NAME;
    use super::{*, IAccessControlDispatcher, IAccessControlDispatcherTrait, ITreasury};

    const CHIP_MINTER_ROLE: felt252 = selector!("MINTER_ROLE");

    component!(path: AccessControlComponent, storage: accesscontrol, event: AccessControlEvent);
    #[abi(embed_v0)]
    impl AccessControlImpl =
        AccessControlComponent::AccessControlImpl<ContractState>;
    impl AccessControlInternalImpl = AccessControlComponent::InternalImpl<ContractState>;
    component!(path: SRC5Component, storage: src5, event: SRC5Event);

    #[storage]
    struct Storage {
        #[substorage(v0)]
        accesscontrol: AccessControlComponent::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        AccessControlEvent: AccessControlComponent::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
        ChipVaultMinted: ChipVaultMinted,
    }

    #[derive(Drop, starknet::Event)]
    struct ChipVaultMinted {
        #[key]
        rewards_vault: ContractAddress,
        amount: u256,
    }

    fn dojo_init(ref self: ContractState) {
        self.accesscontrol.initializer();
    }

    #[abi(embed_v0)]
    impl TreasuryImpl of ITreasury<ContractState> {
        fn mint_chip_to_rewards_vault(ref self: ContractState, amount: u256) {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            let config = store.config();
            let caller = get_caller_address();
            assert(caller == config.admin || caller == config.team, 'Treasury: unauthorized');

            let rewards_vault = world
                .dns_address(@REWARDS_VAULT_NAME())
                .expect('RewardsVault missing');
            let chip_token = config.chip_token;
            let treasury = get_contract_address();

            let access_control = IAccessControlDispatcher { contract_address: chip_token };
            if !access_control.has_role(CHIP_MINTER_ROLE, treasury) {
                access_control.grant_role(CHIP_MINTER_ROLE, treasury);
            }

            let chip = IERC20Dispatcher { contract_address: chip_token };
            chip.mint(rewards_vault, amount);

            self.emit(ChipVaultMinted { rewards_vault, amount });
        }
    }
}
