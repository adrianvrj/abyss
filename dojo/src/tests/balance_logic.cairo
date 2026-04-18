use crate::constants::DEFAULT_TICKETS;
use crate::helpers::items::{
    BIBLIA_ITEM_ID, get_all_items, get_item_diamond_chip_bonus, get_item_purchase_price,
    get_item_runtime_effect,
};
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
    let pig_bank = find_item(13);
    let weird_hand = find_item(16);
    let smelly_boots = find_item(20);
    let devil_head = find_item(28);

    assert(old_wig.price == 1, 'old wig price');
    assert(old_wig.effect_value == 1, 'old wig value');
    assert(cigarettes.price == 2, 'cigarettes price');
    assert(cigarettes.effect_value == 6, 'cigarettes value');
    assert(fake_coin.price == 3, 'fake coin price');
    assert(fake_coin.effect_value == 5, 'fake coin value');
    assert(chilly_pepper.effect_value == 4, 'chilly pepper value');
    assert(nerd_glasses.effect_value == 6, 'nerd glasses value');
    assert(ghost_mask.effect_value == 12, 'ghost mask value');
    assert(hockey_mask.effect_value == 9, 'hockey mask value');
    assert(ticket.effect_value == 13, 'ticket value');
    assert(devil_train.price == 4, 'devil train price');
    assert(devil_train.effect_value == 16, 'devil train value');
    assert(skull.effect_value == 8, 'skull value');
    assert(pig_bank.effect_value == 1, 'pig bank value');
    assert(weird_hand.effect_value == 14, 'weird hand value');
    assert(smelly_boots.effect_value == 2, 'smelly boots value');
    assert(devil_head.effect_value == 20, 'devil head value');
    assert(find_item(4).sell_price == 1, 'old cassette sell');
    assert(find_item(30).effect_value == 1, 'soul contract value');
    assert(find_item(30).sell_price == 2, 'soul contract sell');
    assert(find_item(38).effect_value == 2, 'pocket watch value');
}

#[test]
fn test_coin_diamond_and_cash_out_item_definitions_match_patch() {
    let milk = find_item(2);
    let ace = find_item(8);
    let globe = find_item(17);
    let old_phone = find_item(19);
    let knight_helmet = find_item(39);
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
    assert(globe.effect_value == 4, 'golden globe value');
    assert(old_phone.target_symbol == 'anti-coin', 'old phone target');
    assert(old_phone.price == 1, 'old phone price');
    assert(old_phone.effect_value == 3, 'old phone value');
    assert(rune.effect_value == 3, 'rune value');
    assert(bloody_knife.effect_value == 14, 'bloody knife value');
    assert(beer_can.target_symbol == 'anti-coin', 'beer can target');
    assert(beer_can.effect_value == 7, 'beer can value');
    assert(beer_can.price == 2, 'beer can price');
    assert(memory_card.effect_type == 2, 'memory card type');
    assert(memory_card.target_symbol == 'anti-coin', 'memory card target');
    assert(memory_card.effect_value == 9, 'memory card value');
    assert(memory_card.price == 3, 'memory card price');
    assert(fake_dollar.effect_value == 4, 'fake dollar value');
    assert(bull_skull.effect_value == 20, 'bull skull value');
    assert(knight_helmet.target_symbol == 'anti-coin', 'knight helmet target');
    assert(knight_helmet.effect_value == 5, 'knight helmet value');
    assert(knight_helmet.price == 2, 'knight helmet price');
    assert(cash_out.effect_type == 11, 'cash out type');
    assert(cash_out.price == 4, 'cash out price');
    assert(get_item_diamond_chip_bonus(2) == 1, 'milk chip bonus');
    assert(get_item_diamond_chip_bonus(27) == 2, 'bloody knife chip bonus');
    assert(get_item_diamond_chip_bonus(35) == 3, 'fake dollar chip bonus');
}

#[test]
fn test_biblia_price_scales_per_purchase_and_base_tickets_match_patch() {
    let biblia = find_item(BIBLIA_ITEM_ID);
    let rune = find_item(26);

    assert(DEFAULT_TICKETS == 7, 'default tickets');
    assert(biblia.price == 1, 'biblia base price');
    assert(get_item_purchase_price(BIBLIA_ITEM_ID, biblia.price, 0) == 1, 'biblia first buy');
    assert(get_item_purchase_price(BIBLIA_ITEM_ID, biblia.price, 1) == 2, 'biblia second buy');
    assert(get_item_purchase_price(BIBLIA_ITEM_ID, biblia.price, 3) == 4, 'biblia fourth buy');
    assert(get_item_purchase_price(rune.item_id, rune.price, 5) == rune.price, 'static item price');
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
