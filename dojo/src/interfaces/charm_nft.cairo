use starknet::ContractAddress;

#[derive(Drop, Serde, Copy)]
pub struct CharmMetadata {
    pub charm_id: u32,
    pub name: felt252,
    pub description: felt252,
    pub effect_type: u8,
    pub effect_value: u32,
    pub effect_value_2: u32,
    pub condition_type: u8,
    pub rarity: u8,
    pub shop_cost: u32,
}

#[starknet::interface]
pub trait ICharm<TContractState> {
    fn get_player_charms(self: @TContractState, player: ContractAddress) -> Array<u256>;
    fn get_charm_metadata(self: @TContractState, token_id: u256) -> CharmMetadata;
    fn get_charm_type_info(self: @TContractState, charm_id: u32) -> CharmMetadata;
    fn get_charm_forge_cost_in_token(
        self: @TContractState, payment_token: ContractAddress,
    ) -> u256;
    fn set_base_uri(ref self: TContractState, base_uri: ByteArray);
    fn get_base_uri(self: @TContractState) -> ByteArray;
    fn reroll_charms(
        ref self: TContractState,
        token_id_1: u256,
        token_id_2: u256,
        token_id_3: u256,
        payment_token: ContractAddress,
    ) -> u256;
    fn mint_random_charm_of_rarity(
        ref self: TContractState, player: ContractAddress, rarity: u8, random_seed: felt252,
    ) -> u256;
    fn get_charms_by_rarity(self: @TContractState, rarity: u8) -> Array<u32>;
    fn mint_charm(ref self: TContractState, player: ContractAddress, charm_id: u32) -> u256;
}
