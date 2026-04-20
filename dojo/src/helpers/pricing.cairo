use starknet::ContractAddress;
use crate::store::{Store, StoreTrait};

const LEGENDARY_RELIC_QUOTE_UNITS: u32 = 60;
const MYTHIC_RELIC_QUOTE_UNITS: u32 = 80;

fn pow10_u256(exp: u32) -> u256 {
    // Match-based lookup covers every ERC20 decimals value we ship against
    // (USDC: 6, most others: 18). Fall back to the iterative path only for
    // unexpected decimals.
    match exp {
        0 => 1,
        1 => 10,
        2 => 100,
        3 => 1_000,
        4 => 10_000,
        5 => 100_000,
        6 => 1_000_000,
        7 => 10_000_000,
        8 => 100_000_000,
        9 => 1_000_000_000,
        10 => 10_000_000_000,
        11 => 100_000_000_000,
        12 => 1_000_000_000_000,
        13 => 10_000_000_000_000,
        14 => 100_000_000_000_000,
        15 => 1_000_000_000_000_000,
        16 => 10_000_000_000_000_000,
        17 => 100_000_000_000_000_000,
        18 => 1_000_000_000_000_000_000,
        _ => {
            let mut result: u256 = 1_000_000_000_000_000_000;
            let mut i: u32 = 18;
            while i != exp {
                result *= 10;
                i += 1;
            }
            result
        },
    }
}

pub fn fixed_quote_amount_from_units(units: u32, quote_decimals: u8) -> u256 {
    units.into() * pow10_u256(quote_decimals.into())
}

pub fn relic_quote_units_for_rarity(rarity: u8) -> u32 {
    assert(rarity == 2 || rarity == 3, 'Unsupported relic rarity');
    if rarity == 2 {
        LEGENDARY_RELIC_QUOTE_UNITS
    } else {
        MYTHIC_RELIC_QUOTE_UNITS
    }
}

#[generate_trait]
pub impl PricingImpl of PricingTrait {
    /// Get the cost of session entry in the configured quote token.
    fn get_usd_cost_in_token(store: @Store, token: ContractAddress) -> u256 {
        let config = store.config();
        let entry_price_usd = config.entry_price_usd;
        if entry_price_usd == 0 {
            return 0;
        }
        assert(token == config.quote_token, 'Unsupported payment token');
        entry_price_usd
    }
}

#[cfg(test)]
mod tests {
    use super::{fixed_quote_amount_from_units, relic_quote_units_for_rarity};

    #[test]
    fn fixed_quote_amount_scales_with_decimals() {
        assert_eq!(fixed_quote_amount_from_units(60, 6), 60_000_000);
        assert_eq!(fixed_quote_amount_from_units(40, 18), 40_000_000_000_000_000_000);
    }

    #[test]
    fn relic_quote_units_match_rarity_policy() {
        assert_eq!(relic_quote_units_for_rarity(2), 60);
        assert_eq!(relic_quote_units_for_rarity(3), 80);
    }
}
