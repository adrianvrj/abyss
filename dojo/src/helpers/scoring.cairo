use crate::types::symbol::SymbolType;

/// Get score for a symbol from a snapshot of symbol scores.
pub fn get_score_from_snapshot(symbol: u8, scores: (u32, u32, u32, u32, u32)) -> u32 {
    let (s7, sd, sc, sco, sl) = scores;
    if symbol == SymbolType::SEVEN {
        s7
    } else if symbol == SymbolType::DIAMOND {
        sd
    } else if symbol == SymbolType::CHERRY {
        sc
    } else if symbol == SymbolType::COIN {
        sco
    } else {
        sl
    }
}

/// Calculate symbol score upgrade deltas from scaling factors.
/// Returns (seven_delta, diamond_delta, cherry_delta, coin_delta, lemon_delta).
pub fn get_symbol_upgrade(
    symbol: u8, scaling_factors: (u32, u32, u32, u32, u32),
) -> (u32, u32, u32, u32, u32) {
    let (b7, bd, bc, b_coin, bl) = scaling_factors;
    if symbol == SymbolType::SEVEN && b7 > 0 {
        (b7, 0, 0, 0, 0)
    } else if symbol == SymbolType::DIAMOND && bd > 0 {
        (0, bd, 0, 0, 0)
    } else if symbol == SymbolType::CHERRY && bc > 0 {
        (0, 0, bc, 0, 0)
    } else if symbol == SymbolType::COIN && b_coin > 0 {
        (0, 0, 0, b_coin, 0)
    } else if symbol == SymbolType::LEMON && bl > 0 {
        (0, 0, 0, 0, bl)
    } else {
        (0, 0, 0, 0, 0)
    }
}

/// Get level threshold for a given level.
pub fn get_level_threshold(level: u32) -> u32 {
    if level == 1 { 66 }
    else if level == 2 { 222 }
    else if level == 3 { 333 }
    else if level == 4 { 666 }
    else if level == 5 { 1000 }
    else if level == 6 { 2000 }
    else if level == 7 { 4000 }
    else if level == 8 { 6000 }
    else if level == 9 { 8000 }
    else if level == 10 { 10000 }
    else { 30000 + ((level - 10) * 10000) }
}
