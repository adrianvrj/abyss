// Minimal Pragma VRF interface for Abyss Game
// Based on: https://docs.pragma.build/starknet/deprecated/vrf
//
// This provides the interface to interact with Pragma's VRF oracle
// without requiring the full pragma_lib dependency.

use starknet::ContractAddress;

/// Interface for Pragma VRF Oracle
#[starknet::interface]
pub trait IRandomness<TContractState> {
    /// Request random words from the VRF oracle
    ///
    /// # Arguments
    /// * `seed` - Random seed that feeds into the VRF algorithm (must be different every time)
    /// * `callback_address` - Address to call receive_random_words on
    /// * `callback_fee_limit` - Overall fee limit on the callback function
    /// * `publish_delay` - Minimum number of blocks to wait from request to fulfillment
    /// * `num_words` - Number of random words to receive
    /// * `calldata` - Calldata to pass to the callback function
    ///
    /// # Returns
    /// * `request_id` - ID of the request
    fn request_random(
        ref self: TContractState,
        seed: u64,
        callback_address: ContractAddress,
        callback_fee_limit: u128,
        publish_delay: u64,
        num_words: u64,
        calldata: Array<felt252>,
    ) -> u64;

    /// Compute the premium fee for a randomness request
    fn compute_premium_fee(self: @TContractState, caller: ContractAddress) -> u128;

    /// Get the status of a randomness request
    fn get_request_status(self: @TContractState, request_id: u64) -> u8;
}
