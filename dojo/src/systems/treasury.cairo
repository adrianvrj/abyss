use starknet::ContractAddress;

#[inline]
pub fn NAME() -> ByteArray {
    "Treasury"
}

#[starknet::interface]
pub trait ITreasury<T> {
    fn claim_prize(ref self: T);
    fn add_prize_token(ref self: T, token: ContractAddress);
    fn distribute_prizes(ref self: T);
    fn get_unclaimed_prize(self: @T, address: ContractAddress) -> u256;
}

#[dojo::contract]
pub mod Treasury {

    use openzeppelin::access::accesscontrol::{AccessControlComponent, DEFAULT_ADMIN_ROLE};
    use openzeppelin::introspection::src5::SRC5Component;
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use crate::constants::NAMESPACE;
    use crate::store::{StoreTrait};
    use super::*;

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
    }

    fn dojo_init(ref self: ContractState) {
        self.accesscontrol.initializer();
    }

    #[abi(embed_v0)]
    impl TreasuryImpl of ITreasury<ContractState> {
        fn claim_prize(ref self: ContractState) {
            let _caller = get_caller_address();
            let world = self.world(@NAMESPACE());
            let mut _store = StoreTrait::new(world);

            // TODO: Check leaderboard rank, verify prizes distributed, check not already claimed
            // TODO: Calculate share, transfer tokens
        }

        fn add_prize_token(ref self: ContractState, token: ContractAddress) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);

            let mut pool = store.prize_pool();
            let idx = pool.prize_tokens_count;
            pool.prize_tokens_count += 1;
            store.set_prize_pool(@pool);
            store.set_prize_token(
                @crate::models::index::PrizeToken { index: idx, token_address: token },
            );
        }

        fn distribute_prizes(ref self: ContractState) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut _store = StoreTrait::new(world);

            // TODO: Distribute prize pool to top leaderboard players
        }

        fn get_unclaimed_prize(self: @ContractState, address: ContractAddress) -> u256 {
            // TODO: Calculate actual unclaimed prize based on leaderboard & prize pool
            0
        }
    }
}
