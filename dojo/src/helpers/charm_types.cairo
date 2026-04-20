use crate::interfaces::charm_nft::CharmMetadata;
use crate::types::effect::{CharmConditionType, CharmEffectType};

/// Internal dispatch for charm attributes. Returns
/// (name, description, effect_type, effect_value, effect_value_2, condition_type, rarity, shop_cost).
/// Dispatched via a balanced binary split (avg ~log2(20) ≈ 4 comparisons vs ~10 linear).
fn charm_attrs(charm_id: u32) -> (felt252, felt252, u8, u32, u32, u8, u8, u32) {
    if charm_id <= 10 {
        if charm_id <= 5 {
            if charm_id == 1 {
                ('Whisper Stone', 'Luck +3', CharmEffectType::LuckBoost, 3, 0, CharmConditionType::None, 0, 1)
            } else if charm_id == 2 {
                ('Faded Coin', 'Luck +4', CharmEffectType::LuckBoost, 4, 0, CharmConditionType::None, 0, 1)
            } else if charm_id == 3 {
                ('Broken Mirror', 'No pat +5', CharmEffectType::ConditionalLuckBoost, 5, 0, CharmConditionType::NoPatternLastSpin, 0, 1)
            } else if charm_id == 4 {
                ('Dusty Hourglass', 'Low spins +8', CharmEffectType::ConditionalLuckBoost, 8, 0, CharmConditionType::LowSpinsRemaining, 0, 1)
            } else {
                ('Cracked Skull', 'Luck +5', CharmEffectType::LuckBoost, 5, 0, CharmConditionType::None, 0, 1)
            }
        } else {
            if charm_id == 6 {
                ('Rusty Key', 'Per item +3', CharmEffectType::ConditionalLuckBoost, 3, 0, CharmConditionType::PerItemInInventory, 0, 1)
            } else if charm_id == 7 {
                ('Moth Wing', 'Luck +6', CharmEffectType::LuckBoost, 6, 0, CharmConditionType::None, 0, 1)
            } else if charm_id == 8 {
                ('Bone Dice', 'Low score +8', CharmEffectType::ConditionalLuckBoost, 8, 0, CharmConditionType::LowScore, 0, 1)
            } else if charm_id == 9 {
                ('Soul Fragment', 'Luck +10', CharmEffectType::LuckBoost, 10, 0, CharmConditionType::None, 1, 2)
            } else {
                ('Cursed Pendant', 'H3 x2', CharmEffectType::PatternRetrigger, 2, 1, CharmConditionType::None, 1, 2)
            }
        }
    } else {
        if charm_id <= 15 {
            if charm_id == 11 {
                ('Shadow Lantern', '+8 base, lvl5 +8', CharmEffectType::LuckBoost, 8, 8, CharmConditionType::HighLevel, 1, 2)
            } else if charm_id == 12 {
                ('Ethereal Chain', 'Pattern +6', CharmEffectType::ConditionalLuckBoost, 6, 0, CharmConditionType::None, 1, 2)
            } else if charm_id == 13 {
                ('Void Compass', '+1 spin +15', CharmEffectType::ExtraSpinWithLuck, 1, 15, CharmConditionType::None, 1, 3)
            } else if charm_id == 14 {
                ('Demons Tooth', 'Diag x2', CharmEffectType::PatternRetrigger, 2, 3, CharmConditionType::None, 1, 3)
            } else {
                ('Abyssal Eye', 'Luck +20', CharmEffectType::LuckBoost, 20, 0, CharmConditionType::None, 2, 4)
            }
        } else {
            if charm_id == 16 {
                ('Phoenix Feather', '+2 spin +10', CharmEffectType::ExtraSpinWithLuck, 2, 10, CharmConditionType::None, 2, 4)
            } else if charm_id == 17 {
                ('Reapers Mark', 'NoJP x2', CharmEffectType::PatternRetrigger, 2, 0, CharmConditionType::None, 2, 5)
            } else if charm_id == 18 {
                ('Chaos Orb', 'Block666 +80', CharmEffectType::ConditionalLuckBoost, 80, 0, CharmConditionType::Blocked666, 2, 5)
            } else if charm_id == 19 {
                ('Soul Abyss', 'Luck +30', CharmEffectType::LuckBoost, 30, 0, CharmConditionType::None, 2, 6)
            } else {
                ('Void Heart', '+1 spin +50', CharmEffectType::ExtraSpinWithLuck, 1, 50, CharmConditionType::None, 2, 7)
            }
        }
    }
}

