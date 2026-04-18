use crate::models::index::Item;

/// Returns only the hot-path item metadata needed during spin execution.
pub fn get_item_runtime_effect(item_id: u32) -> (u8, u32, felt252) {
    if item_id == 1 {
        (3, 3, 'seven')
    } else if item_id == 2 {
        (3, 2, 'diamond')
    } else if item_id == 3 {
        (3, 1, 'cherry')
    } else if item_id == 4 {
        (3, 1, 'lemon')
    } else if item_id == 5 {
        (1, 15, '')
    } else if item_id == 6 {
        (1, 30, '')
    } else if item_id == 7 {
        (2, 6, 'seven')
    } else if item_id == 8 {
        (2, 8, 'diamond')
    } else if item_id == 9 {
        (4, 1, '')
    } else if item_id == 10 {
        (4, 2, '')
    } else if item_id == 11 {
        (2, 10, 'seven')
    } else if item_id == 12 {
        (2, 12, 'cherry')
    } else if item_id == 13 {
        (3, 2, 'cherry')
    } else if item_id == 14 {
        (3, 1, 'lemon')
    } else if item_id == 15 {
        (1, 50, '')
    } else if item_id == 16 {
        (2, 20, 'cherry')
    } else if item_id == 17 {
        (2, 3, 'anti-coin')
    } else if item_id == 18 {
        (4, 3, '')
    } else if item_id == 19 {
        (3, 1, 'coin')
    } else if item_id == 20 {
        (3, 3, 'cherry')
    } else if item_id == 21 {
        (1, 80, '')
    } else if item_id == 22 {
        (1, 100, '')
    } else if item_id == 23 {
        (4, 4, '')
    } else if item_id == 24 {
        (1, 150, '')
    } else if item_id == 25 {
        (3, 7, 'seven')
    } else if item_id == 26 {
        (3, 3, 'diamond')
    } else if item_id == 27 {
        (2, 14, 'diamond')
    } else if item_id == 28 {
        (2, 30, 'cherry')
    } else if item_id == 29 {
        (2, 8, 'lemon')
    } else if item_id == 30 {
        (3, 2, 'lemon')
    } else if item_id == 31 {
        (2, 5, 'anti-coin')
    } else if item_id == 32 {
        (2, 7, 'anti-coin')
    } else if item_id == 33 {
        (3, 10, 'seven')
    } else if item_id == 34 {
        (2, 16, 'seven')
    } else if item_id == 35 {
        (3, 4, 'diamond')
    } else if item_id == 36 {
        (2, 20, 'diamond')
    } else if item_id == 37 {
        (2, 8, 'lemon')
    } else if item_id == 38 {
        (3, 3, 'lemon')
    } else if item_id == 39 {
        (3, 1, 'coin')
    } else if item_id == 40 {
        (6, 1, 'six')
    } else if item_id == 41 {
        (11, 1, 'six')
    } else {
        (0, 0, '')
    }
}

pub fn get_item_diamond_chip_bonus(item_id: u32) -> u32 {
    if item_id == 2 || item_id == 8 {
        1
    } else if item_id == 26 || item_id == 27 {
        2
    } else if item_id == 35 || item_id == 36 {
        3
    } else {
        0
    }
}

