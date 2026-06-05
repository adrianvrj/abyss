use core::result::ResultTrait;
use dojo::model::ModelStorageTest;
use dojo::utils::{bytearray_hash, selector_from_names};
use dojo::world::WorldStorageTrait;
use dojo_cairo_test::world::{
    ContractDefTrait, NamespaceDef, TestResource, WorldStorageTestTrait, spawn_test_world,
};
use snforge_std::{DeclareResultTrait, declare, start_cheat_caller_address};
use starknet::{ClassHash, ContractAddress};
use crate::constants::{
    DEFAULT_CHIP_BOOST_MULTIPLIER, DEFAULT_CHIP_EMISSION_RATE, DEFAULT_SCORE_CHERRY,
    DEFAULT_SCORE_COIN, DEFAULT_SCORE_DIAMOND, DEFAULT_SCORE_LEMON, DEFAULT_SCORE_SEVEN, NAMESPACE,
    PATTERN_D3_MULT, PATTERN_H3_MULT, PATTERN_H4_MULT, PATTERN_H5_MULT, PATTERN_V3_MULT,
    REVENUE_BURN_PCT, REVENUE_PRIZE_PCT, REVENUE_TEAM_PCT, REVENUE_TREASURY_PCT, WORLD_RESOURCE,
};
use crate::models::index::Config;
use crate::systems::golden_chip::{IGoldenChipDispatcher, IGoldenChipDispatcherTrait};

fn declared_class_hash(name: ByteArray) -> ClassHash {
    let declared = declare(name).unwrap();
    let contract_class = declared.contract_class();
    (*contract_class).class_hash
}

fn golden_chip_world() -> (
    dojo::world::WorldStorage, ContractAddress, ContractAddress, ContractAddress,
) {
    let world_class_hash = declared_class_hash("world");
    let resources = array![
        TestResource::Model(declared_class_hash("m_Config")),
        TestResource::Model(declared_class_hash("m_Session")),
        TestResource::Model(declared_class_hash("m_SessionMarket")),
        TestResource::Model(declared_class_hash("m_PlayerSessions")),
        TestResource::Model(declared_class_hash("m_PlayerSessionEntry")),
        TestResource::Model(declared_class_hash("m_SessionChipBonus")),
        TestResource::Model(declared_class_hash("m_SessionItemPurchaseCount")),
        TestResource::Model(declared_class_hash("m_SessionCharmLoadout")),
        TestResource::Model(declared_class_hash("m_PendingCharmLoadout")),
        TestResource::Event(declared_class_hash("e_SessionCreated")),
        TestResource::Event(declared_class_hash("e_MarketRefreshed")),
        TestResource::Contract(declared_class_hash("Collection")),
        TestResource::Contract(declared_class_hash("Play")),
        TestResource::Contract(declared_class_hash("Setup")),
        TestResource::Contract(declared_class_hash("GoldenChip")),
        TestResource::Contract(declared_class_hash("Treasury")),
    ];

    let world = spawn_test_world(
        world_class_hash,
        array![NamespaceDef { namespace: NAMESPACE(), resources: resources.span() }].span(),
    );

    let collection_def = ContractDefTrait::new(@NAMESPACE(), @"Collection")
        .with_owner_of([bytearray_hash(@NAMESPACE())].span());
    let play_def = ContractDefTrait::new(@NAMESPACE(), @"Play")
        .with_writer_of(
            array![
                selector_from_names(@NAMESPACE(), @"Config"),
                selector_from_names(@NAMESPACE(), @"Session"),
                selector_from_names(@NAMESPACE(), @"SessionMarket"),
                selector_from_names(@NAMESPACE(), @"PlayerSessions"),
                selector_from_names(@NAMESPACE(), @"PlayerSessionEntry"),
                selector_from_names(@NAMESPACE(), @"SessionChipBonus"),
                selector_from_names(@NAMESPACE(), @"SessionItemPurchaseCount"),
                selector_from_names(@NAMESPACE(), @"SessionCharmLoadout"),
                selector_from_names(@NAMESPACE(), @"PendingCharmLoadout"),
                selector_from_names(@NAMESPACE(), @"SessionCreated"),
                selector_from_names(@NAMESPACE(), @"MarketRefreshed"),
            ]
                .span(),
        );
    let golden_chip_def = ContractDefTrait::new(@NAMESPACE(), @"GoldenChip")
        .with_owner_of([bytearray_hash(@NAMESPACE())].span());
    let treasury_def = ContractDefTrait::new(@NAMESPACE(), @"Treasury");
    world
        .sync_perms_and_inits(
            array![collection_def, play_def, golden_chip_def, treasury_def].span(),
        );

    let golden_chip_address = world.dns_address(@"GoldenChip").expect('GoldenChip not found');
    let setup_address = world.dns_address(@"Setup").expect('Setup not found');
    let treasury_address = world.dns_address(@"Treasury").expect('Treasury not found');
    (world, golden_chip_address, setup_address, treasury_address)
}

