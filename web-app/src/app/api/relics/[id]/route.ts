import { NextResponse } from 'next/server';
import { RpcProvider, Contract } from 'starknet';
import { CONTRACTS } from '@/lib/constants';

// Configuration for Relic metadata
const RELIC_METADATA: Record<string, any> = {
    "1": {
        name: "Mortis",
        description: "Gentleman of Death - Forces a random jackpot",
        image: "https://abyss-game.xyz/images/relics/mortis.png", // Absolute URL required for marketplaces
        attributes: [
            { trait_type: "Rarity", value: "Mythic" },
            { trait_type: "Effect", value: "Force Random Jackpot" },
            { trait_type: "Cooldown", value: 5, display_type: "number" },
            { trait_type: "Stat: Luck", value: 1, display_type: "number" },
            { trait_type: "Stat: Vitality", value: 1, display_type: "number" }
        ]
    },
    "2": {
        name: "Phantom",
        description: "The Timeless Specter - Resets your spins to 5",
        image: "https://abyss-game.xyz/images/relics/phantom.png",
        attributes: [
            { trait_type: "Rarity", value: "Mythic" },
            { trait_type: "Effect", value: "Reset Spins" },
            { trait_type: "Cooldown", value: 5, display_type: "number" },
            { trait_type: "Stat: Wisdom", value: 1, display_type: "number" }
        ]
    },
    "3": {
        name: "Lucky the Dealer",
        description: "Doubles down on every bet - 2x next spin score",
        image: "https://abyss-game.xyz/images/relics/lucky_the_dealer.png",
        attributes: [
            { trait_type: "Rarity", value: "Legendary" },
            { trait_type: "Effect", value: "Double Next Spin" },
            { trait_type: "Cooldown", value: 3, display_type: "number" },
            { trait_type: "Stat: Charisma", value: 1, display_type: "number" }
        ]
    },
    "4": {
        name: "Scorcher",
        description: "Master of the cursed 666 - Triggers 666 pattern",
        image: "https://abyss-game.xyz/images/relics/scorcher.png",
        attributes: [
            { trait_type: "Rarity", value: "Legendary" },
            { trait_type: "Effect", value: "Trigger 666" },
            { trait_type: "Cooldown", value: 5, display_type: "number" },
            { trait_type: "Stat: Intelligence", value: 1, display_type: "number" }
        ]
    },
    "5": {
        name: "Inferno",
        description: "Hell's marketplace demon - Free market refresh",
        image: "https://abyss-game.xyz/images/relics/inferno.png",
        attributes: [
            { trait_type: "Rarity", value: "Legendary" },
            { trait_type: "Effect", value: "Free Market Refresh" },
            { trait_type: "Cooldown", value: 3, display_type: "number" },
            { trait_type: "Stat: Dexterity", value: 1, display_type: "number" }
        ]
    }
};

const provider = new RpcProvider({ nodeUrl: "https://api.cartridge.gg/x/starknet/sepolia" });

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const tokenId = (await params).id;

    try {
        // Since get_relic_metadata returns a struct and reading raw storage without ABI can be tricky if we don't assume layout,
        // we will try to use the contract interface if possible.
        // However, fetching ABI every time might be slow.
        // A more robust way for production is to just call 'get_relic_metadata' via execute/call on provider.

        // We know the entrypoint is 'get_relic_metadata' and it takes u256 (low, high).
        // Token ID passed in URL is likely a decimal string.

        const tokenIdBigInt = BigInt(tokenId);
        const low = tokenIdBigInt & ((BigInt(1) << BigInt(128)) - BigInt(1));
        const high = tokenIdBigInt >> BigInt(128);

        // Call the contract directly to avoid ABI fetching overhead if we parse manually, 
        // but using Contract class is safer. We'll fetch ABI once normally, but here we can just do raw call.
        // get_relic_metadata returns RelicMetadata struct.
        // Structure: 
        // relic_id: u32 (index 0)
        // name: felt252 (index 1)
        // ...

        const result = await provider.callContract({
            contractAddress: CONTRACTS.RELIC_NFT,
            entrypoint: "get_relic_metadata",
            calldata: [low.toString(), high.toString()]
        });

        // result[0] is relic_id (u32)
        const relicId = BigInt(result[0]).toString();

        // If relicId is 0, it means it's not initialized or invalid (since our IDs start at 1)
        if (relicId === "0") {
            return NextResponse.json({ error: "Relic not initialized" }, { status: 404 });
        }

        const metadata = RELIC_METADATA[relicId];

        if (!metadata) {
            // Fallback for unknown relic types if any
            return NextResponse.json({
                name: `Relic #${tokenId}`,
                description: "Unknown Relic",
                attributes: []
            });
        }

        // Return standard OpenSea metadata
        return NextResponse.json({
            name: `${metadata.name} #${tokenId}`,
            description: metadata.description,
            image: metadata.image,
            attributes: metadata.attributes
        });

    } catch (error) {
        console.error("Error fetching relic metadata:", error);
        return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }
}
