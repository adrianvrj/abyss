use starknet::ContractAddress;

#[inline]
pub fn NAME() -> ByteArray {
    "Setup"
}

#[starknet::interface]
pub trait ISetup<T> {
    fn set_vrf(ref self: T, address: ContractAddress);
    fn set_quote_token(ref self: T, address: ContractAddress);
    fn set_chip_token(ref self: T, address: ContractAddress);
    fn set_charm_nft(ref self: T, address: ContractAddress);
    fn set_charm_base_uri(ref self: T, base_uri: ByteArray);
    fn set_relic_nft(ref self: T, address: ContractAddress);
    fn set_relic_base_uri(ref self: T, base_uri: ByteArray);
    fn set_beast_nft(ref self: T, address: ContractAddress);

    fn set_pragma_oracle(ref self: T, oracle: ContractAddress);
    fn set_chip_emission_rate(ref self: T, rate: u32);
    fn set_chip_boost_multiplier(ref self: T, multiplier: u32);
    fn set_token_pair_id(ref self: T, token: ContractAddress, pair_id: felt252);
    fn set_entry_price_usd(ref self: T, price: u256);
    fn set_burn_percentage(ref self: T, percentage: u8);
    fn set_treasury_percentage(ref self: T, percentage: u8);
    fn set_team_percentage(ref self: T, percentage: u8);
    fn set_distribution(
        ref self: T, burn_percentage: u8, treasury_percentage: u8, team_percentage: u8,
    );
    fn set_ekubo_router(ref self: T, address: ContractAddress);
    fn set_pool_fee(ref self: T, fee: u128);
    fn set_pool_tick_spacing(ref self: T, tick_spacing: u128);
    fn set_pool_extension(ref self: T, address: ContractAddress);
    fn set_pool_sqrt(ref self: T, sqrt: u256);
    fn initialize_items(ref self: T);
    fn register_bundle(
        ref self: T,
        referral_percentage: u8,
        reissuable: bool,
        price: u256,
        payment_token: ContractAddress,
        payment_receiver: ContractAddress,
        metadata: ByteArray,
        allower: ContractAddress,
    ) -> u32;
    fn register_default_session_bundle(
        ref self: T,
        referral_percentage: u8,
        reissuable: bool,
        price: u256,
        payment_token: ContractAddress,
        payment_receiver: ContractAddress,
        image_uri: ByteArray,
        allower: ContractAddress,
    ) -> u32;
    fn register_free_social_bundle(
        ref self: T,
        referral_percentage: u8,
        price: u256,
        payment_token: ContractAddress,
        payment_receiver: ContractAddress,
        image_uri: ByteArray,
        allower: ContractAddress,
    ) -> u32;
    fn update_bundle(
        ref self: T,
        bundle_id: u32,
        referral_percentage: u8,
        reissuable: bool,
        price: u256,
        payment_token: ContractAddress,
        payment_receiver: ContractAddress,
        allower: ContractAddress,
    );
    fn update_bundle_metadata(ref self: T, bundle_id: u32, metadata: ByteArray);
    fn admin_mint_session(ref self: T, recipient: ContractAddress, quantity: u32);
}

