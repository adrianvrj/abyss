use crate::components::spinnable::SpinnableImpl;
use crate::constants::{
    DEFAULT_SCORE_CHERRY, DEFAULT_SCORE_COIN, DEFAULT_SCORE_DIAMOND, DEFAULT_SCORE_LEMON,
    DEFAULT_SCORE_SEVEN, NAMESPACE, WORLD_RESOURCE,
};
use crate::helpers::grid::generate_grid_from_random;
use crate::models::index::{
    Config, Item, MarketSlotPurchased, Session, SessionCharmEntry, SessionCharmLoadout,
    SessionCharms, SessionChipBonus, SessionInventory, SessionItemEntry, SessionItemIndex,
    SessionMarket, SpinResult,
};
use crate::store::StoreTrait;
use crate::systems::market::{IMarketDispatcher, IMarketDispatcherTrait};
use crate::systems::play::{IPlayDispatcher, IPlayDispatcherTrait};
use crate::types::effect::{ItemEffectType, RelicEffectType};
use core::option::OptionTrait;
use core::result::ResultTrait;
use core::traits::TryInto;
use dojo::model::ModelStorageTest;
use dojo::utils::selector_from_names;
use dojo::world::WorldStorageTrait;
use dojo_cairo_test::world::{
    ContractDefTrait, NamespaceDef, TestResource, WorldStorageTestTrait, spawn_test_world,
};
use snforge_std::{DeclareResultTrait, declare, start_cheat_caller_address, start_mock_call};
use starknet::{ClassHash, ContractAddress};

const PROFILE_ITERATIONS: u32 = 48;
const REQUEST_SPIN_PROFILE_ITERATIONS: u32 = 16;
const REFRESH_MARKET_PROFILE_ITERATIONS: u32 = 24;

#[test]
fn profile_execute_spin_hot_path() {
    let probability_bonuses = (8, 5, 3, 2, 1);
    let retrigger_bonuses = (2, 2, 2, 1);
    let pattern_bonuses = (25, 40, 75, 30, 35, 50);
    let symbol_scores = (7, 5, 4, 3, 2);

    let mut checksum: felt252 = 0;
    let mut i: u32 = 0;
    while i != PROFILE_ITERATIONS {
        let random_word: felt252 = (0xAB55_u32 + i).into();
        let (score, patterns, is_666, is_jackpot, grid, matches) = SpinnableImpl::execute_spin(
            random_word,
            24,
            probability_bonuses,
            0,
            18,
            retrigger_bonuses,
            pattern_bonuses,
            symbol_scores,
            false,
        );

        let (m7, md, mc, m_coin, ml) = matches;
        checksum += score.into();
        checksum += patterns.into();
        checksum += (*grid.at(0)).into();
        checksum += (*grid.at(7)).into();
        checksum += (*grid.at(14)).into();
        checksum += m7.into() + md.into() + mc.into() + m_coin.into() + ml.into();

        if is_666 {
            checksum += 17;
        }
        if is_jackpot {
            checksum += 31;
        }

        i += 1;
    }

    assert(checksum != 0, 'spin profile guard');
}

#[test]
fn profile_generate_grid_hot_path() {
    let probability_bonuses = (8, 5, 3, 2, 1);

    let mut checksum: felt252 = 0;
    let mut i: u32 = 0;
    while i != PROFILE_ITERATIONS {
        let random_word: felt252 = (0xC011EC7_u32 + i).into();
        let (grid, is_666, is_jackpot) = generate_grid_from_random(
            random_word, 24, probability_bonuses, 0, 18,
        );

        checksum += (*grid.at(0)).into();
        checksum += (*grid.at(4)).into();
        checksum += (*grid.at(8)).into();
        checksum += (*grid.at(14)).into();

        if is_666 {
            checksum += 13;
        }
        if is_jackpot {
            checksum += 29;
        }

        i += 1;
    }

    assert(checksum != 0, 'grid profile guard');
}

fn declared_class_hash(name: ByteArray) -> ClassHash {
    let declared = declare(name).unwrap();
    let contract_class = declared.contract_class();
    (*contract_class).class_hash
}

