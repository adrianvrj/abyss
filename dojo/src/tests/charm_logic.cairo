use crate::helpers::charm_types::{
    calculate_base_luck_from_charm_ids, calculate_effective_luck_from_charm_ids,
    get_charm_ids_by_rarity, get_charm_retrigger_bonuses_for_ids, get_charm_type_info,
};
use crate::types::effect::{CharmConditionType, CharmEffectType};

fn assert_charm_meta(
    charm_id: u32,
    expected_name: felt252,
    expected_description: felt252,
    expected_effect_type: u8,
    expected_effect_value: u32,
    expected_effect_value_2: u32,
    expected_condition_type: u8,
    expected_rarity: u8,
    expected_cost: u32,
) {
    let meta = get_charm_type_info(charm_id);
    assert(meta.charm_id == charm_id, 'bad charm id');
    assert(meta.name == expected_name, 'bad charm name');
    assert(meta.description == expected_description, 'bad charm description');
    assert(meta.effect_type == expected_effect_type, 'bad effect type');
    assert(meta.effect_value == expected_effect_value, 'bad effect value');
    assert(meta.effect_value_2 == expected_effect_value_2, 'bad effect value 2');
    assert(meta.condition_type == expected_condition_type, 'bad condition');
    assert(meta.rarity == expected_rarity, 'bad rarity');
    assert(meta.shop_cost == expected_cost, 'bad cost');
}

fn assert_u32_array_eq(actual: Array<u32>, expected: Array<u32>) {
    assert(actual.len() == expected.len(), 'bad array len');
    let mut i: u32 = 0;
    while i < actual.len().try_into().unwrap() {
        assert(*actual.at(i) == *expected.at(i), 'bad array value');
        i += 1;
    };
}

