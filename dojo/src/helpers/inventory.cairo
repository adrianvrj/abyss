use crate::constants::{
    DEFAULT_SCORE_CHERRY, DEFAULT_SCORE_COIN, DEFAULT_SCORE_DIAMOND, DEFAULT_SCORE_LEMON,
    DEFAULT_SCORE_SEVEN,
};
use crate::models::index::Session;
// No imports from index needed currently as reported by compiler.
use crate::helpers::charm_types::{
    calculate_base_luck_from_charm_ids, calculate_effective_luck_from_charm_ids,
    get_charm_retrigger_bonuses_for_ids, get_charm_type_info,
};
use crate::helpers::items::{get_item_diamond_chip_bonus, get_item_runtime_effect};
use crate::store::{Store, StoreTrait};
use crate::types::effect::{CharmConditionType, CharmEffectType, ItemEffectType};

#[derive(Copy, Drop)]
pub struct SpinCycleModifiers {
    pub effective_luck: u32,
    pub base_luck: u32,
    pub item_count: u32,
    pub spin_bonus: u32,
    pub probability_bonuses: (u32, u32, u32, u32, u32),
    pub coin_probability_penalty: u32,
    pub retrigger_bonuses: (u32, u32, u32, u32),
    pub pattern_bonuses: (u32, u32, u32, u32, u32, u32),
    pub symbol_scores: (u32, u32, u32, u32, u32),
    pub direct_score_bonuses: (u32, u32, u32, u32, u32),
    pub diamond_chip_bonus_per_pattern: u32,
    pub pattern_luck_per_pattern: u32,
    pub no_pattern_bonus: u32,
    pub low_spins_bonus: u32,
    pub per_item_bonus: u32,
    pub low_score_bonus: u32,
    pub high_level_bonus: u32,
    pub blocked_666_bonus: u32,
}

#[generate_trait]
pub impl InventoryImpl of InventoryTrait {
    /// Get cumulative direct score bonuses from inventory
    fn get_inventory_scaling_factors(store: @Store, session_id: u32) -> (u32, u32, u32, u32, u32) {
        let mut b7: u32 = 0;
        let mut bd: u32 = 0;
        let mut bc: u32 = 0;
        let mut b_coin: u32 = 0;
        let mut bl: u32 = 0;

        let item_idx = store.session_item_index(session_id);
        let item_count = item_idx.count;
        let mut i: u32 = 0;
        while i != item_count {
            let entry = store.session_item_entry(session_id, i);
            let item = store.item(entry.item_id);

            if item.effect_type == ItemEffectType::DirectScoreBonus {
                if item.target_symbol == 'seven' {
                    b7 += item.effect_value;
                } else if item.target_symbol == 'diamond' {
                    bd += item.effect_value;
                } else if item.target_symbol == 'cherry' {
                    bc += item.effect_value;
                } else if item.target_symbol == 'coin' {
                    b_coin += item.effect_value;
                } else if item.target_symbol == 'lemon' {
                    bl += item.effect_value;
                }
            }
            i += 1;
        }
        (b7, bd, bc, b_coin, bl)
    }

    /// Get effective symbol scores after applying inventory direct score bonuses.
    fn get_effective_symbol_scores(store: @Store, session_id: u32) -> (u32, u32, u32, u32, u32) {
        let (b7, bd, bc, b_coin, bl) = Self::get_inventory_scaling_factors(store, session_id);
        (
            DEFAULT_SCORE_SEVEN + b7,
            DEFAULT_SCORE_DIAMOND + bd,
            DEFAULT_SCORE_CHERRY + bc,
            DEFAULT_SCORE_COIN + b_coin,
            DEFAULT_SCORE_LEMON + bl,
        )
    }

    /// Get cumulative probability bonuses from inventory
    fn get_inventory_probability_bonuses(
        store: @Store, session_id: u32,
    ) -> (u32, u32, u32, u32, u32) {
        let mut p7: u32 = 0;
        let mut pd: u32 = 0;
        let mut pc: u32 = 0;
        let mut p_coin: u32 = 0;
        let mut pl: u32 = 0;
        let mut anti_coin_penalty: u32 = 0;

        let item_idx = store.session_item_index(session_id);
        let item_count = item_idx.count;
        let mut i: u32 = 0;
        while i != item_count {
            let entry = store.session_item_entry(session_id, i);
            let item = store.item(entry.item_id);

            if item.effect_type == ItemEffectType::SymbolProbabilityBoost {
                if item.target_symbol == 'seven' {
                    p7 += item.effect_value;
                } else if item.target_symbol == 'diamond' {
                    pd += item.effect_value;
                } else if item.target_symbol == 'cherry' {
                    pc += item.effect_value;
                } else if item.target_symbol == 'coin' {
                    p_coin += item.effect_value;
                } else if item.target_symbol == 'lemon' {
                    pl += item.effect_value;
                } else if item.target_symbol == 'anti-coin' {
                    anti_coin_penalty += item.effect_value;
                }
            }
            i += 1;
        }
        let adjusted_coin = if anti_coin_penalty >= p_coin { 0 } else { p_coin - anti_coin_penalty };
        (p7, pd, pc, adjusted_coin, pl)
    }

