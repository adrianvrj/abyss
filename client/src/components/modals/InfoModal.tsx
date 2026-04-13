import { useEffect, useState } from 'react';
import ModalWrapper from './ModalWrapper';
import { DEFAULT_GAME_CONFIG, SYMBOL_INFO, GameConfig, PatternType } from '@/utils/GameConfig';
import { ContractItem, getItemInfo, getSessionItems } from '@/utils/abyssContract';
import { applyItemEffects } from '@/utils/itemEffects';

interface InfoModalProps {
    sessionId: number;
    onClose: () => void;
    optimisticItems?: ContractItem[];
    practiceMode?: boolean;
    practiceItems?: ContractItem[];
}

type InfoTab = 'how' | 'symbols' | 'patterns';

const HOW_TO_PLAY_SECTIONS = [
    {
        title: 'OBJECTIVE',
        body: 'Spin for score, climb levels, and survive long enough to lock in a big run. Every level demands a higher score threshold.',
    },
    {
        title: 'SPINS',
        body: 'You begin with 5 spins. When you clear a level threshold, the machine grants more spins and pushes the run deeper.',
    },
    {
        title: '666 RISK',
        body: 'If the machine resolves a 666 pattern, your score is wiped unless a Biblia blocks it. The odds get meaner as levels rise.',
    },
    {
        title: 'MARKET',
        body: 'Spend score during the run to buy items that change symbol values, pattern multipliers, luck, spins, or other run math.',
    },
    {
        title: 'RELICS',
        body: 'You can bind exactly one relic per session. Its effect can swing the run hard, but once the slot is sealed you cannot swap it.',
    },
    {
        title: 'LEADERBOARD',
        body: 'Finished runs feed the leaderboard. Push higher scores and cleaner runs to climb the ranking.',
    },
];

const PATTERN_LABELS: Record<PatternType, string> = {
    'horizontal-3': 'H3',
    'horizontal-4': 'H4',
    'horizontal-5': 'H5',
    'vertical-3': 'V3',
    'diagonal-3': 'D3',
    jackpot: 'JP',
};