fn request_spin_profile_world() -> (dojo::world::WorldStorage, ContractAddress, ContractAddress) {
    let world_class_hash = declared_class_hash("world");
    let resources = array![
        TestResource::Model(declared_class_hash("m_Config")),
        TestResource::Model(declared_class_hash("m_Session")),
        TestResource::Model(declared_class_hash("m_SpinResult")),
        TestResource::Model(declared_class_hash("m_SessionChipBonus")),
        TestResource::Model(declared_class_hash("m_SessionInventory")),
        TestResource::Model(declared_class_hash("m_Item")),
        TestResource::Model(declared_class_hash("m_SessionItemIndex")),
        TestResource::Model(declared_class_hash("m_SessionItemEntry")),
        TestResource::Model(declared_class_hash("m_SessionCharms")),
        TestResource::Model(declared_class_hash("m_SessionCharmEntry")),
        TestResource::Model(declared_class_hash("m_SessionCharmLoadout")),
        TestResource::Event(declared_class_hash("e_SpinCompleted")),
        TestResource::Contract(declared_class_hash("Play")),
        TestResource::Contract(declared_class_hash("Collection")),
    ];

    let world = spawn_test_world(
        world_class_hash, array![NamespaceDef { namespace: NAMESPACE(), resources: resources.span() }]
            .span(),
    );

    let play_def = ContractDefTrait::new(@NAMESPACE(), @"Play")
        .with_writer_of(
            array![
                selector_from_names(@NAMESPACE(), @"Session"),
                selector_from_names(@NAMESPACE(), @"SpinResult"),
                selector_from_names(@NAMESPACE(), @"SessionChipBonus"),
                selector_from_names(@NAMESPACE(), @"SpinCompleted"),
            ]
                .span(),
        );
    world.sync_perms_and_inits(array![play_def].span());

    let play_address = world.dns_address(@"Play").expect('Play not found');
    let collection_address = world.dns_address(@"Collection").expect('Collection not found');
    (world, play_address, collection_address)
}

fn seed_request_spin_profile_static_models(
    ref world: dojo::world::WorldStorage, vrf_address: ContractAddress,
) {
    world
        .write_model_test(
            @Config {
                world_resource: WORLD_RESOURCE,
                admin: 0.try_into().unwrap(),
                vrf: vrf_address,
                pragma_oracle: 0.try_into().unwrap(),
                quote_token: 0.try_into().unwrap(),
                chip_token: 0.try_into().unwrap(),
                charm_nft: 0.try_into().unwrap(),
                relic_nft: 0.try_into().unwrap(),
                beast_nft: 0.try_into().unwrap(),
                treasury: 0.try_into().unwrap(),
                team: 0.try_into().unwrap(),
                seven_points: DEFAULT_SCORE_SEVEN,
                seven_prob: 10,
                diamond_points: DEFAULT_SCORE_DIAMOND,
                diamond_prob: 10,
                cherry_points: DEFAULT_SCORE_CHERRY,
                cherry_prob: 10,
                coin_points: DEFAULT_SCORE_COIN,
                coin_prob: 10,
                lemon_points: DEFAULT_SCORE_LEMON,
                lemon_prob: 10,
                six_points: 0,
                six_prob: 0,
                pattern_h3_mult: 0,
                pattern_h4_mult: 0,
                pattern_h5_mult: 0,
                pattern_v3_mult: 0,
                pattern_d3_mult: 0,
                probability_666: 0,
                chip_emission_rate: 0,
                chip_boost_multiplier: 0,
                entry_price_usd: 0,
                total_sessions: 0,
                total_competitive_sessions: 0,
                total_items: 4,
                burn_percentage: 0,
                treasury_percentage: 0,
                team_percentage: 0,
                ekubo_router: 0.try_into().unwrap(),
                pool_fee: 0,
                pool_tick_spacing: 0,
                pool_extension: 0.try_into().unwrap(),
                pool_sqrt: 0,
            },
        );

    world
        .write_model_test(
            @Item {
                item_id: 1,
                name: 'Crown',
                description: 'Seven +2',
                price: 10,
                sell_price: 5,
                effect_type: ItemEffectType::DirectScoreBonus,
                effect_value: 2,
                target_symbol: 'seven',
            },
        );
    world
        .write_model_test(
            @Item {
                item_id: 2,
                name: 'Banner',
                description: 'All pats +25',
                price: 10,
                sell_price: 5,
                effect_type: ItemEffectType::PatternMultiplierBoost,
                effect_value: 25,
                target_symbol: '',
            },
        );
    world
        .write_model_test(
            @Item {
                item_id: 3,
                name: 'Coin',
                description: 'Coin +3%',
                price: 10,
                sell_price: 5,
                effect_type: ItemEffectType::SymbolProbabilityBoost,
                effect_value: 3,
                target_symbol: 'coin',
            },
        );
    world
        .write_model_test(
            @Item {
                item_id: 4,
                name: 'Wheel',
                description: '+1 spin',
                price: 10,
                sell_price: 5,
                effect_type: ItemEffectType::SpinBonus,
                effect_value: 1,
                target_symbol: '',
            },
        );
}