/// Returns all 41 item definitions extracted from the monolith.
pub fn get_all_items() -> Array<Item> {
    let mut items: Array<Item> = array![];

    // Seven Run Items
    items
        .append(
            Item {
                item_id: 1,
                name: 'Chilly Pepper',
                description: '+3 to seven score on pattern',
                price: 1,
                sell_price: 0,
                effect_type: 3,
                effect_value: 3,
                target_symbol: 'seven',
            },
        );

    items
        .append(
            Item {
                item_id: 7,
                name: 'Nerd Glasses',
                description: '+6% seven probability',
                price: 1,
                sell_price: 0,
                effect_type: 2,
                effect_value: 6,
                target_symbol: 'seven',
            },
        );

    items
        .append(
            Item {
                item_id: 11,
                name: 'Ghost Mask',
                description: '+10% seven probability',
                price: 3,
                sell_price: 1,
                effect_type: 2,
                effect_value: 10,
                target_symbol: 'seven',
            },
        );

    items
        .append(
            Item {
                item_id: 25,
                name: 'Hockey Mask',
                description: '+7 to seven score on pattern',
                price: 2,
                sell_price: 1,
                effect_type: 3,
                effect_value: 7,
                target_symbol: 'seven',
            },
        );

    items
        .append(
            Item {
                item_id: 33,
                name: 'Ticket',
                description: '+10 to seven score on pattern',
                price: 3,
                sell_price: 2,
                effect_type: 3,
                effect_value: 10,
                target_symbol: 'seven',
            },
        );

    items
        .append(
            Item {
                item_id: 34,
                name: 'Devil Train',
                description: '+16% seven probability',
                price: 4,
                sell_price: 2,
                effect_type: 2,
                effect_value: 16,
                target_symbol: 'seven',
            },
        );

    // Diamond Run Items
    items
        .append(
            Item {
                item_id: 2,
                name: 'Milk',
                description: '+2 dia score +1 chip',
                price: 1,
                sell_price: 0,
                effect_type: 3,
                effect_value: 2,
                target_symbol: 'diamond',
            },
        );

    items
        .append(
            Item {
                item_id: 8,
                name: 'Ace of Spades',
                description: '+8% dia prob +1 chip',
                price: 1,
                sell_price: 0,
                effect_type: 2,
                effect_value: 8,
                target_symbol: 'diamond',
            },
        );

    items
        .append(
            Item {
                item_id: 26,
                name: 'Rune',
                description: '+3 dia score +2 chip',
                price: 3,
                sell_price: 1,
                effect_type: 3,
                effect_value: 3,
                target_symbol: 'diamond',
            },
        );

    items
        .append(
            Item {
                item_id: 27,
                name: 'Bloody knife',
                description: '+14% dia prob +2 chip',
                price: 2,
                sell_price: 1,
                effect_type: 2,
                effect_value: 14,
                target_symbol: 'diamond',
            },
        );

    items
        .append(
            Item {
                item_id: 35,
                name: 'Fake Dollar',
                description: '+4 dia score +3 chip',
                price: 4,
                sell_price: 1,
                effect_type: 3,
                effect_value: 4,
                target_symbol: 'diamond',
            },
        );

    items
        .append(
            Item {
                item_id: 36,
                name: 'Bull Skull',
                description: '+20% dia prob +3 chip',
                price: 4,
                sell_price: 2,
                effect_type: 2,
                effect_value: 20,
                target_symbol: 'diamond',
            },
        );

    // Cherry Run Items
    items
        .append(
            Item {
                item_id: 3,
                name: 'Magic Dice',
                description: '+1 to cherry score on pattern',
                price: 1,
                sell_price: 0,
                effect_type: 3,
                effect_value: 1,
                target_symbol: 'cherry',
            },
        );

    items
        .append(
            Item {
                item_id: 12,
                name: 'Skull',
                description: '+12% cherry probability',
                price: 1,
                sell_price: 0,
                effect_type: 2,
                effect_value: 12,
                target_symbol: 'cherry',
            },
        );

    items
        .append(
            Item {
                item_id: 13,
                name: 'Pig Bank',
                description: '+2 to cherry score on pattern',
                price: 2,
                sell_price: 1,
                effect_type: 3,
                effect_value: 2,
                target_symbol: 'cherry',
            },
        );

    items
        .append(
            Item {
                item_id: 16,
                name: 'Weird Hand',
                description: '+20% cherry probability',
                price: 2,
                sell_price: 1,
                effect_type: 2,
                effect_value: 20,
                target_symbol: 'cherry',
            },
        );

    items
        .append(
            Item {
                item_id: 20,
                name: 'Smelly Boots',
                description: '+3 to cherry score on pattern',
                price: 2,
                sell_price: 1,
                effect_type: 3,
                effect_value: 3,
                target_symbol: 'cherry',
            },
        );

    items
        .append(
            Item {
                item_id: 28,
                name: 'Devil Head',
                description: '+30% cherry probability',
                price: 4,
                sell_price: 2,
                effect_type: 2,
                effect_value: 30,
                target_symbol: 'cherry',
            },
        );

    // Lemon Run Items
    items
        .append(
            Item {
                item_id: 4,
                name: 'Old Cassette',
                description: '+1 to lemon score on pattern',
                price: 1,
                sell_price: 0,
                effect_type: 3,
                effect_value: 1,
                target_symbol: 'lemon',
            },
        );

    items
        .append(
            Item {
                item_id: 14,
                name: 'Old Wig',
                description: '+1 to lemon score on pattern',
                price: 2,
                sell_price: 1,
                effect_type: 3,
                effect_value: 1,
                target_symbol: 'lemon',
            },
        );

    items
        .append(
            Item {
                item_id: 29,
                name: 'Cigarettes',
                description: '+8% lemon probability',
                price: 3,
                sell_price: 1,
                effect_type: 2,
                effect_value: 8,
                target_symbol: 'lemon',
            },
        );

    items
        .append(
            Item {
                item_id: 30,
                name: 'Soul Contract',
                description: '+2 to lemon score on pattern',
                price: 4,
                sell_price: 1,
                effect_type: 3,
                effect_value: 2,
                target_symbol: 'lemon',
            },
        );

    items
        .append(
            Item {
                item_id: 37,
                name: 'Fake Coin',
                description: '+8% lemon probability',
                price: 4,
                sell_price: 1,
                effect_type: 2,
                effect_value: 8,
                target_symbol: 'lemon',
            },
        );

    items
        .append(
            Item {
                item_id: 38,
                name: 'Pocket Watch',
                description: '+3 to lemon score on pattern',
                price: 5,
                sell_price: 2,
                effect_type: 3,
                effect_value: 3,
                target_symbol: 'lemon',
            },
        );

    // Coin Run Items
    items
        .append(
            Item {
                item_id: 17,
                name: 'Golden Globe',
                description: 'Tilt coin +3% others',
                price: 1,
                sell_price: 0,
                effect_type: 2,
                effect_value: 3,
                target_symbol: 'anti-coin',
            },
        );

    items
        .append(
            Item {
                item_id: 19,
                name: 'Old Phone',
                description: '+1 to coin score on pattern',
                price: 2,
                sell_price: 1,
                effect_type: 3,
                effect_value: 1,
                target_symbol: 'coin',
            },
        );

    items
        .append(
            Item {
                item_id: 31,
                name: 'Beer Can',
                description: 'Tilt coin +5% others',
                price: 3,
                sell_price: 1,
                effect_type: 2,
                effect_value: 5,
                target_symbol: 'anti-coin',
            },
        );

    items
        .append(
            Item {
                item_id: 32,
                name: 'Memory Card',
                description: 'Tilt coin +7% others',
                price: 4,
                sell_price: 2,
                effect_type: 2,
                effect_value: 7,
                target_symbol: 'anti-coin',
            },
        );

    items
        .append(
            Item {
                item_id: 39,
                name: 'Knight Helmet',
                description: '+1 to coin score on pattern',
                price: 1,
                sell_price: 0,
                effect_type: 3,
                effect_value: 1,
                target_symbol: 'coin',
            },
        );

    // Pattern Multiplier Items
    items
        .append(
            Item {
                item_id: 5,
                name: 'Bat Boomerang',
                description: '+15% pattern multiplier',
                price: 2,
                sell_price: 1,
                effect_type: 1,
                effect_value: 15,
                target_symbol: '',
            },
        );

    items
        .append(
            Item {
                item_id: 6,
                name: 'Holy Eye',
                description: '+30% pattern multiplier',
                price: 3,
                sell_price: 1,
                effect_type: 1,
                effect_value: 30,
                target_symbol: '',
            },
        );

    items
        .append(
            Item {
                item_id: 15,
                name: 'Amulet',
                description: '+50% pattern multiplier',
                price: 4,
                sell_price: 2,
                effect_type: 1,
                effect_value: 50,
                target_symbol: '',
            },
        );

    items
        .append(
            Item {
                item_id: 21,
                name: 'Bloody Wrench',
                description: '+80% pattern multiplier',
                price: 5,
                sell_price: 2,
                effect_type: 1,
                effect_value: 80,
                target_symbol: '',
            },
        );

    items
        .append(
            Item {
                item_id: 22,
                name: 'Car Keys',
                description: '+100% pattern multiplier',
                price: 6,
                sell_price: 3,
                effect_type: 1,
                effect_value: 100,
                target_symbol: '',
            },
        );

    items
        .append(
            Item {
                item_id: 24,
                name: 'Holy Grail',
                description: '+150% pattern multiplier',
                price: 7,
                sell_price: 3,
                effect_type: 1,
                effect_value: 150,
                target_symbol: '',
            },
        );

    // Spin Items
    items
        .append(
            Item {
                item_id: 9,
                name: 'Devil Onion',
                description: '+1 instant spin',
                price: 2,
                sell_price: 1,
                effect_type: 4,
                effect_value: 1,
                target_symbol: '',
            },
        );

    items
        .append(
            Item {
                item_id: 10,
                name: 'Red Button',
                description: '+2 instant spins',
                price: 4,
                sell_price: 2,
                effect_type: 4,
                effect_value: 2,
                target_symbol: '',
            },
        );

    items
        .append(
            Item {
                item_id: 18,
                name: 'Pyramid',
                description: '+3 instant spins',
                price: 5,
                sell_price: 2,
                effect_type: 4,
                effect_value: 3,
                target_symbol: '',
            },
        );

    items
        .append(
            Item {
                item_id: 23,
                name: 'Devil Seal',
                description: '+4 instant spins',
                price: 7,
                sell_price: 3,
                effect_type: 4,
                effect_value: 4,
                target_symbol: '',
            },
        );

    // Strategy Protection Item
    items
        .append(
            Item {
                item_id: 40,
                name: 'La Biblia',
                description: 'Protects from 666 pattern',
                price: 3,
                sell_price: 1,
                effect_type: 6,
                effect_value: 1,
                target_symbol: 'six',
            },
        );

    items
        .append(
            Item {
                item_id: 41,
                name: 'Tricky Dice',
                description: 'Next 666 cashout',
                price: 4,
                sell_price: 2,
                effect_type: 11,
                effect_value: 1,
                target_symbol: 'six',
            },
        );

    items
}
