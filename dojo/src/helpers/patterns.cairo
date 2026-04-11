use crate::helpers::scoring::get_score_from_snapshot;
use crate::types::symbol::SymbolType;

pub fn apply_percentage_bonus(score: u32, bonus: u32) -> u32 {
    score * (100 + bonus) / 100
}

pub fn apply_jackpot_bonus(total_score: u32, is_jackpot: bool, jp_bonus: u32) -> u32 {
    if is_jackpot && jp_bonus > 0 {
        apply_percentage_bonus(total_score, jp_bonus)
    } else {
        total_score
    }
}

/// Check horizontal line (5 cells starting at `start`) for 3/4/5-in-a-row patterns.
/// Returns (score, patterns_count).
pub fn check_horizontal_line(
    g: Span<u8>,
    start: u32,
    symbol_scores: (u32, u32, u32, u32, u32),
    bonuses: (u32, u32, u32), // (h3_bonus, h4_bonus, h5_bonus)
) -> (u32, u8, u8) {
    // Returns (score, patterns, matched_symbol) where matched_symbol is 0 if no match
    let mut score: u32 = 0;
    let mut patterns: u8 = 0;
    let mut matched_symbol: u8 = 0;
    let (h3_bonus, h4_bonus, h5_bonus) = bonuses;

    // Check for 5 in a row: points * 5 * 6 = points * 30
    if *g.at(start) == *g.at(start + 1)
        && *g.at(start + 1) == *g.at(start + 2)
        && *g.at(start + 2) == *g.at(start + 3)
        && *g.at(start + 3) == *g.at(start + 4) {
        let base = get_score_from_snapshot(*g.at(start), symbol_scores) * 30;
        score += apply_percentage_bonus(base, h5_bonus);
        patterns += 1;
        matched_symbol = *g.at(start);
    } // Check for 4 in a row (left-aligned): points * 4 * 3 = points * 12
    else if *g.at(start) == *g.at(start + 1)
        && *g.at(start + 1) == *g.at(start + 2)
        && *g.at(start + 2) == *g.at(start + 3) {
        let base = get_score_from_snapshot(*g.at(start), symbol_scores) * 12;
        score += apply_percentage_bonus(base, h4_bonus);
        patterns += 1;
        matched_symbol = *g.at(start);
    } else if *g.at(start + 1) == *g.at(start + 2)
        && *g.at(start + 2) == *g.at(start + 3)
        && *g.at(start + 3) == *g.at(start + 4) {
        let base = get_score_from_snapshot(*g.at(start + 1), symbol_scores) * 12;
        score += apply_percentage_bonus(base, h4_bonus);
        patterns += 1;
        matched_symbol = *g.at(start + 1);
    } // Check for 3 in a row: (points * 3 * 3) / 2 = (points * 9) / 2
    else if *g.at(start) == *g.at(start + 1) && *g.at(start + 1) == *g.at(start + 2) {
        let base = (get_score_from_snapshot(*g.at(start), symbol_scores) * 9) / 2;
        score += apply_percentage_bonus(base, h3_bonus);
        patterns += 1;
        matched_symbol = *g.at(start);
    } else if *g.at(start + 1) == *g.at(start + 2) && *g.at(start + 2) == *g.at(start + 3) {
        let base = (get_score_from_snapshot(*g.at(start + 1), symbol_scores) * 9) / 2;
        score += apply_percentage_bonus(base, h3_bonus);
        patterns += 1;
        matched_symbol = *g.at(start + 1);
    } else if *g.at(start + 2) == *g.at(start + 3) && *g.at(start + 3) == *g.at(start + 4) {
        let base = (get_score_from_snapshot(*g.at(start + 2), symbol_scores) * 9) / 2;
        score += apply_percentage_bonus(base, h3_bonus);
        patterns += 1;
        matched_symbol = *g.at(start + 2);
    }

    (score, patterns, matched_symbol)
}

/// Check all vertical patterns and track match counts.
pub fn check_vertical_patterns_with_matches(
    g: Span<u8>, symbol_scores: (u32, u32, u32, u32, u32), vert_bonus: u32,
) -> (u32, u8, u32, u32, u32, u32, u32) {
    let mut total_score: u32 = 0;
    let mut patterns_count: u8 = 0;
    let mut m7: u32 = 0; let mut md: u32 = 0; let mut mc: u32 = 0; let mut m_coin: u32 = 0; let mut ml: u32 = 0;

    let mut i: u32 = 0;
    while i < 5 {
        if *g.at(i) == *g.at(i + 5) && *g.at(i + 5) == *g.at(i + 10) {
            let symbol = *g.at(i);
            let base = get_score_from_snapshot(symbol, symbol_scores) * 6;
            total_score += apply_percentage_bonus(base, vert_bonus);
            patterns_count += 1;
            
            if symbol == SymbolType::SEVEN { m7 += 1; }
            else if symbol == SymbolType::DIAMOND { md += 1; }
            else if symbol == SymbolType::CHERRY { mc += 1; }
            else if symbol == SymbolType::COIN { m_coin += 1; }
            else if symbol == SymbolType::LEMON { ml += 1; }
        }
        i += 1;
    };

    (total_score, patterns_count, m7, md, mc, m_coin, ml)
}

/// Check all diagonal patterns and track match counts.
pub fn check_diagonal_patterns_with_matches(
    g: Span<u8>, symbol_scores: (u32, u32, u32, u32, u32), diag_bonus: u32,
) -> (u32, u8, u32, u32, u32, u32, u32) {
    let mut total_score: u32 = 0;
    let mut patterns_count: u8 = 0;
    let mut m7: u32 = 0; let mut md: u32 = 0; let mut mc: u32 = 0; let mut m_coin: u32 = 0; let mut ml: u32 = 0;

    // Top-left to bottom-right
    let mut j: u32 = 0;
    while j < 3 {
        if *g.at(j) == *g.at(j + 6) && *g.at(j + 6) == *g.at(j + 12) {
            let symbol = *g.at(j);
            let base = (get_score_from_snapshot(symbol, symbol_scores) * 15) / 2;
            total_score += apply_percentage_bonus(base, diag_bonus);
            patterns_count += 1;

            if symbol == SymbolType::SEVEN { m7 += 1; }
            else if symbol == SymbolType::DIAMOND { md += 1; }
            else if symbol == SymbolType::CHERRY { mc += 1; }
            else if symbol == SymbolType::COIN { m_coin += 1; }
            else if symbol == SymbolType::LEMON { ml += 1; }
        }
        j += 1;
    };

    // Top-right to bottom-left
    let mut k: u32 = 2;
    while k < 5 {
        if *g.at(k) == *g.at(k + 4) && *g.at(k + 4) == *g.at(k + 8) {
            let symbol = *g.at(k);
            let base = (get_score_from_snapshot(symbol, symbol_scores) * 15) / 2;
            total_score += apply_percentage_bonus(base, diag_bonus);
            patterns_count += 1;

            if symbol == SymbolType::SEVEN { m7 += 1; }
            else if symbol == SymbolType::DIAMOND { md += 1; }
            else if symbol == SymbolType::CHERRY { mc += 1; }
            else if symbol == SymbolType::COIN { m_coin += 1; }
            else if symbol == SymbolType::LEMON { ml += 1; }
        }
        k += 1;
    };

    (total_score, patterns_count, m7, md, mc, m_coin, ml)
}
