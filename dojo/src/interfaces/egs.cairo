use starknet::ContractAddress;

pub const IMINIGAME_ID: felt252 =
    0x3d1730c22937da340212dec5546ff5826895259966fa6a92d1191ab068cc2b4;
pub const IMINIGAME_TOKEN_ID: felt252 =
    0x21c51b9820202309d87ff5d316b17b2d9280f2db9fd8fc2c6120c3a60869e49;

#[derive(Drop, Serde)]
pub struct GameContextDetails {
    pub id: felt252,
    pub value: felt252,
}

#[derive(Drop, Serde)]
pub struct MintGameParams {
    pub player_name: Option<felt252>,
    pub settings_id: Option<u32>,
    pub start: Option<u64>,
    pub end: Option<u64>,
    pub objective_id: Option<u32>,
    pub context: Option<GameContextDetails>,
    pub client_url: Option<ByteArray>,
    pub renderer_address: Option<ContractAddress>,
    pub skills_address: Option<ContractAddress>,
    pub to: ContractAddress,
    pub soulbound: bool,
    pub paymaster: bool,
    pub salt: u16,
    pub metadata: u16,
}

#[starknet::interface]
pub trait IMinigame<T> {
    fn token_address(self: @T) -> ContractAddress;
    fn settings_address(self: @T) -> ContractAddress;
    fn objectives_address(self: @T) -> ContractAddress;
    fn mint_game(
        self: @T,
        player_name: Option<felt252>,
        settings_id: Option<u32>,
        start: Option<u64>,
        end: Option<u64>,
        objective_id: Option<u32>,
        context: Option<GameContextDetails>,
        client_url: Option<ByteArray>,
        renderer_address: Option<ContractAddress>,
        skills_address: Option<ContractAddress>,
        to: ContractAddress,
        soulbound: bool,
        paymaster: bool,
        salt: u16,
        metadata: u16,
    ) -> felt252;
}

#[starknet::interface]
pub trait IMinigameTokenData<T> {
    fn score(self: @T, token_id: felt252) -> u64;
    fn game_over(self: @T, token_id: felt252) -> bool;
    fn score_batch(self: @T, token_ids: Span<felt252>) -> Array<u64>;
    fn game_over_batch(self: @T, token_ids: Span<felt252>) -> Array<bool>;
}

#[starknet::interface]
pub trait IMinigameToken<T> {
    fn game_registry_address(self: @T) -> ContractAddress;
    fn assert_is_playable(self: @T, token_id: felt252);
    fn mint(
        ref self: T,
        game_address: ContractAddress,
        player_name: Option<felt252>,
        settings_id: Option<u32>,
        start: Option<u64>,
        end: Option<u64>,
        objective_id: Option<u32>,
        context: Option<GameContextDetails>,
        client_url: Option<ByteArray>,
        renderer_address: Option<ContractAddress>,
        skills_address: Option<ContractAddress>,
        to: ContractAddress,
        soulbound: bool,
        paymaster: bool,
        salt: u16,
        metadata: u16,
    ) -> felt252;
    fn mint_batch(ref self: T, mints: Array<MintGameParams>) -> Array<felt252>;
    fn update_game(ref self: T, token_id: felt252);
}

#[starknet::interface]
pub trait IMinigameRegistry<T> {
    fn register_game(
        ref self: T,
        creator_address: ContractAddress,
        name: ByteArray,
        description: ByteArray,
        developer: ByteArray,
        publisher: ByteArray,
        genre: ByteArray,
        image: ByteArray,
        color: Option<ByteArray>,
        client_url: Option<ByteArray>,
        renderer_address: Option<ContractAddress>,
        royalty_fraction: Option<u128>,
        skills_address: Option<ContractAddress>,
        version: u64,
        license: Option<ByteArray>,
        game_fee_bps: Option<u16>,
    );
}