#[dojo::contract]
pub mod Setup {
    use bundle::component::Component as BundleComponent;
    use bundle::component::Component::BundleTrait;
    use bundle::interface::IBundle;
    use bundle::types::condition::{ConditionTrait, Twitter};
    use bundle::types::item::ItemTrait as BundleItemTrait;
    use bundle::types::metadata::MetadataTrait as BundleMetadataTrait;
    use core::num::traits::Zero;
    use dojo::world::WorldStorageTrait;
    use openzeppelin::access::accesscontrol::{AccessControlComponent, DEFAULT_ADMIN_ROLE};
    use openzeppelin::introspection::src5::SRC5Component;
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use crate::components::purchase::PurchaseComponent;
    use crate::constants::{
        CHARM_BASE_URI, DEFAULT_CHIP_BOOST_MULTIPLIER, DEFAULT_CHIP_EMISSION_RATE,
        DEFAULT_SCORE_CHERRY, DEFAULT_SCORE_COIN, DEFAULT_SCORE_DIAMOND, DEFAULT_SCORE_LEMON,
        DEFAULT_SCORE_SEVEN, NAMESPACE, PATTERN_D3_MULT, PATTERN_H3_MULT, PATTERN_H4_MULT,
        PATTERN_H5_MULT, PATTERN_V3_MULT, RELIC_BASE_URI, REVENUE_PRIZE_PCT, REVENUE_TEAM_PCT,
        REVENUE_TREASURY_PCT, WORLD_RESOURCE,
    };
    use crate::interfaces::charm_nft::{ICharmDispatcher, ICharmDispatcherTrait};
    use crate::interfaces::relic_nft::{IRelicDispatcher, IRelicDispatcherTrait};
    use crate::models::index::{Config, TokenPairId};
    use crate::store::StoreTrait;
    use crate::systems::charm::NAME as CHARM_NAME;
    use crate::systems::play::{IPlayDispatcher, IPlayDispatcherTrait, NAME as PLAY_NAME};
    use crate::systems::relic_nft_contract::NAME as RELIC_NFT_NAME;
    use crate::systems::token::NAME as CHIP_NAME;
    use super::*;

    component!(path: BundleComponent, storage: bundle, event: BundleEvent);
    impl BundleInternalImpl = BundleComponent::InternalImpl<ContractState>;
    impl BundleFeeImpl of BundleComponent::BundleFeeTrait<ContractState> {}
    component!(path: PurchaseComponent, storage: purchase, event: PurchaseEvent);
    impl PurchaseInternalImpl = PurchaseComponent::InternalImpl<ContractState>;
    component!(path: AccessControlComponent, storage: accesscontrol, event: AccessControlEvent);
    #[abi(embed_v0)]
    impl AccessControlImpl =
        AccessControlComponent::AccessControlImpl<ContractState>;
    impl AccessControlInternalImpl = AccessControlComponent::InternalImpl<ContractState>;
    component!(path: SRC5Component, storage: src5, event: SRC5Event);

    #[storage]
    struct Storage {
        #[substorage(v0)]
        bundle: BundleComponent::Storage,
        #[substorage(v0)]
        purchase: PurchaseComponent::Storage,
        #[substorage(v0)]
        accesscontrol: AccessControlComponent::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        BundleEvent: BundleComponent::Event,
        #[flat]
        PurchaseEvent: PurchaseComponent::Event,
        #[flat]
        AccessControlEvent: AccessControlComponent::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
    }

    impl BundleImpl of BundleTrait<ContractState> {
        fn on_issue(
            ref self: BundleComponent::ComponentState<ContractState>,
            recipient: ContractAddress,
            bundle_id: u32,
            quantity: u32,
        ) {
            let mut contract_state = self.get_contract_mut();
            let world = contract_state.world(@NAMESPACE());
            contract_state.purchase.execute(world, bundle_id, quantity);

            let play_address = world.dns_address(@PLAY_NAME()).expect('Play contract not found!');
            let play = IPlayDispatcher { contract_address: play_address };
            play.mint_session(recipient, quantity);
        }
        fn supply(
            self: @BundleComponent::ComponentState<ContractState>, bundle_id: u32,
        ) -> Option<u32> {
            Option::None
        }
    }

    fn zero_address() -> ContractAddress {
        0.try_into().unwrap()
    }

    fn resolve_payment_receiver(
        payment_receiver: ContractAddress, caller: ContractAddress,
    ) -> ContractAddress {
        if payment_receiver == zero_address() {
            caller
        } else {
            payment_receiver
        }
    }

    fn assert_valid_distribution(
        burn_percentage: u8, treasury_percentage: u8, team_percentage: u8,
    ) {
        assert(
            burn_percentage.into() + treasury_percentage.into() + team_percentage.into() == 100,
            'Invalid split',
        );
    }

    fn session_payment_tokens(
        quote_token: ContractAddress, chip_token: ContractAddress,
    ) -> Span<ContractAddress> {
        array![quote_token, chip_token].span()
    }

