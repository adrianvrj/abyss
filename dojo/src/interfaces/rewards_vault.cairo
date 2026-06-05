use starknet::ContractAddress;
use crate::models::index::RewardPools;

#[starknet::interface]
pub trait IRewardsVault<TContractState> {
    fn set_reward_pools(
        ref self: TContractState,
        gameplay_remaining: u256,
        charm_remaining: u256,
        reserve_remaining: u256,
    );
    fn move_reward_reserve_to_pool(ref self: TContractState, to_gameplay: bool, amount: u256);
    fn set_authorized_caller(ref self: TContractState, caller: ContractAddress, authorized: bool);
    fn pay_gameplay(
        ref self: TContractState, player: ContractAddress, session_id: u32, calculated_amount: u256,
    ) -> u256;
    fn pay_charm(
        ref self: TContractState,
        player: ContractAddress,
        session_id: u32,
        rarity: u8,
        token_id: u256,
        calculated_amount: u256,
    ) -> u256;
    fn get_reward_pools(self: @TContractState) -> RewardPools;
    fn get_gameplay_remaining(self: @TContractState) -> u256;
    fn get_charm_remaining(self: @TContractState) -> u256;
    fn get_reserve_remaining(self: @TContractState) -> u256;
}
