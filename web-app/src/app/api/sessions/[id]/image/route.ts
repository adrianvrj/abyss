import manifest from '@/lib/manifest.json';
import { RpcProvider } from 'starknet';

export const dynamic = 'force-dynamic';

const provider = new RpcProvider({
    nodeUrl: process.env.NEXT_PUBLIC_STARKNET_RPC_URL || 'https://api.cartridge.gg/x/starknet/mainnet',
});

const DEFAULT_PLAY_ADDRESS = manifest.contracts.find(
    (contract) => contract.tag === 'ABYSS-Play'
)?.address;

function parseSession(result: string[]) {
    return {
        sessionId: Number(BigInt(result[0] || '0')),
        level: Number(BigInt(result[2] || '0')),
        score: Number(BigInt(result[3] || '0')),
        totalScore: Number(BigInt(result[4] || '0')),
        spinsRemaining: Number(BigInt(result[5] || '0')),
        isActive: BigInt(result[7] || '0') !== BigInt(0),
        chipsClaimed: BigInt(result[9] || '0') !== BigInt(0),
        totalSpins: Number(BigInt(result[14] || '0')),
        luck: Number(BigInt(result[15] || '0')),
        tickets: Number(BigInt(result[17] || '0')),
    };
}

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

function escapeXml(value: string) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const url = new URL(request.url);
    const playAddress = normalizeAddress(url.searchParams.get('play') || DEFAULT_PLAY_ADDRESS);

    if (!playAddress) {
        return new Response('Play contract not found', { status: 500 });
    }

    const sessionIdNum = Number.parseInt(id, 10);
    if (!Number.isFinite(sessionIdNum) || sessionIdNum < 0) {
        return new Response('Invalid session id', { status: 400 });
    }

    try {
        const sessionIdArg = String(sessionIdNum);
        const [sessionRaw, luckRaw] = await Promise.all([
            provider.callContract({
                contractAddress: playAddress,
                entrypoint: 'get_session',
                calldata: [sessionIdArg],
            }),
            provider.callContract({
                contractAddress: playAddress,
                entrypoint: 'get_session_luck',
                calldata: [sessionIdArg],
            }).catch(() => null as string[] | null),
        ]);

        const session = parseSession(sessionRaw);
        // Raw `session.luck` is often 0; in-game HUD uses effective luck (charms, items).
        const currentLuck =
            luckRaw?.[0] !== undefined && luckRaw[0] !== ''
                ? Number(BigInt(luckRaw[0]))
                : session.luck;
        const luckPercent = Math.floor((Math.min(currentLuck, 140) * 100) / 140);
        const status = session.isActive ? 'RUN ACTIVE' : 'GAME OVER';
        const title = `ABYSS SESSION #${session.sessionId}`;

        const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#050201" />
  <rect x="32" y="32" width="1136" height="566" rx="28" fill="none" stroke="#ff8a1c" stroke-width="4" />
  <text x="80" y="120" fill="#ff8a1c" font-size="46" font-family="monospace">${escapeXml(title)}</text>
  <text x="80" y="220" fill="#ff8a1c" font-size="118" font-family="monospace">${escapeXml(status)}</text>
  <text x="80" y="310" fill="#ff8a1c" font-size="34" font-family="monospace">LEVEL ${session.level} | TICKETS ${session.tickets} | SPINS ${session.spinsRemaining}</text>
  <text x="80" y="410" fill="#ff8a1c" font-size="34" font-family="monospace">TOTAL SCORE</text>
  <text x="80" y="500" fill="#ff8a1c" font-size="104" font-family="monospace">${session.totalScore}</text>
  <text x="680" y="410" fill="#ff8a1c" font-size="34" font-family="monospace">TOTAL SPINS</text>
  <text x="680" y="500" fill="#ff8a1c" font-size="104" font-family="monospace">${session.totalSpins}</text>
  <text x="80" y="570" fill="#ff8a1c" font-size="24" font-family="monospace">SCORE ${session.score}</text>
  <text x="320" y="570" fill="#ff8a1c" font-size="24" font-family="monospace">LUCK ${luckPercent}%</text>
  <text x="540" y="570" fill="#ff8a1c" font-size="24" font-family="monospace">CLAIMED ${session.chipsClaimed ? 'YES' : 'NO'}</text>
</svg>`;

        return new Response(svg, {
            headers: {
                'Content-Type': 'image/svg+xml; charset=utf-8',
                // Session stats change every spin; short TTL limits stale OG/social previews.
                'Cache-Control': 'public, max-age=0, must-revalidate, s-maxage=120',
            },
        });
    } catch (error) {
        console.error('Error generating session image metadata:', error);
        return new Response('Session not found', { status: 404 });
    }
}