fn seed_request_spin_profile_session(
    ref world: dojo::world::WorldStorage, session_id: u32, player: ContractAddress,
) {
    world
        .write_model_test(
            @Session {
                session_id,
                player_address: player,
                level: 5,
                score: 80,
                total_score: 400,
                spins_remaining: 3,
                is_competitive: true,
                is_active: true,
                created_at: 1,
                chips_claimed: false,
                equipped_relic: 0,
                relic_last_used_spin: 0,
                relic_pending_effect: RelicEffectType::NoEffect,
                total_spins: 7,
                luck: 0,
                blocked_666_this_session: true,
                tickets: 6,
                score_seven: DEFAULT_SCORE_SEVEN,
                score_diamond: DEFAULT_SCORE_DIAMOND,
                score_cherry: DEFAULT_SCORE_CHERRY,
                score_coin: DEFAULT_SCORE_COIN,
                score_lemon: DEFAULT_SCORE_LEMON,
            },
        );
    world
        .write_model_test(
            @SpinResult {
                session_id,
                cell_0: 1,
                cell_1: 1,
                cell_2: 2,
                cell_3: 3,
                cell_4: 4,
                cell_5: 2,
                cell_6: 2,
                cell_7: 5,
                cell_8: 1,
                cell_9: 4,
                cell_10: 3,
                cell_11: 4,
                cell_12: 5,
                cell_13: 1,
                cell_14: 2,
                score: 27,
                patterns_count: 2,
                is_666: false,
                is_jackpot: false,
                is_pending: false,
                biblia_used: false,
            },
        );
    world.write_model_test(@SessionItemIndex { session_id, count: 4 });
    world.write_model_test(@SessionChipBonus { session_id, bonus_units: 0 });
    world.write_model_test(@SessionItemEntry { session_id, index: 0, item_id: 1 });
    world.write_model_test(@SessionItemEntry { session_id, index: 1, item_id: 2 });
    world.write_model_test(@SessionItemEntry { session_id, index: 2, item_id: 3 });
    world.write_model_test(@SessionItemEntry { session_id, index: 3, item_id: 4 });
    world.write_model_test(@SessionCharms { session_id, count: 6 });
    world.write_model_test(@SessionCharmEntry { session_id, index: 0, charm_id: 4 });
    world.write_model_test(@SessionCharmEntry { session_id, index: 1, charm_id: 6 });
    world.write_model_test(@SessionCharmEntry { session_id, index: 2, charm_id: 8 });
    world.write_model_test(@SessionCharmEntry { session_id, index: 3, charm_id: 11 });
    world.write_model_test(@SessionCharmEntry { session_id, index: 4, charm_id: 12 });
    world.write_model_test(@SessionCharmEntry { session_id, index: 5, charm_id: 18 });
    world.write_model_test(@SessionInventory { session_id, item_id: 40, quantity: 0 });
}

#[test]
fn profile_request_spin_world_path() {
    let (mut world, play_address, collection_address) = request_spin_profile_world();
    let player: ContractAddress = 0x1234.try_into().unwrap();
    let vrf_address: ContractAddress = 0x9876.try_into().unwrap();
    let play = IPlayDispatcher { contract_address: play_address };

    seed_request_spin_profile_static_models(ref world, vrf_address);
    start_mock_call(vrf_address, selector!("consume_random"), 0x00C0FFEE);
    start_mock_call(collection_address, selector!("update"), ());
    start_cheat_caller_address(play_address, player);

    let mut checksum: felt252 = 0;
    let mut i: u32 = 0;
    while i != REQUEST_SPIN_PROFILE_ITERATIONS {
        let session_id = i + 1;
        seed_request_spin_profile_session(ref world, session_id, player);
        play.request_spin(session_id);

        let store = StoreTrait::new(world);
        let session = store.session(session_id);
        let spin_result = store.spin_result(session_id);

        checksum += session.score.into();
        checksum += session.total_score.into();
        checksum += session.spins_remaining.into();
        checksum += session.luck.into();
        checksum += session.score_seven.into();
        checksum += spin_result.score.into();
        checksum += spin_result.patterns_count.into();
        checksum += spin_result.cell_0.into();
        checksum += spin_result.is_666.into();
        checksum += spin_result.is_jackpot.into();

        i += 1;
    }

    assert(checksum != 0, 'request spin guard');
}

