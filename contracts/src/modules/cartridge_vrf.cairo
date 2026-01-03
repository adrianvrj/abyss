// Cartridge VRF interface for Abyss Game
// Based on: https://github.com/cartridge-gg/vrf
//
// This provides the interface to interact with Cartridge's VRF provider
// for synchronous, same-transaction randomness.

use starknet::ContractAddress;

/// Source of entropy for VRF
#[derive(Drop, Copy, Clone, Serde)]
pub enum Source {
    Nonce: ContractAddress,
    Salt: felt252,
}

/// Interface for Cartridge VRF Provider
#[starknet::interface]
pub trait IVrfProvider<TContractState> {
    /// Request random - called by frontend as first call in multicall
    fn request_random(self: @TContractState, caller: ContractAddress, source: Source);

    /// Consume random - called by game contract to get the random value
    fn consume_random(ref self: TContractState, source: Source) -> felt252;
}
