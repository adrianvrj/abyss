// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts for Cairo ^2.0.0

const MINTER_ROLE: felt252 = selector!("MINTER_ROLE");

// 10 million tokens with 18 decimals
const MAX_SUPPLY: u256 = 10_000_000_000_000_000_000_000_000;

#[starknet::contract]
mod Chip {
    use openzeppelin::access::accesscontrol::{AccessControlComponent, DEFAULT_ADMIN_ROLE};
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::token::erc20::{ERC20Component, ERC20HooksEmptyImpl};
    use starknet::{ContractAddress, get_caller_address};
    use super::{MAX_SUPPLY, MINTER_ROLE};

    component!(path: ERC20Component, storage: erc20, event: ERC20Event);
    component!(path: AccessControlComponent, storage: accesscontrol, event: AccessControlEvent);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);

    // External
    #[abi(embed_v0)]
    impl ERC20MixinImpl = ERC20Component::ERC20MixinImpl<ContractState>;
    #[abi(embed_v0)]
    impl AccessControlMixinImpl =
        AccessControlComponent::AccessControlMixinImpl<ContractState>;

    // Internal
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

    #[constructor]
    fn constructor(
        ref self: ContractState, default_admin: ContractAddress, minter: ContractAddress,
    ) {
        self.erc20.initializer("Chip", "CHIP");
        self.accesscontrol.initializer();

        self.accesscontrol._grant_role(DEFAULT_ADMIN_ROLE, default_admin);
        self.accesscontrol._grant_role(MINTER_ROLE, default_admin);
        self.accesscontrol._grant_role(MINTER_ROLE, minter);
    }

    #[generate_trait]
    #[abi(per_item)]
    impl ExternalImpl of ExternalTrait {
        #[external(v0)]
        fn mint(ref self: ContractState, recipient: ContractAddress, amount: u256) {
            self.accesscontrol.assert_only_role(MINTER_ROLE);

            // Enforce supply cap
            let current_supply = self.erc20.total_supply();
            assert(current_supply + amount <= MAX_SUPPLY, 'Max supply exceeded');

            self.erc20.mint(recipient, amount);
        }

        #[external(v0)]
        fn burn(ref self: ContractState, amount: u256) {
            // Anyone can burn their own tokens
            let caller = get_caller_address();
            self.erc20.burn(caller, amount);
        }

        #[external(v0)]
        fn max_supply(self: @ContractState) -> u256 {
            MAX_SUPPLY
        }
    }
}
