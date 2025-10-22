use abyss_game::{IAbyssGameDispatcher, IAbyssGameDispatcherTrait};
use snforge_std::{declare, deploy};
use starknet::ContractAddress;

#[test]
fn test_contract_compiles_and_deploys() {
    let contract = declare("AbyssGame");
    let contract_address = deploy(contract, @array![ContractAddress::from_felt252(1.into())]).unwrap();
    let dispatcher = IAbyssGameDispatcher { contract_address };

    // Test that we can get admin address
    let admin = dispatcher.get_admin();
    assert(admin == ContractAddress::from_felt252(1.into()), 'Admin should match');
}

#[test]
fn test_session_creation() {
    let contract = declare("AbyssGame");
    let contract_address = deploy(contract, @array![ContractAddress::from_felt252(1.into())]).unwrap();
    let dispatcher = IAbyssGameDispatcher { contract_address };

    let player_address = ContractAddress::from_felt252(123.into());
    let session_id = dispatcher.create_session(player_address, true);

    // Test session data
    let session_data = dispatcher.get_session_data(session_id);
    assert(session_data.level == 1, 'New session should start at level 1');
    assert(session_data.score == 0, 'New session should start with 0 score');
    assert(session_data.total_score == 0, 'New session should start with 0 total score');
    assert(session_data.spins_remaining == 5, 'New session should start with 5 spins');
    assert(session_data.is_competitive == true, 'Session should be competitive');
    assert(session_data.is_active == true, 'Session should be active');
}

#[test]
fn test_session_score_update() {
    let contract = declare("AbyssGame");
    let contract_address = deploy(contract, @array![ContractAddress::from_felt252(1.into())]).unwrap();
    let dispatcher = IAbyssGameDispatcher { contract_address };

    let player_address = ContractAddress::from_felt252(123.into());
    let session_id = dispatcher.create_session(player_address, true);

    // Update score
    dispatcher.update_session_score(session_id, 50);
    let session_data = dispatcher.get_session_data(session_id);
    assert(session_data.score == 50, 'Score should be 50');
    assert(session_data.total_score == 50, 'Total score should be 50');
    assert(session_data.spins_remaining == 4, 'Should have 4 spins remaining');
}

#[test]
fn test_leaderboard_updates_only_on_session_end() {
    let contract = declare("AbyssGame");
    let contract_address = deploy(contract, @array![ContractAddress::from_felt252(1.into())]).unwrap();
    let dispatcher = IAbyssGameDispatcher { contract_address };

    let player_address = ContractAddress::from_felt252(123.into());
    let session_id = dispatcher.create_session(player_address, true);

    // Update session score multiple times
    dispatcher.update_session_score(session_id, 50);
    dispatcher.update_session_score(session_id, 30);
    dispatcher.update_session_score(session_id, 20);

    // Check that leaderboard is still empty (no updates during gameplay)
    let leaderboard_before_end = dispatcher.get_leaderboard();
    assert(leaderboard_before_end.len() == 0, 'Leaderboard should be empty during gameplay');

    // End the session
    dispatcher.end_own_session(session_id);

    // Now check that leaderboard has the session
    let leaderboard_after_end = dispatcher.get_leaderboard();
    assert(leaderboard_after_end.len() == 1, 'Leaderboard should have 1 entry after session ends');

    // Verify the entry is correct
    let entry = leaderboard_after_end.at(0);
    assert(entry.session_id == session_id, 'Leaderboard entry should match session');
    assert(entry.total_score == 100, 'Leaderboard should show final score 100');
}