fn refresh_market_profile_world() -> (dojo::world::WorldStorage, ContractAddress) {
    let world_class_hash = declared_class_hash("world");
    let resources = array![
        TestResource::Model(declared_class_hash("m_Config")),
        TestResource::Model(declared_class_hash("m_Session")),
        TestResource::Model(declared_class_hash("m_SessionMarket")),
        TestResource::Model(declared_class_hash("m_MarketSlotPurchased")),
        TestResource::Model(declared_class_hash("m_SpinResult")),
        TestResource::Model(declared_class_hash("m_SessionItemIndex")),
        TestResource::Model(declared_class_hash("m_SessionCharms")),
        TestResource::Model(declared_class_hash("m_SessionCharmEntry")),
        TestResource::Model(declared_class_hash("m_SessionCharmLoadout")),
        TestResource::Event(declared_class_hash("e_MarketRefreshed")),
        TestResource::Contract(declared_class_hash("Market")),
    ];

    let world = spawn_test_world(
        world_class_hash, array![NamespaceDef { namespace: NAMESPACE(), resources: resources.span() }]
            .span(),
    );

    let market_def = ContractDefTrait::new(@NAMESPACE(), @"Market")
        .with_writer_of(
            array![
                selector_from_names(@NAMESPACE(), @"Session"),
                selector_from_names(@NAMESPACE(), @"SessionMarket"),
                selector_from_names(@NAMESPACE(), @"MarketSlotPurchased"),
                selector_from_names(@NAMESPACE(), @"MarketRefreshed"),
            ]
                .span(),
        );
    world.sync_perms_and_inits(array![market_def].span());

    let market_address = world.dns_address(@"Market").expect('Market not found');
    (world, market_address)
}

fn seed_refresh_market_profile_static_models(ref world: dojo::world::WorldStorage) {
    world
        .write_model_test(
            @Config {
                world_resource: WORLD_RESOURCE,
                admin: 0.try_into().unwrap(),
                vrf: 0.try_into().unwrap(),
                pragma_oracle: 0.try_into().unwrap(),
                quote_token: 0.try_into().unwrap(),
                chip_token: 0.try_into().unwrap(),
                charm_nft: 0.try_into().unwrap(),
                relic_nft: 0.try_into().unwrap(),
                beast_nft: 0.try_into().unwrap(),
                treasury: 0.try_into().unwrap(),
                team: 0.try_into().unwrap(),
                seven_points: DEFAULT_SCORE_SEVEN,
                seven_prob: 10,
                diamond_points: DEFAULT_SCORE_DIAMOND,
                diamond_prob: 10,
                cherry_points: DEFAULT_SCORE_CHERRY,
                cherry_prob: 10,
                coin_points: DEFAULT_SCORE_COIN,
                coin_prob: 10,
                lemon_points: DEFAULT_SCORE_LEMON,
                lemon_prob: 10,
                six_points: 0,
                six_prob: 0,
                pattern_h3_mult: 0,
                pattern_h4_mult: 0,
                pattern_h5_mult: 0,
                pattern_v3_mult: 0,
                pattern_d3_mult: 0,
                probability_666: 0,
                chip_emission_rate: 0,
                chip_boost_multiplier: 0,
                entry_price_usd: 0,
                total_sessions: 0,
                total_competitive_sessions: 0,
                total_items: 40,
                burn_percentage: 0,
                treasury_percentage: 0,
                team_percentage: 0,
                ekubo_router: 0.try_into().unwrap(),
                pool_fee: 0,
                pool_tick_spacing: 0,
                pool_extension: 0.try_into().unwrap(),
                pool_sqrt: 0,
            },
        );
}