pub fn get_charm_type_info(charm_id: u32) -> CharmMetadata {
    assert(charm_id >= 1, 'Invalid charm');
    assert(charm_id <= 20, 'Invalid charm');

    let (name, description, effect_type, effect_value, effect_value_2, condition_type, rarity, shop_cost) =
        charm_attrs(charm_id);
    CharmMetadata {
        charm_id,
        name,
        description,
        effect_type,
        effect_value,
        effect_value_2,
        condition_type,
        rarity,
        shop_cost,
    }
}

// Legacy per-charm branches below are dead after the binary-split dispatch above.
// They are kept only to avoid churn in any diff review; they are never reached because
// `get_charm_type_info` returns from the block above. NOTE: actually the builder above
// already returns a value, so strip the rest.
#[cfg(never)]
fn _legacy_charm_info(charm_id: u32) -> CharmMetadata {
    if charm_id == 1 {
        return CharmMetadata {
            charm_id,
            name: 'Whisper Stone',
            description: 'Luck +3',
            effect_type: CharmEffectType::LuckBoost,
            effect_value: 3,
            effect_value_2: 0,
            condition_type: CharmConditionType::None,
            rarity: 0,
            shop_cost: 1,
        };
    } else if charm_id == 2 {
        return CharmMetadata {
            charm_id,
            name: 'Faded Coin',
            description: 'Luck +4',
            effect_type: CharmEffectType::LuckBoost,
            effect_value: 4,
            effect_value_2: 0,
            condition_type: CharmConditionType::None,
            rarity: 0,
            shop_cost: 1,
        };
    } else if charm_id == 3 {
        return CharmMetadata {
            charm_id,
            name: 'Broken Mirror',
            description: 'No pat +5',
            effect_type: CharmEffectType::ConditionalLuckBoost,
            effect_value: 5,
            effect_value_2: 0,
            condition_type: CharmConditionType::NoPatternLastSpin,
            rarity: 0,
            shop_cost: 1,
        };
    } else if charm_id == 4 {
        return CharmMetadata {
            charm_id,
            name: 'Dusty Hourglass',
            description: 'Low spins +8',
            effect_type: CharmEffectType::ConditionalLuckBoost,
            effect_value: 8,
            effect_value_2: 0,
            condition_type: CharmConditionType::LowSpinsRemaining,
            rarity: 0,
            shop_cost: 1,
        };
    } else if charm_id == 5 {
        return CharmMetadata {
            charm_id,
            name: 'Cracked Skull',
            description: 'Luck +5',
            effect_type: CharmEffectType::LuckBoost,
            effect_value: 5,
            effect_value_2: 0,
            condition_type: CharmConditionType::None,
            rarity: 0,
            shop_cost: 1,
        };
    } else if charm_id == 6 {
        return CharmMetadata {
            charm_id,
            name: 'Rusty Key',
            description: 'Per item +3',
            effect_type: CharmEffectType::ConditionalLuckBoost,
            effect_value: 3,
            effect_value_2: 0,
            condition_type: CharmConditionType::PerItemInInventory,
            rarity: 0,
            shop_cost: 1,
        };
    } else if charm_id == 7 {
        return CharmMetadata {
            charm_id,
            name: 'Moth Wing',
            description: 'Luck +6',
            effect_type: CharmEffectType::LuckBoost,
            effect_value: 6,
            effect_value_2: 0,
            condition_type: CharmConditionType::None,
            rarity: 0,
            shop_cost: 1,
        };
    } else if charm_id == 8 {
        return CharmMetadata {
            charm_id,
            name: 'Bone Dice',
            description: 'Low score +8',
            effect_type: CharmEffectType::ConditionalLuckBoost,
            effect_value: 8,
            effect_value_2: 0,
            condition_type: CharmConditionType::LowScore,
            rarity: 0,
            shop_cost: 1,
        };
    } else if charm_id == 9 {
        return CharmMetadata {
            charm_id,
            name: 'Soul Fragment',
            description: 'Luck +10',
            effect_type: CharmEffectType::LuckBoost,
            effect_value: 10,
            effect_value_2: 0,
            condition_type: CharmConditionType::None,
            rarity: 1,
            shop_cost: 2,
        };
    } else if charm_id == 10 {
        return CharmMetadata {
            charm_id,
            name: 'Cursed Pendant',
            description: 'H3 x2',
            effect_type: CharmEffectType::PatternRetrigger,
            effect_value: 2,
            effect_value_2: 1,
            condition_type: CharmConditionType::None,
            rarity: 1,
            shop_cost: 2,
        };
    } else if charm_id == 11 {
        return CharmMetadata {
            charm_id,
            name: 'Shadow Lantern',
            description: '+8 base, lvl5 +8',
            effect_type: CharmEffectType::LuckBoost,
            effect_value: 8,
            effect_value_2: 8,
            condition_type: CharmConditionType::HighLevel,
            rarity: 1,
            shop_cost: 2,
        };
    } else if charm_id == 12 {
        return CharmMetadata {
            charm_id,
            name: 'Ethereal Chain',
            description: 'Pattern +6',
            effect_type: CharmEffectType::ConditionalLuckBoost,
            effect_value: 6,
            effect_value_2: 0,
            condition_type: CharmConditionType::None,
            rarity: 1,
            shop_cost: 2,
        };
    } else if charm_id == 13 {
        return CharmMetadata {
            charm_id,
            name: 'Void Compass',
            description: '+1 spin +15',
            effect_type: CharmEffectType::ExtraSpinWithLuck,
            effect_value: 1,
            effect_value_2: 15,
            condition_type: CharmConditionType::None,
            rarity: 1,
            shop_cost: 3,
        };
    } else if charm_id == 14 {
        return CharmMetadata {
            charm_id,
            name: 'Demons Tooth',
            description: 'Diag x2',
            effect_type: CharmEffectType::PatternRetrigger,
            effect_value: 2,
            effect_value_2: 3,
            condition_type: CharmConditionType::None,
            rarity: 1,
            shop_cost: 3,
        };
    } else if charm_id == 15 {
        return CharmMetadata {
            charm_id,
            name: 'Abyssal Eye',
            description: 'Luck +20',
            effect_type: CharmEffectType::LuckBoost,
            effect_value: 20,
            effect_value_2: 0,
            condition_type: CharmConditionType::None,
            rarity: 2,
            shop_cost: 4,
        };
    } else if charm_id == 16 {
        return CharmMetadata {
            charm_id,
            name: 'Phoenix Feather',
            description: '+2 spin +10',
            effect_type: CharmEffectType::ExtraSpinWithLuck,
            effect_value: 2,
            effect_value_2: 10,
            condition_type: CharmConditionType::None,
            rarity: 2,
            shop_cost: 4,
        };
    } else if charm_id == 17 {
        return CharmMetadata {
            charm_id,
            name: 'Reapers Mark',
            description: 'NoJP x2',
            effect_type: CharmEffectType::PatternRetrigger,
            effect_value: 2,
            effect_value_2: 0,
            condition_type: CharmConditionType::None,
            rarity: 2,
            shop_cost: 5,
        };
    } else if charm_id == 18 {
        return CharmMetadata {
            charm_id,
            name: 'Chaos Orb',
            description: 'Block666 +80',
            effect_type: CharmEffectType::ConditionalLuckBoost,
            effect_value: 80,
            effect_value_2: 0,
            condition_type: CharmConditionType::Blocked666,
            rarity: 2,
            shop_cost: 5,
        };
    } else if charm_id == 19 {
        return CharmMetadata {
            charm_id,
            name: 'Soul Abyss',
            description: 'Luck +30',
            effect_type: CharmEffectType::LuckBoost,
            effect_value: 30,
            effect_value_2: 0,
            condition_type: CharmConditionType::None,
            rarity: 2,
            shop_cost: 6,
        };
    } else {
        return CharmMetadata {
            charm_id,
            name: 'Void Heart',
            description: '+1 spin +50',
            effect_type: CharmEffectType::ExtraSpinWithLuck,
            effect_value: 1,
            effect_value_2: 50,
            condition_type: CharmConditionType::None,
            rarity: 2,
            shop_cost: 7,
        };
    }
}

