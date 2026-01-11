'use client';

import { useState, useEffect } from 'react';
import { DEFAULT_GAME_CONFIG, SYMBOL_INFO, SymbolType, SymbolConfig, PatternMultiplier } from '@/utils/GameConfig';
import { getSessionItems, getItemInfo, getSessionLuck, ContractItem, ItemEffectType, isCharmItem, getCharmIdFromItemId, getCharmInfo } from '@/utils/abyssContract';
import Image from 'next/image';

interface GameStatsPanelProps {
    level: number;
    score: number;
    threshold: number;
    sessionId?: number;
    refreshTrigger?: number;
    currentLuck?: number;
    currentTickets?: number;
    lastSpinPatternCount?: number;
}

// Map target_symbol strings to SymbolType
const symbolNameToType: Record<string, SymbolType> = {
    'seven': 'seven',
    'diamond': 'diamond',
    'cherry': 'cherry',
    'coin': 'coin',
    'lemon': 'lemon',
};

export default function GameStatsPanel({
    level,
    score,
    threshold,
    sessionId,
    refreshTrigger = 0,
    currentLuck,
    currentTickets = 0,
    lastSpinPatternCount = 0
}: GameStatsPanelProps) {
    const [items, setItems] = useState<ContractItem[]>([]);
    const [luck, setLuck] = useState<number>(0);
    const progress = Math.min((score / threshold) * 100, 100);

    useEffect(() => {
        if (typeof currentLuck !== 'undefined') {
            setLuck(currentLuck);
        } else if (sessionId) {
            loadLuck();
        }
    }, [currentLuck, sessionId, refreshTrigger, lastSpinPatternCount, items]);

    useEffect(() => {
        if (sessionId) {
            loadItems();
        }
    }, [sessionId, refreshTrigger]);

    async function loadItems() {
        try {
            const playerItems = await getSessionItems(sessionId!);
            const itemDetails = await Promise.all(
                playerItems.map(async (pi) => {
                    if (isCharmItem(pi.item_id)) {
                        const charmId = getCharmIdFromItemId(pi.item_id);
                        const charmInfo = await getCharmInfo(charmId);
                        if (charmInfo) {
                            return {
                                item_id: pi.item_id,
                                name: charmInfo.name,
                                description: charmInfo.description,
                                price: charmInfo.shop_cost,
                                sell_price: 0,
                                effect_type: 7 as ItemEffectType, // CharmEffect
                                effect_value: charmInfo.luck,
                                target_symbol: ''
                            } as ContractItem;
                        }
                    }
                    return getItemInfo(pi.item_id);
                })
            );
            // Filter out any potential nulls if getCharmInfo fails (though logic above returns getItemInfo promise or Charm object)
            setItems(itemDetails.filter(Boolean));
        } catch (err) {
            console.error('Failed to load items for stats panel:', err);
        }
    }

    async function loadLuck() {
        try {
            let sessionLuck = 0;
            if (typeof currentLuck !== 'undefined') {
                sessionLuck = currentLuck;
            } else {
                sessionLuck = await getSessionLuck(sessionId!);
            }

            // Calculate conditional bonuses
            let conditionalBonus = 0;
            items.forEach(item => {
                // Ethereal Chain (Charm ID 12 -> Item ID 1012)
                // Effect: +6 luck per pattern in last spin
                if (item.item_id === 1012) {
                    conditionalBonus += (6 * lastSpinPatternCount);
                }

                // Broken Mirror (Charm ID 3 -> Item ID 1003)
                // Effect: +5 luck if last spin had no patterns
                if (item.item_id === 1003 && lastSpinPatternCount === 0) {
                    conditionalBonus += 5;
                }
            });

            setLuck(sessionLuck + conditionalBonus);
        } catch (err) {
            console.error('Failed to load session luck:', err);
        }
    }

    // Calculate modified symbol values
    function getModifiedSymbols(): (SymbolConfig & { pointsBonus: number; probBonus: number })[] {
        return DEFAULT_GAME_CONFIG.symbols
            .filter(s => s.type !== 'six')
            .map(symbol => {
                let pointsBonus = 0;
                let probBonus = 0;

                items.forEach(item => {
                    const targetType = symbolNameToType[item.target_symbol?.toLowerCase() || ''];
                    const matchesSymbol = targetType === symbol.type || !item.target_symbol;

                    // DirectScoreBonus - adds points per symbol
                    if (item.effect_type === ItemEffectType.DirectScoreBonus && matchesSymbol) {
                        pointsBonus += item.effect_value;
                    }
                    // SymbolProbabilityBoost - adds % probability
                    if (item.effect_type === ItemEffectType.SymbolProbabilityBoost && matchesSymbol) {
                        probBonus += item.effect_value;
                    }
                });

                return { ...symbol, pointsBonus, probBonus };
            });
    }

    // Calculate modified pattern multipliers
    function getModifiedPatterns(): (PatternMultiplier & { bonus: number })[] {
        let totalPatternBoost = 0;
        items.forEach(item => {
            if (item.effect_type === ItemEffectType.PatternMultiplierBoost) {
                totalPatternBoost += item.effect_value;
            }
        });

        return DEFAULT_GAME_CONFIG.patternMultipliers.map(pm => ({
            ...pm,
            bonus: totalPatternBoost,
        }));
    }

    const modifiedSymbols = getModifiedSymbols();
    const modifiedPatterns = getModifiedPatterns();

    return (
        <div style={{
            background: 'rgba(0, 0, 0, 0.85)',
            border: '2px solid #FF841C',
            borderRadius: '8px',
            padding: '16px',
            width: '280px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
        }}>
            {/* Level Progress */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{
                    fontFamily: "'PressStart2P', monospace",
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.6)',
                }}>
                    LEVEL {level} PROGRESS
                </div>
                <div style={{
                    background: '#222',
                    borderRadius: '4px',
                    height: '12px',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        background: '#FF841C',
                        height: '100%',
                        width: `${progress}%`,
                        transition: 'width 0.3s ease',
                    }} />
                </div>
                <div style={{
                    fontFamily: "'PressStart2P', monospace",
                    fontSize: '12px',
                    color: '#fff',
                    textAlign: 'right',
                }}>
                    {score} / {threshold}
                </div>
            </div>

            {/* Tickets & Luck Row */}
            <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{
                    flex: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: '6px',
                }}>
                    <div style={{ position: 'relative', width: 28, height: 28 }}>
                        <Image
                            src="/images/ticket.png"
                            alt="Tickets"
                            fill
                            style={{ objectFit: 'contain' }}
                        />
                    </div>
                    <div style={{
                        fontFamily: "'PressStart2P', monospace",
                        fontSize: '14px',
                        color: '#FF841C',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    }}>
                        {currentTickets}
                    </div>
                </div>

                {luck > 0 && (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'rgba(167, 139, 250, 0.1)',
                        border: '1px solid rgba(167, 139, 250, 0.3)',
                    }}>
                        <div style={{
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}>
                            LUCK
                        </div>
                        <div style={{
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: '14px',
                            textShadow: '0 0 8px rgba(167, 139, 250, 0.5)',
                            color: '#A78BFA',
                        }}>
                            +{luck}
                        </div>
                    </div>
                )}
            </div>

            {/* Symbol Values */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{
                    fontFamily: "'PressStart2P', monospace",
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.6)',
                }}>
                    SYMBOL VALUES
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {modifiedSymbols.map(symbol => (
                        <SymbolRow
                            key={symbol.type}
                            symbolType={symbol.type}
                            points={symbol.points}
                            pointsBonus={symbol.pointsBonus}
                            probability={symbol.probability}
                            probBonus={symbol.probBonus}
                        />
                    ))}
                </div>
            </div>

            {/* Pattern Multipliers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{
                    fontFamily: "'PressStart2P', monospace",
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.6)',
                }}>
                    PATTERNS
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '4px',
                    fontSize: '10px',
                    fontFamily: "'PressStart2P', monospace",
                }}>
                    {modifiedPatterns.map(pm => {
                        const boostedMultiplier = pm.multiplier * (1 + pm.bonus / 100);
                        const hasBoost = pm.bonus > 0;
                        return (
                            <div
                                key={pm.type}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '4px 6px',
                                    background: hasBoost ? 'rgba(0, 255, 100, 0.1)' : 'rgba(255, 132, 28, 0.1)',
                                    borderRadius: '4px',
                                }}
                            >
                                <span style={{ color: '#999' }}>{formatPatternName(pm.type)}</span>
                                <span style={{ color: hasBoost ? '#00FF64' : '#FFD700' }}>
                                    ×{boostedMultiplier.toFixed(1)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div >
    );
}

interface SymbolRowProps {
    symbolType: SymbolType;
    points: number;
    pointsBonus: number;
    probability: number;
    probBonus: number;
}

function SymbolRow({ symbolType, points, pointsBonus, probability, probBonus }: SymbolRowProps) {
    const info = SYMBOL_INFO[symbolType];
    const totalPoints = points + pointsBonus;
    const totalProb = probability + probBonus;
    const hasPointsBonus = pointsBonus > 0;
    const hasProbBonus = probBonus > 0;
    const hasAnyBonus = hasPointsBonus || hasProbBonus;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 8px',
            background: hasAnyBonus ? 'rgba(0, 255, 100, 0.1)' : 'rgba(255, 255, 255, 0.05)',
            borderRadius: '4px',
        }}>
            <div style={{ width: 24, height: 24, position: 'relative' }}>
                <Image
                    src={info.image}
                    alt={info.name}
                    fill
                    style={{ objectFit: 'contain' }}
                />
            </div>
            <span style={{
                fontFamily: "'PressStart2P', monospace",
                fontSize: '10px',
                color: info.color,
                flex: 1,
            }}>
            </span>
            <span style={{
                fontFamily: "'PressStart2P', monospace",
                fontSize: '10px',
                color: hasPointsBonus ? '#00FF64' : '#fff',
            }}>
                {totalPoints}pt
                {hasPointsBonus && <span style={{ fontSize: '8px', color: '#00FF64' }}> (+{pointsBonus})</span>}
            </span>
            <span style={{
                fontFamily: "'PressStart2P', monospace",
                fontSize: '9px',
                color: hasProbBonus ? '#00FF64' : '#666',
            }}>
                {totalProb}%
                {hasProbBonus && <span style={{ fontSize: '7px' }}> (+{probBonus})</span>}
            </span>
        </div>
    );
}

function formatPatternName(type: string): string {
    const names: Record<string, string> = {
        'horizontal-3': 'H3',
        'horizontal-4': 'H4',
        'horizontal-5': 'H5',
        'vertical-3': 'V3',
        'diagonal-3': 'D3',
        'jackpot': 'JP',
    };
    return names[type] || type;
}
