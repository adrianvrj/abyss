use crate::store::{Store, StoreTrait};
use starknet::ContractAddress;

#[generate_trait]
pub impl PricingImpl of PricingTrait {
    /// Get the cost of session entry in the configured quote token.
    fn get_usd_cost_in_token(store: @Store, token: ContractAddress) -> u256 {
        let config = store.config();
        let entry_price_usd = config.entry_price_usd;
        if entry_price_usd == 0 { return 0; }
        assert(token == config.quote_token, 'Unsupported payment token');
        entry_price_usd
    }
}
