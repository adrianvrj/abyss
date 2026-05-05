#[inline]
pub fn NAME() -> ByteArray {
    "Charm"
}

const MINTER_ROLE: felt252 = selector!("MINTER_ROLE");
pub const CHARM_FORGE_PRICE_CHIP: u256 = 4_444_000_000_000_000_000_000;
const CHARM_FORGE_BURN_PERCENTAGE: u256 = 90;
const HUNDRED: u256 = 100;

fn sort_charm_reroll_rarities(rarity_1: u8, rarity_2: u8, rarity_3: u8) -> (u8, u8, u8) {
    let mut low = rarity_1;
    let mut mid = rarity_2;
    let mut high = rarity_3;

    if mid < low {
        let tmp = low;
        low = mid;
        mid = tmp;
    }
    if high < mid {
        let tmp = mid;
        mid = high;
        high = tmp;
    }
    if mid < low {
        let tmp = low;
        low = mid;
        mid = tmp;
    }

    (low, mid, high)
}

pub fn get_charm_reroll_base_rarity(rarity_1: u8, rarity_2: u8, rarity_3: u8) -> u8 {
    let (_, anchor, _) = sort_charm_reroll_rarities(rarity_1, rarity_2, rarity_3);
    anchor
}

fn get_charm_reroll_cumulative_odds(rarity_1: u8, rarity_2: u8, rarity_3: u8) -> (
    u32, u32, u32,
) {
    let (low, mid, high) = sort_charm_reroll_rarities(rarity_1, rarity_2, rarity_3);

    if low == 0 && mid == 0 && high == 0 {
        (80, 98, 100)
    } else if low == 0 && mid == 0 && high == 1 {
        (55, 95, 100)
    } else if low == 0 && mid == 1 && high == 1 {
        (15, 90, 100)
    } else if low == 1 && mid == 1 && high == 1 {
        (0, 76, 100)
    } else if low == 0 && mid == 0 && high == 2 {
        (45, 80, 100)
    } else if low == 0 && mid == 1 && high == 2 {
        (10, 75, 100)
    } else if low == 1 && mid == 1 && high == 2 {
        (0, 55, 100)
    } else if low == 0 && mid == 2 && high == 2 {
        (5, 35, 100)
    } else if low == 1 && mid == 2 && high == 2 {
        (0, 12, 100)
    } else if low == 2 && mid == 2 && high == 2 {
        (0, 0, 95)
    } else if low == 0 && mid == 0 && high == 3 {
        (35, 70, 95)
    } else if low == 0 && mid == 1 && high == 3 {
        (8, 65, 95)
    } else if low == 1 && mid == 1 && high == 3 {
        (0, 45, 95)
    } else if low == 0 && mid == 2 && high == 3 {
        (5, 25, 90)
    } else if low == 1 && mid == 2 && high == 3 {
        (0, 10, 88)
    } else if low == 2 && mid == 2 && high == 3 {
        (0, 0, 84)
    } else if low == 0 && mid == 3 && high == 3 {
        (0, 20, 80)
    } else if low == 1 && mid == 3 && high == 3 {
        (0, 5, 70)
    } else if low == 2 && mid == 3 && high == 3 {
        (0, 0, 58)
    } else {
        (0, 0, 0)
    }
}

pub fn get_charm_reroll_result_rarity(
    rarity_1: u8, rarity_2: u8, rarity_3: u8, roll: u32,
) -> u8 {
    let (common_max, rare_max, epic_max) = get_charm_reroll_cumulative_odds(
        rarity_1, rarity_2, rarity_3,
    );

    if roll < common_max {
        0
    } else if roll < rare_max {
        1
    } else if roll < epic_max {
        2
    } else {
        3
    }
}

