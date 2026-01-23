use starknet::ContractAddress;

#[starknet::interface]
trait IRelic<TContractState> {
    fn create_relic_drop(
        ref self: TContractState,
        relic_id: u32,
        name: felt252,
        description: felt252,
        effect_type: u8,
        cooldown_spins: u32,
        rarity: u8,
        image_uri: felt252,
        strength: u8,
        dexterity: u8,
        intelligence: u8,
        vitality: u8,
        wisdom: u8,
        charisma: u8,
        luck: u8,
        price: u256,
        max_supply: u32,
    );
    fn mint_relic(ref self: TContractState, relic_id: u32) -> u256;
    fn get_relic_metadata(self: @TContractState, token_id: u256) -> RelicMetadata;
    fn get_relic_drop_info(self: @TContractState, relic_id: u32) -> (RelicMetadata, u256, u32, u32);
    fn get_player_relics(self: @TContractState, player: ContractAddress) -> Array<u256>;
    fn get_supply_info(self: @TContractState, relic_id: u32) -> (u32, u32);
    fn update_relic_metadata(
        ref self: TContractState,
        relic_id: u32,
        name: felt252,
        description: felt252,
        effect_type: u8,
        cooldown_spins: u32,
        rarity: u8,
        image_uri: felt252,
        strength: u8,
        dexterity: u8,
        intelligence: u8,
        vitality: u8,
        wisdom: u8,
        charisma: u8,
        luck: u8,
    );
    fn upgrade(ref self: TContractState, new_class_hash: starknet::class_hash::ClassHash);
    fn set_base_uri(ref self: TContractState, new_base_uri: ByteArray);
}

#[derive(Drop, Serde, starknet::Store, Copy)]
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

