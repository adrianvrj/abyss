import { NextResponse } from 'next/server';

// Base URL for images
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://play.abyssgame.fun';

// Relic metadata configuration
const RELIC_METADATA: Record<string, {
    name: string;
    description: string;
    image: string;
    rarity: string;
    effect_type: string;
    effect_description: string;
}> = {
    "1": {
        name: "Mortis",
        description: "The beginning of the end. A relic that embodies the finality of existence.",
        image: `${BASE_URL}/images/relics/1.png`,
        rarity: "Common",
        effect_type: "Game Over",
        effect_description: "Ends your session immediately upon activation"
    },
    "2": {
        name: "Phantom",
        description: "Now you see it, now you don't. A relic that manipulates the fabric of spins.",
        image: `${BASE_URL}/images/relics/2.png`,
        rarity: "Rare",
        effect_type: "Free Spins",
        effect_description: "Grants 5 free spins instantly"
    },
    "3": {
        name: "Lucky the Dealer",
        description: "Luck is not a chance, it's a choice. And Lucky chooses you.",
        image: `${BASE_URL}/images/relics/3.png`,
        rarity: "Epic",
        effect_type: "Luck Boost",
        effect_description: "+50 Luck for the next 10 spins"
    },
    "4": {
        name: "Scorcher",
        description: "Burn it all down. Chaos reigns supreme when the Scorcher is active.",
        image: `${BASE_URL}/images/relics/4.png`,
        rarity: "Legendary",
        effect_type: "High Risk",
        effect_description: "Ends session, 50% chance to double score, 50% to lose half"
    },
    "5": {
        name: "Inferno",
        description: "The market ablaze with new opportunities. Fresh goods, hot prices.",
        image: `${BASE_URL}/images/relics/5.png`,
        rarity: "Rare",
        effect_type: "Market Refresh",
        effect_description: "Instantly refreshes the market items"
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
                { trait_type: "Relic ID", value: parseInt(relicIdVal), display_type: "number" }
            ],
            background_color: RARITY_COLORS[metadata.rarity]?.replace("#", "") || "1A1A2E"
        });

    } catch (error) {
        console.error("Error fetching relic metadata:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