    /// Get pattern multiplier bonuses from inventory
    fn get_inventory_pattern_bonuses(
        store: @Store, session_id: u32,
    ) -> (u32, u32, u32, u32, u32, u32) {
        let mut h3: u32 = 0;
        let mut h4: u32 = 0;
        let mut h5: u32 = 0;
        let mut vert: u32 = 0;
        let mut diag: u32 = 0;
        let mut jp: u32 = 0;

        let item_idx = store.session_item_index(session_id);
        let item_count = item_idx.count;
        let mut i: u32 = 0;
        while i != item_count {
            let entry = store.session_item_entry(session_id, i);
            let item = store.item(entry.item_id);

            if item.effect_type == ItemEffectType::PatternMultiplierBoost {
                if item.target_symbol == '' {
                    h3 += item.effect_value;
                    h4 += item.effect_value;
                    h5 += item.effect_value;
                    vert += item.effect_value;
                    diag += item.effect_value;
                    jp += item.effect_value;
                } else if item.target_symbol == 'horizontal-3' {
                    h3 += item.effect_value;
                } else if item.target_symbol == 'horizontal-4' {
                    h4 += item.effect_value;
                } else if item.target_symbol == 'horizontal-5' {
                    h5 += item.effect_value;
                } else if item.target_symbol == 'vertical' || item.target_symbol == 'vertical-3' {
                    vert += item.effect_value;
                } else if item.target_symbol == 'diagonal' || item.target_symbol == 'diagonal-3' {
                    diag += item.effect_value;
                } else if item.target_symbol == 'jackpot' {
                    jp += item.effect_value;
                }
            }
            i += 1;
        }
        (h3, h4, h5, vert, diag, jp)
    }

    /// Get cumulative spin bonus from inventory
    fn get_inventory_spin_bonus(store: @Store, session_id: u32) -> u32 {
        let mut bonus: u32 = 0;

        let charm_ids = Self::collect_session_charm_ids(store, session_id);
        let charm_count = charm_ids.len();
        let mut j: u32 = 0;
        while j != charm_count {
            let charm_meta = get_charm_type_info(*charm_ids.at(j));
            if charm_meta.effect_type == CharmEffectType::ExtraSpinWithLuck {
                bonus += charm_meta.effect_value;
            }
            j += 1;
        }

        bonus
    }

