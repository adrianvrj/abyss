use starknet::ContractAddress;

use crate::store::{Store, StoreTrait};

pub const SECONDS_PER_DAY: u64 = 86400;
pub const STREAK_RECOVER_CHIP_COST: u256 = 666_000_000_000_000_000_000;
pub const STREAK_LOOT_CHARM_SESSION_ID_SENTINEL: u32 = 0;

#[inline(always)]
pub fn utc_day_from_timestamp(timestamp: u64) -> u32 {
    (timestamp / SECONDS_PER_DAY).try_into().unwrap()
}

/// Roll is in range 0..100 (exclusive 100 via % 100).
#[inline(always)]
pub fn streak_loot_rarity_from_roll(roll: u32) -> u8 {
    if roll < 60 {
        0
    } else if roll < 90 {
        1
    } else if roll < 98 {
        2
    } else {
        3
    }
}

/// Called after successful `claim_chips` rewards processing (`chips_claimed` set).
pub fn advance_player_streak(ref store: Store, player: ContractAddress, today: u32) {
    let mut ps = store.player_streak(player);

    if ps.recover_prior_count > 0 && today > ps.recover_deadline_day_id {
        ps.recover_prior_count = 0;
        ps.recover_deadline_day_id = 0;
    }

    if ps.streak_count == 7 {
        store.set_player_streak(@ps);
        return;
    }

    if ps.streak_count > 0 && ps.last_increment_day_id == today {
        store.set_player_streak(@ps);
        return;
    }

    let gap = ps.last_increment_day_id != 0
        && today > ps.last_increment_day_id + 1
        && ps.streak_count > 0
        && ps.streak_count < 7;

    if gap {
        ps.recover_prior_count = ps.streak_count;
        ps.recover_deadline_day_id = ps.last_increment_day_id + 2;
        ps.streak_count = 0;
        ps.last_increment_day_id = 0;
    }

    if ps.streak_count == 0 {
        if ps.loot_claim_barrier_day_id != 0 && today <= ps.loot_claim_barrier_day_id {
            store.set_player_streak(@ps);
            return;
        }
        ps.streak_count = 1;
        ps.last_increment_day_id = today;
    } else if today == ps.last_increment_day_id + 1 {
        ps.streak_count = ps.streak_count + 1;
        ps.last_increment_day_id = today;
        assert(ps.streak_count <= 7, 'Streak overflow');
    } else if ps.streak_count > 0 && ps.last_increment_day_id == 0 {
        ps.streak_count = 1;
        ps.last_increment_day_id = today;
    }

    store.set_player_streak(@ps);
}
