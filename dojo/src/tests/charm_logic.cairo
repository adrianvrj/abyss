use crate::helpers::charm_types::{
    calculate_base_luck_from_charm_ids, calculate_effective_luck_from_charm_ids,
    get_charm_ids_by_rarity, get_charm_retrigger_bonuses_for_ids, get_charm_type_info,
    get_debt_pledge_config, preview_debt_collection, preview_debt_payout,
    should_pay_debt_pledge,
};
use crate::helpers::grid::normalize_spin_luck;
use crate::systems::play::{
    get_charm_drop_chance_from_score_and_luck, get_charm_rarity_from_score_and_roll,
};
use crate::systems::charm::{
    CHARM_FORGE_PRICE_CHIP, get_charm_reroll_base_rarity, get_charm_reroll_result_rarity,
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

fn assert_reroll_odds_row(
    rarity_1: u8,
    rarity_2: u8,
    rarity_3: u8,
    common: u32,
    rare: u32,
    epic: u32,
    legendary: u32,
) {
    assert(common + rare + epic + legendary == 100, 'bad odds sum');
    let rare_start = common;
    let epic_start = common + rare;
    let legendary_start = common + rare + epic;

    if common > 0 {
        assert_eq!(get_charm_reroll_result_rarity(rarity_1, rarity_2, rarity_3, 0), 0);
        assert_eq!(
            get_charm_reroll_result_rarity(rarity_1, rarity_2, rarity_3, common - 1), 0,
        );
    }
    if rare > 0 {
        assert_eq!(
            get_charm_reroll_result_rarity(rarity_1, rarity_2, rarity_3, rare_start), 1,
        );
        assert_eq!(
            get_charm_reroll_result_rarity(rarity_1, rarity_2, rarity_3, epic_start - 1), 1,
        );
    }
    if epic > 0 {
        assert_eq!(
            get_charm_reroll_result_rarity(rarity_1, rarity_2, rarity_3, epic_start), 2,
        );
        assert_eq!(
            get_charm_reroll_result_rarity(rarity_1, rarity_2, rarity_3, legendary_start - 1), 2,
        );
    }
    if legendary > 0 {
        assert_eq!(
            get_charm_reroll_result_rarity(rarity_1, rarity_2, rarity_3, legendary_start), 3,
        );
        assert_eq!(get_charm_reroll_result_rarity(rarity_1, rarity_2, rarity_3, 99), 3);
    }
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
        3,
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
        3,
        5,
    );
    assert_charm_meta(
        21, 'Big Diamond', 'Luck +15', CharmEffectType::LuckBoost, 15, 0,
        CharmConditionType::None, 0, 1,
    );
    assert_charm_meta(
        22, 'Supernova Nacho', 'No pat +22', CharmEffectType::ConditionalLuckBoost, 22, 0,
        CharmConditionType::NoPatternLastSpin, 0, 1,
    );
    assert_charm_meta(
        23, 'Magic Bean', 'Per item +9', CharmEffectType::ConditionalLuckBoost, 9, 0,
        CharmConditionType::PerItemInInventory, 0, 1,
    );
    assert_charm_meta(
        24, 'Ice King Crown', 'Vert x2', CharmEffectType::PatternRetrigger, 2, 2,
        CharmConditionType::None, 1, 2,
    );
    assert_charm_meta(
        25, 'Antimatter', '+2 spin +28', CharmEffectType::ExtraSpinWithLuck, 2, 28,
        CharmConditionType::None, 1, 2,
    );
    assert_charm_meta(
        26, 'Boxing Globes', 'Debt 5, 666x2 pays x10', CharmEffectType::DebtPledge, 5, 10,
        CharmConditionType::Consecutive666, 2, 3,
    );
    assert_charm_meta(
        27, 'Morellonomicon', 'Debt 10, HVD pays x12', CharmEffectType::DebtPledge, 10, 12,
        CharmConditionType::AllPatternTypesSameSpin, 3, 3,
    );
}

