use bundle::models::index::Bundle;
use dojo::event::EventStorage;
use dojo::model::ModelStorage;
use dojo::world::WorldStorage;
use ekubo::components::clear::IClearDispatcher;
use ekubo::interfaces::router::IRouterDispatcher;
use starknet::ContractAddress;
use crate::constants::WORLD_RESOURCE;
use crate::events::index::{
    CharmMinted, ItemPurchased, ItemSold, MarketRefreshed, RelicActivated, RelicEquipped,
    SessionCreated, SessionEnded, SpinCompleted,
};
use crate::interfaces::charm_nft::ICharmDispatcher;
use crate::interfaces::erc20::IERC20Dispatcher;
use crate::interfaces::relic_nft::{IRelicDispatcher, IRelicERC721Dispatcher};
use crate::interfaces::vrf::IVrfProviderDispatcher;
use crate::models::index::{
    BeastSessionsUsed, Config, Item, MarketSlotPurchased, PlayerSessionEntry, PlayerSessions,
    Session, SessionCharmEntry, SessionCharms, SessionInventory, SessionItemEntry, SessionItemIndex,
    SessionMarket, SpinResult, TokenPairId, XShareSessionClaim,
};

#[derive(Copy, Drop)]
pub struct Store {
    pub world: WorldStorage,
}

