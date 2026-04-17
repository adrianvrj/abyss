use crate::helpers::items::{get_all_items, get_item_runtime_effect};
use crate::helpers::relic_types::get_relic_type_info;
use crate::models::index::Item;

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
    let devil_train = find_item(34);
    let skull = find_item(12);

    assert(old_wig.price == 2, 'old wig price');
    assert(old_wig.effect_value == 1, 'old wig value');
    assert(cigarettes.price == 3, 'cigarettes price');
    assert(cigarettes.effect_value == 8, 'cigarettes value');
    assert(fake_coin.price == 4, 'fake coin price');
    assert(fake_coin.effect_value == 8, 'fake coin value');
    assert(devil_train.price == 4, 'devil train price');
    assert(devil_train.effect_value == 40, 'devil train value');
    assert(skull.effect_value == 12, 'skull value');
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
