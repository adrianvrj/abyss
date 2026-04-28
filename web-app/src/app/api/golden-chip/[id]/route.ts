import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://abyssgame.fun';
const MAX_SUPPLY = 200;

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const tokenId = (await params).id;
    const parsedTokenId = Number.parseInt(tokenId, 10);

    if (!Number.isFinite(parsedTokenId) || parsedTokenId < 1) {
        return NextResponse.json({ error: 'Invalid token id' }, { status: 400 });
    }

    return NextResponse.json({
        name: `Golden Chip #${tokenId}`,
        description: 'Grants the holder 2 free Abyss runs per week.',
        image: `${BASE_URL}/images/golden-chip.gif`,
        external_url: BASE_URL,
        attributes: [
            { trait_type: 'Benefit', value: '2 free runs weekly' },
            { trait_type: 'Mint Price', value: '150 USDC' },
            { trait_type: 'Supply', value: MAX_SUPPLY, display_type: 'number' },
            { trait_type: 'Transferable', value: true },
        ],
        background_color: '050505',
    });
}
