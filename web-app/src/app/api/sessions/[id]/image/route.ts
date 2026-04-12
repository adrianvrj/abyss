import manifest from '@/lib/manifest.json';
import { RpcProvider } from 'starknet';

export const dynamic = 'force-dynamic';

const provider = new RpcProvider({
    nodeUrl: process.env.NEXT_PUBLIC_STARKNET_RPC_URL || 'https://api.cartridge.gg/x/starknet/sepolia',
});

const DEFAULT_PLAY_ADDRESS = manifest.contracts.find(
    (contract) => contract.tag === 'ABYSS-Play'
)?.address;

type SessionSnapshot = {
    sessionId: number;
    level: number;
    score: number;
    totalScore: number;
    spinsRemaining: number;
    isCompetitive: boolean;
    isActive: boolean;
    chipsClaimed: boolean;
    totalSpins: number;
    luck: number;
    blocked666: boolean;
    tickets: number;
};

function parseSession(result: string[]): SessionSnapshot {
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

function formatCompactNumber(value: number) {
    return new Intl.NumberFormat('en-US').format(value);
}

function seededRandom(seed: number) {
    let state = (seed >>> 0) || 0x9e3779b9;

    return () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 0xffffffff;
    };
}

function generateEmbers(seed: number) {
    const random = seededRandom(seed ^ 0xa11ce);
    const embers: string[] = [];

    for (let index = 0; index < 30; index += 1) {
        const x = 80 + Math.floor(random() * 1040);
        const y = 80 + Math.floor(random() * 260);
        const size = 4 + Math.floor(random() * 8);
        const opacity = (0.14 + (random() * 0.4)).toFixed(2);
        const rotation = Math.floor(random() * 360);

        embers.push(
            `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="1" fill="#ff9a3d" opacity="${opacity}" transform="rotate(${rotation} ${x + (size / 2)} ${y + (size / 2)})" />`
        );
    }

    return embers.join('\n');
}

function generateGridSymbols(session: SessionSnapshot) {
    const random = seededRandom(
        (session.sessionId * 1103515245) ^
        (session.level * 12345) ^
        (session.totalSpins * 2654435761)
    );

    return Array.from({ length: 15 }, (_, index) => {
        if (session.blocked666 && index >= 6 && index <= 8) {
            return 6;
        }

        return 1 + Math.floor(random() * 5);
    });
}

function renderSymbol(symbol: number, x: number, y: number, cellSize: number) {
    const cx = x + (cellSize / 2);
    const cy = y + (cellSize / 2);

    if (symbol === 6) {
        return `
            <g>
                <rect x="${x + 10}" y="${y + 10}" width="${cellSize - 20}" height="${cellSize - 20}" rx="18" fill="rgba(80,12,0,0.95)" stroke="#ff5329" stroke-width="3"/>
                <text x="${cx}" y="${cy + 18}" text-anchor="middle" fill="#ff5d2c" font-size="54" font-weight="700" font-family="monospace">666</text>
            </g>
        `;
    }

    if (symbol === 1) {
        return `
            <g>
                <rect x="${x + 10}" y="${y + 10}" width="${cellSize - 20}" height="${cellSize - 20}" rx="18" fill="rgba(10,10,10,0.72)" />
                <text x="${cx}" y="${cy + 18}" text-anchor="middle" fill="#ff9a3d" font-size="70" font-weight="700" font-family="monospace">7</text>
            </g>
        `;
    }

    if (symbol === 2) {
        return `
            <g>
                <rect x="${x + 10}" y="${y + 10}" width="${cellSize - 20}" height="${cellSize - 20}" rx="18" fill="rgba(10,10,10,0.72)" />
                <rect x="${cx - 24}" y="${cy - 24}" width="48" height="48" fill="#59c9ff" transform="rotate(45 ${cx} ${cy})"/>
                <rect x="${cx - 12}" y="${cy - 12}" width="24" height="24" fill="#b8edff" transform="rotate(45 ${cx} ${cy})" opacity="0.95"/>
            </g>
        `;
    }

    if (symbol === 3) {
        return `
            <g>
                <rect x="${x + 10}" y="${y + 10}" width="${cellSize - 20}" height="${cellSize - 20}" rx="18" fill="rgba(10,10,10,0.72)" />
                <circle cx="${cx - 16}" cy="${cy + 10}" r="16" fill="#ff3a3a" />
                <circle cx="${cx + 12}" cy="${cy + 8}" r="16" fill="#ff3a3a" />
                <path d="M ${cx - 6} ${cy + 4} C ${cx - 2} ${cy - 18}, ${cx + 16} ${cy - 26}, ${cx + 30} ${cy - 20}" stroke="#7ac95b" stroke-width="5" fill="none" stroke-linecap="round"/>
                <path d="M ${cx - 6} ${cy + 4} C ${cx - 10} ${cy - 16}, ${cx - 24} ${cy - 24}, ${cx - 34} ${cy - 18}" stroke="#7ac95b" stroke-width="5" fill="none" stroke-linecap="round"/>
            </g>
        `;
    }

    if (symbol === 4) {
        return `
            <g>
                <rect x="${x + 10}" y="${y + 10}" width="${cellSize - 20}" height="${cellSize - 20}" rx="18" fill="rgba(10,10,10,0.72)" />
                <circle cx="${cx}" cy="${cy}" r="28" fill="#ffcf4a" stroke="#ffd978" stroke-width="5"/>
                <circle cx="${cx}" cy="${cy}" r="16" fill="#ffb327" opacity="0.65"/>
            </g>
        `;
    }

    return `
        <g>
            <rect x="${x + 10}" y="${y + 10}" width="${cellSize - 20}" height="${cellSize - 20}" rx="18" fill="rgba(10,10,10,0.72)" />
            <path d="M ${cx} ${cy - 26}
                     C ${cx + 22} ${cy - 26}, ${cx + 26} ${cy + 8}, ${cx} ${cy + 30}
                     C ${cx - 26} ${cy + 8}, ${cx - 22} ${cy - 26}, ${cx} ${cy - 26}" fill="#b9eb69"/>
            <path d="M ${cx + 12} ${cy - 22} L ${cx + 20} ${cy - 30}" stroke="#efffbf" stroke-width="4" stroke-linecap="round"/>
        </g>
    `;
}

