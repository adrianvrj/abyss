#[generate_trait]
pub impl SpinnableImpl of SpinnableTrait {
    /// Execute a spin machine cycle.
    /// Handles grid generation and pattern detection/scoring only.
    /// Returns (score, pats_count, is_666, is_jackpot, grid, matches).
    fn execute_spin(
        random_word: felt252,
        luck: u32,
        probability_bonuses: (u32, u32, u32, u32, u32),
        probability_666: u32,
        retrigger_bonuses: (u32, u32, u32, u32),
        pattern_bonuses: (u32, u32, u32, u32, u32, u32),
        symbol_scores: (u32, u32, u32, u32, u32),
        force_jackpot: bool,
    ) -> (u32, u8, bool, bool, Array<u8>, (u32, u32, u32, u32, u32)) {
        // Generate grid
        let (mut grid, is_666, is_jackpot) = if force_jackpot {
            crate::helpers::grid::generate_jackpot_grid(random_word)
        } else {
            crate::helpers::grid::generate_grid_from_random(
                random_word, luck, probability_bonuses, probability_666,
            )
        };

        if is_666 {
            grid = crate::helpers::grid::force_666_pattern(@grid);
        }

        // Calculate score from patterns
        let g = grid.span();
        let (h3_bonus, h4_bonus, h5_bonus, vert_bonus, diag_bonus, jp_bonus) = pattern_bonuses;
        let (h3_retrigger, diag_retrigger, all_retrigger, jackpot_retrigger) = retrigger_bonuses;
        let vert_retrigger = all_retrigger;

        let mut total_score: u32 = 0;
        let mut total_patterns: u8 = 0;
        let mut m7: u32 = 0;
        let mut md: u32 = 0;
        let mut mc: u32 = 0;
        let mut m_coin: u32 = 0;
        let mut ml: u32 = 0;

        // Horizontal patterns (3 rows)
        let h_bonuses = (h3_bonus, h4_bonus, h5_bonus);
        let mut row: u32 = 0;
        while row < 3 {
            let start = row * 5;
            let (score, pats, matched) = crate::helpers::patterns::check_horizontal_line(
                g, start, symbol_scores, h_bonuses,
            );
            total_score += score * h3_retrigger;
            total_patterns += pats;

            // Track matches for upgrades
            if matched == crate::types::symbol::SymbolType::SEVEN {
                m7 += pats.into();
            } else if matched == crate::types::symbol::SymbolType::DIAMOND {
                md += pats.into();
            } else if matched == crate::types::symbol::SymbolType::CHERRY {
                mc += pats.into();
            } else if matched == crate::types::symbol::SymbolType::COIN {
                m_coin += pats.into();
            } else if matched == crate::types::symbol::SymbolType::LEMON {
                ml += pats.into();
            }

            row += 1;
        }

        // Vertical patterns
        let (v_score, v_pats, vm7, vmd, vmc, vm_coin, vml) =
            crate::helpers::patterns::check_vertical_patterns_with_matches(
            g, symbol_scores, vert_bonus,
        );
        total_score += v_score * vert_retrigger;
        total_patterns += v_pats;
        m7 += vm7;
        md += vmd;
        mc += vmc;
        m_coin += vm_coin;
        ml += vml;

        // Diagonal patterns
        let (d_score, d_pats, dm7, dmd, dmc, dm_coin, dml) =
            crate::helpers::patterns::check_diagonal_patterns_with_matches(
            g, symbol_scores, diag_bonus,
        );
        total_score += d_score * diag_retrigger;
        total_patterns += d_pats;
        m7 += dm7;
        md += dmd;
        mc += dmc;
        m_coin += dm_coin;
        ml += dml;

        total_score =
            crate::helpers::patterns::apply_jackpot_bonus(total_score, is_jackpot, jp_bonus);

        // Jackpot retrigger (multiplayer only apply if jackpot)
        if jackpot_retrigger > 1 && is_jackpot {
            total_score = total_score * jackpot_retrigger;
        }

        (total_score, total_patterns, is_666, is_jackpot, grid, (m7, md, mc, m_coin, ml))
    }
}
