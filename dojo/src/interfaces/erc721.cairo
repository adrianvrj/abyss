use starknet::ContractAddress;

#[starknet::interface]
pub trait IERC721<TContractState> {
    fn owner_of(self: @TContractState, token_id: u256) -> ContractAddress;
    fn balance_of(self: @TContractState, owner: ContractAddress) -> u256;
}
