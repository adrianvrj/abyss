use crate::store::{Store, StoreTrait};
// No imports from index needed currently as reported by compiler.
use crate::interfaces::charm_nft::{ICharmDispatcherTrait};
use crate::types::effect::CharmConditionType;
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
    fn get_inventory_pattern_bonuses(store: @Store, session_id: u32) -> (u32, u32, u32, u32, u32) {
        let mut h3: u32 = 0;
        let mut h4: u32 = 0;
        let mut h5: u32 = 0;
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
                    diag += item.effect_value;
                    jp += item.effect_value;
                } else if item.target_symbol == 'horizontal-3' {
                    h3 += item.effect_value;
                } else if item.target_symbol == 'horizontal-4' {
                    h4 += item.effect_value;
                } else if item.target_symbol == 'horizontal-5' {
                    h5 += item.effect_value;
                } else if item.target_symbol == 'diagonal' {
                    diag += item.effect_value;
                } else if item.target_symbol == 'jackpot' {
                    jp += item.effect_value;
                }
            }
            i += 1;
        };
        (h3, h4, h5, diag, jp)
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

    /// Get retrigger bonuses from charms
    fn get_charm_retrigger_bonuses(store: @Store, session_id: u32) -> (u32, u32, u32, u32) {
        let mut h3_retrigger: u32 = 1;
        let mut diag_retrigger: u32 = 1;
        let mut all_retrigger: u32 = 1;
        let mut jackpot_retrigger: u32 = 1;

        let charm_idx = store.session_charms(session_id);
        let charm_disp = store.charm_disp();

        let mut i: u32 = 0;
        while i < charm_idx.count {
            let entry = store.session_charm_entry(session_id, i);
            let charm_id = entry.charm_id;
            let charm_meta = charm_disp.get_charm_type_info(charm_id);

            if charm_id == 19 {
                jackpot_retrigger = 2;
            }

            if charm_meta.effect_type == 8 { // PatternRetrigger
                let retrigger_val = charm_meta.effect_value;
                let pattern_type = charm_meta.effect_value_2;

                if pattern_type == 0 { // All patterns
                    all_retrigger = retrigger_val;
                } else if pattern_type == 1 { // H3
                    h3_retrigger = retrigger_val;
                } else if pattern_type == 3 { // Diagonal
                    diag_retrigger = retrigger_val;
                } else if pattern_type == 5 { // Jackpot
                    jackpot_retrigger = retrigger_val;
                }
            }
            i += 1;
        };

        if all_retrigger > 1 {
            if h3_retrigger < all_retrigger { h3_retrigger = all_retrigger; }
            if diag_retrigger < all_retrigger { diag_retrigger = all_retrigger; }
            if jackpot_retrigger < all_retrigger { jackpot_retrigger = all_retrigger; }
        }

        (h3_retrigger, diag_retrigger, all_retrigger, jackpot_retrigger)
    }

    /// Calculate effective luck for the next spin
    fn calculate_effective_luck(store: @Store, session_id: u32) -> u32 {
        let session = store.session(session_id);
        let mut luck = session.luck;

        let charm_idx = store.session_charms(session_id);
        let charm_disp = store.charm_disp();

        let mut k: u32 = 0;
        while k < charm_idx.count {
            let entry = store.session_charm_entry(session_id, k);
            let charm_id = entry.charm_id;
            let charm_meta = charm_disp.get_charm_type_info(charm_id);

            if charm_id == 12 {
                let last_spin = store.spin_result(session_id);
                luck += (last_spin.patterns_count.into() * 6);
            }

            let condition = charm_meta.condition_type;
            let val = charm_meta.effect_value;

            if condition == CharmConditionType::NoPatternLastSpin {
                let last_spin = store.spin_result(session_id);
                if last_spin.patterns_count == 0 {
                    luck += val;
                }
            } else if condition == CharmConditionType::LowSpinsRemaining {
                if session.spins_remaining <= 2 {
                    luck += val;
                }
            } else if condition == CharmConditionType::PerItemInInventory {
                let items = store.session_item_index(session_id);
                luck += (items.count * val);
            } else if condition == CharmConditionType::LowScore {
                if session.score < 100 {
                    luck += val;
                }
            } else if condition == CharmConditionType::HighLevel {
                if session.level >= 5 {
                    if charm_meta.effect_value_2 > 0 {
                        luck += charm_meta.effect_value_2;
                    } else {
                        luck += val;
                    }
                }
            } else if condition == CharmConditionType::Blocked666 {
                if session.blocked_666_this_session {
                    luck += val;
                }
            }
            k += 1;
        };
        luck
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