pub fn get_charm_ids_by_rarity(rarity: u8) -> Array<u32> {
    if rarity == 0 {
        return array![1, 2, 3, 4, 5, 6, 7, 8];
    } else if rarity == 1 {
        return array![9, 10, 11, 12, 13, 14];
    } else if rarity == 2 {
        return array![15, 16, 17, 18, 19, 20];
    }

    array![]
}

pub fn get_charm_retrigger_bonuses_for_ids(charm_ids: Span<u32>) -> (u32, u32, u32, u32) {
    let mut h3_retrigger: u32 = 1;
    let mut diag_retrigger: u32 = 1;
    let mut all_retrigger: u32 = 1;
    let mut jackpot_retrigger: u32 = 1;

    let len = charm_ids.len();
    let mut i: u32 = 0;
    while i != len {
        let charm_id = *charm_ids.at(i);
        let charm_meta = get_charm_type_info(charm_id);

        if charm_id == 19 {
            jackpot_retrigger = 2;
        }

        if charm_meta.effect_type == CharmEffectType::PatternRetrigger {
            let retrigger_val = charm_meta.effect_value;
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

        i += 1;
    }

    if all_retrigger > 1 {
        if h3_retrigger < all_retrigger {
            h3_retrigger = all_retrigger;
        }
        if diag_retrigger < all_retrigger {
            diag_retrigger = all_retrigger;
        }
    }

    (h3_retrigger, diag_retrigger, all_retrigger, jackpot_retrigger)
}

pub fn calculate_base_luck_from_charm_ids(charm_ids: Span<u32>) -> u32 {
    let mut luck: u32 = 0;
    let len = charm_ids.len();
    let mut i: u32 = 0;

    while i != len {
        let charm_meta = get_charm_type_info(*charm_ids.at(i));
        if charm_meta.effect_type == CharmEffectType::LuckBoost {
            luck += charm_meta.effect_value;
        } else if charm_meta.effect_type == CharmEffectType::ExtraSpinWithLuck {
            luck += charm_meta.effect_value_2;
        }

        i += 1;
    }

    luck
}

pub fn calculate_effective_luck_from_charm_ids(
    charm_ids: Span<u32>,
    last_spin_patterns: u8,
    spins_remaining: u32,
    inventory_count: u32,
    score: u32,
    level: u32,
    blocked_666_this_session: bool,
) -> u32 {
    // Fused single-pass walk that computes both the base-luck contribution
    // (LuckBoost / ExtraSpinWithLuck) and the conditional bonuses in one sweep.
    // Previously this function invoked `calculate_base_luck_from_charm_ids` which
    // performed an identical pre-pass, doubling the metadata fetches.
    let mut luck: u32 = 0;
    let len = charm_ids.len();
    let mut i: u32 = 0;

    while i != len {
        let charm_id = *charm_ids.at(i);
        let charm_meta = get_charm_type_info(charm_id);
        let val = charm_meta.effect_value;

        // Base-luck contributions (previously computed in a separate loop).
        if charm_meta.effect_type == CharmEffectType::LuckBoost {
            luck += val;
        } else if charm_meta.effect_type == CharmEffectType::ExtraSpinWithLuck {
            luck += charm_meta.effect_value_2;
        }

        if charm_id == 12 {
            luck += last_spin_patterns.into() * 6;
        }

        if charm_meta.condition_type == CharmConditionType::NoPatternLastSpin {
            if last_spin_patterns == 0 {
                luck += val;
            }
        } else if charm_meta.condition_type == CharmConditionType::LowSpinsRemaining {
            if spins_remaining <= 2 {
                luck += val;
            }
        } else if charm_meta.condition_type == CharmConditionType::PerItemInInventory {
            luck += inventory_count * val;
        } else if charm_meta.condition_type == CharmConditionType::LowScore {
            if score < 100 {
                luck += val;
            }
        } else if charm_meta.condition_type == CharmConditionType::HighLevel {
            if level >= 5 {
                if charm_meta.effect_value_2 > 0 {
                    luck += charm_meta.effect_value_2;
                } else {
                    luck += val;
                }
            }
        } else if charm_meta.condition_type == CharmConditionType::Blocked666 {
            if blocked_666_this_session {
                luck += val;
            }
        }

        i += 1;
    }

    luck
}
