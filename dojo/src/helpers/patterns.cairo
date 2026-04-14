use crate::helpers::scoring::get_score_from_snapshot;
use crate::types::symbol::SymbolType;

#[inline(always)]
pub fn accumulate_symbol_match_counts(
    symbol: u8, count: u32, ref m7: u32, ref md: u32, ref mc: u32, ref m_coin: u32, ref ml: u32,
) {
    if symbol == SymbolType::SEVEN {
        m7 += count;
    } else if symbol == SymbolType::DIAMOND {
        md += count;
    } else if symbol == SymbolType::CHERRY {
        mc += count;
    } else if symbol == SymbolType::COIN {
        m_coin += count;
    } else if symbol == SymbolType::LEMON {
        ml += count;
    }
}

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
    bonuses: (u32, u32, u32) // (h3_bonus, h4_bonus, h5_bonus)
) -> (u32, u8, u8) {
    let (h3_bonus, h4_bonus, h5_bonus) = bonuses;
    let s0 = *g.at(start);
    let s1 = *g.at(start + 1);
    let s2 = *g.at(start + 2);
    let s3 = *g.at(start + 3);
    let s4 = *g.at(start + 4);

    // Check for 5 in a row: points * 5 * 6 = points * 30
    if s0 == s1 && s1 == s2 && s2 == s3 && s3 == s4 {
        let base = get_score_from_snapshot(s0, symbol_scores) * 30;
        return (apply_percentage_bonus(base, h5_bonus), 1, s0);
    }

    // Check for 4 in a row (left-aligned): points * 4 * 3 = points * 12
    if s0 == s1 && s1 == s2 && s2 == s3 {
        let base = get_score_from_snapshot(s0, symbol_scores) * 12;
        return (apply_percentage_bonus(base, h4_bonus), 1, s0);
    }

    if s1 == s2 && s2 == s3 && s3 == s4 {
        let base = get_score_from_snapshot(s1, symbol_scores) * 12;
        return (apply_percentage_bonus(base, h4_bonus), 1, s1);
    }

    // Check for 3 in a row: (points * 3 * 3) / 2 = (points * 9) / 2
    if s0 == s1 && s1 == s2 {
        let base = (get_score_from_snapshot(s0, symbol_scores) * 9) / 2;
        return (apply_percentage_bonus(base, h3_bonus), 1, s0);
    }

    if s1 == s2 && s2 == s3 {
        let base = (get_score_from_snapshot(s1, symbol_scores) * 9) / 2;
        return (apply_percentage_bonus(base, h3_bonus), 1, s1);
    }

    if s2 == s3 && s3 == s4 {
        let base = (get_score_from_snapshot(s2, symbol_scores) * 9) / 2;
        return (apply_percentage_bonus(base, h3_bonus), 1, s2);
    } // Check for 3 in a row: (points * 3 * 3) / 2 = (points * 9) / 2

    (0, 0, 0)
}

/// Check all vertical patterns and track match counts.
pub fn check_vertical_patterns_with_matches(
    g: Span<u8>, symbol_scores: (u32, u32, u32, u32, u32), vert_bonus: u32,
) -> (u32, u8, u32, u32, u32, u32, u32) {
    let mut total_score: u32 = 0;
    let mut patterns_count: u8 = 0;
    let mut m7: u32 = 0;
    let mut md: u32 = 0;
    let mut mc: u32 = 0;
    let mut m_coin: u32 = 0;
    let mut ml: u32 = 0;

    let mut i: u32 = 0;
    while i != 5 {
        let s0 = *g.at(i);
        let s1 = *g.at(i + 5);
        let s2 = *g.at(i + 10);
        if s0 == s1 && s1 == s2 {
            let symbol = s0;
            let base = get_score_from_snapshot(symbol, symbol_scores) * 6;
            total_score += apply_percentage_bonus(base, vert_bonus);
            patterns_count += 1;
            accumulate_symbol_match_counts(symbol, 1, ref m7, ref md, ref mc, ref m_coin, ref ml);
        }
        i += 1;
    }

    (total_score, patterns_count, m7, md, mc, m_coin, ml)
}

/// Check all diagonal patterns and track match counts.
pub fn check_diagonal_patterns_with_matches(
    g: Span<u8>, symbol_scores: (u32, u32, u32, u32, u32), diag_bonus: u32,
) -> (u32, u8, u32, u32, u32, u32, u32) {
    let mut total_score: u32 = 0;
    let mut patterns_count: u8 = 0;
    let mut m7: u32 = 0;
    let mut md: u32 = 0;
    let mut mc: u32 = 0;
    let mut m_coin: u32 = 0;
    let mut ml: u32 = 0;

    // Top-left to bottom-right
    let mut j: u32 = 0;
    while j != 3 {
        let s0 = *g.at(j);
        let s1 = *g.at(j + 6);
        let s2 = *g.at(j + 12);
        if s0 == s1 && s1 == s2 {
            let symbol = s0;
            let base = (get_score_from_snapshot(symbol, symbol_scores) * 15) / 2;
            total_score += apply_percentage_bonus(base, diag_bonus);
            patterns_count += 1;
            accumulate_symbol_match_counts(symbol, 1, ref m7, ref md, ref mc, ref m_coin, ref ml);
        }
        j += 1;
    }

    // Top-right to bottom-left
    let mut k: u32 = 2;
    while k != 5 {
        let s0 = *g.at(k);
        let s1 = *g.at(k + 4);
        let s2 = *g.at(k + 8);
        if s0 == s1 && s1 == s2 {
            let symbol = s0;
            let base = (get_score_from_snapshot(symbol, symbol_scores) * 15) / 2;
            total_score += apply_percentage_bonus(base, diag_bonus);
            patterns_count += 1;
            accumulate_symbol_match_counts(symbol, 1, ref m7, ref md, ref mc, ref m_coin, ref ml);
        }
        k += 1;
    }

    (total_score, patterns_count, m7, md, mc, m_coin, ml)
}
