use crate::helpers::items::{get_all_items, get_item_diamond_chip_bonus, get_item_runtime_effect};
use crate::helpers::relic_types::get_relic_type_info;
use crate::models::index::Item;
use crate::systems::play::{get_chip_payout_amount, get_total_chip_units};

fn find_item(item_id: u32) -> Item {
    let items = get_all_items();
    let mut i: u32 = 0;
    while i < items.len().try_into().unwrap() {
        let item = *items.at(i);
        if item.item_id == item_id {
            return item;
        }
        i += 1;
    };

    assert(false, 'Item missing');
    *items.at(0)
}

#[test]
fn test_spin_consumable_runtime_values_match_balance_patch() {
    let (_, red_button_spins, _) = get_item_runtime_effect(10);
    let (_, pyramid_spins, _) = get_item_runtime_effect(18);
    let (_, devil_seal_spins, _) = get_item_runtime_effect(23);

    assert(red_button_spins == 2, 'red button spins');
    assert(pyramid_spins == 3, 'pyramid spins');
    assert(devil_seal_spins == 4, 'devil seal spins');
}

#[test]
fn test_lemon_and_meta_shift_item_definitions_match_patch() {
    let old_wig = find_item(14);
    let cigarettes = find_item(29);
    let fake_coin = find_item(37);
    let chilly_pepper = find_item(1);
    let nerd_glasses = find_item(7);
    let ghost_mask = find_item(11);
    let hockey_mask = find_item(25);
    let ticket = find_item(33);
    let devil_train = find_item(34);
    let skull = find_item(12);

    assert(old_wig.price == 2, 'old wig price');
    assert(old_wig.effect_value == 1, 'old wig value');
    assert(cigarettes.price == 3, 'cigarettes price');
    assert(cigarettes.effect_value == 8, 'cigarettes value');
    assert(fake_coin.price == 4, 'fake coin price');
    assert(fake_coin.effect_value == 8, 'fake coin value');
    assert(chilly_pepper.effect_value == 3, 'chilly pepper value');
    assert(nerd_glasses.effect_value == 6, 'nerd glasses value');
    assert(ghost_mask.effect_value == 10, 'ghost mask value');
    assert(hockey_mask.effect_value == 7, 'hockey mask value');
    assert(ticket.effect_value == 10, 'ticket value');
    assert(devil_train.price == 4, 'devil train price');
    assert(devil_train.effect_value == 16, 'devil train value');
    assert(skull.effect_value == 12, 'skull value');
}

#[test]
fn test_coin_diamond_and_cash_out_item_definitions_match_patch() {
    let milk = find_item(2);
    let ace = find_item(8);
    let globe = find_item(17);
    let old_phone = find_item(19);
    let rune = find_item(26);
    let bloody_knife = find_item(27);
    let beer_can = find_item(31);
    let memory_card = find_item(32);
    let fake_dollar = find_item(35);
    let bull_skull = find_item(36);
    let cash_out = find_item(41);

    assert(milk.effect_value == 2, 'milk value');
    assert(ace.effect_value == 8, 'ace probability');
    assert(globe.target_symbol == 'anti-coin', 'golden globe target');
    assert(globe.effect_value == 3, 'golden globe value');
    assert(old_phone.effect_value == 1, 'old phone value');
    assert(rune.effect_value == 3, 'rune value');
    assert(bloody_knife.effect_value == 14, 'bloody knife value');
    assert(beer_can.target_symbol == 'anti-coin', 'beer can target');
    assert(beer_can.effect_value == 5, 'beer can value');
    assert(memory_card.effect_type == 2, 'memory card type');
    assert(memory_card.effect_value == 7, 'memory card value');
    assert(fake_dollar.effect_value == 4, 'fake dollar value');
    assert(bull_skull.effect_value == 20, 'bull skull value');
    assert(cash_out.effect_type == 11, 'cash out type');
    assert(cash_out.price == 4, 'cash out price');
    assert(get_item_diamond_chip_bonus(2) == 1, 'milk chip bonus');
    assert(get_item_diamond_chip_bonus(27) == 2, 'bloody knife chip bonus');
    assert(get_item_diamond_chip_bonus(35) == 3, 'fake dollar chip bonus');
}

#[test]
fn test_relic_cooldowns_match_balance_patch() {
    let mortis = get_relic_type_info(1).metadata;
    let phantom = get_relic_type_info(2).metadata;
    let lucky = get_relic_type_info(3).metadata;

    assert(mortis.cooldown_spins == 13, 'mortis cooldown');
    assert(phantom.cooldown_spins == 10, 'phantom cooldown');
    assert(lucky.cooldown_spins == 9, 'lucky cooldown');
}

#[test]
fn test_diamond_chip_bonus_is_included_in_final_chip_payout() {
    assert(get_total_chip_units(45, 3) == 5, 'total chip units');

    let payout = get_chip_payout_amount(45, 3, 1, 1);
    assert(payout == 5_000_000_000_000_000_000_u256, 'bonus payout amount');

    let boosted_payout = get_chip_payout_amount(80, 2, 3, 2);
    assert(boosted_payout == 36_000_000_000_000_000_000_u256, 'boosted payout amount');
}
