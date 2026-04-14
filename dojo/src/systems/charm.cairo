#[inline]
pub fn NAME() -> ByteArray {
    "Charm"
}

const MINTER_ROLE: felt252 = selector!("MINTER_ROLE");

#[dojo::contract]
pub mod Charm {
    use openzeppelin::access::accesscontrol::{AccessControlComponent, DEFAULT_ADMIN_ROLE};
    use openzeppelin::interfaces::token::erc721::{IERC721, IERC721Metadata};
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::token::erc721::{ERC721Component, ERC721HooksEmptyImpl};
    use dojo::world::WorldStorageTrait;
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use starknet::ContractAddress;
    use crate::constants::NAMESPACE;
    use crate::helpers::charm_types::{get_charm_ids_by_rarity, get_charm_type_info};
    use crate::interfaces::charm_nft::{CharmMetadata, ICharm};
    use crate::systems::play::NAME as PLAY_NAME;
    use crate::systems::setup::NAME as SETUP_NAME;
    use crate::systems::treasury::NAME as TREASURY_NAME;
    use super::MINTER_ROLE;

    component!(path: ERC721Component, storage: erc721, event: ERC721Event);
    component!(path: AccessControlComponent, storage: accesscontrol, event: AccessControlEvent);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);

    #[abi(embed_v0)]
    impl AccessControlImpl =
        AccessControlComponent::AccessControlImpl<ContractState>;
    impl ERC721StandardImpl = ERC721Component::ERC721Impl<ContractState>;
    impl ERC721InternalImpl = ERC721Component::InternalImpl<ContractState>;
    impl AccessControlInternalImpl = AccessControlComponent::InternalImpl<ContractState>;

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
        token_charm_id: Map<u256, u32>,
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

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn mint_charm_internal(
            ref self: ContractState, player: ContractAddress, charm_id: u32,
        ) -> u256 {
            let _ = get_charm_type_info(charm_id);
            let token_id_u64 = self.next_token_id.read() + 1;
            self.next_token_id.write(token_id_u64);

            let token_id: u256 = token_id_u64.into();
            self.erc721.mint(player, token_id);
            self.token_charm_id.entry(token_id).write(charm_id);
            token_id
        }
    }

    fn dojo_init(ref self: ContractState) {
        let world = self.world(@NAMESPACE());
        self.erc721.initializer("Abyss Charms", "CHARM", "");
        self.accesscontrol.initializer();

        let play_address = world.dns_address(@PLAY_NAME()).expect('Play not found!');
        let setup_address = world.dns_address(@SETUP_NAME()).expect('Setup not found!');
        let treasury_address = world
            .dns_address(@TREASURY_NAME())
            .expect('Treasury not found!');
        self.accesscontrol._grant_role(MINTER_ROLE, play_address);
        self.accesscontrol._grant_role(DEFAULT_ADMIN_ROLE, treasury_address);
        self.accesscontrol._grant_role(DEFAULT_ADMIN_ROLE, setup_address);
        self.base_uri.write("");
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
            let charm_id = self.token_charm_id.entry(token_id).read();
            let contract_felt: felt252 = starknet::get_contract_address().into();

            base_uri
                + format!("{}", token_id_u64)
                + "?charmId="
                + format!("{}", charm_id)
                + "&tokenId="
                + format!("{}", token_id_u64)
                + "&contract="
                + format!("{}", contract_felt)
        }
    }

    #[abi(embed_v0)]
    impl CharmImpl of ICharm<ContractState> {
        fn set_base_uri(ref self: ContractState, base_uri: ByteArray) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            self.base_uri.write(base_uri);
        }

        fn get_base_uri(self: @ContractState) -> ByteArray {
            self.base_uri.read()
        }

        fn get_player_charms(self: @ContractState, player: ContractAddress) -> Array<u256> {
            let mut token_ids: Array<u256> = array![];
            let total = self.next_token_id.read();
            let mut current: u64 = 1;
            while current <= total {
                let token_id: u256 = current.into();
                if self.erc721.owner_of(token_id) == player {
                    token_ids.append(token_id);
                }
                current += 1;
            };
            token_ids
        }

        fn get_charm_metadata(self: @ContractState, token_id: u256) -> CharmMetadata {
            let charm_id = self.token_charm_id.entry(token_id).read();
            if charm_id == 0 {
                return CharmMetadata {
                    charm_id: 0,
                    name: 0,
                    description: 0,
                    effect_type: 0,
                    effect_value: 0,
                    effect_value_2: 0,
                    condition_type: 0,
                    rarity: 0,
                    shop_cost: 0,
                };
            }

            get_charm_type_info(charm_id)
        }

        fn get_charm_type_info(self: @ContractState, charm_id: u32) -> CharmMetadata {
            get_charm_type_info(charm_id)
        }

        fn mint_random_charm_of_rarity(
            ref self: ContractState, player: ContractAddress, rarity: u8, random_seed: felt252,
        ) -> u256 {
            self.accesscontrol.assert_only_role(MINTER_ROLE);

            let charm_ids = get_charm_ids_by_rarity(rarity);
            assert(charm_ids.len() > 0, 'Invalid rarity');

            let random_u256: u256 = random_seed.into();
            let index: u32 = (random_u256 % charm_ids.len().into()).try_into().unwrap();
            let charm_id = *charm_ids.at(index);
            InternalImpl::mint_charm_internal(ref self, player, charm_id)
        }

        fn get_charms_by_rarity(self: @ContractState, rarity: u8) -> Array<u32> {
            get_charm_ids_by_rarity(rarity)
        }

        fn mint_charm(ref self: ContractState, player: ContractAddress, charm_id: u32) -> u256 {
            self.accesscontrol.assert_only_role(MINTER_ROLE);
            InternalImpl::mint_charm_internal(ref self, player, charm_id)
        }
    }
}