fn seed_config(ref world: dojo::world::WorldStorage) {
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
                diamond_prob: 15,
                cherry_points: DEFAULT_SCORE_CHERRY,
                cherry_prob: 20,
                coin_points: DEFAULT_SCORE_COIN,
                coin_prob: 25,
                lemon_points: DEFAULT_SCORE_LEMON,
                lemon_prob: 24,
                six_points: 0,
                six_prob: 0,
                pattern_h3_mult: PATTERN_H3_MULT,
                pattern_h4_mult: PATTERN_H4_MULT,
                pattern_h5_mult: PATTERN_H5_MULT,
                pattern_v3_mult: PATTERN_V3_MULT,
                pattern_d3_mult: PATTERN_D3_MULT,
                probability_666: 150,
                chip_emission_rate: DEFAULT_CHIP_EMISSION_RATE,
                chip_boost_multiplier: DEFAULT_CHIP_BOOST_MULTIPLIER,
                entry_price_usd: 0,
                total_sessions: 0,
                total_competitive_sessions: 0,
                total_items: 0,
                burn_percentage: REVENUE_BURN_PCT.try_into().unwrap(),
                treasury_percentage: REVENUE_TREASURY_PCT.try_into().unwrap(),
                team_percentage: REVENUE_TEAM_PCT.try_into().unwrap(),
                prize_percentage: REVENUE_PRIZE_PCT.try_into().unwrap(),
                ekubo_router: 0.try_into().unwrap(),
                pool_fee: 0,
                pool_tick_spacing: 0,
                pool_extension: 0.try_into().unwrap(),
                pool_sqrt: 0,
                prize_receiver: 0.try_into().unwrap(),
                current_season_id: 1,
                season_end_ts: 0,
                active_leaderboard_id: 2,
                prize_outstanding: 0,
            },
        );
}

#[test]
fn golden_chip_consumes_daily_run_without_stacking() {
    let (mut world, golden_chip_address, setup_address, treasury_address) = golden_chip_world();
    seed_config(ref world);

    let player: ContractAddress = 0x123.try_into().unwrap();
    let golden_chip = IGoldenChipDispatcher { contract_address: golden_chip_address };

    start_cheat_caller_address(golden_chip_address, treasury_address);
    golden_chip.set_mint_price(0);

    start_cheat_caller_address(golden_chip_address, player);
    golden_chip.mint();
    golden_chip.mint();

    assert_eq!(golden_chip.get_available_daily_runs(player), 1);
    start_cheat_caller_address(golden_chip_address, setup_address);
    golden_chip.consume_daily_runs(player, 1);
    assert_eq!(golden_chip.get_available_daily_runs(player), 0);
}

#[test]
fn golden_chip_admin_mint_grants_holder_benefit_without_payment() {
    let (mut world, golden_chip_address, _, treasury_address) = golden_chip_world();
    seed_config(ref world);

    let player: ContractAddress = 0x234.try_into().unwrap();
    let golden_chip = IGoldenChipDispatcher { contract_address: golden_chip_address };

    start_cheat_caller_address(golden_chip_address, treasury_address);
    golden_chip.admin_mint(player, 2);

    assert_eq!(golden_chip.get_available_daily_runs(player), 1);
}

#[test]
#[should_panic]
fn golden_chip_rejects_non_admin_mint() {
    let (mut world, golden_chip_address, _, _) = golden_chip_world();
    seed_config(ref world);

    let player: ContractAddress = 0x345.try_into().unwrap();
    let golden_chip = IGoldenChipDispatcher { contract_address: golden_chip_address };

    start_cheat_caller_address(golden_chip_address, player);
    golden_chip.admin_mint(player, 1);
}

#[test]
#[should_panic(expected: ('Sold out',))]
fn golden_chip_admin_mint_respects_max_supply() {
    let (mut world, golden_chip_address, _, treasury_address) = golden_chip_world();
    seed_config(ref world);

    let player: ContractAddress = 0x567.try_into().unwrap();
    let golden_chip = IGoldenChipDispatcher { contract_address: golden_chip_address };

    start_cheat_caller_address(golden_chip_address, treasury_address);
    golden_chip.set_max_supply(1);
    golden_chip.admin_mint(player, 2);
}

#[test]
#[should_panic(expected: ('Daily limit exceeded',))]
fn golden_chip_rejects_second_daily_run() {
    let (mut world, golden_chip_address, setup_address, treasury_address) = golden_chip_world();
    seed_config(ref world);

    let player: ContractAddress = 0x456.try_into().unwrap();
    let golden_chip = IGoldenChipDispatcher { contract_address: golden_chip_address };

    start_cheat_caller_address(golden_chip_address, treasury_address);
    golden_chip.set_mint_price(0);

    start_cheat_caller_address(golden_chip_address, player);
    golden_chip.mint();
    start_cheat_caller_address(golden_chip_address, setup_address);
    golden_chip.consume_daily_runs(player, 1);
    golden_chip.consume_daily_runs(player, 1);
}

#[test]
#[should_panic(expected: ('Daily limit exceeded',))]
fn golden_chip_rejects_non_holder_claim() {
    let (mut world, golden_chip_address, setup_address, _) = golden_chip_world();
    seed_config(ref world);

    let player: ContractAddress = 0x789.try_into().unwrap();
    let golden_chip = IGoldenChipDispatcher { contract_address: golden_chip_address };

    start_cheat_caller_address(golden_chip_address, setup_address);
    golden_chip.consume_daily_runs(player, 1);
}

#[test]
#[should_panic(expected: ('Only setup can consume',))]
fn golden_chip_rejects_direct_consume() {
    let (mut world, golden_chip_address, _, treasury_address) = golden_chip_world();
    seed_config(ref world);

    let player: ContractAddress = 0x987.try_into().unwrap();
    let golden_chip = IGoldenChipDispatcher { contract_address: golden_chip_address };

    start_cheat_caller_address(golden_chip_address, treasury_address);
    golden_chip.set_mint_price(0);

    start_cheat_caller_address(golden_chip_address, player);
    golden_chip.mint();
    golden_chip.consume_daily_runs(player, 1);
}