    fn get_spin_cycle_modifiers(
        store: @Store, session_id: u32, session: @Session,
    ) -> SpinCycleModifiers {
        let session = *session;
        let last_spin = store.spin_result(session_id);
        let item_idx = store.session_item_index(session_id);
        let raw_item_count = item_idx.count;

        let mut b7: u32 = 0;
        let mut bd: u32 = 0;
        let mut bc: u32 = 0;
        let mut b_coin: u32 = 0;
        let mut bl: u32 = 0;
        let mut p7: u32 = 0;
        let mut pd: u32 = 0;
        let mut pc: u32 = 0;
        let mut p_coin: u32 = 0;
        let mut pl: u32 = 0;
        let mut coin_probability_penalty: u32 = 0;
        let mut h3: u32 = 0;
        let mut h4: u32 = 0;
        let mut h5: u32 = 0;
        let mut vert: u32 = 0;
        let mut diag: u32 = 0;
        let mut jp: u32 = 0;
        let mut spin_bonus: u32 = 0;
        let mut diamond_chip_bonus_per_pattern: u32 = 0;

        let mut i: u32 = 0;
        let mut persistent_item_count: u32 = 0;
        while i != raw_item_count {
            let entry = store.session_item_entry(session_id, i);
            let (effect_type, effect_value, target_symbol) = get_item_runtime_effect(entry.item_id);

            if effect_type != ItemEffectType::SpinBonus {
                persistent_item_count += 1;
            }

            if effect_type == ItemEffectType::PatternMultiplierBoost {
                if target_symbol == '' {
                    h3 += effect_value;
                    h4 += effect_value;
                    h5 += effect_value;
                    vert += effect_value;
                    diag += effect_value;
                    jp += effect_value;
                } else if target_symbol == 'horizontal-3' {
                    h3 += effect_value;
                } else if target_symbol == 'horizontal-4' {
                    h4 += effect_value;
                } else if target_symbol == 'horizontal-5' {
                    h5 += effect_value;
                } else if target_symbol == 'vertical' || target_symbol == 'vertical-3' {
                    vert += effect_value;
                } else if target_symbol == 'diagonal' || target_symbol == 'diagonal-3' {
                    diag += effect_value;
                } else if target_symbol == 'jackpot' {
                    jp += effect_value;
                }
            } else if effect_type == ItemEffectType::SymbolProbabilityBoost {
                if target_symbol == 'seven' {
                    p7 += effect_value;
                } else if target_symbol == 'diamond' {
                    pd += effect_value;
                } else if target_symbol == 'cherry' {
                    pc += effect_value;
                } else if target_symbol == 'coin' {
                    p_coin += effect_value;
                } else if target_symbol == 'lemon' {
                    pl += effect_value;
                } else if target_symbol == 'anti-coin' {
                    coin_probability_penalty += effect_value;
                }
            } else if effect_type == ItemEffectType::DirectScoreBonus {
                if target_symbol == 'seven' {
                    b7 += effect_value;
                } else if target_symbol == 'diamond' {
                    bd += effect_value;
                } else if target_symbol == 'cherry' {
                    bc += effect_value;
                } else if target_symbol == 'coin' {
                    b_coin += effect_value;
                } else if target_symbol == 'lemon' {
                    bl += effect_value;
                }
            }

            diamond_chip_bonus_per_pattern += get_item_diamond_chip_bonus(entry.item_id);

            i += 1;
        }

        let charm_idx = store.session_charms(session_id);
        let charm_count = charm_idx.count;
        let mut base_luck: u32 = 0;
        let mut conditional_luck: u32 = 0;
        let mut pattern_luck_per_pattern: u32 = 0;
        let mut no_pattern_bonus: u32 = 0;
        let mut low_spins_bonus: u32 = 0;
        let mut per_item_bonus: u32 = 0;
        let mut low_score_bonus: u32 = 0;
        let mut high_level_bonus: u32 = 0;
        let mut blocked_666_bonus: u32 = 0;
        let mut h3_retrigger: u32 = 1;
        let mut diag_retrigger: u32 = 1;
        let mut all_retrigger: u32 = 1;
        let mut jackpot_retrigger: u32 = 1;

        let mut j: u32 = 0;
        while j != charm_count {
            let charm_id = store.session_charm_entry(session_id, j).charm_id;
            let charm_meta = get_charm_type_info(charm_id);
            let val = charm_meta.effect_value;

            if charm_meta.effect_type == CharmEffectType::LuckBoost {
                base_luck += val;
            } else if charm_meta.effect_type == CharmEffectType::ExtraSpinWithLuck {
                base_luck += charm_meta.effect_value_2;
                spin_bonus += val;
            }

            if charm_id == 19 {
                jackpot_retrigger = 2;
            }

            if charm_meta.effect_type == CharmEffectType::PatternRetrigger {
                let retrigger_val = val;
                let pattern_type = charm_meta.effect_value_2;

                if pattern_type == 0 {
                    all_retrigger = retrigger_val;
                } else if pattern_type == 1 {
                    h3_retrigger = retrigger_val;
                } else if pattern_type == 3 {
                    diag_retrigger = retrigger_val;
                } else if pattern_type == 5 {
                    jackpot_retrigger = retrigger_val;
                }
            }

            if charm_id == 12 {
                pattern_luck_per_pattern += val;
                conditional_luck += last_spin.patterns_count.into() * val;
            }

            if charm_meta.condition_type == CharmConditionType::NoPatternLastSpin {
                no_pattern_bonus += val;
                if last_spin.patterns_count == 0 {
                    conditional_luck += val;
                }
            } else if charm_meta.condition_type == CharmConditionType::LowSpinsRemaining {
                low_spins_bonus += val;
                if session.spins_remaining <= 2 {
                    conditional_luck += val;
                }
            } else if charm_meta.condition_type == CharmConditionType::PerItemInInventory {
                per_item_bonus += val;
                conditional_luck += persistent_item_count * val;
            } else if charm_meta.condition_type == CharmConditionType::LowScore {
                low_score_bonus += val;
                if session.score < 100 {
                    conditional_luck += val;
                }
            } else if charm_meta.condition_type == CharmConditionType::HighLevel {
                let high_level_conditional_bonus =
                    if charm_meta.effect_value_2 > 0 { charm_meta.effect_value_2 } else { val };
                high_level_bonus += high_level_conditional_bonus;
                if session.level >= 5 {
                    conditional_luck += high_level_conditional_bonus;
                }
            } else if charm_meta.condition_type == CharmConditionType::Blocked666 {
                blocked_666_bonus += val;
                if session.blocked_666_this_session {
                    conditional_luck += val;
                }
            }

            j += 1;
        }

        if all_retrigger > 1 {
            if h3_retrigger < all_retrigger {
                h3_retrigger = all_retrigger;
            }
            if diag_retrigger < all_retrigger {
                diag_retrigger = all_retrigger;
            }
        }

        SpinCycleModifiers {
            effective_luck: base_luck + conditional_luck,
            base_luck,
            item_count: persistent_item_count,
            spin_bonus,
            probability_bonuses: (p7, pd, pc, p_coin, pl),
            coin_probability_penalty,
            retrigger_bonuses: (h3_retrigger, diag_retrigger, all_retrigger, jackpot_retrigger),
            pattern_bonuses: (h3, h4, h5, vert, diag, jp),
            symbol_scores: (
                session.score_seven,
                session.score_diamond,
                session.score_cherry,
                session.score_coin,
                session.score_lemon,
            ),
            direct_score_bonuses: (b7, bd, bc, b_coin, bl),
            diamond_chip_bonus_per_pattern,
            pattern_luck_per_pattern,
            no_pattern_bonus,
            low_spins_bonus,
            per_item_bonus,
            low_score_bonus,
            high_level_bonus,
            blocked_666_bonus,
        }
    }