export default function InfoModal({
    sessionId,
    onClose,
    optimisticItems = [],
    practiceMode = false,
    practiceItems = [],
}: InfoModalProps) {
    const [activeTab, setActiveTab] = useState<InfoTab>('how');
    const [loading, setLoading] = useState(true);
    const [gameConfig, setGameConfig] = useState<GameConfig>(DEFAULT_GAME_CONFIG);
    const [sessionItemCount, setSessionItemCount] = useState(0);

    useEffect(() => {
        void loadItemsAndApplyEffects();
    }, [practiceItems, practiceMode, sessionId, optimisticItems]);

    async function loadItemsAndApplyEffects() {
        try {
            setLoading(true);
            let items: ContractItem[] = [];

            if (practiceMode) {
                items = [...practiceItems];
            } else if (sessionId > 0) {
                const playerItems = await getSessionItems(sessionId);
                items = await Promise.all(playerItems.map((playerItem) => getItemInfo(playerItem.item_id)));
            }

            const existingIds = new Set(items.map((item) => item.item_id));
            const uniqueOptimistic = optimisticItems.filter((item) => !existingIds.has(item.item_id));
            items = [...items, ...uniqueOptimistic];

            const effects = applyItemEffects(DEFAULT_GAME_CONFIG, items);
            setGameConfig(effects.modifiedConfig);
            setSessionItemCount(items.length);
        } catch (error) {
            console.error('Failed to load items:', error);
            setGameConfig(DEFAULT_GAME_CONFIG);
            setSessionItemCount(0);
        } finally {
            setLoading(false);
        }
    }

    const wasModified = (current: number, original: number) => current !== original;

    const renderPattern = (type: PatternType) => {
        let cells = Array(15).fill(false);
        if (type === 'horizontal-3') [0, 1, 2].forEach((index) => { cells[index] = true; });
        if (type === 'horizontal-4') [0, 1, 2, 3].forEach((index) => { cells[index] = true; });
        if (type === 'horizontal-5') [0, 1, 2, 3, 4].forEach((index) => { cells[index] = true; });
        if (type === 'vertical-3') [0, 5, 10].forEach((index) => { cells[index] = true; });
        if (type === 'diagonal-3') [0, 6, 12].forEach((index) => { cells[index] = true; });
        if (type === 'jackpot') cells = Array(15).fill(true);

        return (
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 8px)',
                    gridTemplateRows: 'repeat(3, 8px)',
                    gap: 2,
                    padding: 8,
                    borderRadius: 6,
                    background: 'rgba(0,0,0,0.45)',
                    border: '1px solid rgba(255,132,28,0.18)',
                }}
            >
                {cells.map((active, index) => (
                    <div
                        key={index}
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: active ? '#FFD700' : '#333',
                        }}
                    />
                ))}
            </div>
        );
    };

    const tabStyle = (isActive: boolean) => ({
        flex: 1,
        padding: '10px 6px',
        background: isActive ? '#FF841C' : '#171717',
        color: isActive ? '#000' : '#666',
        border: '1px solid rgba(255,132,28,0.35)',
        borderRadius: 6,
        fontFamily: "'PressStart2P', monospace",
        fontSize: 8,
        cursor: 'pointer',
    });

    return (
        <ModalWrapper onClose={onClose} title="INFO" maxWidth={440} maxHeight="82vh">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div
                    style={{
                        background: 'rgba(0,0,0,0.6)',
                        border: '2px solid #FF841C',
                        borderRadius: 12,
                        padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                }}
                >
                    <div style={{ fontFamily: "'PressStart2P', monospace", fontSize: 8, color: '#666' }}>
                        {practiceMode ? 'PRACTICE READOUT' : 'LIVE SESSION READOUT'}
                    </div>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                            gap: 8,
                        }}
                    >
                        <div style={{ background: '#111', borderRadius: 6, padding: 10, border: '1px solid rgba(255,132,28,0.2)' }}>
                            <div style={{ fontFamily: "'PressStart2P', monospace", fontSize: 7, color: '#666', marginBottom: 8 }}>ITEMS</div>
                            <div style={{ fontFamily: "'PressStart2P', monospace", fontSize: 12, color: '#FF841C' }}>{sessionItemCount}</div>
                        </div>
                        <div style={{ background: '#111', borderRadius: 6, padding: 10, border: '1px solid rgba(255,132,28,0.2)' }}>
                            <div style={{ fontFamily: "'PressStart2P', monospace", fontSize: 7, color: '#666', marginBottom: 8 }}>666</div>
                            <div style={{ fontFamily: "'PressStart2P', monospace", fontSize: 12, color: '#FF4444' }}>
                                {gameConfig.probability666.toFixed(1)}%
                            </div>
                        </div>
                        <div style={{ background: '#111', borderRadius: 6, padding: 10, border: '1px solid rgba(255,132,28,0.2)' }}>
                            <div style={{ fontFamily: "'PressStart2P', monospace", fontSize: 7, color: '#666', marginBottom: 8 }}>BASE SPINS</div>
                            <div style={{ fontFamily: "'PressStart2P', monospace", fontSize: 12, color: '#FFD700' }}>5</div>
                        </div>
                    </div>
                </div>

                {practiceMode && (
                    <div
                        style={{
                            background: 'rgba(255, 132, 28, 0.08)',
                            border: '2px solid rgba(255, 132, 28, 0.45)',
                            borderRadius: 10,
                            padding: 12,
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: 8,
                            lineHeight: 1.9,
                            color: '#FFB874',
                        }}
                    >
                        PRACTICE MODE RUNS COMPLETELY OFFCHAIN. NO SESSION NFTS, NO CHIPS, NO CHARMS, NO RELICS.
                    </div>
                )}

                <div style={{ display: 'flex', gap: 6 }}>
                    <button style={tabStyle(activeTab === 'how')} onClick={() => setActiveTab('how')}>HOW</button>
                    <button style={tabStyle(activeTab === 'symbols')} onClick={() => setActiveTab('symbols')}>SYMBOLS</button>
                    <button style={tabStyle(activeTab === 'patterns')} onClick={() => setActiveTab('patterns')}>PATTERNS</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {activeTab === 'how' && (
                        <>
                            {HOW_TO_PLAY_SECTIONS.map((section) => (
                                <div
                                    key={section.title}
                                    style={{
                                        background: 'rgba(0,0,0,0.6)',
                                        border: '2px solid #FF841C',
                                        borderRadius: 10,
                                        padding: 12,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontFamily: "'PressStart2P', monospace",
                                            fontSize: 9,
                                            color: '#FF841C',
                                            marginBottom: 10,
                                        }}
                                    >
                                        {section.title}
                                    </div>
                                    <div
                                        style={{
                                            fontFamily: "'PressStart2P', monospace",
                                            fontSize: 8,
                                            lineHeight: 1.9,
                                            color: '#ccc',
                                        }}
                                    >
                                        {section.body}
                                    </div>
                                </div>
                            ))}
                        </>
                    )}

                    {activeTab === 'symbols' && (
                        <>
                            {loading ? (
                                <div style={{ color: '#fff', textAlign: 'center', fontFamily: "'PressStart2P', monospace", fontSize: 10 }}>LOADING...</div>
                            ) : (
                                gameConfig.symbols
                                    .filter((symbol) => symbol.type !== 'six')
                                    .map((symbol) => {
                                        const original = DEFAULT_GAME_CONFIG.symbols.find((baseSymbol) => baseSymbol.type === symbol.type);
                                        const pointsModified = original ? wasModified(symbol.points, original.points) : false;
                                        const probabilityModified = original ? wasModified(symbol.probability, original.probability) : false;
                                        const info = SYMBOL_INFO[symbol.type];

                                        return (
                                            <div
                                                key={symbol.type}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    padding: 12,
                                                    background: 'rgba(0,0,0,0.6)',
                                                    border: '2px solid #FF841C',
                                                    borderRadius: 10,
                                                }}
                                            >
                                                <img
                                                    src={info.image}
                                                    alt={info.name}
                                                    width={36}
                                                    height={36}
                                                    loading="lazy"
                                                    style={{ objectFit: 'contain', flexShrink: 0 }}
                                                />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontFamily: "'PressStart2P', monospace", fontSize: 10, color: '#fff', marginBottom: 8 }}>
                                                        {info.name.toUpperCase()}
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                                                        <div style={{ fontFamily: "'PressStart2P', monospace", fontSize: 8, color: pointsModified ? '#4ADE80' : '#FFD700' }}>
                                                            {symbol.points} PTS
                                                            {pointsModified && original && (
                                                                <span style={{ color: '#666', marginLeft: 6, textDecoration: 'line-through' }}>
                                                                    {original.points}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontFamily: "'PressStart2P', monospace", fontSize: 8, color: probabilityModified ? '#4ADE80' : '#888' }}>
                                                            {symbol.probability}%
                                                            {probabilityModified && original && (
                                                                <span style={{ color: '#666', marginLeft: 6, textDecoration: 'line-through' }}>
                                                                    {original.probability}%
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                            )}

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: 12,
                                    background: 'rgba(72,0,0,0.35)',
                                    border: '2px solid #8B0000',
                                    borderRadius: 10,
                                }}
                            >
                                <img
                                    src="/images/six.png"
                                    alt="Six"
                                    width={36}
                                    height={36}
                                    loading="lazy"
                                    style={{ objectFit: 'contain', flexShrink: 0 }}
                                />
                                <div>
                                    <div style={{ fontFamily: "'PressStart2P', monospace", fontSize: 10, color: '#FF4444', marginBottom: 8 }}>SIX</div>
                                    <div style={{ fontFamily: "'PressStart2P', monospace", fontSize: 8, lineHeight: 1.9, color: '#FF6666' }}>
                                        CURSED SYMBOL · IF IT RESOLVES INTO 666 YOU LOSE THE SCORE.
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'patterns' && (
                        <>
                            {loading ? (
                                <div style={{ color: '#fff', textAlign: 'center', fontFamily: "'PressStart2P', monospace", fontSize: 10 }}>LOADING...</div>
                            ) : (
                                gameConfig.patternMultipliers.map((pattern) => {
                                    const original = DEFAULT_GAME_CONFIG.patternMultipliers.find((basePattern) => basePattern.type === pattern.type);
                                    const multiplierModified = original ? wasModified(pattern.multiplier, original.multiplier) : false;

                                    return (
                                        <div
                                            key={pattern.type}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                padding: 12,
                                                background: 'rgba(0,0,0,0.6)',
                                                border: '2px solid #FF841C',
                                                borderRadius: 10,
                                            }}
                                        >
                                            {renderPattern(pattern.type)}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontFamily: "'PressStart2P', monospace", fontSize: 9, color: '#fff', marginBottom: 8 }}>
                                                    {PATTERN_LABELS[pattern.type]}
                                                </div>
                                                <div style={{ fontFamily: "'PressStart2P', monospace", fontSize: 11, color: multiplierModified ? '#4ADE80' : '#FFD700' }}>
                                                    {pattern.multiplier.toFixed(1)}x
                                                    {multiplierModified && original && (
                                                        <span style={{ color: '#666', marginLeft: 6, fontSize: 8, textDecoration: 'line-through' }}>
                                                            {original.multiplier.toFixed(1)}x
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </>
                    )}
                </div>
            </div>
        </ModalWrapper>
    );
}
