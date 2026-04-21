use crate::constants::DEFAULT_TICKETS;
use crate::helpers::items::{
    BIBLIA_ITEM_ID, get_all_items, get_item_diamond_chip_bonus, get_item_purchase_price,
    get_item_runtime_effect,
};
use crate::helpers::probability::get_666_probability;
use crate::helpers::relic_types::get_relic_type_info;
use crate::helpers::scoring::get_level_threshold;
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
    let devil_onion = find_item(9);
    let pyramid = find_item(18);
    let (_, devil_onion_spins, _) = get_item_runtime_effect(9);
    let (_, pyramid_spins, _) = get_item_runtime_effect(18);

    assert(devil_onion.price == 1, 'devil onion price');
    assert(pyramid.price == 2, 'pyramid price');
    assert(devil_onion.sell_price == 1, 'devil onion sell');
    assert(pyramid.sell_price == 2, 'pyramid sell');
    assert(devil_onion_spins == 1, 'devil onion spins');
    assert(pyramid_spins == 3, 'pyramid spins');
}

#[test]
fn test_pattern_multiplier_prices_match_balance_patch() {
    let bat_boomerang = find_item(5);
    let holy_eye = find_item(6);
    let amulet = find_item(15);
    let bloody_wrench = find_item(21);
    let car_keys = find_item(22);
    let holy_grail = find_item(24);

    assert(bat_boomerang.price == 1, 'bat boomerang price');
    assert(bat_boomerang.effect_value == 20, 'bat boomerang value');
    assert(holy_eye.price == 2, 'holy eye price');
    assert(holy_eye.effect_value == 40, 'holy eye value');
    assert(amulet.price == 3, 'amulet price');
    assert(amulet.effect_value == 60, 'amulet value');
    assert(bloody_wrench.price == 4, 'bloody wrench price');
    assert(bloody_wrench.effect_value == 90, 'bloody wrench value');
    assert(car_keys.price == 5, 'car keys price');
    assert(car_keys.effect_value == 120, 'car keys value');
    assert(holy_grail.price == 7, 'holy grail legacy price');
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

    assert(old_wig.price == 2, 'old wig price');
    assert(old_wig.effect_value == 2, 'old wig value');
    assert(cigarettes.price == 2, 'cigarettes price');
    assert(cigarettes.effect_value == 5, 'cigarettes value');
    assert(fake_coin.price == 3, 'fake coin price');
    assert(fake_coin.effect_value == 6, 'fake coin value');
    assert(chilly_pepper.effect_value == 14, 'chilly pepper value');
    assert(nerd_glasses.effect_value == 6, 'nerd glasses value');
    assert(ghost_mask.effect_value == 9, 'ghost mask value');
    assert(hockey_mask.effect_value == 21, 'hockey mask value');
    assert(ticket.effect_value == 28, 'ticket value');
    assert(devil_train.price == 4, 'devil train price');
    assert(devil_train.effect_value == 10, 'devil train value');
    assert(skull.effect_value == 7, 'skull value');
    assert(pig_bank.effect_value == 3, 'pig bank value');
    assert(weird_hand.effect_value == 13, 'weird hand value');
    assert(smelly_boots.price == 3, 'smelly boots price');
    assert(smelly_boots.effect_value == 4, 'smelly boots value');
    assert(devil_head.effect_value == 19, 'devil head value');
    assert(find_item(4).sell_price == 1, 'old cassette sell');
    assert(find_item(30).price == 3, 'soul contract price');
    assert(find_item(30).effect_value == 3, 'soul contract value');
    assert(find_item(30).sell_price == 2, 'soul contract sell');
    assert(find_item(38).price == 4, 'pocket watch price');
    assert(find_item(38).effect_value == 4, 'pocket watch value');
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
    assert(globe.effect_value == 7, 'golden globe value');
    assert(old_phone.target_symbol == 'anti-coin', 'old phone target');
    assert(old_phone.price == 1, 'old phone price');
    assert(old_phone.effect_value == 4, 'old phone value');
    assert(rune.effect_value == 3, 'rune value');
    assert(bloody_knife.effect_value == 14, 'bloody knife value');
    assert(beer_can.target_symbol == 'anti-coin', 'beer can target');
    assert(beer_can.effect_value == 12, 'beer can value');
    assert(beer_can.price == 2, 'beer can price');
    assert(memory_card.effect_type == 2, 'memory card type');
    assert(memory_card.target_symbol == 'anti-coin', 'memory card target');
    assert(memory_card.effect_value == 17, 'memory card value');
    assert(memory_card.price == 3, 'memory card price');
    assert(memory_card.sell_price == 2, 'memory card sell');
    assert(fake_dollar.effect_value == 4, 'fake dollar value');
    assert(bull_skull.effect_value == 20, 'bull skull value');
    assert(knight_helmet.target_symbol == 'anti-coin', 'knight helmet target');
    assert(knight_helmet.effect_value == 6, 'knight helmet value');
    assert(knight_helmet.price == 2, 'knight helmet price');
    assert(cash_out.effect_type == 11, 'cash out type');
    assert(cash_out.price == 4, 'cash out price');
    assert(get_item_diamond_chip_bonus(2) == 1, 'milk chip bonus');
    assert(get_item_diamond_chip_bonus(27) == 2, 'bloody knife chip bonus');
    assert(get_item_diamond_chip_bonus(35) == 3, 'fake dollar chip bonus');
}

