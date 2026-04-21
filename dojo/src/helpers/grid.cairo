use core::poseidon::hades_permutation;
use crate::types::symbol::SymbolType;

#[inline(always)]
fn poseidon_hash_pair(x: felt252, y: felt252) -> felt252 {
    let (s0, _, _) = hades_permutation(x, y, 2);
    s0
}

/// Generate a slot grid from a VRF random word with luck bias and probability bonuses.
///
/// Returns (grid as 15-element array, is_666, is_jackpot).
pub fn generate_grid_from_random(
    random_word: felt252,
    luck: u32,
    probability_bonuses: (u32, u32, u32, u32, u32),
    coin_probability_penalty: u32,
    probability_666: u32,
) -> (Array<u8>, bool, bool) {
    let mut grid: Array<u8> = array![];
    let mut is_jackpot = true;
    let mut first_symbol: u8 = 0;

    // Cap luck bias at 50% to prevent guaranteed patterns
    let luck_bias_chance: u32 = if luck > 50 {
        50
    } else {
        luck
    };
    let luck_bias_threshold = luck_bias_chance * 1000;

    let (p7, pd, pc, p_coin, pl) = probability_bonuses;
    let prob_seven = 13 + p7;
    let prob_diamond = 15 + pd;
    let prob_cherry = 20 + pc;
    let raw_prob_coin = 25 + p_coin;
    let prob_coin = if coin_probability_penalty >= raw_prob_coin {
        0
    } else {
        raw_prob_coin - coin_probability_penalty
    };
    let prob_lemon = 30 + pl;
    let total_prob = prob_seven + prob_diamond + prob_cherry + prob_coin + prob_lemon;
    let thresh_seven = prob_seven;
    let thresh_diamond = thresh_seven + prob_diamond;
    let thresh_cherry = thresh_diamond + prob_cherry;
    let thresh_coin = thresh_cherry + prob_coin;

    let mut i: u32 = 0;
    while i != 15 {
        let position_seed = poseidon_hash_pair(random_word, i.into());
        let seed_value: u256 = position_seed.into();
        let seed_low: u128 = seed_value.low;

        // Luck bias: chance to copy symbol from adjacent cell
        let mut symbol: u8 = 0;

        if luck_bias_threshold > 0 && i > 0 {
            let luck_window: u32 = (seed_low % 100000).try_into().unwrap();
            if luck_window < luck_bias_threshold {
                let copy_from = get_pattern_neighbor(i);
                symbol = *grid.at(copy_from);
            }
        }

        // If no luck bias applied, use normal random symbol
        if symbol == 0 {
            let symbol_roll: u32 = (seed_low % total_prob.into()).try_into().unwrap();
            symbol =
                if symbol_roll < thresh_seven {
                    SymbolType::SEVEN
                } else if symbol_roll < thresh_diamond {
                    SymbolType::DIAMOND
                } else if symbol_roll < thresh_cherry {
                    SymbolType::CHERRY
                } else if symbol_roll < thresh_coin {
                    SymbolType::COIN
                } else {
                    SymbolType::LEMON
                };
        }

        grid.append(symbol);

        // Track if all symbols are the same (jackpot)
        if i == 0 {
            first_symbol = symbol;
        } else if symbol != first_symbol {
            is_jackpot = false;
        }

        i += 1;
    }

    // Check for 666 based on level probability
    let roll_666_seed = poseidon_hash_pair(random_word, 999.into());
    let roll_666: u256 = roll_666_seed.into();
    let is_666 = (roll_666.low % 1000) < probability_666.into();

    (grid, is_666, is_jackpot)
}

/// Get the best neighbor cell to copy for pattern formation.
/// Grid layout (5x3):
///   [0]  [1]  [2]  [3]  [4]   <- Row 0
///   [5]  [6]  [7]  [8]  [9]   <- Row 1
///   [10] [11] [12] [13] [14]  <- Row 2
pub fn get_pattern_neighbor(index: u32) -> u32 {
    if index == 5 || index == 10 {
        index - 5 // vertical neighbor
    } else if index == 0 {
        0 // first cell
    } else {
        index - 1 // horizontal neighbor
    }
}

/// Forced jackpot (e.g. Mortis): one symbol for all 15 cells, **not** uniform.
/// Weights out of 100: seven 8, diamond 12, cherry 15, coin 25, lemon 40 (lemon highest).
pub fn generate_jackpot_grid(random_word: felt252) -> (Array<u8>, bool, bool) {
    let symbol_roll: u256 = random_word.into();
    let roll: u32 = (symbol_roll.low % 100).try_into().unwrap();
    // Cumulative thresholds on [0, 100)
    let symbol: u8 = if roll < 8 {
        SymbolType::SEVEN
    } else if roll < 20 {
        SymbolType::DIAMOND
    } else if roll < 35 {
        SymbolType::CHERRY
    } else if roll < 60 {
        SymbolType::COIN
    } else {
        SymbolType::LEMON
    };
    let mut grid: Array<u8> = array![];
    let mut i: u32 = 0;
    while i != 15 {
        grid.append(symbol);
        i += 1;
    }
    (grid, false, true)
}

/// Generate a 666 grid (normal grid but forced 666 pattern in middle row).
pub fn generate_666_grid(random_word: felt252) -> (Array<u8>, bool, bool) {
    let mut grid: Array<u8> = array![];
    let mut i: u32 = 0;
    while i != 15 {
        if i == 6 || i == 7 || i == 8 {
            grid.append(SymbolType::SIX);
        } else {
            let symbol_seed = poseidon_hash_pair(random_word, i.into());
            let symbol_roll: u256 = symbol_seed.into();
            let symbol: u8 = ((symbol_roll.low % 8) + 1).try_into().unwrap();
            grid.append(symbol);
        }
        i += 1;
    }
    (grid, true, false)
}

/// Force 666 pattern onto an existing grid (middle row = SIX).
pub fn force_666_pattern(grid: @Array<u8>) -> Array<u8> {
    let mut result: Array<u8> = array![];
    let mut i: u32 = 0;
    while i != 15 {
        if i == 6 || i == 7 || i == 8 {
            result.append(SymbolType::SIX);
        } else {
            result.append(*grid.at(i));
        }
        i += 1;
    }
    result
}