#[test]
fn test_charm_ids_grouped_by_rarity() {
    assert_u32_array_eq(get_charm_ids_by_rarity(0), array![1, 2, 3, 4, 5, 6, 7, 8, 21, 22, 23]);
    assert_u32_array_eq(get_charm_ids_by_rarity(1), array![9, 10, 11, 12, 13, 14, 24, 25]);
    assert_u32_array_eq(get_charm_ids_by_rarity(2), array![15, 16, 17, 18, 26]);
    assert_u32_array_eq(get_charm_ids_by_rarity(3), array![19, 20, 27]);
    assert_u32_array_eq(get_charm_ids_by_rarity(99), array![]);
}

#[test]
#[should_panic(expected: ('Invalid charm',))]
fn test_charm_id_above_expanded_range_rejected() {
    get_charm_type_info(28);
}

#[test]
fn test_charm_forge_price_is_4444_chip() {
    assert_eq!(CHARM_FORGE_PRICE_CHIP, 4_444_000_000_000_000_000_000);
}

#[test]
fn test_charm_reroll_base_rarity_uses_median_anchor() {
    assert_eq!(get_charm_reroll_base_rarity(2, 1, 3), 2);
    assert_eq!(get_charm_reroll_base_rarity(3, 3, 2), 3);
    assert_eq!(get_charm_reroll_base_rarity(0, 3, 1), 1);
}

#[test]
fn test_charm_reroll_composition_odds_boundaries_without_legendary_inputs() {
    assert_reroll_odds_row(0, 0, 0, 80, 18, 2, 0);
    assert_reroll_odds_row(0, 0, 1, 55, 40, 5, 0);
    assert_reroll_odds_row(0, 1, 1, 15, 75, 10, 0);
    assert_reroll_odds_row(1, 1, 1, 0, 76, 24, 0);
    assert_reroll_odds_row(0, 0, 2, 45, 35, 20, 0);
    assert_reroll_odds_row(0, 1, 2, 10, 65, 25, 0);
    assert_reroll_odds_row(1, 1, 2, 0, 55, 45, 0);
    assert_reroll_odds_row(0, 2, 2, 5, 30, 65, 0);
    assert_reroll_odds_row(1, 2, 2, 0, 12, 88, 0);
    assert_reroll_odds_row(2, 2, 2, 0, 0, 95, 5);
}

#[test]
fn test_charm_reroll_composition_odds_boundaries_with_legendary_inputs() {
    assert_reroll_odds_row(0, 0, 3, 35, 35, 25, 5);
    assert_reroll_odds_row(0, 1, 3, 8, 57, 30, 5);
    assert_reroll_odds_row(1, 1, 3, 0, 45, 50, 5);
    assert_reroll_odds_row(0, 2, 3, 5, 20, 65, 10);
    assert_reroll_odds_row(1, 2, 3, 0, 10, 78, 12);
    assert_reroll_odds_row(2, 2, 3, 0, 0, 84, 16);
    assert_reroll_odds_row(0, 3, 3, 0, 20, 60, 20);
    assert_reroll_odds_row(1, 3, 3, 0, 5, 65, 30);
    assert_reroll_odds_row(2, 3, 3, 0, 0, 58, 42);
    assert_reroll_odds_row(3, 3, 3, 0, 0, 0, 100);
}