    fn session_bundle_metadata(
        quote_token: ContractAddress, chip_token: ContractAddress, image_uri: ByteArray,
    ) -> ByteArray {
        let item = BundleItemTrait::new(
            name: "Abyss Session",
            description: "Start a new run in Abyss",
            image_uri: image_uri.clone(),
        );

        BundleMetadataTrait::new(
            name: "Abyss Session Bundle",
            description: "Purchase playable Abyss sessions with Cartridge Controller",
            image_uri: image_uri,
            items: array![item].span(),
            tokens: session_payment_tokens(quote_token, chip_token),
            conditions: array![].span(),
        )
            .jsonify()
    }

    fn free_social_session_bundle_metadata(
        quote_token: ContractAddress, chip_token: ContractAddress, image_uri: ByteArray,
    ) -> ByteArray {
        let item = BundleItemTrait::new(
            name: "Free Abyss Session",
            description: "Start a free run in Abyss by sharing on X",
            image_uri: image_uri.clone(),
        );

        let conditions = Twitter::new("abyssdotfun", "1884657985219403776").span();

        BundleMetadataTrait::new(
            name: "Free Abyss Session Bundle",
            description: "Claim a free Abyss session",
            image_uri: image_uri,
            items: array![item].span(),
            tokens: session_payment_tokens(quote_token, chip_token),
            conditions: conditions,
        )
            .jsonify()
    }

    fn register_session_bundle_internal(
        ref self: ContractState,
        referral_percentage: u8,
        reissuable: bool,
        price: u256,
        image_uri: ByteArray,
        allower: ContractAddress,
        is_social: bool,
    ) -> u32 {
        let world = self.world(@NAMESPACE());
        let store = StoreTrait::new(world);
        let config = store.config();
        let payment_token = config.quote_token;
        let payment_receiver = get_contract_address();
        let metadata = if is_social {
            free_social_session_bundle_metadata(payment_token, config.chip_token, image_uri)
        } else {
            session_bundle_metadata(payment_token, config.chip_token, image_uri)
        };

        self
            .bundle
            .register(
                world,
                referral_percentage,
                reissuable,
                price,
                payment_token,
                payment_receiver,
                metadata,
                allower,
            )
    }

    fn register_bundle_internal(
        ref self: ContractState,
        referral_percentage: u8,
        reissuable: bool,
        price: u256,
        payment_token: ContractAddress,
        payment_receiver: ContractAddress,
        metadata: ByteArray,
        allower: ContractAddress,
    ) -> u32 {
        let world = self.world(@NAMESPACE());
        let caller = get_caller_address();
        let payment_receiver = resolve_payment_receiver(payment_receiver, caller);

        self
            .bundle
            .register(
                world,
                referral_percentage,
                reissuable,
                price,
                payment_token,
                payment_receiver,
                metadata,
                allower,
            )
    }

    fn update_bundle_internal(
        ref self: ContractState,
        bundle_id: u32,
        referral_percentage: u8,
        reissuable: bool,
        price: u256,
        payment_token: ContractAddress,
        payment_receiver: ContractAddress,
        allower: ContractAddress,
    ) {
        let world = self.world(@NAMESPACE());

        self
            .bundle
            .update(
                world,
                bundle_id,
                referral_percentage,
                reissuable,
                price,
                payment_token,
                payment_receiver,
                allower,
            );
    }

