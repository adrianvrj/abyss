import { NextResponse } from 'next/server';

// Base URL for images - update this to your production domain
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
        image: `${BASE_URL}/images/charms/whisper_stone.png`,
        rarity: "Common",
        effect_type: "LuckBoost",
        effect_description: "+3 luck permanently",
        luck_value: 3,
        shop_cost: 50
    },
    "2": {
        name: "Faded Coin",
        description: "An ancient coin worn smooth by countless wishes.",
        image: `${BASE_URL}/images/charms/faded_coin.png`,
        rarity: "Common",
        effect_type: "LuckBoost",
        effect_description: "+4 luck permanently",
        luck_value: 4,
        shop_cost: 65
    },
    "3": {
        name: "Broken Mirror",
        description: "Seven years of bad luck? Not with this shard.",
        image: `${BASE_URL}/images/charms/broken_mirror.png`,
        rarity: "Common",
        effect_type: "ConditionalLuckBoost",
        effect_description: "+5 luck when last spin had no patterns",
        luck_value: 5,
        shop_cost: 70
    },
    "4": {
        name: "Dusty Hourglass",
        description: "Time runs out, but luck flows in.",
        image: `${BASE_URL}/images/charms/dusty_hourglass.png`,
        rarity: "Common",
        effect_type: "ConditionalLuckBoost",
        effect_description: "+4 luck when ≤2 spins remaining",
        luck_value: 4,
        shop_cost: 75
    },
    "5": {
        name: "Cracked Skull",
        description: "Death's reminder that fortune favors the bold.",
        image: `${BASE_URL}/images/charms/cracked_skull.png`,
        rarity: "Common",
        effect_type: "LuckBoost",
        effect_description: "+5 luck permanently",
        luck_value: 5,
        shop_cost: 80
    },
    "6": {
        name: "Rusty Key",
        description: "Unlocks hidden potential in every item you collect.",
        image: `${BASE_URL}/images/charms/rusty_key.png`,
        rarity: "Common",
        effect_type: "ConditionalLuckBoost",
        effect_description: "+3 luck per item in inventory",
        luck_value: 3,
        shop_cost: 85
    },
    "7": {
        name: "Moth Wing",
        description: "Drawn to the light of fortune like a moth to flame.",
        image: `${BASE_URL}/images/charms/moth_wing.png`,
        rarity: "Common",
        effect_type: "LuckBoost",
        effect_description: "+6 luck permanently",
        luck_value: 6,
        shop_cost: 90
    },
    "8": {
        name: "Bone Dice",
        description: "When you have nothing to lose, luck finds you.",
        image: `${BASE_URL}/images/charms/bone_dice.png`,
        rarity: "Common",
        effect_type: "ConditionalLuckBoost",
        effect_description: "+8 luck when score < 100",
        luck_value: 8,
        shop_cost: 100
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // RARE CHARMS (6 types)
    // ═══════════════════════════════════════════════════════════════════════════
    "9": {
        name: "Soul Fragment",
        description: "A piece of a wandering spirit, forever seeking patterns.",
        image: `${BASE_URL}/images/charms/soul_fragment.png`,
        rarity: "Rare",
        effect_type: "LuckBoost",
        effect_description: "+10 luck permanently",
        luck_value: 10,
        shop_cost: 150
    },
    "10": {
        name: "Cursed Pendant",
        description: "Cursed to repeat horizontal patterns again and again.",
        image: `${BASE_URL}/images/charms/cursed_pendant.png`,
        rarity: "Rare",
        effect_type: "PatternRetrigger",
        effect_description: "Horizontal-3 patterns trigger twice",
        luck_value: 0,
        shop_cost: 200
    },
    "11": {
        name: "Shadow Lantern",
        description: "Its light grows brighter as you descend deeper.",
        image: `${BASE_URL}/images/charms/shadow_lantern.png`,
        rarity: "Rare",
        effect_type: "LuckBoost",
        effect_description: "+8 luck, +4 more at level 5+",
        luck_value: 12,
        shop_cost: 220
    },
    "12": {
        name: "Ethereal Chain",
        description: "Each pattern strengthens the links of fate.",
        image: `${BASE_URL}/images/charms/ethereal_chain.png`,
        rarity: "Rare",
        effect_type: "ConditionalLuckBoost",
        effect_description: "+6 luck per pattern in last spin",
        luck_value: 6,
        shop_cost: 250
    },
    "13": {
        name: "Void Compass",
        description: "Points toward one more chance at destiny.",
        image: `${BASE_URL}/images/charms/void_compass.png`,
        rarity: "Rare",
        effect_type: "ExtraSpinWithLuck",
        effect_description: "+1 spin with +15 luck",
        luck_value: 15,
        shop_cost: 280
    },
    "14": {
        name: "Demon's Tooth",
        description: "Ripped from a diagonal demon. Patterns tremble.",
        image: `${BASE_URL}/images/charms/demons_tooth.png`,
        rarity: "Rare",
        effect_type: "PatternRetrigger",
        effect_description: "Diagonal patterns trigger twice",
        luck_value: 0,
        shop_cost: 300
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // EPIC CHARMS (4 types)
    // ═══════════════════════════════════════════════════════════════════════════
    "15": {
        name: "Abyssal Eye",
        description: "The eye of the abyss sees all patterns before they form.",
        image: `${BASE_URL}/images/charms/abyssal_eye.png`,
        rarity: "Epic",
        effect_type: "LuckBoost",
        effect_description: "+20 luck permanently",
        luck_value: 20,
        shop_cost: 400
    },
    "16": {
        name: "Phoenix Feather",
        description: "From the ashes, more chances arise.",
        image: `${BASE_URL}/images/charms/phoenix_feather.png`,
        rarity: "Epic",
        effect_type: "ExtraSpinWithLuck",
        effect_description: "+2 spins with +10 luck each",
        luck_value: 10,
        shop_cost: 500
    },
    "17": {
        name: "Reaper's Mark",
        description: "Death marks all patterns for a second harvest.",
        image: `${BASE_URL}/images/charms/reapers_mark.png`,
        rarity: "Epic",
        effect_type: "PatternRetrigger",
        effect_description: "ALL patterns trigger twice",
        luck_value: 0,
        shop_cost: 550
    },
    "18": {
        name: "Chaos Orb",
        description: "Born from blocked destruction, chaos rewards survival.",
        image: `${BASE_URL}/images/charms/chaos_orb.png`,
        rarity: "Epic",
        effect_type: "ConditionalLuckBoost",
        effect_description: "+15 luck if 666 was blocked this session",
        luck_value: 15,
        shop_cost: 600
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // LEGENDARY CHARMS (2 types)
    // ═══════════════════════════════════════════════════════════════════════════
    "19": {
        name: "Soul of the Abyss",
        description: "The heart of the abyss itself. Jackpots bow to its power.",
        image: `${BASE_URL}/images/charms/soul_of_abyss.png`,
        rarity: "Legendary",
        effect_type: "LuckBoost + PatternRetrigger",
        effect_description: "+30 luck, Jackpot patterns trigger twice",
        luck_value: 30,
        shop_cost: 1000
    },
    "20": {
        name: "Void Heart",
        description: "The ultimate soul charm. Reality bends to your will.",
        image: `${BASE_URL}/images/charms/void_heart.png`,
        rarity: "Legendary",
        effect_type: "ExtraSpinWithLuck + Combo",
        effect_description: "+25 luck, +1 spin with +50 luck, patterns 1.5x",
        luck_value: 75,
        shop_cost: 1200
    }
};

// Rarity colors for display
const RARITY_COLORS: Record<string, string> = {
    "Common": "#9CA3AF",
    "Rare": "#3B82F6",
    "Epic": "#8B5CF6",
    "Legendary": "#F59E0B"
};

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const tokenId = (await params).id;

    try {
        // For Soul Charms, the token ID maps directly to charm type for simplicity
        // In production, you might want to fetch the charm_id from the contract
        // based on the token_id -> charm_id mapping

        // For now, we'll use a simple modulo approach:
        // token_id % 20 + 1 = charm_id (1-20)
        // This assumes charms are minted in a round-robin fashion by type

        const tokenIdNum = parseInt(tokenId);
        if (isNaN(tokenIdNum) || tokenIdNum < 1) {
            return NextResponse.json({ error: "Invalid token ID" }, { status: 400 });
        }

        // Calculate charm_id from token_id
        // In production, this should be fetched from the contract
        const charmId = ((tokenIdNum - 1) % 20) + 1;
        const charmIdStr = charmId.toString();

        const metadata = CHARM_METADATA[charmIdStr];

        if (!metadata) {
            return NextResponse.json({ error: "Charm not found" }, { status: 404 });
        }

        // Return standard OpenSea/Starknet NFT metadata
        return NextResponse.json({
            name: `${metadata.name} #${tokenId}`,
            description: metadata.description,
            image: metadata.image,
            external_url: `${BASE_URL}/charms/${tokenId}`,
            attributes: [
                { trait_type: "Rarity", value: metadata.rarity },
                { trait_type: "Effect Type", value: metadata.effect_type },
                { trait_type: "Effect", value: metadata.effect_description },
                { trait_type: "Luck Value", value: metadata.luck_value, display_type: "number" },
                { trait_type: "Shop Cost", value: metadata.shop_cost, display_type: "number" },
                { trait_type: "Charm ID", value: charmId, display_type: "number" }
            ],
            // Additional metadata for rarity display
            background_color: RARITY_COLORS[metadata.rarity]?.replace("#", "") || "1A1A2E"
        });

    } catch (error) {
        console.error("Error fetching charm metadata:", error);
        return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }
}

// Helper endpoint to get all charm types (for frontend use)
export async function OPTIONS() {
    return NextResponse.json({
        total_charm_types: 20,
        rarities: ["Common", "Rare", "Epic", "Legendary"],
        charm_ids: Object.keys(CHARM_METADATA).map(Number)
    });
}
