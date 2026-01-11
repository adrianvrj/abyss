use starknet::ContractAddress;

#[starknet::interface]
pub trait ICharm<TContractState> {
    // Admin functions
    fn create_charm_type(
        ref self: TContractState,
        charm_id: u32,
        name: felt252,
        description: felt252,
        effect_type: u8,
        effect_value: u32,
        effect_value_2: u32,
        condition_type: u8,
        rarity: u8,
        shop_cost: u32,
        max_supply: u32,
    );

    fn update_charm_shop_cost(ref self: TContractState, charm_id: u32, new_cost: u32);

    // Called by game contract to mint reward
    fn mint_charm(ref self: TContractState, player: ContractAddress, charm_id: u32) -> u256;

    // Called by game contract for random rarity mint
    fn mint_random_charm_of_rarity(
        ref self: TContractState, player: ContractAddress, rarity: u8, random_seed: felt252,
    ) -> u256;

    // View functions
    fn get_charm_metadata(self: @TContractState, token_id: u256) -> CharmMetadata;
    fn get_charm_type_info(self: @TContractState, charm_id: u32) -> CharmMetadata;
    fn get_player_charms(self: @TContractState, player: ContractAddress) -> Array<u256>;
    fn get_supply_info(self: @TContractState, charm_id: u32) -> (u32, u32);
    fn get_charms_by_rarity(self: @TContractState, rarity: u8) -> Array<u32>;
    fn get_total_charm_types(self: @TContractState) -> u32;

    // Game contract authorization
    fn set_game_contract(ref self: TContractState, game_contract: ContractAddress);
    fn get_game_contract(self: @TContractState) -> ContractAddress;
}

/// Charm metadata stored on-chain
#[derive(Drop, Serde, starknet::Store, Copy)]
pub struct CharmMetadata {
    pub charm_id: u32,
    pub name: felt252,
    pub description: felt252,
    pub effect_type: u8, // 7=LuckBoost, 8=PatternRetrigger, 9=ExtraSpinWithLuck, 10=ConditionalLuckBoost
    pub effect_value: u32, // Primary value (luck amount, retrigger count, etc.)
    pub effect_value_2: u32, // Secondary value (for combo effects)
    pub condition_type: u8, // For conditional effects: 0=none, 1=no_patterns, 2=low_spins, 3=per_item, 4=low_score, 5=high_level, 6=blocked_666
    pub rarity: u8, // 0=Common, 1=Rare, 2=Epic, 3=Legendary
    pub shop_cost: u32 // Cost in game score
}

/// Effect type constants
pub mod CharmEffectType {
    pub const LuckBoost: u8 = 7;
    pub const PatternRetrigger: u8 = 8;
    pub const ExtraSpinWithLuck: u8 = 9;
    pub const ConditionalLuckBoost: u8 = 10;
}

/// Condition type constants for ConditionalLuckBoost
pub mod ConditionType {
    pub const None: u8 = 0;
    pub const NoPatternLastSpin: u8 = 1; // +luck if last spin had no patterns
    pub const LowSpinsRemaining: u8 = 2; // +luck if ≤2 spins remaining
    pub const PerItemInInventory: u8 = 3; // +luck per item owned
    pub const LowScore: u8 = 4; // +luck if score < 100
    pub const HighLevel: u8 = 5; // +luck if level ≥ 5
    pub const Blocked666: u8 = 6; // +luck if 666 was blocked this session
}

/// Rarity constants
pub mod Rarity {
    pub const Common: u8 = 0;
    pub const Rare: u8 = 1;
    pub const Epic: u8 = 2;
    pub const Legendary: u8 = 3;
}