    fn dojo_init(
        ref self: ContractState,
        vrf_address: ContractAddress,
        quote_token: ContractAddress,
        team_address: ContractAddress,
    ) {
        let world = self.world(@NAMESPACE());
        let mut store = StoreTrait::new(world);
        let chip_token = world.dns_address(@CHIP_NAME()).expect('Chip contract not found!');
        let charm_nft = world.dns_address(@CHARM_NAME()).expect('Charm contract not found!');
        let relic_nft = world
            .dns_address(@RELIC_NFT_NAME())
            .expect('Relic NFT contract not found!');
        let beast_nft: ContractAddress = Zero::zero();
        let items = crate::helpers::items::get_all_items();
        let len = items.len();
        assert_valid_distribution(
            REVENUE_PRIZE_PCT.try_into().unwrap(),
            REVENUE_TREASURY_PCT.try_into().unwrap(),
            REVENUE_TEAM_PCT.try_into().unwrap(),
        );
        let mut i: u32 = 0;
        while i < len {
            store.set_item(items.at(i));
            i += 1;
        }

        // Initialize config with defaults
        let config = Config {
            world_resource: WORLD_RESOURCE,
            admin: team_address,
            vrf: vrf_address,
            pragma_oracle: 0.try_into().unwrap(),
            quote_token,
            chip_token,
            charm_nft,
            relic_nft,
            beast_nft,
            treasury: team_address,
            team: team_address,
            // Symbol config defaults
            seven_points: DEFAULT_SCORE_SEVEN,
            seven_prob: 10,
            diamond_points: DEFAULT_SCORE_DIAMOND,
            diamond_prob: 15,
            cherry_points: DEFAULT_SCORE_CHERRY,
            cherry_prob: 20,
            coin_points: DEFAULT_SCORE_COIN,
            coin_prob: 25,
            lemon_points: DEFAULT_SCORE_LEMON,
            lemon_prob: 30,
            six_points: 0,
            six_prob: 0,
            // Pattern multipliers
            pattern_h3_mult: PATTERN_H3_MULT,
            pattern_h4_mult: PATTERN_H4_MULT,
            pattern_h5_mult: PATTERN_H5_MULT,
            pattern_v3_mult: PATTERN_V3_MULT,
            pattern_d3_mult: PATTERN_D3_MULT,
            probability_666: 150,
            // CHIP emission
            chip_emission_rate: DEFAULT_CHIP_EMISSION_RATE,
            chip_boost_multiplier: DEFAULT_CHIP_BOOST_MULTIPLIER,
            // Pricing
            entry_price_usd: 2000000, // 2 USDC (6 decimals)
            // Counters
            total_sessions: 0,
            total_competitive_sessions: 0,
            total_items: len,
            // Revenue split + swap config
            burn_percentage: REVENUE_PRIZE_PCT.try_into().unwrap(),
            treasury_percentage: REVENUE_TREASURY_PCT.try_into().unwrap(),
            team_percentage: REVENUE_TEAM_PCT.try_into().unwrap(),
            ekubo_router: 0.try_into().unwrap(),
            pool_fee: 0,
            pool_tick_spacing: 0,
            pool_extension: 0.try_into().unwrap(),
            pool_sqrt: 0,
        };
        store.set_config(@config);

        let charm = ICharmDispatcher { contract_address: charm_nft };
        charm.set_base_uri(CHARM_BASE_URI());
        let relic = IRelicDispatcher { contract_address: relic_nft };
        relic.set_base_uri(RELIC_BASE_URI());

        // Initialize access control
        self.accesscontrol.initializer();
        self.accesscontrol._grant_role(DEFAULT_ADMIN_ROLE, team_address);
    }

    #[abi(embed_v0)]
    impl IBundleImpl of IBundle<ContractState> {
        fn get_metadata(self: @ContractState, bundle_id: u32) -> ByteArray {
            let world = self.world(@NAMESPACE());
            self.bundle.get_metadata(world, bundle_id)
        }

        fn quote(
            self: @ContractState,
            bundle_id: u32,
            quantity: u32,
            has_referrer: bool,
            client_percentage: u8,
        ) -> BundleComponent::BundleQuote {
            let world = self.world(@NAMESPACE());
            self.bundle.quote(world, bundle_id, quantity, has_referrer, client_percentage)
        }

        fn issue(
            ref self: ContractState,
            recipient: ContractAddress,
            bundle_id: u32,
            quantity: u32,
            referrer: Option<ContractAddress>,
            referrer_group: Option<felt252>,
            client: Option<ContractAddress>,
            client_percentage: u8,
            voucher_key: Option<felt252>,
            signature: Option<Span<felt252>>,
        ) {
            let mut world = self.world(@NAMESPACE());
            self
                .bundle
                .issue(
                    world,
                    recipient,
                    bundle_id,
                    quantity,
                    referrer,
                    referrer_group,
                    client,
                    client_percentage,
                    voucher_key,
                    signature,
                )
        }
    }