#[test]
fn test_all_charm_metadata_definitions() {
    assert_charm_meta(
        1,
        'Whisper Stone',
        'Luck +10',
        CharmEffectType::LuckBoost,
        10,
        0,
        CharmConditionType::None,
        0,
        1,
    );
    assert_charm_meta(
        2,
        'Faded Coin',
        'Luck +12',
        CharmEffectType::LuckBoost,
        12,
        0,
        CharmConditionType::None,
        0,
        1,
    );
    assert_charm_meta(
        3,
        'Broken Mirror',
        'No pat +18',
        CharmEffectType::ConditionalLuckBoost,
        18,
        0,
        CharmConditionType::NoPatternLastSpin,
        0,
        1,
    );
    assert_charm_meta(
        4,
        'Dusty Hourglass',
        'Low spins +20',
        CharmEffectType::ConditionalLuckBoost,
        20,
        0,
        CharmConditionType::LowSpinsRemaining,
        0,
        1,
    );
    assert_charm_meta(
        5,
        'Cracked Skull',
        'Luck +14',
        CharmEffectType::LuckBoost,
        14,
        0,
        CharmConditionType::None,
        0,
        1,
    );
    assert_charm_meta(
        6,
        'Rusty Key',
        'Per item +8',
        CharmEffectType::ConditionalLuckBoost,
        8,
        0,
        CharmConditionType::PerItemInInventory,
        0,
        1,
    );
    assert_charm_meta(
        7, 'Moth Wing', 'Luck +16', CharmEffectType::LuckBoost, 16, 0, CharmConditionType::None, 0, 1,
    );
    assert_charm_meta(
        8,
        'Bone Dice',
        'Low score +22',
        CharmEffectType::ConditionalLuckBoost,
        22,
        0,
        CharmConditionType::LowScore,
        0,
        1,
    );
    assert_charm_meta(
        9,
        'Soul Fragment',
        'Luck +24',
        CharmEffectType::LuckBoost,
        24,
        0,
        CharmConditionType::None,
        1,
        1,
    );
    assert_charm_meta(
        10,
        'Cursed Pendant',
        'H3 x2',
        CharmEffectType::PatternRetrigger,
        2,
        1,
        CharmConditionType::None,
        1,
        2,
    );
    assert_charm_meta(
        11,
        'Shadow Lantern',
        '+14 base, lvl4 +18',
        CharmEffectType::LuckBoost,
        14,
        18,
        CharmConditionType::HighLevel,
        1,
        1,
    );
    assert_charm_meta(
        12,
        'Ethereal Chain',
        'Pattern +12',
        CharmEffectType::ConditionalLuckBoost,
        12,
        0,
        CharmConditionType::None,
        1,
        1,
    );
    assert_charm_meta(
        13,
        'Void Compass',
        '+2 spin +25',
        CharmEffectType::ExtraSpinWithLuck,
        2,
        25,
        CharmConditionType::None,
        1,
        2,
    );
    assert_charm_meta(
        14,
        'Demons Tooth',
        'Diag x2',
        CharmEffectType::PatternRetrigger,
        2,
        3,
        CharmConditionType::None,
        1,
        3,
    );
    assert_charm_meta(
        15,
        'Abyssal Eye',
        'Luck +38',
        CharmEffectType::LuckBoost,
        38,
        0,
        CharmConditionType::None,
        2,
        3,
    );
    assert_charm_meta(
        16,
        'Phoenix Feather',
        '+3 spin +20',
        CharmEffectType::ExtraSpinWithLuck,
        3,
        20,
        CharmConditionType::None,
        2,
        3,
    );
    assert_charm_meta(
        17,
        'Reapers Mark',
        'NoJP x2',
        CharmEffectType::PatternRetrigger,
        2,
        0,
        CharmConditionType::None,
        2,
        4,
    );
    assert_charm_meta(
        18,
        'Chaos Orb',
        '+12 base, block666 +140',
        CharmEffectType::ConditionalLuckBoost,
        140,
        0,
        CharmConditionType::Blocked666,
        2,
        4,
    );
    assert_charm_meta(
        19,
        'Soul Abyss',
        'Luck +45',
        CharmEffectType::LuckBoost,
        45,
        0,
        CharmConditionType::None,
        2,
        5,
    );
    assert_charm_meta(
        20,
        'Void Heart',
        '+2 spin +80',
        CharmEffectType::ExtraSpinWithLuck,
        2,
        80,
        CharmConditionType::None,
        2,
        5,
    );
}

#[test]
fn test_charm_ids_grouped_by_rarity() {
    assert_u32_array_eq(get_charm_ids_by_rarity(0), array![1, 2, 3, 4, 5, 6, 7, 8]);
    assert_u32_array_eq(get_charm_ids_by_rarity(1), array![9, 10, 11, 12, 13, 14]);
    assert_u32_array_eq(get_charm_ids_by_rarity(2), array![15, 16, 17, 18, 19, 20]);
    assert_u32_array_eq(get_charm_ids_by_rarity(99), array![]);
}

#[test]
fn test_base_luck_only_counts_persistent_sources() {
    let charm_ids = array![1, 11, 12, 13, 18, 19, 20];
    let luck = calculate_base_luck_from_charm_ids(charm_ids.span());
    assert(luck == 186, 'unexpected base luck');
}

#[test]
fn test_effective_luck_applies_conditional_charm_rules() {
    let charm_ids = array![3, 4, 6, 8, 11, 12, 18];
    let luck = calculate_effective_luck_from_charm_ids(charm_ids.span(), 0, 2, 4, 80, 5, true);
    assert(luck == 276, 'unexpected effective luck');
}

#[test]
fn test_ethereal_chain_uses_last_spin_pattern_count() {
    let charm_ids = array![12];
    let luck = calculate_effective_luck_from_charm_ids(charm_ids.span(), 3, 4, 2, 200, 2, false);
    assert(luck == 36, 'unexpected chain luck');
}