#[dojo::contract]
pub mod Charm {
    use dojo::world::WorldStorageTrait;
    use core::poseidon::poseidon_hash_span;
    use openzeppelin::access::accesscontrol::{AccessControlComponent, DEFAULT_ADMIN_ROLE};
    use openzeppelin::interfaces::token::erc721::{IERC721, IERC721Metadata};
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::token::erc721::{ERC721Component, ERC721HooksEmptyImpl};
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use crate::constants::NAMESPACE;
    use crate::helpers::charm_types::{get_charm_ids_by_rarity, get_charm_type_info};
    use crate::interfaces::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};
    use crate::interfaces::charm_nft::{CharmMetadata, ICharm};
    use crate::store::StoreTrait;
    use crate::systems::play::NAME as PLAY_NAME;
    use crate::systems::setup::NAME as SETUP_NAME;
    use crate::systems::token::{IChipDispatcher, IChipDispatcherTrait};
    use crate::systems::treasury::NAME as TREASURY_NAME;
    use super::{
        CHARM_FORGE_BURN_PERCENTAGE, CHARM_FORGE_PRICE_CHIP, HUNDRED, MINTER_ROLE,
        get_charm_reroll_base_rarity, get_charm_reroll_result_rarity,
    };

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
        CharmRerolled: CharmRerolled,
    }

    #[derive(Drop, starknet::Event)]
    struct CharmRerolled {
        #[key]
        player: ContractAddress,
        token_id_1: u256,
        token_id_2: u256,
        token_id_3: u256,
        new_token_id: u256,
        new_charm_id: u32,
        base_rarity: u8,
        result_rarity: u8,
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
        let treasury_address = world.dns_address(@TREASURY_NAME()).expect('Treasury not found!');
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
                let charm_id = self.token_charm_id.entry(token_id).read();
                if charm_id != 0 && self.erc721.owner_of(token_id) == player {
                    token_ids.append(token_id);
                }
                current += 1;
            }
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

        fn get_charm_forge_cost_in_token(
            self: @ContractState, payment_token: ContractAddress,
        ) -> u256 {
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            let config = store.config();
            assert(payment_token == config.chip_token, 'Unsupported payment token');
            CHARM_FORGE_PRICE_CHIP
        }

        fn reroll_charms(
            ref self: ContractState,
            token_id_1: u256,
            token_id_2: u256,
            token_id_3: u256,
            payment_token: ContractAddress,
        ) -> u256 {
            assert(token_id_1 != token_id_2, 'Duplicate token IDs');
            assert(token_id_1 != token_id_3, 'Duplicate token IDs');
            assert(token_id_2 != token_id_3, 'Duplicate token IDs');

            let caller = get_caller_address();
            assert(self.erc721.owner_of(token_id_1) == caller, 'Not charm owner');
            assert(self.erc721.owner_of(token_id_2) == caller, 'Not charm owner');
            assert(self.erc721.owner_of(token_id_3) == caller, 'Not charm owner');

            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            let config = store.config();
            assert(payment_token == config.chip_token, 'Unsupported payment token');

            let token = IERC20Dispatcher { contract_address: payment_token };
            let this = starknet::get_contract_address();
            token.transfer_from(caller, this, CHARM_FORGE_PRICE_CHIP);

            let burn_amount = CHARM_FORGE_PRICE_CHIP * CHARM_FORGE_BURN_PERCENTAGE / HUNDRED;
            let team_amount = CHARM_FORGE_PRICE_CHIP - burn_amount;
            if burn_amount > 0 {
                let chip = IChipDispatcher { contract_address: payment_token };
                chip.burn(burn_amount);
            }
            if team_amount > 0 {
                token.transfer(config.team, team_amount);
            }

            let charm_id_1 = self.token_charm_id.entry(token_id_1).read();
            let charm_id_2 = self.token_charm_id.entry(token_id_2).read();
            let charm_id_3 = self.token_charm_id.entry(token_id_3).read();
            let meta_1 = get_charm_type_info(charm_id_1);
            let meta_2 = get_charm_type_info(charm_id_2);
            let meta_3 = get_charm_type_info(charm_id_3);
            let base_rarity = get_charm_reroll_base_rarity(
                meta_1.rarity, meta_2.rarity, meta_3.rarity,
            );

            let seed = poseidon_hash_span(
                array![
                    caller.into(),
                    token_id_1.low.into(),
                    token_id_2.low.into(),
                    token_id_3.low.into(),
                    starknet::get_block_timestamp().into(),
                    self.next_token_id.read().into(),
                ]
                    .span(),
            );
            let seed_u256: u256 = seed.into();
            let roll: u32 = (seed_u256.low % 100).try_into().unwrap();
            let result_rarity = get_charm_reroll_result_rarity(
                meta_1.rarity, meta_2.rarity, meta_3.rarity, roll,
            );

            self.erc721.burn(token_id_1);
            self.erc721.burn(token_id_2);
            self.erc721.burn(token_id_3);
            self.token_charm_id.entry(token_id_1).write(0);
            self.token_charm_id.entry(token_id_2).write(0);
            self.token_charm_id.entry(token_id_3).write(0);

            let charm_ids = get_charm_ids_by_rarity(result_rarity);
            assert(charm_ids.len() > 0, 'Invalid rarity');
            let index: u32 = ((seed_u256.low / 100) % charm_ids.len().into()).try_into().unwrap();
            let new_charm_id = *charm_ids.at(index);
            let new_token_id = InternalImpl::mint_charm_internal(ref self, caller, new_charm_id);

            self.emit(
                CharmRerolled {
                    player: caller,
                    token_id_1,
                    token_id_2,
                    token_id_3,
                    new_token_id,
                    new_charm_id,
                    base_rarity,
                    result_rarity,
                },
            );

            new_token_id
        }

        fn mint_random_charm_of_rarity(
            ref self: ContractState, player: ContractAddress, rarity: u8, random_seed: felt252,
        ) -> u256 {
            self.accesscontrol.assert_only_role(MINTER_ROLE);

            let charm_ids = get_charm_ids_by_rarity(rarity);
            assert(charm_ids.len() > 0, 'Invalid rarity');

            let random_u256: u256 = random_seed.into();
            let index: u32 = (random_u256.low % charm_ids.len().into()).try_into().unwrap();
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