fn seed_refresh_market_profile_session(
    ref world: dojo::world::WorldStorage, session_id: u32, player: ContractAddress,
) {
    world
        .write_model_test(
            @Session {
                session_id,
                player_address: player,
                level: 3,
                score: 250,
                total_score: 250,
                spins_remaining: 4,
                is_competitive: true,
                is_active: true,
                created_at: 1,
                chips_claimed: false,
                equipped_relic: 0,
                relic_last_used_spin: 0,
                relic_pending_effect: RelicEffectType::NoEffect,
                total_spins: 3,
                luck: 0,
                blocked_666_this_session: false,
                tickets: 3,
                score_seven: DEFAULT_SCORE_SEVEN,
                score_diamond: DEFAULT_SCORE_DIAMOND,
                score_cherry: DEFAULT_SCORE_CHERRY,
                score_coin: DEFAULT_SCORE_COIN,
                score_lemon: DEFAULT_SCORE_LEMON,
            },
        );
    world
        .write_model_test(
            @SessionMarket {
                session_id,
                refresh_count: 2,
                item_slot_1: 1,
                item_slot_2: 2,
                item_slot_3: 3,
                item_slot_4: 4,
                item_slot_5: 5,
                item_slot_6: 6,
            },
        );
    world.write_model_test(@SpinResult {
        session_id,
        cell_0: 0,
        cell_1: 0,
        cell_2: 0,
        cell_3: 0,
        cell_4: 0,
        cell_5: 0,
        cell_6: 0,
        cell_7: 0,
        cell_8: 0,
        cell_9: 0,
        cell_10: 0,
        cell_11: 0,
        cell_12: 0,
        cell_13: 0,
        cell_14: 0,
        score: 0,
        patterns_count: 0,
        is_666: false,
        is_jackpot: false,
        is_pending: false,
        biblia_used: false,
    });
    world.write_model_test(@SessionItemIndex { session_id, count: 0 });
    world.write_model_test(@SessionCharms { session_id, count: 0 });

    let mut slot: u32 = 0;
    while slot != 6 {
        world.write_model_test(@MarketSlotPurchased { session_id, slot, purchased: false });
        slot += 1;
    }
}

#[test]
fn profile_refresh_market_world_path() {
    let (mut world, market_address) = refresh_market_profile_world();
    let player: ContractAddress = 0xABCD.try_into().unwrap();
    let market = IMarketDispatcher { contract_address: market_address };

    seed_refresh_market_profile_static_models(ref world);
    start_cheat_caller_address(market_address, player);

    let mut checksum: felt252 = 0;
    let mut i: u32 = 0;
    while i != REFRESH_MARKET_PROFILE_ITERATIONS {
        let session_id = i + 1;
        seed_refresh_market_profile_session(ref world, session_id, player);
        market.refresh_market(session_id);

        let store = StoreTrait::new(world);
        let session = store.session(session_id);
        let refreshed_market = store.session_market(session_id);

        checksum += session.score.into();
        checksum += refreshed_market.refresh_count.into();
        checksum += refreshed_market.item_slot_1.into();
        checksum += refreshed_market.item_slot_2.into();
        checksum += refreshed_market.item_slot_3.into();
        checksum += refreshed_market.item_slot_4.into();
        checksum += refreshed_market.item_slot_5.into();
        checksum += refreshed_market.item_slot_6.into();

        i += 1;
    }

    assert(checksum != 0, 'refresh market guard');
}

fn is_charm_item(item_id: u32) -> bool {
    item_id >= 1001 && item_id <= 1100
}

fn loadout_contains(
    loadout: SessionCharmLoadout, charm_item_id: u32,
) -> bool {
    if charm_item_id < 1001 {
        return false;
    }
    let charm_id = charm_item_id - 1000;
    loadout.charm_id_1 == charm_id
        || loadout.charm_id_2 == charm_id
        || loadout.charm_id_3 == charm_id
}

fn assert_no_charms_in_market(market: SessionMarket) {
    assert(!is_charm_item(market.item_slot_1), 'slot1 charm leak');
    assert(!is_charm_item(market.item_slot_2), 'slot2 charm leak');
    assert(!is_charm_item(market.item_slot_3), 'slot3 charm leak');
    assert(!is_charm_item(market.item_slot_4), 'slot4 charm leak');
    assert(!is_charm_item(market.item_slot_5), 'slot5 charm leak');
    assert(!is_charm_item(market.item_slot_6), 'slot6 charm leak');
}

