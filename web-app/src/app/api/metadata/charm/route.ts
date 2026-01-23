import { NextResponse } from 'next/server';

// Base URL for images
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://play.abyssgame.fun';

// Soul Charms metadata configuration
// Matches the 20 charms defined in SOUL_CHARMS_IMPLEMENTATION.md
const CHARM_METADATA: Record<string, {
    name: string;
    description: string;
    image: string;
    rarity: string;
    effect_type: string;
    effect_description: string;
    luck_value: number;
    shop_cost: number;
}> = {
    // ═══════════════════════════════════════════════════════════════════════════
    // COMMON CHARMS (8 types)
    // ═══════════════════════════════════════════════════════════════════════════
    "1": {
        name: "Whisper Stone",
        description: "A small stone that whispers secrets of fortune to its bearer.",
        image: `${BASE_URL}/images/charms/1.png`,
        rarity: "Common",
        effect_type: "LuckBoost",
        effect_description: "+3 luck permanently",
        luck_value: 3,
        shop_cost: 1
    },
    "2": {
        name: "Faded Coin",
        description: "An ancient coin worn smooth by countless wishes.",
        image: `${BASE_URL}/images/charms/2.png`,
        rarity: "Common",
        effect_type: "LuckBoost",
        effect_description: "+4 luck permanently",
        luck_value: 4,
        shop_cost: 1
    },
    "3": {
        name: "Broken Mirror",
        description: "Seven years of bad luck? Not with this shard.",
        image: `${BASE_URL}/images/charms/3.png`,
        rarity: "Common",
        effect_type: "ConditionalLuckBoost",
        effect_description: "+5 luck when last spin had no patterns",
        luck_value: 5,
        shop_cost: 1
    },
    "4": {
        name: "Dusty Hourglass",
        description: "Time runs out, but luck flows in.",
        image: `${BASE_URL}/images/charms/4.png`,
        rarity: "Common",
        effect_type: "ConditionalLuckBoost",
        effect_description: "+4 luck when ≤2 spins remaining",
        luck_value: 4,
        shop_cost: 1
    },
    "5": {
        name: "Cracked Skull",
        description: "Death's reminder that fortune favors the bold.",
        image: `${BASE_URL}/images/charms/5.png`,
        rarity: "Common",
        effect_type: "LuckBoost",
        effect_description: "+5 luck permanently",
        luck_value: 5,
        shop_cost: 1
    },
    "6": {
        name: "Rusty Key",
        description: "Unlocks hidden potential in every item you collect.",
        image: `${BASE_URL}/images/charms/6.png`,
        rarity: "Common",
        effect_type: "ConditionalLuckBoost",
        effect_description: "+3 luck per item in inventory",
        luck_value: 3,
        shop_cost: 1
    },
    "7": {
        name: "Moth Wing",
        description: "Drawn to the light of fortune like a moth to flame.",
        image: `${BASE_URL}/images/charms/7.png`,
        rarity: "Common",
        effect_type: "LuckBoost",
        effect_description: "+6 luck permanently",
        luck_value: 6,
        shop_cost: 1
    },
    "8": {
        name: "Bone Dice",
        description: "When you have nothing to lose, luck finds you.",
        image: `${BASE_URL}/images/charms/8.png`,
        rarity: "Common",
        effect_type: "ConditionalLuckBoost",
        effect_description: "+8 luck when score < 100",
        luck_value: 8,
        shop_cost: 1
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // RARE CHARMS (6 types)
    // ═══════════════════════════════════════════════════════════════════════════
    "9": {
        name: "Soul Fragment",
        description: "A piece of a wandering spirit, forever seeking patterns.",
        image: `${BASE_URL}/images/charms/9.png`,
        rarity: "Rare",
        effect_type: "LuckBoost",
        effect_description: "+10 luck permanently",
        luck_value: 10,
        shop_cost: 2
    },
    "10": {
        name: "Cursed Pendant",
        description: "Cursed to repeat horizontal patterns again and again.",
        image: `${BASE_URL}/images/charms/10.png`,
        rarity: "Rare",
        effect_type: "PatternRetrigger",
        effect_description: "Horizontal-3 patterns trigger twice",
        luck_value: 0,
        shop_cost: 2
    },
    "11": {
        name: "Shadow Lantern",
        description: "Its light grows brighter as you descend deeper.",
        image: `${BASE_URL}/images/charms/11.png`,
        rarity: "Rare",
        effect_type: "LuckBoost",
        effect_description: "+8 luck, +4 more at level 5+",
        luck_value: 12,
        shop_cost: 2
    },
    "12": {
        name: "Ethereal Chain",
        description: "Each pattern strengthens the links of fate.",
        image: `${BASE_URL}/images/charms/12.png`,
        rarity: "Rare",
        effect_type: "ConditionalLuckBoost",
        effect_description: "+6 luck per pattern in last spin",
        luck_value: 6,
        shop_cost: 2
    },
    "13": {
        name: "Void Compass",
        description: "Points toward one more chance at destiny.",
        image: `${BASE_URL}/images/charms/13.png`,
        rarity: "Rare",
        effect_type: "ExtraSpinWithLuck",
        effect_description: "+1 spin with +15 luck",
        luck_value: 15,
        shop_cost: 3
    },
    "14": {
        name: "Demon's Tooth",
        description: "Ripped from a diagonal demon. Patterns tremble.",
        image: `${BASE_URL}/images/charms/14.png`,
        rarity: "Rare",
        effect_type: "PatternRetrigger",
        effect_description: "Diagonal patterns trigger twice",
        luck_value: 0,
        shop_cost: 3
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // EPIC CHARMS (4 types)
    // ═══════════════════════════════════════════════════════════════════════════
    "15": {
        name: "Abyssal Eye",
        description: "The eye of the abyss sees all patterns before they form.",
        image: `${BASE_URL}/images/charms/15.png`,
        rarity: "Epic",
        effect_type: "LuckBoost",
        effect_description: "+20 luck permanently",
        luck_value: 20,
        shop_cost: 4
    },
    "16": {
        name: "Phoenix Feather",
        description: "From the ashes, more chances arise.",
        image: `${BASE_URL}/images/charms/16.png`,
        rarity: "Epic",
        effect_type: "ExtraSpinWithLuck",
        effect_description: "+2 spins with +10 luck each",
        luck_value: 10,
        shop_cost: 4
    },
    "17": {
        name: "Reaper's Mark",
        description: "Death marks all patterns for a second harvest.",
        image: `${BASE_URL}/images/charms/17.png`,
        rarity: "Epic",
        effect_type: "PatternRetrigger",
        effect_description: "ALL patterns trigger twice",
        luck_value: 0,
        shop_cost: 5
    },
    "18": {
        name: "Chaos Orb",
        description: "Born from blocked destruction, chaos rewards survival.",
        image: `${BASE_URL}/images/charms/18.png`,
        rarity: "Epic",
        effect_type: "ConditionalLuckBoost",
        effect_description: "+15 luck if 666 was blocked this session",
        luck_value: 15,
        shop_cost: 5
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // LEGENDARY CHARMS (2 types)
    // ═══════════════════════════════════════════════════════════════════════════
    "19": {
        name: "Soul of the Abyss",
        description: "The heart of the abyss itself. Jackpots bow to its power.",
        image: `${BASE_URL}/images/charms/19.png`,
        rarity: "Legendary",
        effect_type: "LuckBoost + PatternRetrigger",
        effect_description: "+30 luck, Jackpot patterns trigger twice",
        luck_value: 30,
        shop_cost: 6
    },
    "20": {
        name: "Void Heart",
        description: "The ultimate soul charm. Reality bends to your will.",
        image: `${BASE_URL}/images/charms/20.png`,
        rarity: "Legendary",
        effect_type: "ExtraSpinWithLuck + Combo",
        effect_description: "+25 luck, +1 spin with +50 luck, patterns 1.5x",
        luck_value: 75,
        shop_cost: 7
    }
};

// Rarity colors for display
const RARITY_COLORS: Record<string, string> = {
    "Common": "#9CA3AF",
    "Rare": "#3B82F6",
    "Epic": "#8B5CF6",
    "Legendary": "#F59E0B"
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    // These params come from the contract's token_uri query: ?charmId=X&tokenId=Y
    const charmIdVal = searchParams.get('charmId');
    const tokenIdVal = searchParams.get('tokenId');

    // Basic validation
    if (!charmIdVal || !CHARM_METADATA[charmIdVal]) {
        return NextResponse.json({ error: "Invalid or missing charmId" }, { status: 400 });
    }

    const metadata = CHARM_METADATA[charmIdVal];
    const tokenIdStr = tokenIdVal ? ` #${tokenIdVal}` : '';

    try {
        // Return standard OpenSea/Starknet NFT metadata
        return NextResponse.json({
            name: `${metadata.name}${tokenIdStr}`,
            description: metadata.description,
            image: metadata.image,
            external_url: `${BASE_URL}`,
            attributes: [
                { trait_type: "Rarity", value: metadata.rarity },
                { trait_type: "Effect Type", value: metadata.effect_type },
                { trait_type: "Effect", value: metadata.effect_description },
                { trait_type: "Luck Value", value: metadata.luck_value, display_type: "number" },
                { trait_type: "Shop Cost", value: metadata.shop_cost, display_type: "number" },
                { trait_type: "Charm ID", value: parseInt(charmIdVal), display_type: "number" }
            ],
            // Additional metadata for rarity display
            background_color: RARITY_COLORS[metadata.rarity]?.replace("#", "") || "1A1A2E"
        });

    } catch (error) {
        console.error("Error fetching charm metadata:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