#[generate_trait]
pub impl StoreImpl of StoreTrait {
    fn new(world: WorldStorage) -> Store {
        Store { world }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Dispatchers
    // ═══════════════════════════════════════════════════════════════════

    fn vrf_disp(self: @Store) -> IVrfProviderDispatcher {
        let config = self.config();
        IVrfProviderDispatcher { contract_address: config.vrf }
    }

    fn chip_disp(self: @Store) -> IERC20Dispatcher {
        let config = self.config();
        IERC20Dispatcher { contract_address: config.chip_token }
    }

    fn quote_disp(self: @Store) -> IERC20Dispatcher {
        let config = self.config();
        IERC20Dispatcher { contract_address: config.quote_token }
    }

    fn charm_disp(self: @Store) -> ICharmDispatcher {
        let config = self.config();
        ICharmDispatcher { contract_address: config.charm_nft }
    }

    fn relic_disp(self: @Store) -> IRelicDispatcher {
        let config = self.config();
        IRelicDispatcher { contract_address: config.relic_nft }
    }

    fn relic_erc721_disp(self: @Store) -> IRelicERC721Dispatcher {
        let config = self.config();
        IRelicERC721Dispatcher { contract_address: config.relic_nft }
    }

    fn ekubo_router(self: @Store) -> IRouterDispatcher {
        let config = self.config();
        IRouterDispatcher { contract_address: config.ekubo_router }
    }

    fn ekubo_clearer(self: @Store) -> IClearDispatcher {
        let config = self.config();
        IClearDispatcher { contract_address: config.ekubo_router }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Config
    // ═══════════════════════════════════════════════════════════════════

    fn config(self: @Store) -> Config {
        self.world.read_model(WORLD_RESOURCE)
    }

    fn set_config(mut self: Store, config: @Config) {
        self.world.write_model(config)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Bundle
    // ═══════════════════════════════════════════════════════════════════

    fn bundle(self: @Store, bundle_id: u32) -> Bundle {
        self.world.read_model(bundle_id)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Session
    // ═══════════════════════════════════════════════════════════════════

    fn session(self: @Store, session_id: u32) -> Session {
        self.world.read_model(session_id)
    }

    fn set_session(mut self: Store, session: @Session) {
        self.world.write_model(session)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Spin Result
    // ═══════════════════════════════════════════════════════════════════

    fn spin_result(self: @Store, session_id: u32) -> SpinResult {
        self.world.read_model(session_id)
    }

    fn set_spin_result(mut self: Store, result: @SpinResult) {
        self.world.write_model(result)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Session Market
    // ═══════════════════════════════════════════════════════════════════

    fn session_market(self: @Store, session_id: u32) -> SessionMarket {
        self.world.read_model(session_id)
    }

    fn set_session_market(mut self: Store, market: @SessionMarket) {
        self.world.write_model(market)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Session Inventory
    // ═══════════════════════════════════════════════════════════════════

    fn inventory(self: @Store, session_id: u32, item_id: u32) -> SessionInventory {
        self.world.read_model((session_id, item_id))
    }

    fn set_inventory(mut self: Store, inv: @SessionInventory) {
        self.world.write_model(inv)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Market Slot Purchased
    // ═══════════════════════════════════════════════════════════════════

    fn market_slot_purchased(self: @Store, session_id: u32, slot: u32) -> MarketSlotPurchased {
        self.world.read_model((session_id, slot))
    }

    fn set_market_slot_purchased(mut self: Store, msp: @MarketSlotPurchased) {
        self.world.write_model(msp)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Item
    // ═══════════════════════════════════════════════════════════════════

    fn item(self: @Store, item_id: u32) -> Item {
        self.world.read_model(item_id)
    }

    fn set_item(mut self: Store, item: @Item) {
        self.world.write_model(item)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Player Sessions
    // ═══════════════════════════════════════════════════════════════════

    fn player_sessions(self: @Store, player: ContractAddress) -> PlayerSessions {
        self.world.read_model(player)
    }

    fn set_player_sessions(mut self: Store, ps: @PlayerSessions) {
        self.world.write_model(ps)
    }

    fn player_session_entry(
        self: @Store, player: ContractAddress, index: u32,
    ) -> PlayerSessionEntry {
        self.world.read_model((player, index))
    }

    fn set_player_session_entry(mut self: Store, entry: @PlayerSessionEntry) {
        self.world.write_model(entry)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Session Item Index
    // ═══════════════════════════════════════════════════════════════════

    fn session_item_index(self: @Store, session_id: u32) -> SessionItemIndex {
        self.world.read_model(session_id)
    }

    fn set_session_item_index(mut self: Store, idx: @SessionItemIndex) {
        self.world.write_model(idx)
    }

    fn session_item_entry(self: @Store, session_id: u32, index: u32) -> SessionItemEntry {
        self.world.read_model((session_id, index))
    }

    fn set_session_item_entry(mut self: Store, entry: @SessionItemEntry) {
        self.world.write_model(entry)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Session Charms
    // ═══════════════════════════════════════════════════════════════════

    fn session_charms(self: @Store, session_id: u32) -> SessionCharms {
        self.world.read_model(session_id)
    }

    fn set_session_charms(mut self: Store, sc: @SessionCharms) {
        self.world.write_model(sc)
    }

    fn session_charm_entry(self: @Store, session_id: u32, index: u32) -> SessionCharmEntry {
        self.world.read_model((session_id, index))
    }

    fn set_session_charm_entry(mut self: Store, entry: @SessionCharmEntry) {
        self.world.write_model(entry)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Token Pair IDs
    // ═══════════════════════════════════════════════════════════════════

    fn token_pair_id(self: @Store, token: ContractAddress) -> TokenPairId {
        self.world.read_model(token)
    }

    fn set_token_pair_id(mut self: Store, tpi: @TokenPairId) {
        self.world.write_model(tpi)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Beast Sessions
    // ═══════════════════════════════════════════════════════════════════

    fn beast_sessions_used(self: @Store, player: ContractAddress) -> BeastSessionsUsed {
        self.world.read_model(player)
    }

    fn set_beast_sessions_used(mut self: Store, bsu: @BeastSessionsUsed) {
        self.world.write_model(bsu)
    }

    fn x_share_session_claim(self: @Store, player: ContractAddress) -> XShareSessionClaim {
        self.world.read_model(player)
    }

    fn set_x_share_session_claim(mut self: Store, claim: @XShareSessionClaim) {
        self.world.write_model(claim)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Events
    // ═══════════════════════════════════════════════════════════════════

    fn emit_session_created(
        mut self: Store, session_id: u32, player: ContractAddress, is_competitive: bool,
    ) {
        self.world.emit_event(@SessionCreated { session_id, player, is_competitive });
    }

    fn emit_session_ended(
        mut self: Store, session_id: u32, player: ContractAddress, total_score: u32, level: u32,
    ) {
        self
            .world
            .emit_event(
                @SessionEnded { session_id, player, total_score, level, dummy_metadata: 0 },
            );
    }

    fn emit_spin_completed(mut self: Store, event: @SpinCompleted) {
        self.world.emit_event(event);
    }

    fn emit_item_purchased(mut self: Store, event: @ItemPurchased) {
        self.world.emit_event(event);
    }

    fn emit_item_sold(mut self: Store, event: @ItemSold) {
        self.world.emit_event(event);
    }

    fn emit_market_refreshed(mut self: Store, event: @MarketRefreshed) {
        self.world.emit_event(event);
    }

    fn emit_relic_activated(mut self: Store, event: @RelicActivated) {
        self.world.emit_event(event);
    }

    fn emit_relic_equipped(mut self: Store, event: @RelicEquipped) {
        self.world.emit_event(event);
    }

    fn emit_charm_minted(mut self: Store, event: @CharmMinted) {
        self.world.emit_event(event);
    }
}
