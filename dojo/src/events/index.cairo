use starknet::ContractAddress;

// ═══════════════════════════════════════════════════════════════════════════
// SPIN COMPLETED
// ═══════════════════════════════════════════════════════════════════════════

#[dojo::event]
#[derive(Copy, Drop, Serde)]
pub struct SpinCompleted {
    #[key]
    pub session_id: u32,
    #[key]
    pub player: ContractAddress,
    // Grid cells
    pub cell_0: u8,
    pub cell_1: u8,
    pub cell_2: u8,
    pub cell_3: u8,
    pub cell_4: u8,
    pub cell_5: u8,
    pub cell_6: u8,
    pub cell_7: u8,
    pub cell_8: u8,
    pub cell_9: u8,
    pub cell_10: u8,
    pub cell_11: u8,
    pub cell_12: u8,
    pub cell_13: u8,
    pub cell_14: u8,
    // Outcome
    pub score_gained: u32,
    pub new_total_score: u32,
    pub new_level: u32,
    pub spins_remaining: u32,
    pub is_active: bool,
    pub is_666: bool,
    pub is_jackpot: bool,
    pub biblia_used: bool,
    pub current_luck: u32,
    // Symbol scores
    pub score_seven: u32,
    pub score_diamond: u32,
    pub score_cherry: u32,
    pub score_coin: u32,
    pub score_lemon: u32,
    // Chip bonus (e.g., diamond chip bonus units accumulated)
    pub chip_bonus_units: u32,
}

// ═══════════════════════════════════════════════════════════════════════════
// ITEM PURCHASED
// ═══════════════════════════════════════════════════════════════════════════

#[dojo::event]
#[derive(Copy, Drop, Serde)]
pub struct ItemPurchased {
    #[key]
    pub session_id: u32,
    #[key]
    pub player: ContractAddress,
    pub item_id: u32,
    pub price: u32,
    pub new_score: u32,
    pub new_spins: u32,
    pub new_tickets: u32,
    pub is_charm: bool,
    pub current_luck: u32,
}

// ═══════════════════════════════════════════════════════════════════════════
// ITEM SOLD
// ═══════════════════════════════════════════════════════════════════════════

#[dojo::event]
#[derive(Copy, Drop, Serde)]
pub struct ItemSold {
    #[key]
    pub session_id: u32,
    #[key]
    pub player: ContractAddress,
    pub item_id: u32,
    pub sell_price: u32,
    pub new_score: u32,
    pub new_tickets: u32,
    pub current_luck: u32,
}

// ═══════════════════════════════════════════════════════════════════════════
// MARKET REFRESHED
// ═══════════════════════════════════════════════════════════════════════════

#[dojo::event]
#[derive(Copy, Drop, Serde)]
pub struct MarketRefreshed {
    #[key]
    pub session_id: u32,
    #[key]
    pub player: ContractAddress,
    pub new_score: u32,
    pub slot_1: u32,
    pub slot_2: u32,
    pub slot_3: u32,
    pub slot_4: u32,
    pub slot_5: u32,
    pub slot_6: u32,
    pub current_luck: u32,
}

// ═══════════════════════════════════════════════════════════════════════════
// RELIC EVENTS
// ═══════════════════════════════════════════════════════════════════════════

#[dojo::event]
#[derive(Copy, Drop, Serde)]
pub struct RelicActivated {
    #[key]
    pub session_id: u32,
    #[key]
    pub player: ContractAddress,
    pub relic_id: u32,
    pub effect_type: u8,
    pub cooldown_until_spin: u32,
    pub current_luck: u32,
}

#[dojo::event]
#[derive(Copy, Drop, Serde)]
pub struct PhantomActivated {
    #[key]
    pub session_id: u32,
    #[key]
    pub player: ContractAddress,
    pub bonus_spins: u32,
    pub new_spins: u32,
}

#[dojo::event]
#[derive(Copy, Drop, Serde)]
pub struct RelicEquipped {
    #[key]
    pub session_id: u32,
    #[key]
    pub player: ContractAddress,
    pub relic_token_id: u256,
    pub relic_id: u32,
    pub current_luck: u32,
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════

#[dojo::event]
#[derive(Copy, Drop, Serde)]
pub struct SessionCreated {
    #[key]
    pub session_id: u32,
    #[key]
    pub player: ContractAddress,
    pub is_competitive: bool,
}

#[dojo::event]
#[derive(Copy, Drop, Serde)]
pub struct SessionEnded {
    #[key]
    pub session_id: u32,
    #[key]
    pub player: ContractAddress,
    pub total_score: u32,
    pub level: u32,
    pub dummy_metadata: felt252,
}

// ═══════════════════════════════════════════════════════════════════════════
// CHARM MINTED
// ═══════════════════════════════════════════════════════════════════════════

#[dojo::event]
#[derive(Copy, Drop, Serde)]
pub struct CharmMinted {
    #[key]
    pub session_id: u32,
    #[key]
    pub player: ContractAddress,
    pub charm_id: u32,
    pub rarity: u8,
    pub token_id: u256,
}

// ═══════════════════════════════════════════════════════════════════════════
// BIBLIA DISCARDED
// ═══════════════════════════════════════════════════════════════════════════

#[dojo::event]
#[derive(Copy, Drop, Serde)]
pub struct BibliaDiscarded {
    #[key]
    pub session_id: u32,
    #[key]
    pub player: ContractAddress,
    pub discarded: bool,
}

// ═══════════════════════════════════════════════════════════════════════════
// CASH OUT RESOLVED
// ═══════════════════════════════════════════════════════════════════════════

#[dojo::event]
#[derive(Copy, Drop, Serde)]
pub struct CashOutResolved {
    #[key]
    pub session_id: u32,
    #[key]
    pub player: ContractAddress,
    pub succeeded: bool,
}