    fn calculate_effective_luck_from_spin_modifiers(
        spin_modifiers: @SpinCycleModifiers,
        last_spin_patterns: u8,
        spins_remaining: u32,
        item_count: u32,
        score: u32,
        level: u32,
        blocked_666_this_session: bool,
    ) -> u32 {
        let spin_modifiers = *spin_modifiers;
        let mut luck =
            spin_modifiers.base_luck
                + last_spin_patterns.into() * spin_modifiers.pattern_luck_per_pattern;

        if last_spin_patterns == 0 {
            luck += spin_modifiers.no_pattern_bonus;
        }
        if spins_remaining <= 2 {
            luck += spin_modifiers.low_spins_bonus;
        }
        luck += item_count * spin_modifiers.per_item_bonus;
        if score < 100 {
            luck += spin_modifiers.low_score_bonus;
        }
        if level >= 5 {
            luck += spin_modifiers.high_level_bonus;
        }
        if blocked_666_this_session {
            luck += spin_modifiers.blocked_666_bonus;
        }

        luck
    }

    fn collect_session_charm_ids(store: @Store, session_id: u32) -> Array<u32> {
        let charm_idx = store.session_charms(session_id);
        let charm_count = charm_idx.count;
        let mut charm_ids: Array<u32> = array![];
        let mut i: u32 = 0;

        while i != charm_count {
            let entry = store.session_charm_entry(session_id, i);
            charm_ids.append(entry.charm_id);
            i += 1;
        }

        charm_ids
    }

    /// Get retrigger bonuses from charms
    fn get_charm_retrigger_bonuses(store: @Store, session_id: u32) -> (u32, u32, u32, u32) {
        let charm_ids = Self::collect_session_charm_ids(store, session_id);
        get_charm_retrigger_bonuses_for_ids(charm_ids.span())
    }

    /// Calculate the persistent/base luck from active charms.
    ///
    /// Conditional luck is intentionally excluded here so it cannot compound
    /// when a spin stores a session snapshot.
    fn calculate_base_luck(store: @Store, session_id: u32) -> u32 {
        let charm_ids = Self::collect_session_charm_ids(store, session_id);
        calculate_base_luck_from_charm_ids(charm_ids.span())
    }

