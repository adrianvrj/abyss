use starknet::ContractAddress;

#[derive(Copy, Drop, Serde)]
pub enum Source {
    Nonce: ContractAddress,
    Salt: felt252,
}

#[starknet::interface]
pub trait IVrfProvider<TContractState> {
    fn request_random(
        ref self: TContractState, caller: ContractAddress, source: Source,
    );
    fn consume_random(ref self: TContractState, source: Source) -> felt252;
}
