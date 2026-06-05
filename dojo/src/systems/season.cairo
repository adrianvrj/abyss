use starknet::ContractAddress;
use crate::models::index::SeasonInfo as SeasonModel;

#[inline]
pub fn NAME() -> ByteArray {
    // NOTE: tag is ABYSS-SeasonManager (not "Season") — a stale `ABYSS-Season`
    // *model* is already registered on mainnet from an earlier migration attempt,
    // and a contract can't reuse a tag held by a model. Keep this distinct.
    "SeasonManager"
}

#[starknet::interface]
pub trait ISeason<T> {
    // Called by Play on each competitive score submission. Rolls the season
    // forward if it has ended, records the score into the season's top-3, and
    // returns the active leaderboard id Play should submit the arcade score to.
    fn record_score(ref self: T, session_id: u32, player: ContractAddress, score: u32) -> felt252;
    // Claim a finished season's prize for any top-3 session the caller owns.
    // Pays out all unclaimed winning ranks in a single call.
    fn claim_prize(ref self: T, season_id: u32);
    fn get_active_season(self: @T) -> SeasonModel;
    fn get_season(self: @T, season_id: u32) -> SeasonModel;
}

#[dojo::contract]
pub mod SeasonManager {
    use dojo::world::WorldStorageTrait;
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use crate::constants::{LEADERBOARD_BASE_ID, NAMESPACE, SEASON_DURATION};
    use crate::events::index::PrizeClaimed;
    use crate::helpers::season::{rank_pct, record_top3};
    use crate::interfaces::erc20::IERC20DispatcherTrait;
    use crate::models::index::SeasonInfo as SeasonModel;
    use crate::store::{Store, StoreTrait};
    use crate::systems::play::NAME as PLAY_NAME;
    use super::ISeason;

    #[abi(embed_v0)]
    impl SeasonImpl of ISeason<ContractState> {
        fn record_score(
            ref self: ContractState, session_id: u32, player: ContractAddress, score: u32,
        ) -> felt252 {
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            // Only Play may record scores.
            let play_address = world.dns_address(@PLAY_NAME()).expect('Play not found');
            assert(get_caller_address() == play_address, 'Season: only play');

            let (leaderboard_id, season_id) = roll_season_if_needed(ref store);
            let _ = player; // player resolved from Session on claim; kept for ABI clarity

            let mut season = store.season(season_id);
            if record_top3(ref season, session_id, score) {
                store.set_season(@season);
            }
            leaderboard_id
        }

        fn claim_prize(ref self: ContractState, season_id: u32) {
            let caller = get_caller_address();
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);

            // Apply any pending rollover so a just-ended season is finalizable.
            let (_, _) = roll_season_if_needed(ref store);

            let mut season = store.season(season_id);
            assert(season.finalized, 'Season not finalized');

            let mut total: u256 = 0;
            let mut newly: u8 = 0;
            let mut rank: u8 = 0;
            while rank < 3 {
                let (bit, sid, sscore) = if rank == 0 {
                    (1_u8, season.top1_session, season.top1_score)
                } else if rank == 1 {
                    (2_u8, season.top2_session, season.top2_score)
                } else {
                    (4_u8, season.top3_session, season.top3_score)
                };
                // Skip already-claimed ranks and empty slots.
                if season.claimed_mask & bit == 0 && sscore > 0 {
                    let s = store.session(sid);
                    if s.player_address == caller {
                        total += season.pool_amount * rank_pct(rank) / 100;
                        newly = newly | bit;
                    }
                }
                rank += 1;
            }

            assert(total > 0, 'No prize to claim');

            season.claimed_mask = season.claimed_mask | newly;
            store.set_season(@season);

            let mut config = store.config();
            config.prize_outstanding -= total;
            store.set_config(@config);

            store.quote_disp().transfer(caller, total);
            store
                .emit_prize_claimed(
                    @PrizeClaimed { season_id, player: caller, ranks_mask: newly, amount: total },
                );
        }

        fn get_active_season(self: @ContractState) -> SeasonModel {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            store.season(store.config().current_season_id)
        }

        fn get_season(self: @ContractState, season_id: u32) -> SeasonModel {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            store.season(season_id)
        }
    }

    // Rolls the active season forward if it has ended, snapshotting the finished
    // season's USDC pool, and returns (active leaderboard id, active season id).
    // Hot path (season still running): one Config read, a timestamp compare, and
    // zero writes.
    fn roll_season_if_needed(ref store: Store) -> (felt252, u32) {
        let mut config = store.config();
        let now = starknet::get_block_timestamp();
        if now < config.season_end_ts {
            return (config.active_leaderboard_id, config.current_season_id);
        }

        // Finalize the current season: snapshot its pool as the USDC held by this
        // contract minus what older finished seasons still owe.
        let mut current = store.season(config.current_season_id);
        let usdc = store.quote_disp();
        let balance = usdc.balance_of(get_contract_address());
        let pool = if balance > config.prize_outstanding {
            balance - config.prize_outstanding
        } else {
            0
        };
        current.pool_amount = pool;
        current.finalized = true;
        store.set_season(@current);
        config.prize_outstanding += pool;

        // Start the next season on a fresh leaderboard id.
        let next_id = config.current_season_id + 1;
        let next_lb = LEADERBOARD_BASE_ID + next_id.into();
        let next_end = now + SEASON_DURATION;
        store
            .set_season(
                @SeasonModel {
                    season_id: next_id,
                    leaderboard_id: next_lb,
                    end_ts: next_end,
                    pool_amount: 0,
                    finalized: false,
                    claimed_mask: 0,
                    top1_session: 0,
                    top1_score: 0,
                    top2_session: 0,
                    top2_score: 0,
                    top3_session: 0,
                    top3_score: 0,
                },
            );
        config.current_season_id = next_id;
        config.active_leaderboard_id = next_lb;
        config.season_end_ts = next_end;
        store.set_config(@config);
        (next_lb, next_id)
    }
}