fn assert_charms_limited_to_loadout(market: SessionMarket, loadout: SessionCharmLoadout) {
    let slots = array![
        market.item_slot_1,
        market.item_slot_2,
        market.item_slot_3,
        market.item_slot_4,
        market.item_slot_5,
        market.item_slot_6,
    ];
    let mut i: u32 = 0;
    while i < slots.len() {
        let slot = *slots.at(i);
        if is_charm_item(slot) {
            assert(loadout_contains(loadout, slot), 'charm outside loadout');
        }
        i += 1;
    };
}

#[test]
fn refresh_market_empty_loadout_never_rolls_charms() {
    let (mut world, market_address) = refresh_market_profile_world();
    let player: ContractAddress = 0xC11A5.try_into().unwrap();
    let market = IMarketDispatcher { contract_address: market_address };

    seed_refresh_market_profile_static_models(ref world);
    start_cheat_caller_address(market_address, player);

    let iterations: u32 = 12;
    let mut i: u32 = 0;
    while i != iterations {
        let session_id = 1000 + i;
        seed_refresh_market_profile_session(ref world, session_id, player);
        // No SessionCharmLoadout written → read returns zero-initialised defaults.
        market.refresh_market(session_id);

        let store = StoreTrait::new(world);
        let refreshed = store.session_market(session_id);
        assert_no_charms_in_market(refreshed);
        i += 1;
    };
}

#[test]
fn refresh_market_explicit_empty_loadout_never_rolls_charms() {
    let (mut world, market_address) = refresh_market_profile_world();
    let player: ContractAddress = 0xC11A6.try_into().unwrap();
    let market = IMarketDispatcher { contract_address: market_address };

    seed_refresh_market_profile_static_models(ref world);
    start_cheat_caller_address(market_address, player);

    let iterations: u32 = 12;
    let mut i: u32 = 0;
    while i != iterations {
        let session_id = 2000 + i;
        seed_refresh_market_profile_session(ref world, session_id, player);
        world
            .write_model_test(
                @SessionCharmLoadout {
                    session_id, charm_id_1: 0, charm_id_2: 0, charm_id_3: 0,
                },
            );
        market.refresh_market(session_id);

        let store = StoreTrait::new(world);
        let refreshed = store.session_market(session_id);
        assert_no_charms_in_market(refreshed);
        i += 1;
    };
}

#[test]
fn refresh_market_populated_loadout_only_rolls_loadout_charms() {
    let (mut world, market_address) = refresh_market_profile_world();
    let player: ContractAddress = 0xC11A7.try_into().unwrap();
    let market = IMarketDispatcher { contract_address: market_address };

    seed_refresh_market_profile_static_models(ref world);
    start_cheat_caller_address(market_address, player);

    let loadout = SessionCharmLoadout {
        session_id: 0, charm_id_1: 3, charm_id_2: 7, charm_id_3: 15,
    };

    let iterations: u32 = 24;
    let mut i: u32 = 0;
    let mut charm_sightings: u32 = 0;
    while i != iterations {
        let session_id = 3000 + i;
        seed_refresh_market_profile_session(ref world, session_id, player);
        world
            .write_model_test(
                @SessionCharmLoadout {
                    session_id,
                    charm_id_1: loadout.charm_id_1,
                    charm_id_2: loadout.charm_id_2,
                    charm_id_3: loadout.charm_id_3,
                },
            );
        market.refresh_market(session_id);

        let store = StoreTrait::new(world);
        let refreshed = store.session_market(session_id);
        let session_loadout = store.session_charm_loadout(session_id);
        assert_charms_limited_to_loadout(refreshed, session_loadout);

        let slots = array![
            refreshed.item_slot_1,
            refreshed.item_slot_2,
            refreshed.item_slot_3,
            refreshed.item_slot_4,
            refreshed.item_slot_5,
            refreshed.item_slot_6,
        ];
        let mut k: u32 = 0;
        while k < slots.len() {
            if is_charm_item(*slots.at(k)) {
                charm_sightings += 1;
            }
            k += 1;
        };

        i += 1;
    };

    // Sanity: across 24 refreshes with MARKET_CHARM_APPEAR_CHANCE non-zero we should
    // see the charm branch fire at least once. If this ever flakes, bump iterations.
    assert(charm_sightings > 0, 'loadout charms never rolled');
}