#[test]
fn test_ethereal_chain_gives_no_bonus_without_patterns() {
    let charm_ids = array![12];
    let luck = calculate_effective_luck_from_charm_ids(charm_ids.span(), 0, 4, 2, 200, 2, false);
    assert(luck == 0, 'chain no bonus');
}

#[test]
fn test_dusty_hourglass_applies_at_three_spins_remaining() {
    let charm_ids = array![4];
    let luck = calculate_effective_luck_from_charm_ids(charm_ids.span(), 0, 3, 0, 200, 2, false);
    assert(luck == 20, 'hourglass at three');
}

#[test]
fn test_dusty_hourglass_does_not_apply_above_three_spins() {
    let charm_ids = array![4];
    let luck = calculate_effective_luck_from_charm_ids(charm_ids.span(), 0, 4, 0, 200, 2, false);
    assert(luck == 0, 'hourglass above three');
}

#[test]
fn test_shadow_lantern_applies_bonus_at_level_four() {
    let charm_ids = array![11];
    let luck = calculate_effective_luck_from_charm_ids(charm_ids.span(), 0, 4, 0, 200, 4, false);
    assert(luck == 32, 'lantern at four');
}

#[test]
fn test_bone_dice_uses_new_score_threshold() {
    let charm_ids = array![8];
    let luck = calculate_effective_luck_from_charm_ids(charm_ids.span(), 0, 4, 0, 179, 2, false);
    assert(luck == 22, 'bone dice below threshold');
}

#[test]
fn test_bone_dice_stops_at_or_above_new_score_threshold() {
    let charm_ids = array![8];
    let luck = calculate_effective_luck_from_charm_ids(charm_ids.span(), 0, 4, 0, 180, 2, false);
    assert(luck == 0, 'bone dice above threshold');
}

#[test]
fn test_chaos_orb_keeps_base_luck_without_blocked_666() {
    let charm_ids = array![18];
    let luck = calculate_effective_luck_from_charm_ids(charm_ids.span(), 0, 4, 0, 200, 2, false);
    assert(luck == 12, 'chaos orb base luck');
}

#[test]
fn test_chaos_orb_adds_blocked_666_bonus() {
    let charm_ids = array![18];
    let luck = calculate_effective_luck_from_charm_ids(charm_ids.span(), 0, 4, 0, 200, 2, true);
    assert(luck == 152, 'chaos orb blocked bonus');
}

#[test]
fn test_extra_spin_charms_can_be_summed_for_reset_logic() {
    let charm_ids = array![16, 20];
    let mut spin_bonus: u32 = 0;
    let mut i: u32 = 0;

    while i < charm_ids.len().try_into().unwrap() {
        let meta = get_charm_type_info(*charm_ids.at(i));
        if meta.effect_type == CharmEffectType::ExtraSpinWithLuck {
            spin_bonus += meta.effect_value;
        }
        i += 1;
    }

    assert(spin_bonus == 5, 'bad charm spin bonus');
    assert(5 + spin_bonus == 10, 'bad reset total');
}

#[test]
fn test_pattern_retriggers_match_contract_behavior() {
    let charm_ids = array![10, 14, 17, 19];
    let (h3, diag, all, jackpot) = get_charm_retrigger_bonuses_for_ids(charm_ids.span());
    assert(h3 == 2, 'bad horizontal retrigger');
    assert(diag == 2, 'bad diagonal retrigger');
    assert(all == 2, 'bad all retrigger');
    assert(jackpot == 2, 'bad jackpot retrigger');
}

#[test]
fn test_reapers_mark_does_not_retrigger_jackpot() {
    let charm_ids = array![17];
    let (h3, diag, all, jackpot) = get_charm_retrigger_bonuses_for_ids(charm_ids.span());
    assert(h3 == 2, 'bad horizontal retrigger');
    assert(diag == 2, 'bad diagonal retrigger');
    assert(all == 2, 'bad vertical retrigger');
    assert(jackpot == 1, 'jackpot should not retrigger');
}