#[starknet::contract]
mod Relic {
    use openzeppelin::access::ownable::OwnableComponent;
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::token::erc721::interface::IERC721Metadata;
    use openzeppelin::token::erc721::{ERC721Component, ERC721HooksEmptyImpl};
    use openzeppelin::upgrades::UpgradeableComponent;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ClassHash, ContractAddress, get_caller_address};
    use super::{IRelic, RelicMetadata};

    component!(path: ERC721Component, storage: erc721, event: ERC721Event);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: UpgradeableComponent, storage: upgradeable, event: UpgradeableEvent);

    #[abi(embed_v0)]
    #[abi(embed_v0)]
    impl ERC721Impl = ERC721Component::ERC721Impl<ContractState>;
    #[abi(embed_v0)]
    impl ERC721CamelOnlyImpl = ERC721Component::ERC721CamelOnlyImpl<ContractState>;
    impl ERC721InternalImpl = ERC721Component::InternalImpl<ContractState>;

    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    impl UpgradeableInternalImpl = UpgradeableComponent::InternalImpl<ContractState>;

    #[starknet::interface]
    trait IMetadataOverride<TState> {
        fn name(self: @TState) -> ByteArray;
        fn symbol(self: @TState) -> ByteArray;
        fn token_uri(self: @TState, token_id: u256) -> ByteArray;
    }

    #[abi(embed_v0)]
    impl MetadataOverrideImpl of IMetadataOverride<ContractState> {
        fn name(self: @ContractState) -> ByteArray {
            self.erc721.name()
        }
        fn symbol(self: @ContractState) -> ByteArray {
            self.erc721.symbol()
        }
        fn token_uri(self: @ContractState, token_id: u256) -> ByteArray {
            assert(self.erc721.exists(token_id), 'ERC721: invalid token ID');
            let base_uri = self.erc721._base_uri();
            let relic_id = self.token_to_relic.read(token_id);
            format!("{}?relicId={}&tokenId={}&v=3", base_uri, relic_id, token_id)
        }
    }

    #[starknet::interface]
    trait IERC20<TContractState> {
        fn transfer_from(
            ref self: TContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        ) -> bool;
    }

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc721: ERC721Component::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        upgradeable: UpgradeableComponent::Storage,
        relics: Map<u32, RelicMetadata>,
        token_to_relic: Map<u256, u32>,
        relic_price: Map<u32, u256>,
        relic_max_supply: Map<u32, u32>,
        relic_current_supply: Map<u32, u32>,
        next_token_id: u256,
        chip_token: ContractAddress,
        treasury: ContractAddress,
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
        #[flat]
        UpgradeableEvent: UpgradeableComponent::Event,
        RelicMinted: RelicMinted,
        RelicDropCreated: RelicDropCreated,
        MetadataUpdate: MetadataUpdate,
    }

    #[derive(Drop, starknet::Event)]
    struct MetadataUpdate {
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct RelicMinted {
        token_id: u256,
        relic_id: u32,
        minter: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct RelicDropCreated {
        relic_id: u32,
        price: u256,
        max_supply: u32,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        chip_token_address: ContractAddress,
        treasury_address: ContractAddress,
        base_uri: ByteArray,
    ) {
        // Base URI should be: https://play.abyssgame.fun/api/metadata/relic
        self.erc721.initializer("Abyss Relics", "RELIC", base_uri);
        self.ownable.initializer(owner);
        self.chip_token.write(chip_token_address);
        self.treasury.write(treasury_address);
        self.next_token_id.write(1);
    }

    #[abi(embed_v0)]
    impl RelicImpl of IRelic<ContractState> {
        fn create_relic_drop(
            ref self: ContractState,
            relic_id: u32,
            name: felt252,
            description: felt252,
            effect_type: u8,
            cooldown_spins: u32,
            rarity: u8,
            image_uri: felt252,
            strength: u8,
            dexterity: u8,
            intelligence: u8,
            vitality: u8,
            wisdom: u8,
            charisma: u8,
            luck: u8,
            price: u256,
            max_supply: u32,
        ) {
            self.ownable.assert_only_owner();

            let metadata = RelicMetadata {
                relic_id,
                name,
                description,
                effect_type,
                cooldown_spins,
                rarity,
                image_uri,
                strength,
                dexterity,
                intelligence,
                vitality,
                wisdom,
                charisma,
                luck,
            };

            self.relics.write(relic_id, metadata);
            self.relic_price.write(relic_id, price);
            self.relic_max_supply.write(relic_id, max_supply);
            self.relic_current_supply.write(relic_id, 0);

            self.emit(RelicDropCreated { relic_id, price, max_supply });
        }

        fn mint_relic(ref self: ContractState, relic_id: u32) -> u256 {
            let caller = get_caller_address();

            let current = self.relic_current_supply.read(relic_id);
            let max = self.relic_max_supply.read(relic_id);
            assert(current < max, 'Sold out');

            let price = self.relic_price.read(relic_id);
            let chip = IERC20Dispatcher { contract_address: self.chip_token.read() };
            chip.transfer_from(caller, self.treasury.read(), price);

            let token_id = self.next_token_id.read();
            self.erc721.mint(caller, token_id);
            self.token_to_relic.write(token_id, relic_id);
            self.next_token_id.write(token_id + 1);
            self.relic_current_supply.write(relic_id, current + 1);

            self.emit(RelicMinted { token_id, relic_id, minter: caller });

            token_id
        }

        fn get_relic_metadata(self: @ContractState, token_id: u256) -> RelicMetadata {
            let relic_id = self.token_to_relic.read(token_id);
            self.relics.read(relic_id)
        }

        fn get_relic_drop_info(
            self: @ContractState, relic_id: u32,
        ) -> (RelicMetadata, u256, u32, u32) {
            let metadata = self.relics.read(relic_id);
            let price = self.relic_price.read(relic_id);
            let max_supply = self.relic_max_supply.read(relic_id);
            let current_supply = self.relic_current_supply.read(relic_id);
            (metadata, price, max_supply, current_supply)
        }

        fn get_player_relics(self: @ContractState, player: ContractAddress) -> Array<u256> {
            let total_supply = self.next_token_id.read() - 1;
            let mut player_relics: Array<u256> = ArrayTrait::new();

            let mut i: u256 = 1;
            while i <= total_supply {
                if self.erc721.owner_of(i) == player {
                    player_relics.append(i);
                }
                i += 1;
            }

            player_relics
        }

        fn get_supply_info(self: @ContractState, relic_id: u32) -> (u32, u32) {
            let current = self.relic_current_supply.read(relic_id);
            let max = self.relic_max_supply.read(relic_id);
            (current, max)
        }

        fn update_relic_metadata(
            ref self: ContractState,
            relic_id: u32,
            name: felt252,
            description: felt252,
            effect_type: u8,
            cooldown_spins: u32,
            rarity: u8,
            image_uri: felt252,
            strength: u8,
            dexterity: u8,
            intelligence: u8,
            vitality: u8,
            wisdom: u8,
            charisma: u8,
            luck: u8,
        ) {
            self.ownable.assert_only_owner();

            // Check if relic exists
            let mut metadata = self.relics.read(relic_id);
            assert(metadata.relic_id == relic_id, 'Relic does not exist');

            // Update metadata (keep id)
            metadata.name = name;
            metadata.description = description;
            metadata.effect_type = effect_type;
            metadata.cooldown_spins = cooldown_spins;
            metadata.rarity = rarity;
            metadata.image_uri = image_uri;
            metadata.strength = strength;
            metadata.dexterity = dexterity;
            metadata.intelligence = intelligence;
            metadata.vitality = vitality;
            metadata.wisdom = wisdom;
            metadata.charisma = charisma;
            metadata.luck = luck;

            self.relics.write(relic_id, metadata);
        }

        fn upgrade(ref self: ContractState, new_class_hash: ClassHash) {
            self.ownable.assert_only_owner();
            self.upgradeable.upgrade(new_class_hash);
        }

        fn set_base_uri(ref self: ContractState, new_base_uri: ByteArray) {
            self.ownable.assert_only_owner();
            self.erc721._set_base_uri(new_base_uri);
        }
    }
}
