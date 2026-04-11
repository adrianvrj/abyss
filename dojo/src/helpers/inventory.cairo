use crate::store::{Store, StoreTrait};
// No imports from index needed currently as reported by compiler.
use crate::helpers::charm_types::{
    calculate_base_luck_from_charm_ids, calculate_effective_luck_from_charm_ids,
    get_charm_retrigger_bonuses_for_ids,
};
use crate::constants::{
    DEFAULT_SCORE_CHERRY, DEFAULT_SCORE_COIN, DEFAULT_SCORE_DIAMOND, DEFAULT_SCORE_LEMON,
    DEFAULT_SCORE_SEVEN,
};

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
        let mut i: u32 = 0;
        while i < item_idx.count {
            let entry = store.session_item_entry(session_id, i);
            let item = store.item(entry.item_id);

            if item.effect_type == 3 { // DirectScoreBonus
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
        };
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
    fn get_inventory_probability_bonuses(store: @Store, session_id: u32) -> (u32, u32, u32, u32, u32) {
        let mut p7: u32 = 0;
        let mut pd: u32 = 0;
        let mut pc: u32 = 0;
        let mut p_coin: u32 = 0;
        let mut pl: u32 = 0;

        let item_idx = store.session_item_index(session_id);
        let mut i: u32 = 0;
        while i < item_idx.count {
            let entry = store.session_item_entry(session_id, i);
            let item = store.item(entry.item_id);

            if item.effect_type == 2 { // SymbolProbabilityBoost
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
                }
            }
            i += 1;
        };
        (p7, pd, pc, p_coin, pl)
    }

    /// Get pattern multiplier bonuses from inventory
    fn get_inventory_pattern_bonuses(store: @Store, session_id: u32) -> (u32, u32, u32, u32, u32, u32) {
        let mut h3: u32 = 0;
        let mut h4: u32 = 0;
        let mut h5: u32 = 0;
        let mut vert: u32 = 0;
        let mut diag: u32 = 0;
        let mut jp: u32 = 0;

        let item_idx = store.session_item_index(session_id);
        let mut i: u32 = 0;
        while i < item_idx.count {
            let entry = store.session_item_entry(session_id, i);
            let item = store.item(entry.item_id);

            if item.effect_type == 1 { // PatternMultiplierBoost
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
        };
        (h3, h4, h5, vert, diag, jp)
    }

    /// Get cumulative spin bonus from inventory
    fn get_inventory_spin_bonus(store: @Store, session_id: u32) -> u32 {
        let mut bonus: u32 = 0;
        let item_idx = store.session_item_index(session_id);
        let mut i: u32 = 0;
        while i < item_idx.count {
            let entry = store.session_item_entry(session_id, i);
            let item = store.item(entry.item_id);
            if item.effect_type == 4 { // SpinBonus
                bonus += item.effect_value;
            }
            i += 1;
        };
        bonus
    }

    fn collect_session_charm_ids(store: @Store, session_id: u32) -> Array<u32> {
        let charm_idx = store.session_charms(session_id);
        let mut charm_ids: Array<u32> = array![];
        let mut i: u32 = 0;

        while i < charm_idx.count {
            let entry = store.session_charm_entry(session_id, i);
            charm_ids.append(entry.charm_id);
            i += 1;
        };

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
            
            store.set_session_item_entry(@crate::models::index::SessionItemEntry {
                session_id, index: item_idx.count, item_id,
            });
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
        };
        false
    }

    /// Add a charm to the active session.
    fn add_charm_to_session(ref store: Store, session_id: u32, charm_id: u32) {
        assert(!Self::has_charm_in_session(@store, session_id, charm_id), 'Charm already in session');

        let mut charm_idx = store.session_charms(session_id);
        store.set_session_charm_entry(@crate::models::index::SessionCharmEntry {
            session_id,
            index: charm_idx.count,
            charm_id,
        });
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
        };

        if let Option::Some(idx) = found_idx {
            let mut j = idx;
            while j < charm_idx.count - 1 {
                let next_charm_id = store.session_charm_entry(session_id, j + 1).charm_id;
                store.set_session_charm_entry(@crate::models::index::SessionCharmEntry {
                    session_id,
                    index: j,
                    charm_id: next_charm_id,
                });
                j += 1;
            };
            charm_idx.count -= 1;
            store.set_session_charms(@charm_idx);
        }
    }

    /// Remove one unit of an item from inventory (handles index shifting)
    fn remove_item_from_inventory(ref store: Store, session_id: u32, item_id: u32) {
        let mut inv = store.inventory(session_id, item_id);
        if inv.quantity == 0 { return; }
        
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
            };

            if let Option::Some(idx) = found_idx {
                // Shift remaining items
                let mut j = idx;
                while j < item_idx.count - 1 {
                    let next_item_id = store.session_item_entry(session_id, j + 1).item_id;
                    store.set_session_item_entry(@crate::models::index::SessionItemEntry {
                        session_id, index: j, item_id: next_item_id,
                    });
                    j += 1;
                };
                // Decrement count
                item_idx.count -= 1;
                store.set_session_item_index(@item_idx);
                // Clear the last entry (optional but clean)
            }
        }
    }
}
