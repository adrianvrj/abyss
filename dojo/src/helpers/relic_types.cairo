use crate::interfaces::relic_nft::RelicMetadata;
use crate::types::effect::RelicEffectType;

#[derive(Copy, Drop)]
pub struct RelicTypeInfo {
    pub metadata: RelicMetadata,
    pub price_wei: u256,
    pub max_supply: u32,
}

pub fn get_relic_type_info(relic_id: u32) -> RelicTypeInfo {
    assert(relic_id >= 1, 'Invalid relic');
    assert(relic_id <= 5, 'Invalid relic');

    if relic_id == 1 {
        return RelicTypeInfo {
            metadata: RelicMetadata {
                relic_id,
                name: 'Mortis',
                description: 'Force jackpot',
                effect_type: RelicEffectType::RandomJackpot,
                cooldown_spins: 8,
                rarity: 3,
                image_uri: 'mortis',
                strength: 0,
                dexterity: 0,
                intelligence: 0,
                vitality: 1,
                wisdom: 0,
                charisma: 0,
                luck: 1,
            },
            price_wei: 44_444_000_000_000_000_000_000,
            max_supply: 5,
        };
    } else if relic_id == 2 {
        return RelicTypeInfo {
            metadata: RelicMetadata {
                relic_id,
                name: 'Phantom',
                description: 'Reset spins',
                effect_type: RelicEffectType::ResetSpins,
                cooldown_spins: 8,
                rarity: 3,
                image_uri: 'phantom',
                strength: 0,
                dexterity: 0,
                intelligence: 0,
                vitality: 0,
                wisdom: 1,
                charisma: 0,
                luck: 0,
            },
            price_wei: 33_333_000_000_000_000_000_000,
            max_supply: 7,
        };
    } else if relic_id == 3 {
        return RelicTypeInfo {
            metadata: RelicMetadata {
                relic_id,
                name: 'Lucky Dealer',
                description: 'Double next',
                effect_type: RelicEffectType::DoubleNextSpin,
                cooldown_spins: 5,
                rarity: 2,
                image_uri: 'lucky',
                strength: 0,
                dexterity: 0,
                intelligence: 0,
                vitality: 0,
                wisdom: 0,
                charisma: 1,
                luck: 0,
            },
            price_wei: 22_222_000_000_000_000_000_000,
            max_supply: 10,
        };
    } else if relic_id == 4 {
        return RelicTypeInfo {
            metadata: RelicMetadata {
                relic_id,
                name: 'Scorcher',
                description: 'Trigger 666',
                effect_type: RelicEffectType::Trigger666,
                cooldown_spins: 5,
                rarity: 2,
                image_uri: 'scorcher',
                strength: 0,
                dexterity: 0,
                intelligence: 1,
                vitality: 0,
                wisdom: 0,
                charisma: 0,
                luck: 0,
            },
            price_wei: 15_555_000_000_000_000_000_000,
            max_supply: 10,
        };
    } else {
        return RelicTypeInfo {
            metadata: RelicMetadata {
                relic_id,
                name: 'Inferno',
                description: 'Free refresh',
                effect_type: RelicEffectType::FreeMarketRefresh,
                cooldown_spins: 5,
                rarity: 2,
                image_uri: 'inferno',
                strength: 0,
                dexterity: 1,
                intelligence: 0,
                vitality: 0,
                wisdom: 0,
                charisma: 0,
                luck: 0,
            },
            price_wei: 11_111_000_000_000_000_000_000,
            max_supply: 10,
        };
    }
}
