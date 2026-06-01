use crate::systems::charm_market::{
    HUNDRED, SALE_BURN_PERCENTAGE, SALE_TEAM_PERCENTAGE, compute_sale_split,
};

const ONE_CHIP: u256 = 1_000_000_000_000_000_000;

#[test]
fn test_sale_split_round_number() {
    // 100 CHIP: 5 burn, 2 team, 93 seller.
    let price = 100 * ONE_CHIP;
    let (burn, team, seller) = compute_sale_split(price);
    assert(burn == 5 * ONE_CHIP, 'bad burn');
    assert(team == 2 * ONE_CHIP, 'bad team');
    assert(seller == 93 * ONE_CHIP, 'bad seller');
    assert(burn + team + seller == price, 'split must conserve total');
}

#[test]
fn test_sale_split_conserves_total_with_dust() {
    // A price that does not divide evenly: dust accrues to the seller.
    let price: u256 = 101;
    let (burn, team, seller) = compute_sale_split(price);
    // 101 * 5 / 100 = 5, 101 * 2 / 100 = 2, seller = 94.
    assert(burn == 5, 'bad burn dust');
    assert(team == 2, 'bad team dust');
    assert(seller == 94, 'bad seller dust');
    assert(burn + team + seller == price, 'dust must go to seller');
}

#[test]
fn test_sale_split_percentages_constants() {
    assert(SALE_BURN_PERCENTAGE == 5, 'burn pct');
    assert(SALE_TEAM_PERCENTAGE == 2, 'team pct');
    assert(HUNDRED == 100, 'hundred');
}

#[test]
fn test_sale_split_small_price_zero_fees() {
    // Below 20 wei, the 5% burn and 2% team round to zero; seller gets all.
    let price: u256 = 10;
    let (burn, team, seller) = compute_sale_split(price);
    assert(burn == 0, 'burn rounds to zero');
    assert(team == 0, 'team rounds to zero');
    assert(seller == 10, 'seller gets all');
}
