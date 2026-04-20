import { NextResponse } from 'next/server';

// Base URL for images
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://abyssgame.fun';

// Relic metadata configuration
const RELIC_METADATA: Record<string, {
    name: string;
    description: string;
    image: string;
    rarity: string;
    effect_type: string;
    effect_description: string;
    cooldown: number;
}> = {
    "1": {
        name: "Mortis",
        description: "Gentleman of Death - Forces a random jackpot.",
        image: `${BASE_URL}/images/relics/mortis.png`,
        rarity: "Mythic",
        effect_type: "Random Jackpot",
        effect_description: "Forces a random jackpot on your next spin.",
        cooldown: 15,
    },
    "2": {
        name: "Phantom",
        description: "The Timeless Specter - Resets to max spins.",
        image: `${BASE_URL}/images/relics/phantom.png`,
        rarity: "Mythic",
        effect_type: "Reset Spins",
        effect_description: "Resets your run back to max spins when activated.",
        cooldown: 15,
    },
    "3": {
        name: "Lucky the Dealer",
        description: "Doubles down on every bet - 5x next spin score.",
        image: `${BASE_URL}/images/relics/lucky_the_dealer.png`,
        rarity: "Legendary",
        effect_type: "Double Next Spin",
        effect_description: "Multiplies the next spin score by 5x.",
        cooldown: 9,
    },
    "4": {
        name: "Scorcher",
        description: "Master of the cursed 666 - Immediately end session.",
        image: `${BASE_URL}/images/relics/scorcher.png`,
        rarity: "Legendary",
        effect_type: "End Session",
        effect_description: "Immediately ends the current session when activated.",
        cooldown: 9,
    },
    "5": {
        name: "Inferno",
        description: "Hell's marketplace demon - Free market refresh.",
        image: `${BASE_URL}/images/relics/inferno.png`,
        rarity: "Legendary",
        effect_type: "Market Refresh",
        effect_description: "Instantly refreshes the market inventory for free.",
        cooldown: 9,
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
    // These params come from the contract's token_uri query: ?relicId=X&tokenId=Y
    const relicIdVal = searchParams.get('relicId');
    const tokenIdVal = searchParams.get('tokenId');

    // Basic validation
    if (!relicIdVal || !RELIC_METADATA[relicIdVal]) {
        return NextResponse.json({ error: "Invalid or missing relicId" }, { status: 400 });
    }

    const metadata = RELIC_METADATA[relicIdVal];
    const tokenIdStr = tokenIdVal ? ` #${tokenIdVal}` : '';

    try {
        return NextResponse.json({
            name: `${metadata.name}${tokenIdStr}`,
            description: metadata.description,
            image: metadata.image,
            external_url: `${BASE_URL}`,
            attributes: [
                { trait_type: "Rarity", value: metadata.rarity },
                { trait_type: "Effect Type", value: metadata.effect_type },
                { trait_type: "Effect", value: metadata.effect_description },
                { trait_type: "Cooldown", value: metadata.cooldown, display_type: "number" },
                { trait_type: "Relic ID", value: parseInt(relicIdVal), display_type: "number" }
            ],
            background_color: RARITY_COLORS[metadata.rarity]?.replace("#", "") || "1A1A2E"
        });

    } catch (error) {
        console.error("Error fetching relic metadata:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
