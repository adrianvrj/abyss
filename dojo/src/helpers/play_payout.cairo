use crate::constants::CHIP_SCORE_DIVISOR;

#[inline(always)]
pub fn get_total_chip_units(score: u32, bonus_units: u32) -> u32 {
    (score / CHIP_SCORE_DIVISOR) + bonus_units
}

#[inline(always)]
pub fn get_chip_payout_amount(
    score: u32, bonus_units: u32, chip_emission_rate: u32, chip_boost_multiplier: u32,
) -> u256 {
    (get_total_chip_units(score, bonus_units).into()
        * chip_emission_rate.into()
        * chip_boost_multiplier.into())
        * 1_000_000_000_000_000_000
}
