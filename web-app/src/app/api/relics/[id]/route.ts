import { NextResponse } from 'next/server';
import manifest from '@/lib/manifest.json';
import { RpcProvider } from 'starknet';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://abyssgame.fun';
const DEFAULT_RELIC_ADDRESS = manifest.contracts.find(
    (contract) => contract.tag === 'ABYSS-RelicNFT'
)?.address;

// Configuration for Relic metadata
const RELIC_METADATA: Record<string, any> = {
    "1": {
        name: "Mortis",
        description: "Gentleman of Death - Forces a random jackpot",
        image: `${BASE_URL}/images/relics/mortis.png`,
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
        image: `${BASE_URL}/images/relics/phantom.png`,
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
        image: `${BASE_URL}/images/relics/lucky_the_dealer.png`,
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
        image: `${BASE_URL}/images/relics/scorcher.png`,
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
        image: `${BASE_URL}/images/relics/inferno.png`,
        attributes: [
            { trait_type: "Rarity", value: "Legendary" },
            { trait_type: "Effect", value: "Free Market Refresh" },
            { trait_type: "Cooldown", value: 3, display_type: "number" },
            { trait_type: "Stat: Dexterity", value: 1, display_type: "number" }
        ]
    }
};

const provider = new RpcProvider({
    nodeUrl: process.env.NEXT_PUBLIC_STARKNET_RPC_URL || "https://api.cartridge.gg/x/starknet/mainnet",
});

function normalizeAddress(value: string | null | undefined) {
    if (!value) return null;
    if (value.startsWith('0x') || value.startsWith('0X')) {
        return value;
    }

    try {
        return `0x${BigInt(value).toString(16)}`;
    } catch {
        return value;
    }
}

function parseRelicId(value: string | null | undefined) {
    if (!value) return null;
    const relicId = Number.parseInt(value, 10);
    if (!Number.isFinite(relicId) || relicId < 1) {
        return null;
    }
    return relicId.toString();
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const tokenId = (await params).id;
    const url = new URL(request.url);

    try {
        const tokenIdBigInt = BigInt(tokenId);
        const low = tokenIdBigInt & ((BigInt(1) << BigInt(128)) - BigInt(1));
        const high = tokenIdBigInt >> BigInt(128);
        const contractAddress = normalizeAddress(url.searchParams.get('contract') || DEFAULT_RELIC_ADDRESS);
        const explicitRelicId = parseRelicId(url.searchParams.get('relicId'));

        if (!contractAddress && !explicitRelicId) {
            return NextResponse.json({ error: "Relic contract not found" }, { status: 500 });
        }

        const relicId = explicitRelicId ?? await (async () => {
            const result = await provider.callContract({
                contractAddress: contractAddress!,
                entrypoint: "get_relic_metadata",
                calldata: [low.toString(), high.toString()]
            });

            return BigInt(result[0]).toString();
        })();

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
