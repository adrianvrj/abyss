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
        'Luck +3',
        CharmEffectType::LuckBoost,
        3,
        0,
        CharmConditionType::None,
        0,
        1,
    );
    assert_charm_meta(
        2,
        'Faded Coin',
        'Luck +4',
        CharmEffectType::LuckBoost,
        4,
        0,
        CharmConditionType::None,
        0,
        1,
    );
    assert_charm_meta(
        3,
        'Broken Mirror',
        'No pat +5',
        CharmEffectType::ConditionalLuckBoost,
        5,
        0,
        CharmConditionType::NoPatternLastSpin,
        0,
        1,
    );
    assert_charm_meta(
        4,
        'Dusty Hourglass',
        'Low spins +8',
        CharmEffectType::ConditionalLuckBoost,
        8,
        0,
        CharmConditionType::LowSpinsRemaining,
        0,
        1,
    );
    assert_charm_meta(
        5,
        'Cracked Skull',
        'Luck +5',
        CharmEffectType::LuckBoost,
        5,
        0,
        CharmConditionType::None,
        0,
        1,
    );
    assert_charm_meta(
        6,
        'Rusty Key',
        'Per item +3',
        CharmEffectType::ConditionalLuckBoost,
        3,
        0,
        CharmConditionType::PerItemInInventory,
        0,
        1,
    );
    assert_charm_meta(
        7, 'Moth Wing', 'Luck +6', CharmEffectType::LuckBoost, 6, 0, CharmConditionType::None, 0, 1,
    );
    assert_charm_meta(
        8,
        'Bone Dice',
        'Low score +8',
        CharmEffectType::ConditionalLuckBoost,
        8,
        0,
        CharmConditionType::LowScore,
        0,
        1,
    );
    assert_charm_meta(
        9,
        'Soul Fragment',
        'Luck +10',
        CharmEffectType::LuckBoost,
        10,
        0,
        CharmConditionType::None,
        1,
        2,
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
        '+8 base, lvl5 +8',
        CharmEffectType::LuckBoost,
        8,
        8,
        CharmConditionType::HighLevel,
        1,
        2,
    );
    assert_charm_meta(
        12,
        'Ethereal Chain',
        'Pattern +6',
        CharmEffectType::ConditionalLuckBoost,
        6,
        0,
        CharmConditionType::None,
        1,
        2,
    );
    assert_charm_meta(
        13,
        'Void Compass',
        '+1 spin +15',
        CharmEffectType::ExtraSpinWithLuck,
        1,
        15,
        CharmConditionType::None,
        1,
        3,
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
        'Luck +20',
        CharmEffectType::LuckBoost,
        20,
        0,
        CharmConditionType::None,
        2,
        4,
    );
    assert_charm_meta(
        16,
        'Phoenix Feather',
        '+2 spin +10',
        CharmEffectType::ExtraSpinWithLuck,
        2,
        10,
        CharmConditionType::None,
        2,
        4,
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
        5,
    );
    assert_charm_meta(
        18,
        'Chaos Orb',
        'Block666 +80',
        CharmEffectType::ConditionalLuckBoost,
        80,
        0,
        CharmConditionType::Blocked666,
        2,
        5,
    );
    assert_charm_meta(
        19,
        'Soul Abyss',
        'Luck +30',
        CharmEffectType::LuckBoost,
        30,
        0,
        CharmConditionType::None,
        2,
        6,
    );
    assert_charm_meta(
        20,
        'Void Heart',
        '+1 spin +50',
        CharmEffectType::ExtraSpinWithLuck,
        1,
        50,
        CharmConditionType::None,
        2,
        7,
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
    assert(luck == 106, 'unexpected base luck');
}

#[test]
fn test_effective_luck_applies_conditional_charm_rules() {
    let charm_ids = array![3, 4, 6, 8, 11, 12, 18];
    let luck = calculate_effective_luck_from_charm_ids(charm_ids.span(), 0, 2, 4, 80, 5, true);
    assert(luck == 129, 'unexpected effective luck');
}

#[test]
fn test_ethereal_chain_uses_last_spin_pattern_count() {
    let charm_ids = array![12];
    let luck = calculate_effective_luck_from_charm_ids(charm_ids.span(), 3, 4, 2, 200, 2, false);
    assert(luck == 18, 'unexpected chain luck');
}

#[test]
fn test_ethereal_chain_gives_no_bonus_without_patterns() {
    let charm_ids = array![12];
    let luck = calculate_effective_luck_from_charm_ids(charm_ids.span(), 0, 4, 2, 200, 2, false);
    assert(luck == 0, 'chain no bonus');
}

#[test]
fn test_dusty_hourglass_applies_at_two_spins_remaining() {
    let charm_ids = array![4];
    let luck = calculate_effective_luck_from_charm_ids(charm_ids.span(), 0, 2, 0, 200, 2, false);
    assert(luck == 8, 'hourglass at two');
}

#[test]
fn test_dusty_hourglass_does_not_apply_above_two_spins() {
    let charm_ids = array![4];
    let luck = calculate_effective_luck_from_charm_ids(charm_ids.span(), 0, 3, 0, 200, 2, false);
    assert(luck == 0, 'hourglass above two');
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

    assert(spin_bonus == 3, 'bad charm spin bonus');
    assert(5 + spin_bonus == 8, 'bad reset total');
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