#[starknet::contract]
mod Charm {
    use openzeppelin::access::ownable::OwnableComponent;
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::token::erc721::{ERC721Component, ERC721HooksEmptyImpl};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address};
    use super::{CharmMetadata, ICharm};

    component!(path: ERC721Component, storage: erc721, event: ERC721Event);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    #[abi(embed_v0)]
    impl ERC721MixinImpl = ERC721Component::ERC721MixinImpl<ContractState>;
    impl ERC721InternalImpl = ERC721Component::InternalImpl<ContractState>;

    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc721: ERC721Component::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        // Charm type definitions
        charms: Map<u32, CharmMetadata>,
        charm_max_supply: Map<u32, u32>,
        charm_current_supply: Map<u32, u32>,
        total_charm_types: u32,
        // Token to charm type mapping
        token_to_charm: Map<u256, u32>,
        next_token_id: u256,
        // Rarity tracking for random selection
        // Maps (rarity, index) -> charm_id
        charms_by_rarity: Map<(u8, u32), u32>,
        charms_count_by_rarity: Map<u8, u32>,
        // Game contract authorization
        game_contract: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC721Event: ERC721Component::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        CharmMinted: CharmMinted,
        CharmTypeCreated: CharmTypeCreated,
    }

    #[derive(Drop, starknet::Event)]
    struct CharmMinted {
        token_id: u256,
        charm_id: u32,
        player: ContractAddress,
        rarity: u8,
    }

    #[derive(Drop, starknet::Event)]
    struct CharmTypeCreated {
        charm_id: u32,
        name: felt252,
        rarity: u8,
        max_supply: u32,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, base_uri: ByteArray) {
        self.erc721.initializer("Soul Charms", "CHARM", base_uri);
        self.ownable.initializer(owner);
        self.next_token_id.write(1);
        self.total_charm_types.write(0);
    }

    #[abi(embed_v0)]
    impl CharmImpl of ICharm<ContractState> {
        /// Create a new charm type (admin only)
        fn create_charm_type(
            ref self: ContractState,
            charm_id: u32,
            name: felt252,
            description: felt252,
            effect_type: u8,
            effect_value: u32,
            effect_value_2: u32,
            condition_type: u8,
            rarity: u8,
            shop_cost: u32,
            max_supply: u32,
        ) {
            self.ownable.assert_only_owner();

            // Ensure charm_id doesn't exist
            let existing = self.charms.read(charm_id);
            assert(existing.charm_id == 0, 'Charm ID already exists');

            let metadata = CharmMetadata {
                charm_id,
                name,
                description,
                effect_type,
                effect_value,
                effect_value_2,
                condition_type,
                rarity,
                shop_cost,
            };

            self.charms.write(charm_id, metadata);
            self.charm_max_supply.write(charm_id, max_supply);
            self.charm_current_supply.write(charm_id, 0);

            // Add to rarity index for random selection
            let rarity_count = self.charms_count_by_rarity.read(rarity);
            self.charms_by_rarity.write((rarity, rarity_count), charm_id);
            self.charms_count_by_rarity.write(rarity, rarity_count + 1);

            let total = self.total_charm_types.read();
            self.total_charm_types.write(total + 1);

            self.emit(CharmTypeCreated { charm_id, name, rarity, max_supply });
        }

        fn update_charm_shop_cost(ref self: ContractState, charm_id: u32, new_cost: u32) {
            self.ownable.assert_only_owner();
            let mut metadata = self.charms.read(charm_id);
            assert(metadata.charm_id == charm_id, 'Charm does not exist');
            metadata.shop_cost = new_cost;
            self.charms.write(charm_id, metadata);
        }

        /// Mint a specific charm to a player (called by game contract)
        fn mint_charm(ref self: ContractState, player: ContractAddress, charm_id: u32) -> u256 {
            // Only game contract or owner can mint
            let caller = get_caller_address();
            let game = self.game_contract.read();
            assert(caller == game || caller == self.ownable.owner(), 'Not authorized to mint');

            // Check supply
            let current = self.charm_current_supply.read(charm_id);
            let max = self.charm_max_supply.read(charm_id);
            assert(current < max, 'Charm sold out');

            // Mint
            let token_id = self.next_token_id.read();
            self.erc721.mint(player, token_id);
            self.token_to_charm.write(token_id, charm_id);
            self.next_token_id.write(token_id + 1);
            self.charm_current_supply.write(charm_id, current + 1);

            let metadata = self.charms.read(charm_id);
            self.emit(CharmMinted { token_id, charm_id, player, rarity: metadata.rarity });

            token_id
        }

        /// Mint a random charm of specified rarity (for end-game rewards)
        fn mint_random_charm_of_rarity(
            ref self: ContractState, player: ContractAddress, rarity: u8, random_seed: felt252,
        ) -> u256 {
            // Only game contract or owner can mint
            let caller = get_caller_address();
            let game = self.game_contract.read();
            assert(caller == game || caller == self.ownable.owner(), 'Not authorized to mint');

            // Get charms of this rarity
            let rarity_count = self.charms_count_by_rarity.read(rarity);
            assert(rarity_count > 0, 'No charms of this rarity');

            // Find an available charm (not sold out)
            let seed_u256: u256 = random_seed.into();
            let start_index: u32 = (seed_u256 % rarity_count.into()).try_into().unwrap();

            let mut i: u32 = 0;
            let mut found_charm_id: u32 = 0;

            while i < rarity_count {
                let index = (start_index + i) % rarity_count;
                let charm_id = self.charms_by_rarity.read((rarity, index));

                let current = self.charm_current_supply.read(charm_id);
                let max = self.charm_max_supply.read(charm_id);

                if current < max {
                    found_charm_id = charm_id;
                    break;
                }

                i += 1;
            }

            assert(found_charm_id > 0, 'All charms of rarity sold out');

            // Mint the found charm
            self.mint_charm(player, found_charm_id)
        }

        /// Get metadata for a minted token
        fn get_charm_metadata(self: @ContractState, token_id: u256) -> CharmMetadata {
            let charm_id = self.token_to_charm.read(token_id);
            self.charms.read(charm_id)
        }

        /// Get charm type info (without needing a token)
        fn get_charm_type_info(self: @ContractState, charm_id: u32) -> CharmMetadata {
            self.charms.read(charm_id)
        }

        /// Get all charm token IDs owned by a player
        fn get_player_charms(self: @ContractState, player: ContractAddress) -> Array<u256> {
            let total_supply = self.next_token_id.read() - 1;
            let mut player_charms: Array<u256> = ArrayTrait::new();

            let mut i: u256 = 1;
            while i <= total_supply {
                // Check if token exists and is owned by player
                let owner = self.erc721.owner_of(i);
                if owner == player {
                    player_charms.append(i);
                }

                i += 1;
            }
            player_charms
        }

        /// Get supply info for a charm type
        fn get_supply_info(self: @ContractState, charm_id: u32) -> (u32, u32) {
            let current = self.charm_current_supply.read(charm_id);
            let max = self.charm_max_supply.read(charm_id);
            (current, max)
        }

        /// Get all charm IDs of a specific rarity
        fn get_charms_by_rarity(self: @ContractState, rarity: u8) -> Array<u32> {
            let count = self.charms_count_by_rarity.read(rarity);
            let mut charms: Array<u32> = ArrayTrait::new();

            let mut i: u32 = 0;
            while i < count {
                let charm_id = self.charms_by_rarity.read((rarity, i));
                charms.append(charm_id);
                i += 1;
            }

            charms
        }

        /// Get total number of charm types created
        fn get_total_charm_types(self: @ContractState) -> u32 {
            self.total_charm_types.read()
        }

        /// Set the game contract that can mint (admin only)
        fn set_game_contract(ref self: ContractState, game_contract: ContractAddress) {
            self.ownable.assert_only_owner();
            self.game_contract.write(game_contract);
        }

        /// Get the authorized game contract
        fn get_game_contract(self: @ContractState) -> ContractAddress {
            self.game_contract.read()
        }
    }
}
