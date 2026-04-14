use crate::components::spinnable::SpinnableImpl;
use crate::helpers::grid::generate_grid_from_random;

const PROFILE_ITERATIONS: u32 = 48;

#[test]
fn profile_execute_spin_hot_path() {
    let probability_bonuses = (8, 5, 3, 2, 1);
    let retrigger_bonuses = (2, 2, 2, 1);
    let pattern_bonuses = (25, 40, 75, 30, 35, 50);
    let symbol_scores = (7, 5, 4, 3, 2);

    let mut checksum: felt252 = 0;
    let mut i: u32 = 0;
    while i != PROFILE_ITERATIONS {
        let random_word: felt252 = (0xAB55_u32 + i).into();
        let (score, patterns, is_666, is_jackpot, grid, matches) = SpinnableImpl::execute_spin(
            random_word,
            24,
            probability_bonuses,
            18,
            retrigger_bonuses,
            pattern_bonuses,
            symbol_scores,
            false,
        );

        let (m7, md, mc, m_coin, ml) = matches;
        checksum += score.into();
        checksum += patterns.into();
        checksum += (*grid.at(0)).into();
        checksum += (*grid.at(7)).into();
        checksum += (*grid.at(14)).into();
        checksum += m7.into() + md.into() + mc.into() + m_coin.into() + ml.into();

        if is_666 {
            checksum += 17;
        }
        if is_jackpot {
            checksum += 31;
        }

        i += 1;
    }

    assert(checksum != 0, 'spin profile guard');
}

#[test]
fn profile_generate_grid_hot_path() {
    let probability_bonuses = (8, 5, 3, 2, 1);

    let mut checksum: felt252 = 0;
    let mut i: u32 = 0;
    while i != PROFILE_ITERATIONS {
        let random_word: felt252 = (0xC011EC7_u32 + i).into();
        let (grid, is_666, is_jackpot) = generate_grid_from_random(
            random_word, 24, probability_bonuses, 18,
        );

        checksum += (*grid.at(0)).into();
        checksum += (*grid.at(4)).into();
        checksum += (*grid.at(8)).into();
        checksum += (*grid.at(14)).into();

        if is_666 {
            checksum += 13;
        }
        if is_jackpot {
            checksum += 29;
        }

        i += 1;
    }

    assert(checksum != 0, 'grid profile guard');
}
