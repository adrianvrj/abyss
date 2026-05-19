use crate::constants::CHIP_UNIT;

const SCORE_TIER_1_CAP: u32 = 12_000;
const SCORE_TIER_2_CAP: u32 = 25_000;
const SCORE_TIER_1_DIVISOR: u32 = 8;
const SCORE_TIER_2_DIVISOR: u32 = 12;
const SCORE_TIER_3_DIVISOR: u32 = 18;
const CHIP_BONUS_UNIT_CAP: u32 = 300;

#[inline(always)]
pub fn get_total_chip_units(score: u32, bonus_units: u32) -> u32 {
    let tier_1_score = if score > SCORE_TIER_1_CAP {
        SCORE_TIER_1_CAP
    } else {
        score
    };
    let tier_2_score = if score > SCORE_TIER_1_CAP {
        if score > SCORE_TIER_2_CAP {
            SCORE_TIER_2_CAP - SCORE_TIER_1_CAP
        } else {
            score - SCORE_TIER_1_CAP
        }
    } else {
        0
    };
    let tier_3_score = if score > SCORE_TIER_2_CAP {
        score - SCORE_TIER_2_CAP
    } else {
        0
    };
    let capped_bonus_units = if bonus_units > CHIP_BONUS_UNIT_CAP {
        CHIP_BONUS_UNIT_CAP
    } else {
        bonus_units
    };

    (tier_1_score / SCORE_TIER_1_DIVISOR)
        + (tier_2_score / SCORE_TIER_2_DIVISOR)
        + (tier_3_score / SCORE_TIER_3_DIVISOR)
        + capped_bonus_units
}

#[inline(always)]
pub fn get_chip_payout_amount(
    score: u32, bonus_units: u32, chip_emission_rate: u32, chip_boost_multiplier: u32,
) -> u256 {
    (get_total_chip_units(score, bonus_units).into()
        * chip_emission_rate.into()
        * chip_boost_multiplier.into())
        * CHIP_UNIT
}

#[inline(always)]
pub fn get_charm_chip_reward_amount(rarity: u8) -> u256 {
    if rarity == 0 {
        60 * CHIP_UNIT
    } else if rarity == 1 {
        240 * CHIP_UNIT
    } else if rarity == 2 {
        800 * CHIP_UNIT
    } else if rarity == 3 {
        1500 * CHIP_UNIT
    } else {
        0
    }
}
