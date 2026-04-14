use starknet::ContractAddress;
use crate::interfaces::relic_nft::{IRelic, IRelicERC721, RelicMetadata};

#[inline]
pub fn NAME() -> ByteArray {
    "RelicNFT"
}

#[starknet::interface]
pub trait IRelicCollection<TContractState> {
    fn mint_relic(ref self: TContractState, relic_id: u32) -> u256;
    fn get_player_relics(self: @TContractState, player: ContractAddress) -> Array<u256>;
    fn get_supply_info(self: @TContractState, relic_id: u32) -> (u32, u32);
}

#[dojo::contract]
pub mod RelicNFT {
    use dojo::world::{IWorldDispatcherTrait, WorldStorageTrait};
    use openzeppelin::access::accesscontrol::{AccessControlComponent, DEFAULT_ADMIN_ROLE};
    use openzeppelin::interfaces::token::erc721::{IERC721, IERC721Metadata};
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::token::erc721::{ERC721Component, ERC721HooksEmptyImpl};
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address};
    use crate::constants::NAMESPACE;
    use crate::helpers::relic_types::get_relic_type_info;
    use crate::interfaces::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};
    use crate::systems::setup::NAME as SETUP_NAME;
    use crate::systems::token::NAME as TOKEN_NAME;
    use crate::systems::treasury::NAME as TREASURY_NAME;
    use super::{IRelic, IRelicCollection, IRelicERC721, RelicMetadata};

    component!(path: ERC721Component, storage: erc721, event: ERC721Event);
    component!(path: AccessControlComponent, storage: accesscontrol, event: AccessControlEvent);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    #[abi(embed_v0)]
    impl AccessControlImpl =
        AccessControlComponent::AccessControlImpl<ContractState>;
    impl AccessControlInternalImpl = AccessControlComponent::InternalImpl<ContractState>;
    impl ERC721StandardImpl = ERC721Component::ERC721Impl<ContractState>;
    impl ERC721InternalImpl = ERC721Component::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc721: ERC721Component::Storage,
        #[substorage(v0)]
        accesscontrol: AccessControlComponent::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        base_uri: ByteArray,
        next_token_id: u64,
        token_relic_id: Map<u256, u32>,
        minted_per_type: Map<u32, u32>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC721Event: ERC721Component::Event,
        #[flat]
        AccessControlEvent: AccessControlComponent::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
    }

    fn dojo_init(ref self: ContractState) {
        let world = self.world(@NAMESPACE());
        self.erc721.initializer("Abyss Relics", "RELIC", "");
        self.accesscontrol.initializer();

        let setup_address = world.dns_address(@SETUP_NAME()).expect('Setup not found!');
        let treasury_address = world.dns_address(@TREASURY_NAME()).expect('Treasury not found!');
        self.accesscontrol._grant_role(DEFAULT_ADMIN_ROLE, treasury_address);
        self.accesscontrol._grant_role(DEFAULT_ADMIN_ROLE, setup_address);
        self.base_uri.write("");

        let this = starknet::get_contract_address();
        let instance_name: felt252 = this.into();
        world
            .dispatcher
            .register_external_contract(
                namespace: NAMESPACE(),
                contract_name: "ERC721",
                instance_name: format!("{}", instance_name),
                contract_address: this,
                block_number: 1,
            );
    }

    #[abi(embed_v0)]
    impl RelicCollectionImpl of IRelicCollection<ContractState> {
        fn mint_relic(ref self: ContractState, relic_id: u32) -> u256 {
            let caller = get_caller_address();
            let world = self.world(@NAMESPACE());
            let info = get_relic_type_info(relic_id);
            let current_supply = self.minted_per_type.entry(relic_id).read();
            assert(current_supply < info.max_supply, 'Sold out');

            let chip_address = world.dns_address(@TOKEN_NAME()).expect('Chip not found!');
            let treasury_address = world
                .dns_address(@TREASURY_NAME())
                .expect('Treasury not found!');
            let chip = IERC20Dispatcher { contract_address: chip_address };
            chip.transfer_from(caller, treasury_address, info.price_wei);

            let token_id_u64 = self.next_token_id.read() + 1;
            self.next_token_id.write(token_id_u64);

            let token_id: u256 = token_id_u64.into();
            self.erc721.mint(caller, token_id);
            self.token_relic_id.entry(token_id).write(relic_id);
            self.minted_per_type.entry(relic_id).write(current_supply + 1);

            token_id
        }

        fn get_player_relics(self: @ContractState, player: ContractAddress) -> Array<u256> {
            let mut token_ids: Array<u256> = array![];
            let total = self.next_token_id.read();
            let mut current: u64 = 1;
            while current <= total {
                let token_id: u256 = current.into();
                if self.erc721.owner_of(token_id) == player {
                    token_ids.append(token_id);
                }
                current += 1;
            }
            token_ids
        }

        fn get_supply_info(self: @ContractState, relic_id: u32) -> (u32, u32) {
            let info = get_relic_type_info(relic_id);
            (self.minted_per_type.entry(relic_id).read(), info.max_supply)
        }
    }

    #[abi(embed_v0)]
    impl ERC721MetadataImpl of IERC721Metadata<ContractState> {
        fn name(self: @ContractState) -> ByteArray {
            self.erc721.name()
        }

        fn symbol(self: @ContractState) -> ByteArray {
            self.erc721.symbol()
        }

        fn token_uri(self: @ContractState, token_id: u256) -> ByteArray {
            let owner = self.erc721.owner_of(token_id);
            if (owner.into() == 0) {
                return "";
            }

            let base_uri = self.base_uri.read();
            if base_uri.len() == 0 {
                return "";
            }

            let token_id_u64: u64 = token_id.try_into().expect('Invalid token ID');
            let relic_id = self.token_relic_id.entry(token_id).read();
            let contract_felt: felt252 = starknet::get_contract_address().into();

            base_uri
                + format!("{}", token_id_u64)
                + "?relicId="
                + format!("{}", relic_id)
                + "&tokenId="
                + format!("{}", token_id_u64)
                + "&contract="
                + format!("{}", contract_felt)
        }
    }

    #[abi(embed_v0)]
    impl RelicMetadataImpl of IRelic<ContractState> {
        fn set_base_uri(ref self: ContractState, base_uri: ByteArray) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            self.base_uri.write(base_uri);
        }

        fn get_base_uri(self: @ContractState) -> ByteArray {
            self.base_uri.read()
        }

        fn get_relic_metadata(self: @ContractState, token_id: u256) -> RelicMetadata {
            let relic_id = self.token_relic_id.entry(token_id).read();
            if relic_id == 0 {
                return RelicMetadata {
                    relic_id: 0,
                    name: 0,
                    description: 0,
                    effect_type: 0,
                    cooldown_spins: 0,
                    rarity: 0,
                    image_uri: 0,
                    strength: 0,
                    dexterity: 0,
                    intelligence: 0,
                    vitality: 0,
                    wisdom: 0,
                    charisma: 0,
                    luck: 0,
                };
            }

            get_relic_type_info(relic_id).metadata
        }
    }

    #[abi(embed_v0)]
    impl RelicErc721Impl of IRelicERC721<ContractState> {
        fn owner_of(self: @ContractState, token_id: u256) -> ContractAddress {
            self.erc721.owner_of(token_id)
        }

        fn balance_of(self: @ContractState, owner: ContractAddress) -> u256 {
            self.erc721.balance_of(owner)
        }
    }
}
