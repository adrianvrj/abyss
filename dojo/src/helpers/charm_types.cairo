use crate::interfaces::charm_nft::CharmMetadata;
use crate::types::effect::{CharmConditionType, CharmEffectType};

pub fn get_charm_type_info(charm_id: u32) -> CharmMetadata {
    assert(charm_id >= 1, 'Invalid charm');
    assert(charm_id <= 20, 'Invalid charm');

    if charm_id == 1 {
        return CharmMetadata {
            charm_id, name: 'Whisper Stone', description: 'Luck +3',
            effect_type: CharmEffectType::LuckBoost, effect_value: 3, effect_value_2: 0,
            condition_type: CharmConditionType::None, rarity: 0, shop_cost: 1,
        };
    } else if charm_id == 2 {
        return CharmMetadata {
            charm_id, name: 'Faded Coin', description: 'Luck +4',
            effect_type: CharmEffectType::LuckBoost, effect_value: 4, effect_value_2: 0,
            condition_type: CharmConditionType::None, rarity: 0, shop_cost: 1,
        };
    } else if charm_id == 3 {
        return CharmMetadata {
            charm_id, name: 'Broken Mirror', description: 'No pat +5',
            effect_type: CharmEffectType::ConditionalLuckBoost, effect_value: 5, effect_value_2: 0,
            condition_type: CharmConditionType::NoPatternLastSpin, rarity: 0, shop_cost: 1,
        };
    } else if charm_id == 4 {
        return CharmMetadata {
            charm_id, name: 'Dusty Hourglass', description: 'Low spins +4',
            effect_type: CharmEffectType::ConditionalLuckBoost, effect_value: 4, effect_value_2: 0,
            condition_type: CharmConditionType::LowSpinsRemaining, rarity: 0, shop_cost: 1,
        };
    } else if charm_id == 5 {
        return CharmMetadata {
            charm_id, name: 'Cracked Skull', description: 'Luck +5',
            effect_type: CharmEffectType::LuckBoost, effect_value: 5, effect_value_2: 0,
            condition_type: CharmConditionType::None, rarity: 0, shop_cost: 1,
        };
    } else if charm_id == 6 {
        return CharmMetadata {
            charm_id, name: 'Rusty Key', description: 'Per item +3',
            effect_type: CharmEffectType::ConditionalLuckBoost, effect_value: 3, effect_value_2: 0,
            condition_type: CharmConditionType::PerItemInInventory, rarity: 0, shop_cost: 1,
        };
    } else if charm_id == 7 {
        return CharmMetadata {
            charm_id, name: 'Moth Wing', description: 'Luck +6',
            effect_type: CharmEffectType::LuckBoost, effect_value: 6, effect_value_2: 0,
            condition_type: CharmConditionType::None, rarity: 0, shop_cost: 1,
        };
    } else if charm_id == 8 {
        return CharmMetadata {
            charm_id, name: 'Bone Dice', description: 'Low score +8',
            effect_type: CharmEffectType::ConditionalLuckBoost, effect_value: 8, effect_value_2: 0,
            condition_type: CharmConditionType::LowScore, rarity: 0, shop_cost: 1,
        };
    } else if charm_id == 9 {
        return CharmMetadata {
            charm_id, name: 'Soul Fragment', description: 'Luck +10',
            effect_type: CharmEffectType::LuckBoost, effect_value: 10, effect_value_2: 0,
            condition_type: CharmConditionType::None, rarity: 1, shop_cost: 2,
        };
    } else if charm_id == 10 {
        return CharmMetadata {
            charm_id, name: 'Cursed Pendant', description: 'H3 x2',
            effect_type: CharmEffectType::PatternRetrigger, effect_value: 2, effect_value_2: 1,
            condition_type: CharmConditionType::None, rarity: 1, shop_cost: 2,
        };
    } else if charm_id == 11 {
        return CharmMetadata {
            charm_id, name: 'Shadow Lantern', description: '+8 base, lvl5 +4',
            effect_type: CharmEffectType::LuckBoost, effect_value: 8, effect_value_2: 4,
            condition_type: CharmConditionType::HighLevel, rarity: 1, shop_cost: 2,
        };
    } else if charm_id == 12 {
        return CharmMetadata {
            charm_id, name: 'Ethereal Chain', description: 'Pattern +6',
            effect_type: CharmEffectType::ConditionalLuckBoost, effect_value: 6, effect_value_2: 0,
            condition_type: CharmConditionType::None, rarity: 1, shop_cost: 2,
        };
    } else if charm_id == 13 {
        return CharmMetadata {
            charm_id, name: 'Void Compass', description: '+1 spin +15',
            effect_type: CharmEffectType::ExtraSpinWithLuck, effect_value: 1, effect_value_2: 15,
            condition_type: CharmConditionType::None, rarity: 1, shop_cost: 3,
        };
    } else if charm_id == 14 {
        return CharmMetadata {
            charm_id, name: 'Demons Tooth', description: 'Diag x2',
            effect_type: CharmEffectType::PatternRetrigger, effect_value: 2, effect_value_2: 3,
            condition_type: CharmConditionType::None, rarity: 1, shop_cost: 3,
        };
    } else if charm_id == 15 {
        return CharmMetadata {
            charm_id, name: 'Abyssal Eye', description: 'Luck +20',
            effect_type: CharmEffectType::LuckBoost, effect_value: 20, effect_value_2: 0,
            condition_type: CharmConditionType::None, rarity: 2, shop_cost: 4,
        };
    } else if charm_id == 16 {
        return CharmMetadata {
            charm_id, name: 'Phoenix Feather', description: '+2 spin +10',
            effect_type: CharmEffectType::ExtraSpinWithLuck, effect_value: 2, effect_value_2: 10,
            condition_type: CharmConditionType::None, rarity: 2, shop_cost: 4,
        };
    } else if charm_id == 17 {
        return CharmMetadata {
            charm_id, name: 'Reapers Mark', description: 'All x2',
            effect_type: CharmEffectType::PatternRetrigger, effect_value: 2, effect_value_2: 0,
            condition_type: CharmConditionType::None, rarity: 2, shop_cost: 5,
        };
    } else if charm_id == 18 {
        return CharmMetadata {
            charm_id, name: 'Chaos Orb', description: 'Block666 +15',
            effect_type: CharmEffectType::ConditionalLuckBoost, effect_value: 15, effect_value_2: 0,
            condition_type: CharmConditionType::Blocked666, rarity: 2, shop_cost: 5,
        };
    } else if charm_id == 19 {
        return CharmMetadata {
            charm_id, name: 'Soul Abyss', description: 'Luck +30',
            effect_type: CharmEffectType::LuckBoost, effect_value: 30, effect_value_2: 0,
            condition_type: CharmConditionType::None, rarity: 2, shop_cost: 6,
        };
    } else {
        return CharmMetadata {
            charm_id, name: 'Void Heart', description: '+1 spin +50',
            effect_type: CharmEffectType::ExtraSpinWithLuck, effect_value: 1, effect_value_2: 50,
            condition_type: CharmConditionType::None, rarity: 2, shop_cost: 7,
        };
    }
}

pub fn get_charm_ids_by_rarity(rarity: u8) -> Array<u32> {
    if rarity == 0 {
        return array![1, 2, 3, 4, 5, 6, 7, 8];
    } else if rarity == 1 {
        return array![9, 10, 11, 12, 13, 14];
    } else if rarity == 2 {
        return array![15, 16, 17, 18, 19, 20];
    }

    array![]
}
