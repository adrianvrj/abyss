use crate::helpers::patterns::{apply_jackpot_bonus, check_vertical_patterns_with_matches};
use crate::types::symbol::SymbolType;

#[test]
fn test_vertical_pattern_bonus_applies_percentage() {
    let grid = array![
        SymbolType::SEVEN, SymbolType::DIAMOND, SymbolType::CHERRY, SymbolType::COIN,
        SymbolType::LEMON, SymbolType::SEVEN, SymbolType::SEVEN, SymbolType::DIAMOND,
        SymbolType::CHERRY, SymbolType::COIN, SymbolType::SEVEN, SymbolType::LEMON,
        SymbolType::COIN, SymbolType::DIAMOND, SymbolType::CHERRY,
    ];

    let (score, patterns, m7, _, _, _, _) = check_vertical_patterns_with_matches(
        grid.span(), (7, 5, 4, 3, 2), 50,
    );

    assert(score == 63, 'bad vertical bonus score');
    assert(patterns == 1, 'bad vertical pattern count');
    assert(m7 == 1, 'bad seven match count');
}

#[test]
fn test_jackpot_bonus_only_applies_on_jackpot() {
    let boosted = apply_jackpot_bonus(200, true, 50);
    let untouched = apply_jackpot_bonus(200, false, 50);

    assert(boosted == 300, 'bad jackpot bonus');
    assert(untouched == 200, 'bad non-jackpot score');
}