#[test]
fn test_charm_reroll_mixed_inputs_no_longer_use_lowest_rarity_model() {
    assert_eq!(get_charm_reroll_result_rarity(0, 1, 1, 14), 0);
    assert_eq!(get_charm_reroll_result_rarity(0, 1, 1, 15), 1);
    assert_eq!(get_charm_reroll_result_rarity(0, 1, 1, 89), 1);
    assert_eq!(get_charm_reroll_result_rarity(0, 1, 1, 90), 2);
    assert_eq!(get_charm_reroll_result_rarity(1, 0, 1, 80), 1);
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
fn test_new_existing_effect_charms_contribute_luck() {
    let charm_ids = array![21, 22, 23, 25];
    let luck = calculate_effective_luck_from_charm_ids(charm_ids.span(), 0, 4, 3, 200, 1, false);
    assert(luck == 92, 'bad new charm luck');
}

#[test]
fn test_debt_charms_do_not_contribute_luck() {
    let charm_ids = array![26, 27];
    let luck = calculate_effective_luck_from_charm_ids(charm_ids.span(), 0, 4, 3, 200, 1, true);
    assert(luck == 0, 'debt gave luck');
}

#[test]
fn test_debt_pledge_configs_are_id_scoped() {
    let (is_debt_26, collect_26, multiplier_26, condition_26) = get_debt_pledge_config(26);
    assert(is_debt_26, '26 not debt');
    assert(collect_26 == 5, '26 collect');
    assert(multiplier_26 == 10, '26 mult');
    assert(condition_26 == CharmConditionType::Consecutive666, '26 condition');

    let (is_debt_27, collect_27, multiplier_27, condition_27) = get_debt_pledge_config(27);
    assert(is_debt_27, '27 not debt');
    assert(collect_27 == 10, '27 collect');
    assert(multiplier_27 == 12, '27 mult');
    assert(condition_27 == CharmConditionType::AllPatternTypesSameSpin, '27 condition');

    let (is_debt_21, _, _, _) = get_debt_pledge_config(21);
    assert(!is_debt_21, '21 should not debt');
}

#[test]
fn test_debt_collection_does_not_reduce_below_zero() {
    let (score, total_score, stored_score, collected) = preview_debt_collection(3, 80, 5, 5);
    assert(score == 0, 'bad score');
    assert(total_score == 80, 'bad total score');
    assert(stored_score == 8, 'bad stored');
    assert(collected == 3, 'bad collected');
}

#[test]
fn test_debt_collection_uses_configured_cap() {
    let (score, total_score, stored_score, collected) = preview_debt_collection(100, 150, 10, 10);
    assert(score == 90, 'bad score cap');
    assert(total_score == 150, 'bad total cap');
    assert(stored_score == 20, 'bad stored cap');
    assert(collected == 10, 'bad collected cap');
}

#[test]
fn test_boxing_globes_pays_on_consecutive_666_only() {
    assert(should_pay_debt_pledge(26, true, true, 0), '26 should pay');
    assert(!should_pay_debt_pledge(26, false, true, 0), '26 paid early');
    assert(!should_pay_debt_pledge(26, true, false, 7), '26 paid non666');
}

#[test]
fn test_morellonomicon_pays_on_all_pattern_types() {
    assert(should_pay_debt_pledge(27, false, false, 7), '27 should pay');
    assert(!should_pay_debt_pledge(27, true, true, 3), '27 paid partial');
    assert(!should_pay_debt_pledge(27, true, true, 5), '27 paid missing vertical');
}

#[test]
fn test_debt_payout_resets_principal_math() {
    let (score, total_score, payout) = preview_debt_payout(20, 40, 15, 10);
    assert(score == 170, 'bad payout score');
    assert(total_score == 190, 'bad payout total');
    assert(payout == 150, 'bad payout');
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
fn test_spin_luck_normalizes_from_raw_fortune() {
    assert(normalize_spin_luck(0) == 0, 'zero fortune');
    assert(normalize_spin_luck(80) == 34, 'void heart fortune');
    assert(normalize_spin_luck(140) == 60, 'full spin luck');
    assert(normalize_spin_luck(276) == 60, 'spin luck cap');
}

#[test]
fn test_charm_drop_chance_is_more_conservative() {
    assert(get_charm_drop_chance_from_score_and_luck(1000, 20) == 17, 'mid run chance');
    assert(get_charm_drop_chance_from_score_and_luck(2000, 40) == 34, 'strong run chance');
    assert(get_charm_drop_chance_from_score_and_luck(5000, 140) == 60, 'drop chance cap');
}

fn assert_score_rarity_odds(
    score: u32,
    common: u32,
    rare: u32,
    epic: u32,
    legendary: u32,
) {
    assert(common + rare + epic + legendary == 100, 'bad score odds sum');
    let rare_start = common;
    let epic_start = common + rare;
    let legendary_start = common + rare + epic;

    if common > 0 {
        assert_eq!(get_charm_rarity_from_score_and_roll(score, 0), 0);
        assert_eq!(get_charm_rarity_from_score_and_roll(score, common - 1), 0);
    }
    if rare > 0 {
        assert_eq!(get_charm_rarity_from_score_and_roll(score, rare_start), 1);
        assert_eq!(get_charm_rarity_from_score_and_roll(score, epic_start - 1), 1);
    }
    if epic > 0 {
        assert_eq!(get_charm_rarity_from_score_and_roll(score, epic_start), 2);
        assert_eq!(get_charm_rarity_from_score_and_roll(score, legendary_start - 1), 2);
    }
    if legendary > 0 {
        assert_eq!(get_charm_rarity_from_score_and_roll(score, legendary_start), 3);
        assert_eq!(get_charm_rarity_from_score_and_roll(score, 99), 3);
    }
}

#[test]
fn test_score_based_charm_rarity_odds_at_score_boundaries() {
    assert_score_rarity_odds(1499, 88, 12, 0, 0);
    assert_score_rarity_odds(1500, 76, 20, 4, 0);
    assert_score_rarity_odds(2999, 76, 20, 4, 0);
    assert_score_rarity_odds(3000, 58, 32, 10, 0);
    assert_score_rarity_odds(4999, 58, 32, 10, 0);
    assert_score_rarity_odds(5000, 40, 38, 20, 2);
    assert_score_rarity_odds(7999, 40, 38, 20, 2);
    assert_score_rarity_odds(8000, 22, 35, 35, 8);
    assert_score_rarity_odds(12499, 22, 35, 35, 8);
    assert_score_rarity_odds(12500, 10, 30, 45, 15);
    assert_score_rarity_odds(24999, 10, 30, 45, 15);
    assert_score_rarity_odds(25000, 3, 22, 55, 20);
}

#[test]
fn test_score_based_charm_rarity_odds_for_eight_thousand_tier() {
    assert_eq!(get_charm_rarity_from_score_and_roll(8000, 21), 0);
    assert_eq!(get_charm_rarity_from_score_and_roll(8000, 22), 1);
    assert_eq!(get_charm_rarity_from_score_and_roll(8000, 56), 1);
    assert_eq!(get_charm_rarity_from_score_and_roll(8000, 57), 2);
    assert_eq!(get_charm_rarity_from_score_and_roll(8000, 91), 2);
    assert_eq!(get_charm_rarity_from_score_and_roll(8000, 92), 3);
    assert_eq!(get_charm_rarity_from_score_and_roll(8000, 99), 3);
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
    let charm_ids = array![10, 14, 17, 19, 24];
    let (h3, vert, diag, all, jackpot) = get_charm_retrigger_bonuses_for_ids(charm_ids.span());
    assert(h3 == 2, 'bad horizontal retrigger');
    assert(vert == 2, 'bad vertical retrigger');
    assert(diag == 2, 'bad diagonal retrigger');
    assert(all == 2, 'bad all retrigger');
    assert(jackpot == 2, 'bad jackpot retrigger');
}

#[test]
fn test_reapers_mark_does_not_retrigger_jackpot() {
    let charm_ids = array![17];
    let (h3, vert, diag, all, jackpot) = get_charm_retrigger_bonuses_for_ids(charm_ids.span());
    assert(h3 == 2, 'bad horizontal retrigger');
    assert(diag == 2, 'bad diagonal retrigger');
    assert(vert == 2, 'bad vertical retrigger');
    assert(all == 2, 'bad all retrigger');
    assert(jackpot == 1, 'jackpot should not retrigger');
}
