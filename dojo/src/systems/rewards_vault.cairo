#[inline]
pub fn NAME() -> ByteArray {
    "RewardsVault"
}

#[dojo::contract]
pub mod RewardsVault {
    use core::num::traits::Zero;
    use dojo::world::WorldStorageTrait;
    use openzeppelin::access::accesscontrol::{AccessControlComponent, DEFAULT_ADMIN_ROLE};
    use openzeppelin::introspection::src5::SRC5Component;
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use crate::constants::{
        CHARM_REWARD_POOL, GAMEPLAY_REWARD_POOL, NAMESPACE, REWARD_RESERVE_POOL, WORLD_RESOURCE,
    };
    use crate::interfaces::erc20::IERC20DispatcherTrait;
    use crate::interfaces::rewards_vault::IRewardsVault;
    use crate::models::index::RewardPools;
    use crate::store::{Store, StoreTrait};
    use crate::systems::play::NAME as PLAY_NAME;
    use crate::systems::setup::NAME as SETUP_NAME;
    use crate::systems::streak_system::NAME as STREAK_NAME;
    use crate::systems::treasury::NAME as TREASURY_NAME;

    component!(path: AccessControlComponent, storage: accesscontrol, event: AccessControlEvent);
    #[abi(embed_v0)]
    impl AccessControlImpl = AccessControlComponent::AccessControlImpl<ContractState>;
    impl AccessControlInternalImpl = AccessControlComponent::InternalImpl<ContractState>;
    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    #[abi(embed_v0)]
    impl SRC5ExternalImpl = SRC5Component::SRC5Impl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        accesscontrol: AccessControlComponent::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        authorized_callers: Map<ContractAddress, bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        AccessControlEvent: AccessControlComponent::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
        GameplayChipsPaid: GameplayChipsPaid,
        CharmChipsPaid: CharmChipsPaid,
        RewardReserveMoved: RewardReserveMoved,
    }

    #[derive(Drop, starknet::Event)]
    struct GameplayChipsPaid {
        #[key]
        session_id: u32,
        #[key]
        player: ContractAddress,
        calculated_amount: u256,
        paid_amount: u256,
        gameplay_remaining: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct CharmChipsPaid {
        #[key]
        session_id: u32,
        #[key]
        player: ContractAddress,
        rarity: u8,
        token_id: u256,
        calculated_amount: u256,
        paid_amount: u256,
        charm_remaining: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct RewardReserveMoved {
        to_pool: u8,
        amount: u256,
        reserve_remaining: u256,
    }

    fn min_u256(a: u256, b: u256) -> u256 {
        if a < b {
            a
        } else {
            b
        }
    }

    fn token_balance(store: @Store) -> u256 {
        let chip_token = store.chip_disp();
        chip_token.balance_of(get_contract_address())
    }

    fn transfer_reward(store: @Store, player: ContractAddress, amount: u256) {
        if amount > 0 {
            let chip_token = store.chip_disp();
            chip_token.transfer(player, amount);
        }
    }

    fn dojo_init(ref self: ContractState) {
        let world = self.world(@NAMESPACE());
        self.accesscontrol.initializer();

        let setup_address = world.dns_address(@SETUP_NAME()).expect('Setup not found!');
        let treasury_address = world.dns_address(@TREASURY_NAME()).expect('Treasury not found!');
        let play_address = world.dns_address(@PLAY_NAME()).expect('Play not found!');
        let streak_address = world.dns_address(@STREAK_NAME()).expect('Streak not found!');

        self.accesscontrol._grant_role(DEFAULT_ADMIN_ROLE, setup_address);
        self.accesscontrol._grant_role(DEFAULT_ADMIN_ROLE, treasury_address);
        self.authorized_callers.entry(play_address).write(true);
        self.authorized_callers.entry(streak_address).write(true);

        let mut store = StoreTrait::new(world);
        let pools = store.reward_pools();
        if pools.world_resource == 0 {
            store
                .set_reward_pools(
                    @RewardPools {
                        world_resource: WORLD_RESOURCE,
                        gameplay_remaining: GAMEPLAY_REWARD_POOL,
                        charm_remaining: CHARM_REWARD_POOL,
                        reserve_remaining: REWARD_RESERVE_POOL,
                        gameplay_paid: 0,
                        charm_paid: 0,
                    },
                );
        }
    }

    #[abi(embed_v0)]
    impl RewardsVaultImpl of IRewardsVault<ContractState> {
        fn set_reward_pools(
            ref self: ContractState,
            gameplay_remaining: u256,
            charm_remaining: u256,
            reserve_remaining: u256,
        ) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let current = store.reward_pools();
            store
                .set_reward_pools(
                    @RewardPools {
                        world_resource: WORLD_RESOURCE,
                        gameplay_remaining,
                        charm_remaining,
                        reserve_remaining,
                        gameplay_paid: current.gameplay_paid,
                        charm_paid: current.charm_paid,
                    },
                );
        }

        fn move_reward_reserve_to_pool(ref self: ContractState, to_gameplay: bool, amount: u256) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut pools = store.reward_pools();
            assert(pools.reserve_remaining >= amount, 'Insufficient reserve');

            pools.reserve_remaining -= amount;
            let to_pool = if to_gameplay {
                pools.gameplay_remaining += amount;
                0
            } else {
                pools.charm_remaining += amount;
                1
            };
            store.set_reward_pools(@pools);
            self.emit(RewardReserveMoved { to_pool, amount, reserve_remaining: pools.reserve_remaining });
        }

        fn set_authorized_caller(
            ref self: ContractState, caller: ContractAddress, authorized: bool,
        ) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            assert(caller != Zero::zero(), 'Zero caller');
            self.authorized_callers.entry(caller).write(authorized);
        }

        fn pay_gameplay(
            ref self: ContractState,
            player: ContractAddress,
            session_id: u32,
            calculated_amount: u256,
        ) -> u256 {
            let caller = get_caller_address();
            assert(self.authorized_callers.entry(caller).read(), 'Not authorized');
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut pools = store.reward_pools();
            let paid_amount = min_u256(
                min_u256(calculated_amount, pools.gameplay_remaining), token_balance(@store),
            );

            pools.gameplay_remaining -= paid_amount;
            pools.gameplay_paid += paid_amount;
            store.set_reward_pools(@pools);
            transfer_reward(@store, player, paid_amount);
            self
                .emit(
                    GameplayChipsPaid {
                        session_id,
                        player,
                        calculated_amount,
                        paid_amount,
                        gameplay_remaining: pools.gameplay_remaining,
                    },
                );
            paid_amount
        }

        fn pay_charm(
            ref self: ContractState,
            player: ContractAddress,
            session_id: u32,
            rarity: u8,
            token_id: u256,
            calculated_amount: u256,
        ) -> u256 {
            let caller = get_caller_address();
            assert(self.authorized_callers.entry(caller).read(), 'Not authorized');
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut pools = store.reward_pools();
            let paid_amount = min_u256(
                min_u256(calculated_amount, pools.charm_remaining), token_balance(@store),
            );

            pools.charm_remaining -= paid_amount;
            pools.charm_paid += paid_amount;
            store.set_reward_pools(@pools);
            transfer_reward(@store, player, paid_amount);
            self
                .emit(
                    CharmChipsPaid {
                        session_id,
                        player,
                        rarity,
                        token_id,
                        calculated_amount,
                        paid_amount,
                        charm_remaining: pools.charm_remaining,
                    },
                );
            paid_amount
        }

        fn get_reward_pools(self: @ContractState) -> RewardPools {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            store.reward_pools()
        }

        fn get_gameplay_remaining(self: @ContractState) -> u256 {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            store.reward_pools().gameplay_remaining
        }

        fn get_charm_remaining(self: @ContractState) -> u256 {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            store.reward_pools().charm_remaining
        }

        fn get_reserve_remaining(self: @ContractState) -> u256 {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            store.reward_pools().reserve_remaining
        }
    }
}