#[test]
fn test_seven_and_cherry_probability_items_match_balance_patch() {
    let nerd_glasses = find_item(7);
    let ghost_mask = find_item(11);
    let skull = find_item(12);
    let weird_hand = find_item(16);
    let devil_head = find_item(28);
    let devil_train = find_item(34);

    assert(nerd_glasses.target_symbol == 'seven', 'nerd glasses target');
    assert(nerd_glasses.effect_value == 6, 'nerd glasses value');
    assert(ghost_mask.effect_value == 9, 'ghost mask value');
    assert(devil_train.effect_value == 10, 'devil train value');
    assert(skull.target_symbol == 'cherry', 'skull target');
    assert(skull.effect_value == 7, 'skull value');
    assert(weird_hand.effect_value == 13, 'weird hand value');
    assert(devil_head.effect_value == 19, 'devil head value');
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

    assert(mortis.cooldown_spins == 15, 'mortis cooldown');
    assert(phantom.cooldown_spins == 15, 'phantom cooldown');
    assert(lucky.cooldown_spins == 9, 'lucky cooldown');
}

#[test]
fn test_level_thresholds_match_balance_patch() {
    assert(get_level_threshold(1) == 66, 'level 1 threshold');
    assert(get_level_threshold(2) == 220, 'level 2 threshold');
    assert(get_level_threshold(3) == 450, 'level 3 threshold');
    assert(get_level_threshold(4) == 1000, 'level 4 threshold');
    assert(get_level_threshold(5) == 2200, 'level 5 threshold');
    assert(get_level_threshold(6) == 5000, 'level 6 threshold');
    assert(get_level_threshold(7) == 9500, 'level 7 threshold');
    assert(get_level_threshold(8) == 17000, 'level 8 threshold');
    assert(get_level_threshold(9) == 24500, 'level 9 threshold');
    assert(get_level_threshold(10) == 42000, 'level 10 threshold');
    assert(get_level_threshold(11) == 70000, 'level 11 threshold');
    assert(get_level_threshold(12) == 120000, 'level 12 threshold');
}

#[test]
fn test_666_probability_ramps_harder_in_late_game() {
    assert(get_666_probability(2) == 0, 'level 2 666');
    assert(get_666_probability(5) == 60, 'level 5 666');
    assert(get_666_probability(6) == 90, 'level 6 666');
    assert(get_666_probability(8) == 150, 'level 8 666');
    assert(get_666_probability(9) == 210, 'level 9 666');
    assert(get_666_probability(10) == 260, 'level 10 666');
    assert(get_666_probability(11) == 330, 'level 11 666');
    assert(get_666_probability(12) == 400, 'level 12 666');
}

#[test]
fn test_diamond_chip_bonus_is_included_in_final_chip_payout() {
    assert(get_total_chip_units(45, 3) == 5, 'total chip units');

    let payout = get_chip_payout_amount(45, 3, 1, 1);
    assert(payout == 5_000_000_000_000_000_000_u256, 'bonus payout amount');

    let boosted_payout = get_chip_payout_amount(80, 2, 3, 2);
    assert(boosted_payout == 36_000_000_000_000_000_000_u256, 'boosted payout amount');
}