    #[abi(embed_v0)]
    impl SetupImpl of ISetup<ContractState> {
        fn set_vrf(ref self: ContractState, address: ContractAddress) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut config = store.config();
            config.vrf = address;
            store.set_config(@config);
        }

        fn set_quote_token(ref self: ContractState, address: ContractAddress) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut config = store.config();
            config.quote_token = address;
            store.set_config(@config);
        }

        fn set_chip_token(ref self: ContractState, address: ContractAddress) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut config = store.config();
            config.chip_token = address;
            store.set_config(@config);
        }

        fn set_charm_nft(ref self: ContractState, address: ContractAddress) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut config = store.config();
            config.charm_nft = address;
            store.set_config(@config);
        }

        fn set_charm_base_uri(ref self: ContractState, base_uri: ByteArray) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            let config = store.config();
            let charm = ICharmDispatcher { contract_address: config.charm_nft };
            charm.set_base_uri(base_uri);
        }

        fn set_relic_nft(ref self: ContractState, address: ContractAddress) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut config = store.config();
            config.relic_nft = address;
            store.set_config(@config);
        }

        fn set_relic_base_uri(ref self: ContractState, base_uri: ByteArray) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let store = StoreTrait::new(world);
            let config = store.config();
            let relic = IRelicDispatcher { contract_address: config.relic_nft };
            relic.set_base_uri(base_uri);
        }

        fn set_beast_nft(ref self: ContractState, address: ContractAddress) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut config = store.config();
            config.beast_nft = address;
            store.set_config(@config);
        }

        fn set_pragma_oracle(ref self: ContractState, oracle: ContractAddress) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut config = store.config();
            config.pragma_oracle = oracle;
            store.set_config(@config);
        }

        fn set_chip_emission_rate(ref self: ContractState, rate: u32) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut config = store.config();
            config.chip_emission_rate = rate;
            store.set_config(@config);
        }

        fn set_chip_boost_multiplier(ref self: ContractState, multiplier: u32) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut config = store.config();
            config.chip_boost_multiplier = multiplier;
            store.set_config(@config);
        }

        fn set_token_pair_id(ref self: ContractState, token: ContractAddress, pair_id: felt252) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            store.set_token_pair_id(@TokenPairId { token, pair_id });
        }

        fn set_entry_price_usd(ref self: ContractState, price: u256) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut config = store.config();
            config.entry_price_usd = price;
            store.set_config(@config);
        }

        fn set_burn_percentage(ref self: ContractState, percentage: u8) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut config = store.config();
            assert_valid_distribution(
                percentage, config.treasury_percentage, config.team_percentage,
            );
            config.burn_percentage = percentage;
            store.set_config(@config);
        }

        fn set_treasury_percentage(ref self: ContractState, percentage: u8) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut config = store.config();
            assert_valid_distribution(config.burn_percentage, percentage, config.team_percentage);
            config.treasury_percentage = percentage;
            store.set_config(@config);
        }

        fn set_team_percentage(ref self: ContractState, percentage: u8) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut config = store.config();
            assert_valid_distribution(
                config.burn_percentage, config.treasury_percentage, percentage,
            );
            config.team_percentage = percentage;
            store.set_config(@config);
        }

        fn set_distribution(
            ref self: ContractState,
            burn_percentage: u8,
            treasury_percentage: u8,
            team_percentage: u8,
        ) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            assert_valid_distribution(burn_percentage, treasury_percentage, team_percentage);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut config = store.config();
            config.burn_percentage = burn_percentage;
            config.treasury_percentage = treasury_percentage;
            config.team_percentage = team_percentage;
            store.set_config(@config);
        }

        fn set_ekubo_router(ref self: ContractState, address: ContractAddress) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut config = store.config();
            config.ekubo_router = address;
            store.set_config(@config);
        }

        fn set_pool_fee(ref self: ContractState, fee: u128) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut config = store.config();
            config.pool_fee = fee;
            store.set_config(@config);
        }

        fn set_pool_tick_spacing(ref self: ContractState, tick_spacing: u128) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut config = store.config();
            config.pool_tick_spacing = tick_spacing;
            store.set_config(@config);
        }

        fn set_pool_extension(ref self: ContractState, address: ContractAddress) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut config = store.config();
            config.pool_extension = address;
            store.set_config(@config);
        }

        fn set_pool_sqrt(ref self: ContractState, sqrt: u256) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);
            let mut config = store.config();
            config.pool_sqrt = sqrt;
            store.set_config(@config);
        }

        fn initialize_items(ref self: ContractState) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let world = self.world(@NAMESPACE());
            let mut store = StoreTrait::new(world);

            let items = crate::helpers::items::get_all_items();
            let mut i: u32 = 0;
            let len = items.len();
            while i < len {
                store.set_item(items.at(i));
                i += 1;
            }

            let mut config = store.config();
            config.total_items = len;
            store.set_config(@config);
        }

        fn register_bundle(
            ref self: ContractState,
            referral_percentage: u8,
            reissuable: bool,
            price: u256,
            payment_token: ContractAddress,
            payment_receiver: ContractAddress,
            metadata: ByteArray,
            allower: ContractAddress,
        ) -> u32 {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);

            register_bundle_internal(
                ref self,
                referral_percentage,
                reissuable,
                price,
                payment_token,
                payment_receiver,
                metadata,
                allower,
            )
        }

        fn register_default_session_bundle(
            ref self: ContractState,
            referral_percentage: u8,
            reissuable: bool,
            price: u256,
            payment_token: ContractAddress,
            payment_receiver: ContractAddress,
            image_uri: ByteArray,
            allower: ContractAddress,
        ) -> u32 {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let _ = payment_token;
            let _ = payment_receiver;
            register_session_bundle_internal(
                ref self, referral_percentage, reissuable, price, image_uri, allower, false,
            )
        }

        fn register_free_social_bundle(
            ref self: ContractState,
            referral_percentage: u8,
            price: u256,
            payment_token: ContractAddress,
            payment_receiver: ContractAddress,
            image_uri: ByteArray,
            allower: ContractAddress,
        ) -> u32 {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            let _ = payment_token;
            let _ = payment_receiver;
            register_session_bundle_internal(
                ref self, referral_percentage, false, price, image_uri, allower, true,
            )
        }

        fn update_bundle(
            ref self: ContractState,
            bundle_id: u32,
            referral_percentage: u8,
            reissuable: bool,
            price: u256,
            payment_token: ContractAddress,
            payment_receiver: ContractAddress,
            allower: ContractAddress,
        ) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);

            update_bundle_internal(
                ref self,
                bundle_id,
                referral_percentage,
                reissuable,
                price,
                payment_token,
                payment_receiver,
                allower,
            );
        }

        fn update_bundle_metadata(ref self: ContractState, bundle_id: u32, metadata: ByteArray) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);

            let world = self.world(@NAMESPACE());
            self.bundle.update_metadata(world, bundle_id, metadata);
        }

        fn admin_mint_session(
            ref self: ContractState, recipient: ContractAddress, quantity: u32,
        ) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);

            let world = self.world(@NAMESPACE());
            let play_address = world
                .dns_address(@PLAY_NAME())
                .expect('Play contract not found!');
            let play = IPlayDispatcher { contract_address: play_address };
            play.mint_session(recipient, quantity);
        }
    }

    #[cfg(test)]
    mod tests {
        use starknet::ContractAddress;
        use super::{assert_valid_distribution, session_payment_tokens};

        #[test]
        fn session_payment_tokens_include_quote_and_chip() {
            let quote_token: ContractAddress = 0x123.try_into().unwrap();
            let chip_token: ContractAddress = 0x456.try_into().unwrap();
            let payment_tokens = session_payment_tokens(quote_token, chip_token);

            assert_eq!(payment_tokens.len(), 2);
            assert_eq!(*payment_tokens.at(0), quote_token);
            assert_eq!(*payment_tokens.at(1), chip_token);
        }

        #[test]
        fn distribution_validation_accepts_hundred_percent_split() {
            assert_valid_distribution(50, 30, 20);
        }

        #[test]
        #[should_panic(expected: ('Invalid split',))]
        fn distribution_validation_rejects_invalid_split() {
            assert_valid_distribution(50, 30, 10);
        }
    }
}
