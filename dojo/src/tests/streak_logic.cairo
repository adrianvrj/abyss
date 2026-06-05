use starknet::ContractAddress;
use crate::helpers::streak::{advance_player_streak_state, recovered_streak_count};
use crate::models::index::PlayerStreak;

fn player() -> ContractAddress {
    0x51.try_into().unwrap()
}

fn empty_streak() -> PlayerStreak {
    PlayerStreak {
        player: player(),
        last_increment_day_id: 0,
        streak_count: 0,
        loot_claim_barrier_day_id: 0,
        recover_prior_count: 0,
        recover_deadline_day_id: 0,
        loot_claim_nonce: 0,
    }
}

#[test]
fn test_first_claim_starts_streak() {
    let ps = advance_player_streak_state(empty_streak(), 100);

    assert(ps.streak_count == 1, 'first claim count');
    assert(ps.last_increment_day_id == 100, 'first claim day');
    assert(ps.recover_prior_count == 0, 'first claim recovery');
}

#[test]
fn test_same_utc_day_does_not_double_count() {
    let ps = advance_player_streak_state(empty_streak(), 100);
    let ps = advance_player_streak_state(ps, 100);

    assert(ps.streak_count == 1, 'same day count');
    assert(ps.last_increment_day_id == 100, 'same day last');
}

#[test]
fn test_next_utc_day_increments_streak() {
    let ps = advance_player_streak_state(empty_streak(), 100);
    let ps = advance_player_streak_state(ps, 101);

    assert(ps.streak_count == 2, 'next day count');
    assert(ps.last_increment_day_id == 101, 'next day last');
}

#[test]
fn test_missing_day_creates_recovery_without_new_streak() {
    let ps = advance_player_streak_state(empty_streak(), 100);
    let ps = advance_player_streak_state(ps, 101);
    let ps = advance_player_streak_state(ps, 102);
    let ps = advance_player_streak_state(ps, 103);
    let ps = advance_player_streak_state(ps, 106);

    assert(ps.streak_count == 0, 'gap pauses streak');
    assert(ps.last_increment_day_id == 0, 'gap clears last');
    assert(ps.recover_prior_count == 4, 'gap recovery count');
    assert(ps.recover_deadline_day_id == 106, 'gap deadline');
}

#[test]
fn test_recovery_counts_returning_qualifying_day() {
    assert(recovered_streak_count(4) == 5, 'recover plus one');
    assert(recovered_streak_count(6) == 7, 'recover caps seven');
    assert(recovered_streak_count(7) == 7, 'recover stays seven');
}

#[test]
fn test_expired_recovery_clears_and_starts_fresh() {
    let mut ps = empty_streak();
    ps.recover_prior_count = 4;
    ps.recover_deadline_day_id = 106;

    let ps = advance_player_streak_state(ps, 107);

    assert(ps.streak_count == 1, 'expired starts fresh');
    assert(ps.last_increment_day_id == 107, 'expired day');
    assert(ps.recover_prior_count == 0, 'expired clears count');
    assert(ps.recover_deadline_day_id == 0, 'expired clears deadline');
}
