import React, { useState, useEffect } from 'react';
import ModalWrapper from './ModalWrapper';
import Image from 'next/image';
import { DEFAULT_GAME_CONFIG, SYMBOL_INFO, GameConfig } from '@/utils/GameConfig';
import { getSessionItems, getItemInfo, ContractItem } from '@/utils/abyssContract';
import { applyItemEffects } from '@/utils/itemEffects';

interface InfoModalProps {
    sessionId: number;
    onClose: () => void;
}

export default function InfoModal({ sessionId, onClose }: InfoModalProps) {
    const [activeTab, setActiveTab] = useState<'how' | 'symbols' | 'patterns'>('how');
    const [loading, setLoading] = useState(true);
    const [gameConfig, setGameConfig] = useState<GameConfig>(DEFAULT_GAME_CONFIG);
    const [ownedItems, setOwnedItems] = useState<ContractItem[]>([]);

    useEffect(() => {
        loadItemsAndApplyEffects();
    }, [sessionId]);

    async function loadItemsAndApplyEffects() {
        if (sessionId > 0) {
            try {
                setLoading(true);
                const playerItems = await getSessionItems(sessionId);
                const items = await Promise.all(playerItems.map(pi => getItemInfo(pi.item_id)));
                setOwnedItems(items);
                const effects = applyItemEffects(DEFAULT_GAME_CONFIG, items);
                setGameConfig(effects.modifiedConfig);
            } catch (error) {
                console.error('Failed to load items:', error);
                setGameConfig(DEFAULT_GAME_CONFIG);
            } finally {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }

    // Check if value was modified by items
    const wasModified = (current: number, original: number) => current !== original;

    // Get pattern visualization
    const renderPattern = (type: string) => {
        let cells = Array(15).fill(false);
        if (type === 'horizontal-3') [0, 1, 2].forEach(i => cells[i] = true);
        if (type === 'horizontal-4') [0, 1, 2, 3].forEach(i => cells[i] = true);
        if (type === 'horizontal-5') [0, 1, 2, 3, 4].forEach(i => cells[i] = true);
        if (type === 'vertical-3') [0, 5, 10].forEach(i => cells[i] = true);
        if (type === 'diagonal-3') [0, 6, 12].forEach(i => cells[i] = true);
        if (type === 'jackpot') cells = Array(15).fill(true);

        return (
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 8px)',
                gridTemplateRows: 'repeat(3, 8px)',
                gap: 2,
            }}>
                {cells.map((active, i) => (
                    <div
                        key={i}
                        style={{
                            width: 8,
                            height: 8,
                            background: active ? '#FFD700' : '#333',
                            borderRadius: 2,
                        }}
                    />
                ))}
            </div>
        );
    };

    const tabStyle = (isActive: boolean) => ({
        flex: 1,
        padding: '8px 4px',
        background: isActive ? '#FF841C' : '#222',
        color: isActive ? '#000' : '#666',
        border: 'none',
        fontFamily: "'PressStart2P', monospace",
        fontSize: 8,
        cursor: 'pointer',
    });

    return (
        <ModalWrapper onClose={onClose} title="INFO">
            {/* Tabs */}
            <div style={{ display: 'flex', marginBottom: 15, borderRadius: 4, overflow: 'hidden' }}>
                <button style={tabStyle(activeTab === 'how')} onClick={() => setActiveTab('how')}>HOW TO PLAY</button>
                <button style={tabStyle(activeTab === 'symbols')} onClick={() => setActiveTab('symbols')}>SYMBOLS</button>
                <button style={tabStyle(activeTab === 'patterns')} onClick={() => setActiveTab('patterns')}>PATTERNS</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {/* HOW TO PLAY */}
                {activeTab === 'how' && (
                    <div style={{ color: '#ccc', fontSize: 11, lineHeight: 1.6, fontFamily: 'sans-serif' }}>
                        <h3 style={{ color: '#FF841C', fontSize: 12, marginBottom: 10, fontFamily: "'PressStart2P', monospace" }}>🎰 Objective</h3>
                        <p style={{ marginBottom: 15 }}>
                            Spin the slot machine to match symbols and score points. Reach the next level threshold to advance and earn more spins!
                        </p>

                        <h3 style={{ color: '#FF841C', fontSize: 12, marginBottom: 10, fontFamily: "'PressStart2P', monospace" }}>⚡ Spins</h3>
                        <p style={{ marginBottom: 15 }}>
                            You start with 5 spins per level. Tap the machine or lever to spin. When out of spins, if you reach the level threshold, you advance and get 5 more spins.
                        </p>

                        <h3 style={{ color: '#FF841C', fontSize: 12, marginBottom: 10, fontFamily: "'PressStart2P', monospace" }}>📊 Patterns</h3>
                        <p style={{ marginBottom: 15 }}>
                            Match 3+ identical symbols in a row (horizontal, vertical, or diagonal) to trigger a pattern bonus. The more symbols matched, the higher the multiplier!
                        </p>

                        <h3 style={{ color: '#FF841C', fontSize: 12, marginBottom: 10, fontFamily: "'PressStart2P', monospace" }}>⚠️ The 666 Risk</h3>
                        <p style={{ marginBottom: 15 }}>
                            The "6" symbol is dangerous. If you get 666 (three 6s in certain patterns), your session ends immediately and you lose all points! The risk increases with each level.
                        </p>

                        <h3 style={{ color: '#FF841C', fontSize: 12, marginBottom: 10, fontFamily: "'PressStart2P', monospace" }}>🛒 Market & Items</h3>
                        <p style={{ marginBottom: 15 }}>
                            Visit the Market to buy items using your points. Items can boost symbol points, increase pattern multipliers, give extra spins, and more. Build your strategy!
                        </p>

                        <h3 style={{ color: '#FF841C', fontSize: 12, marginBottom: 10, fontFamily: "'PressStart2P', monospace" }}>🔮 Relics</h3>
                        <p style={{ marginBottom: 15 }}>
                            Relics are powerful NFTs with unique abilities! Equip a relic to your session (once per session), then click it to activate:
                        </p>
                        <ul style={{ marginBottom: 15, paddingLeft: 20 }}>
                            <li><strong>Mortis</strong> - Force a Random Jackpot on next spin</li>
                            <li><strong>Phantom</strong> - Double your score on next spin</li>
                            <li><strong>Lucky the Dealer</strong> - Trigger 666 (risky!)</li>
                            <li><strong>Scorcher</strong> - Reset spins to 5</li>
                            <li><strong>Inferno</strong> - Free market refresh</li>
                        </ul>
                        <p style={{ marginBottom: 15, color: '#888' }}>
                            Each relic has a cooldown (in spins) before it can be activated again.
                        </p>

                        <h3 style={{ color: '#FF841C', fontSize: 12, marginBottom: 10, fontFamily: "'PressStart2P', monospace" }}>🏆 Leaderboard & Prizes</h3>
                        <p>
                            Compete for the highest score! Top 5 players win prizes from the prize pool:
                        </p>
                        <ul style={{ marginBottom: 15, paddingLeft: 20 }}>
                            <li>🥇 1st Place: 40%</li>
                            <li>🥈 2nd Place: 25%</li>
                            <li>🥉 3rd Place: 18%</li>
                            <li>4th Place: 10%</li>
                            <li>5th Place: 7%</li>
                        </ul>
                    </div>
                )}

                {/* SYMBOLS */}
                {activeTab === 'symbols' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {loading ? (
                            <p style={{ color: '#fff', textAlign: 'center' }}>Loading...</p>
                        ) : (
                            gameConfig.symbols
                                .filter(s => s.type !== 'six') // Don't show six in list, it's special
                                .map((symbol, idx) => {
                                    const original = DEFAULT_GAME_CONFIG.symbols.find(s => s.type === symbol.type);
                                    const pointsModified = original && wasModified(symbol.points, original.points);
                                    const info = SYMBOL_INFO[symbol.type];

                                    return (
                                        <div key={symbol.type} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            padding: 8,
                                            background: 'rgba(255,255,255,0.05)',
                                            borderRadius: 6,
                                        }}>
                                            <Image
                                                src={info.image}
                                                alt={info.name}
                                                width={32}
                                                height={32}
                                                style={{ objectFit: 'contain' }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{
                                                    color: '#fff',
                                                    fontSize: 11,
                                                    fontFamily: "'PressStart2P', monospace",
                                                    marginBottom: 4,
                                                }}>
                                                    {info.name.toUpperCase()}
                                                </div>
                                                <div style={{
                                                    color: pointsModified ? '#4CAF50' : '#FFD700',
                                                    fontSize: 10,
                                                    fontFamily: 'sans-serif',
                                                }}>
                                                    Points: {symbol.points}
                                                    {pointsModified && original && (
                                                        <span style={{ color: '#666', marginLeft: 5, textDecoration: 'line-through' }}>
                                                            ({original.points})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ color: '#888', fontSize: 9 }}>
                                                {symbol.probability}%
                                            </div>
                                        </div>
                                    );
                                })
                        )}
                        {/* Special warning for 6 */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: 8,
                            background: 'rgba(139, 0, 0, 0.3)',
                            borderRadius: 6,
                            border: '1px solid #8B0000',
                        }}>
                            <Image
                                src="/images/six.png"
                                alt="Six"
                                width={32}
                                height={32}
                                style={{ objectFit: 'contain' }}
                            />
                            <div style={{ flex: 1 }}>
                                <div style={{ color: '#FF4444', fontSize: 11, fontFamily: "'PressStart2P', monospace" }}>
                                    SIX ⚠️
                                </div>
                                <div style={{ color: '#FF6666', fontSize: 9, fontFamily: 'sans-serif' }}>
                                    0 pts - 666 = GAME OVER
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PATTERNS */}
                {activeTab === 'patterns' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {loading ? (
                            <p style={{ color: '#fff', textAlign: 'center' }}>Loading...</p>
                        ) : (
                            gameConfig.patternMultipliers.map((pattern, idx) => {
                                const original = DEFAULT_GAME_CONFIG.patternMultipliers.find(p => p.type === pattern.type);
                                const multiplierModified = original && wasModified(pattern.multiplier, original.multiplier);

                                return (
                                    <div key={pattern.type} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: 8,
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: 6,
                                    }}>
                                        {renderPattern(pattern.type)}
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                color: '#fff',
                                                fontSize: 10,
                                                fontFamily: "'PressStart2P', monospace",
                                                textTransform: 'uppercase',
                                            }}>
                                                {pattern.type.replace(/-/g, ' ')}
                                            </div>
                                        </div>
                                        <div style={{
                                            color: multiplierModified ? '#4CAF50' : '#FFD700',
                                            fontSize: 12,
                                            fontFamily: "'PressStart2P', monospace",
                                        }}>
                                            {pattern.multiplier}x
                                            {multiplierModified && original && (
                                                <span style={{ color: '#666', marginLeft: 5, fontSize: 9, textDecoration: 'line-through' }}>
                                                    ({original.multiplier}x)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </ModalWrapper>
    );
}
