use core::poseidon::poseidon_hash_span;
use starknet::ContractAddress;
use crate::helpers::play_charm_odds::{
    get_charm_drop_chance_from_score, get_charm_rarity_from_score_and_roll,
};
use crate::helpers::play_payout::{get_charm_chip_reward_amount, get_chip_payout_amount};
use crate::helpers::streak::{advance_player_streak, utc_day_from_timestamp};
use crate::interfaces::charm_nft::ICharmDispatcherTrait;
use crate::interfaces::rewards_vault::IRewardsVaultDispatcherTrait;
use crate::models::index::Session;
use crate::store::{Store, StoreTrait};

pub fn process_end_session_rewards(
    ref store: Store, ref session: Session, session_id: u32, random_word: felt252,
) {
    if !session.is_active && !session.chips_claimed {
        let config = store.config();
        let session_chip_bonus = store.session_chip_bonus(session_id);
        let chip_amount = get_chip_payout_amount(
            session.score,
            session_chip_bonus.bonus_units,
            config.chip_emission_rate,
            config.chip_boost_multiplier,
        );

        if chip_amount > 0 {
            let rewards_vault = store.rewards_vault_disp();
            rewards_vault.pay_gameplay(session.player_address, session_id, chip_amount);
        }

        let zero_addr: ContractAddress = 0.try_into().unwrap();
        if config.charm_nft != zero_addr {
            let total_chance = get_charm_drop_chance_from_score(session.score);

            let charm_seed = poseidon_hash_span(
                array![session_id.into(), random_word, session.player_address.into()].span(),
            );
            let charm_roll_u256: u256 = charm_seed.into();
            let charm_roll_low: u128 = charm_roll_u256.low;
            let charm_roll: u32 = (charm_roll_low % 100).try_into().unwrap();

            if charm_roll < total_chance {
                let rarity_roll: u32 = ((charm_roll_low / 100) % 100).try_into().unwrap();
                let rarity = get_charm_rarity_from_score_and_roll(session.total_score, rarity_roll);

                let charm_disp = store.charm_disp();
                let token_id = charm_disp
                    .mint_random_charm_of_rarity(session.player_address, rarity, charm_seed);
                let charm_meta = charm_disp.get_charm_metadata(token_id);
                let rewards_vault = store.rewards_vault_disp();
                rewards_vault
                    .pay_charm(
                        session.player_address,
                        session_id,
                        rarity,
                        token_id,
                        get_charm_chip_reward_amount(rarity),
                    );
                store
                    .emit_charm_minted(
                        @crate::events::index::CharmMinted {
                            session_id,
                            player: session.player_address,
                            charm_id: charm_meta.charm_id,
                            rarity,
                            token_id,
                        },
                    );
            }
        }

        session.chips_claimed = true;
        let today = utc_day_from_timestamp(starknet::get_block_timestamp());
        advance_player_streak(ref store, session.player_address, today);
    }
}
