use starknet::ContractAddress;

#[derive(Drop, Serde, Copy)]
pub struct RelicMetadata {
    pub relic_id: u32,
    pub name: felt252,
    pub description: felt252,
    pub effect_type: u8,
    pub cooldown_spins: u32,
    pub rarity: u8,
    pub image_uri: felt252,
    pub strength: u8,
    pub dexterity: u8,
    pub intelligence: u8,
    pub vitality: u8,
    pub wisdom: u8,
    pub charisma: u8,
    pub luck: u8,
}

#[starknet::interface]
pub trait IRelic<TContractState> {
    fn get_relic_metadata(self: @TContractState, token_id: u256) -> RelicMetadata;
    fn set_base_uri(ref self: TContractState, base_uri: ByteArray);
    fn get_base_uri(self: @TContractState) -> ByteArray;
}

#[starknet::interface]
pub trait IRelicERC721<TContractState> {
    fn owner_of(self: @TContractState, token_id: u256) -> ContractAddress;
    fn balance_of(self: @TContractState, owner: ContractAddress) -> u256;
}