function renderSessionImage(session: SessionSnapshot) {
    const accent = session.isActive ? '#ff8a1c' : '#ff5d2c';
    const accentSoft = session.isActive ? '#ffb35c' : '#ff8b69';
    const statusLabel = session.isActive ? 'RUN ACTIVE' : 'RUN SEALED';
    const statusSubline = session.isActive ? 'THE MACHINE STILL HUNGERS' : 'THE MACHINE HAS CLOSED ITS JAWS';
    const modeLabel = session.isCompetitive ? 'COMPETITIVE' : 'CASUAL';
    const sessionLabel = `ABYSS SESSION #${session.sessionId}`;
    const gridSymbols = generateGridSymbols(session);
    const embers = generateEmbers(session.sessionId);
    const cellSize = 108;
    const gridStartX = 330;
    const gridStartY = 320;

    const symbolMarkup = gridSymbols.map((symbol, index) => {
        const column = index % 5;
        const row = Math.floor(index / 5);
        const x = gridStartX + (column * cellSize);
        const y = gridStartY + (row * cellSize);
        return renderSymbol(symbol, x, y, cellSize);
    }).join('\n');

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200">
  <defs>
    <linearGradient id="bgGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#180804" />
      <stop offset="55%" stop-color="#0b0402" />
      <stop offset="100%" stop-color="#040101" />
    </linearGradient>
    <linearGradient id="frameGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accentSoft}" />
      <stop offset="100%" stop-color="${accent}" />
    </linearGradient>
    <linearGradient id="machineGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a0d08" />
      <stop offset="100%" stop-color="#120704" />
    </linearGradient>
    <linearGradient id="screenGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0d0907" />
      <stop offset="100%" stop-color="#020101" />
    </linearGradient>
    <radialGradient id="altarGlow" cx="50%" cy="22%" r="52%">
      <stop offset="0%" stop-color="rgba(255,138,28,0.32)" />
      <stop offset="50%" stop-color="rgba(255,138,28,0.12)" />
      <stop offset="100%" stop-color="rgba(255,138,28,0)" />
    </radialGradient>
    <filter id="orangeGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <rect width="1200" height="1200" fill="url(#bgGradient)" />
  <rect width="1200" height="1200" fill="url(#altarGlow)" />
  <circle cx="600" cy="1050" r="340" fill="rgba(255,110,32,0.08)" />

  <rect x="36" y="36" width="1128" height="1128" rx="40" fill="none" stroke="url(#frameGradient)" stroke-width="4" />
  <rect x="64" y="64" width="1072" height="1072" rx="26" fill="none" stroke="rgba(255,138,28,0.18)" stroke-width="2" />

  <g opacity="0.85">
    ${embers}
  </g>

  <path d="M 360 210 L 600 84 L 840 210 L 840 258 L 360 258 Z" fill="rgba(255,138,28,0.12)" stroke="rgba(255,138,28,0.24)" stroke-width="3" />
  <path d="M 510 150 L 600 108 L 690 150 L 640 150 L 600 200 L 560 150 Z" fill="${accent}" opacity="0.92" filter="url(#orangeGlow)" />

  <text x="94" y="124" fill="${accentSoft}" font-size="28" font-family="monospace" letter-spacing="4">${escapeXml(sessionLabel)}</text>

  <g transform="translate(874 84)">
    <rect width="232" height="52" rx="26" fill="rgba(0,0,0,0.82)" stroke="${accent}" stroke-width="3" />
    <text x="116" y="33" text-anchor="middle" fill="${accent}" font-size="24" font-family="monospace" font-weight="700">${escapeXml(modeLabel)}</text>
  </g>

  <g>
    <rect x="214" y="216" width="772" height="610" rx="40" fill="url(#machineGradient)" stroke="${accent}" stroke-width="4" />
    <rect x="258" y="256" width="684" height="96" rx="20" fill="rgba(0,0,0,0.76)" stroke="rgba(255,138,28,0.36)" stroke-width="3" />
    <text x="600" y="314" text-anchor="middle" fill="${accent}" font-size="74" font-family="monospace" font-weight="700" letter-spacing="4">${escapeXml(statusLabel)}</text>
    <text x="600" y="346" text-anchor="middle" fill="rgba(255,196,132,0.82)" font-size="18" font-family="monospace" letter-spacing="3">${escapeXml(statusSubline)}</text>

    <rect x="292" y="386" width="616" height="324" rx="26" fill="url(#screenGradient)" stroke="rgba(255,138,28,0.4)" stroke-width="3" />
    <rect x="312" y="406" width="576" height="284" rx="20" fill="rgba(255,138,28,0.03)" stroke="rgba(255,138,28,0.08)" stroke-width="2" />
    ${symbolMarkup}

    <g transform="translate(286 734)">
      <rect width="628" height="52" rx="18" fill="rgba(0,0,0,0.66)" stroke="rgba(255,138,28,0.24)" stroke-width="2" />
      <text x="34" y="33" fill="rgba(255,194,136,0.82)" font-size="20" font-family="monospace">LEVEL ${session.level}</text>
      <text x="232" y="33" fill="rgba(255,194,136,0.82)" font-size="20" font-family="monospace">TICKETS ${session.tickets}</text>
      <text x="456" y="33" fill="rgba(255,194,136,0.82)" font-size="20" font-family="monospace">SPINS ${session.spinsRemaining}</text>
    </g>
  </g>

  <g transform="translate(118 872)">
    <rect width="462" height="210" rx="28" fill="rgba(13,6,4,0.95)" stroke="${accent}" stroke-width="3" />
    <text x="34" y="50" fill="${accentSoft}" font-size="24" font-family="monospace" letter-spacing="3">TOTAL SCORE</text>
    <text x="34" y="138" fill="${accent}" font-size="92" font-family="monospace" font-weight="700">${escapeXml(formatCompactNumber(session.totalScore))}</text>
    <text x="34" y="182" fill="rgba(255,194,136,0.72)" font-size="20" font-family="monospace">RUN SCORE ${escapeXml(formatCompactNumber(session.score))}</text>
  </g>

  <g transform="translate(616 872)">
    <rect width="466" height="98" rx="24" fill="rgba(13,6,4,0.95)" stroke="${accent}" stroke-width="3" />
    <text x="28" y="40" fill="${accentSoft}" font-size="22" font-family="monospace" letter-spacing="3">TOTAL SPINS</text>
    <text x="28" y="78" fill="${accent}" font-size="54" font-family="monospace" font-weight="700">${escapeXml(formatCompactNumber(session.totalSpins))}</text>
    <text x="270" y="40" fill="${accentSoft}" font-size="22" font-family="monospace" letter-spacing="3">LUCK</text>
    <text x="270" y="78" fill="${accent}" font-size="54" font-family="monospace" font-weight="700">${escapeXml(formatCompactNumber(session.luck))}</text>
  </g>

  <g transform="translate(616 984)">
    <rect width="222" height="98" rx="24" fill="rgba(13,6,4,0.95)" stroke="${accent}" stroke-width="3" />
    <text x="28" y="40" fill="${accentSoft}" font-size="22" font-family="monospace" letter-spacing="3">CLAIMED</text>
    <text x="28" y="78" fill="${accent}" font-size="38" font-family="monospace" font-weight="700">${session.chipsClaimed ? 'YES' : 'NO'}</text>
  </g>

  <g transform="translate(860 984)">
    <rect width="222" height="98" rx="24" fill="rgba(13,6,4,0.95)" stroke="${accent}" stroke-width="3" />
    <text x="28" y="40" fill="${accentSoft}" font-size="22" font-family="monospace" letter-spacing="3">WARD</text>
    <text x="28" y="78" fill="${accent}" font-size="38" font-family="monospace" font-weight="700">${session.blocked666 ? 'BROKEN' : 'INTACT'}</text>
  </g>
</svg>`;
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

    try {
        const result = await provider.callContract({
            contractAddress: playAddress,
            entrypoint: 'get_session',
            calldata: [id],
        });

        const session = parseSession(result);
        const svg = renderSessionImage(session);

        return new Response(svg, {
            headers: {
                'Content-Type': 'image/svg+xml; charset=utf-8',
                'Cache-Control': 'public, max-age=60, s-maxage=60',
            },
        });
    } catch (error) {
        console.error('Error generating session image metadata:', error);
        return new Response('Session not found', { status: 404 });
    }
}