    /// Calculate effective luck for the next spin
    fn calculate_effective_luck(store: @Store, session_id: u32) -> u32 {
        let session = store.session(session_id);
        let last_spin = store.spin_result(session_id);
        let items = store.session_item_index(session_id);
        let charm_ids = Self::collect_session_charm_ids(store, session_id);

        calculate_effective_luck_from_charm_ids(
            charm_ids.span(),
            last_spin.patterns_count,
            session.spins_remaining,
            items.count,
            session.score,
            session.level,
            session.blocked_666_this_session,
        )
    }

    /// Check if player has item in session inventory
    fn has_item_in_inventory(store: @Store, session_id: u32, item_id: u32) -> bool {
        let inv = store.inventory(session_id, item_id);
        inv.quantity > 0
    }

    /// Add an item to inventory
    fn add_item_to_inventory(ref store: Store, session_id: u32, item_id: u32) {
        let mut inv = store.inventory(session_id, item_id);

        if inv.quantity == 0 {
            // New item, add to index
            let mut item_idx = store.session_item_index(session_id);
            assert(item_idx.count < 7, 'Inventory full');

            store
                .set_session_item_entry(
                    @crate::models::index::SessionItemEntry {
                        session_id, index: item_idx.count, item_id,
                    },
                );
            item_idx.count += 1;
            store.set_session_item_index(@item_idx);
        }

        inv.quantity += 1;
        store.set_inventory(@inv);
    }

    /// Check if a charm is already active in the session.
    fn has_charm_in_session(store: @Store, session_id: u32, charm_id: u32) -> bool {
        let charm_idx = store.session_charms(session_id);
        let mut i: u32 = 0;
        while i < charm_idx.count {
            let entry = store.session_charm_entry(session_id, i);
            if entry.charm_id == charm_id {
                return true;
            }
            i += 1;
        }
        false
    }

    /// Add a charm to the active session.
    fn add_charm_to_session(ref store: Store, session_id: u32, charm_id: u32) {
        assert(
            !Self::has_charm_in_session(@store, session_id, charm_id), 'Charm already in session',
        );

        let mut charm_idx = store.session_charms(session_id);
        store
            .set_session_charm_entry(
                @crate::models::index::SessionCharmEntry {
                    session_id, index: charm_idx.count, charm_id,
                },
            );
        charm_idx.count += 1;
        store.set_session_charms(@charm_idx);
    }

    /// Remove a charm from the active session.
    fn remove_charm_from_session(ref store: Store, session_id: u32, charm_id: u32) {
        let mut charm_idx = store.session_charms(session_id);
        let mut found_idx: Option<u32> = Option::None;
        let mut i: u32 = 0;
        while i < charm_idx.count {
            if store.session_charm_entry(session_id, i).charm_id == charm_id {
                found_idx = Option::Some(i);
                break;
            }
            i += 1;
        }

        if let Option::Some(idx) = found_idx {
            let mut j = idx;
            while j < charm_idx.count - 1 {
                let next_charm_id = store.session_charm_entry(session_id, j + 1).charm_id;
                store
                    .set_session_charm_entry(
                        @crate::models::index::SessionCharmEntry {
                            session_id, index: j, charm_id: next_charm_id,
                        },
                    );
                j += 1;
            }
            charm_idx.count -= 1;
            store.set_session_charms(@charm_idx);
        }
    }

    /// Remove one unit of an item from inventory (handles index shifting)
    fn remove_item_from_inventory(ref store: Store, session_id: u32, item_id: u32) {
        let mut inv = store.inventory(session_id, item_id);
        if inv.quantity == 0 {
            return;
        }

        inv.quantity -= 1;
        store.set_inventory(@inv);

        if inv.quantity == 0 {
            // Remove from session_item_entry index
            let mut item_idx = store.session_item_index(session_id);
            let mut found_idx: Option<u32> = Option::None;
            let mut i: u32 = 0;
            while i < item_idx.count {
                if store.session_item_entry(session_id, i).item_id == item_id {
                    found_idx = Option::Some(i);
                    break;
                }
                i += 1;
            }

            if let Option::Some(idx) = found_idx {
                // Shift remaining items
                let mut j = idx;
                while j < item_idx.count - 1 {
                    let next_item_id = store.session_item_entry(session_id, j + 1).item_id;
                    store
                        .set_session_item_entry(
                            @crate::models::index::SessionItemEntry {
                                session_id, index: j, item_id: next_item_id,
                            },
                        );
                    j += 1;
                }
                // Decrement count
                item_idx.count -= 1;
                store.set_session_item_index(@item_idx);
                // Clear the last entry (optional but clean)
            }
        }
    }
}
