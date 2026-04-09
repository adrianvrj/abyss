import manifest from '@/lib/manifest.json';
import { RpcProvider } from 'starknet';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://abyssgame.fun';

const provider = new RpcProvider({
    nodeUrl: process.env.NEXT_PUBLIC_STARKNET_RPC_URL || 'https://api.cartridge.gg/x/starknet/sepolia',
});

const PLAY_ADDRESS = manifest.contracts.find(
    (contract) => contract.tag === 'ABYSS-Play'
)?.address;

function parseSession(result: string[]) {
    return {
        sessionId: Number(BigInt(result[0] || '0')),
        level: Number(BigInt(result[2] || '0')),
        score: Number(BigInt(result[3] || '0')),
        totalScore: Number(BigInt(result[4] || '0')),
        spinsRemaining: Number(BigInt(result[5] || '0')),
        isCompetitive: BigInt(result[6] || '0') !== BigInt(0),
        isActive: BigInt(result[7] || '0') !== BigInt(0),
        chipsClaimed: BigInt(result[9] || '0') !== BigInt(0),
        totalSpins: Number(BigInt(result[14] || '0')),
        luck: Number(BigInt(result[15] || '0')),
        blocked666: BigInt(result[16] || '0') !== BigInt(0),
        tickets: Number(BigInt(result[17] || '0')),
    };
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    if (!PLAY_ADDRESS) {
        return NextResponse.json({ error: 'Play contract not found' }, { status: 500 });
    }

    try {
        const result = await provider.callContract({
            contractAddress: PLAY_ADDRESS,
            entrypoint: 'get_session',
            calldata: [id],
        });

        const session = parseSession(result);

        return NextResponse.json({
            name: `Abyss Session #${session.sessionId}`,
            description: 'Abyss is a fully onchain slot machine game built on Starknet with Dojo Engine.',
            image: `${BASE_URL}/api/sessions/${session.sessionId}/image`,
            external_url: 'https://play.abyssgame.fun',
            attributes: [
                { trait_type: 'Session ID', value: session.sessionId },
                { trait_type: 'Score', value: session.score, display_type: 'number' },
                { trait_type: 'Total Score', value: session.totalScore, display_type: 'number' },
                { trait_type: 'Level', value: session.level, display_type: 'number' },
                { trait_type: 'Tickets', value: session.tickets, display_type: 'number' },
                { trait_type: 'Spins Remaining', value: session.spinsRemaining, display_type: 'number' },
                { trait_type: 'Total Spins', value: session.totalSpins, display_type: 'number' },
                { trait_type: 'Luck', value: session.luck, display_type: 'number' },
                { trait_type: 'Mode', value: session.isCompetitive ? 'Competitive' : 'Practice' },
                { trait_type: 'Status', value: session.isActive ? 'Active' : 'Game Over' },
                { trait_type: 'Chips Claimed', value: session.chipsClaimed ? 'Yes' : 'No' },
                { trait_type: 'Blocked 666', value: session.blocked666 ? 'Yes' : 'No' },
            ],
        });
    } catch (error) {
        console.error('Error building session metadata:', error);
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
}
