use starknet::ContractAddress;

use crate::models::index::PlayerStreak;

#[inline]
pub fn NAME() -> ByteArray {
    "Streak"
}

#[starknet::interface]
pub trait IStreak<T> {
    fn claim_streak_loot(ref self: T);
    fn recover_streak(ref self: T);
    fn get_player_streak(self: @T, player: ContractAddress) -> PlayerStreak;
}

#[dojo::contract]
pub mod Streak {
    use core::num::traits::Zero;
    use core::poseidon::poseidon_hash_span;
    use starknet::{ContractAddress, get_caller_address, get_contract_address};

    use crate::constants::NAMESPACE;
    use crate::helpers::streak::{
        recovered_streak_count, streak_loot_rarity_from_roll, utc_day_from_timestamp,
        STREAK_LOOT_CHARM_SESSION_ID_SENTINEL, STREAK_RECOVER_CHIP_COST,
    };
    use crate::interfaces::charm_nft::ICharmDispatcherTrait;
    use crate::interfaces::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};
    use crate::models::index::PlayerStreak;
    use crate::store::StoreTrait;
    use crate::systems::token::{IChipDispatcher, IChipDispatcherTrait};
    use super::IStreak;

    #[storage]
    struct Storage {}

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {}

    fn dojo_init(ref self: ContractState) {
        let _ = self.world(@NAMESPACE());
    }

    #[abi(embed_v0)]
    impl StreakImpl of IStreak<ContractState> {
        fn claim_streak_loot(ref self: ContractState) {
            let caller = get_caller_address();
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);

            let mut ps = store.player_streak(caller);
            assert(ps.streak_count == 7, 'No streak loot');

            let config = store.config();
            let zero_addr: ContractAddress = Zero::zero();
            assert(config.charm_nft != zero_addr, 'Charm unset');

            let loot_day = utc_day_from_timestamp(starknet::get_block_timestamp());

            ps.loot_claim_nonce += 1;
            let seed = poseidon_hash_span(
                array![
                    caller.into(),
                    loot_day.into(),
                    ps.loot_claim_nonce.into(),
                    starknet::get_block_timestamp().into(),
                ]
                    .span(),
            );

            let roll_u256: u256 = seed.into();
            let roll: u32 = (roll_u256.low % 100).try_into().unwrap();

            let rarity = streak_loot_rarity_from_roll(roll);

            let charm_disp = store.charm_disp();
            let token_id = charm_disp.mint_random_charm_of_rarity(caller, rarity, seed);

            let charm_meta = charm_disp.get_charm_metadata(token_id);

            ps.streak_count = 0;
            ps.last_increment_day_id = 0;
            ps.loot_claim_barrier_day_id = loot_day;

            store.set_player_streak(@ps);

            store
                .emit_charm_minted(
                    @crate::events::index::CharmMinted {
                        session_id: STREAK_LOOT_CHARM_SESSION_ID_SENTINEL,
                        player: caller,
                        charm_id: charm_meta.charm_id,
                        rarity,
                        token_id,
                    },
                );
        }

        fn recover_streak(ref self: ContractState) {
            let caller = get_caller_address();
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);

            let today = utc_day_from_timestamp(starknet::get_block_timestamp());

            let mut ps = store.player_streak(caller);
            assert(ps.recover_prior_count > 0, 'No recovery');

            assert(today <= ps.recover_deadline_day_id, 'Recovery expired');

            assert(ps.streak_count == 0, 'Recover blocked');

            let config = store.config();

            assert(config.chip_token != Zero::zero(), 'Chip unset');

            let chip_token = IERC20Dispatcher { contract_address: config.chip_token };

            let this = get_contract_address();
            chip_token.transfer_from(caller, this, STREAK_RECOVER_CHIP_COST);

            let chip = IChipDispatcher { contract_address: config.chip_token };
            chip.burn(STREAK_RECOVER_CHIP_COST);

            ps.streak_count = recovered_streak_count(ps.recover_prior_count);
            ps.last_increment_day_id = today;
            ps.recover_prior_count = 0;
            ps.recover_deadline_day_id = 0;

            store.set_player_streak(@ps);
        }

        fn get_player_streak(self: @ContractState, player: ContractAddress) -> PlayerStreak {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            store.player_streak(player)
        }
    }
}
