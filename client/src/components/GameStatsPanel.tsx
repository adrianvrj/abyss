import { useState, useEffect, useRef } from 'react';
import { DEFAULT_GAME_CONFIG, SYMBOL_INFO, SymbolType, SymbolConfig, PatternMultiplier } from '@/utils/GameConfig';
import { getSessionItems, getItemInfo, getSessionLuck, ContractItem, ItemEffectType, isCharmItem, getCharmIdFromItemId, getCharmInfo } from '@/utils/abyssContract';
import {
    getCharmLuckEntries,
} from '@/lib/charmRules';
import {
    getPatternBonusMap,
    getPatternRetriggerMap,
} from '@/lib/patternMath';
import { CHIP_TOKEN_IMAGE_URL } from '@/lib/constants';
import { getSymbolProbabilityDistribution } from '@/utils/itemEffects';

interface GameStatsPanelProps {
    level: number;
    score: number;
    threshold: number;
    spinsRemaining?: number;
    sessionId?: number;
    refreshTrigger?: number;
    currentLuck?: number;
    lastSpinPatternCount?: number;
    optimisticItems?: ContractItem[];
    hiddenItemIds?: number[];
    symbolScores?: number[];
    blocked666?: boolean;
    itemsOverride?: ContractItem[];
    practiceMode?: boolean;
    diamondChipBonusUnits?: number;
}

const symbolNameToType: Record<string, SymbolType> = {
    'seven': 'seven',
    'diamond': 'diamond',
    'cherry': 'cherry',
    'coin': 'coin',
    'lemon': 'lemon',
};

const EMPTY_ARRAY: any[] = [];

export default function GameStatsPanel({
    level,
    score,
    threshold,
    spinsRemaining = 0,
    sessionId,
    refreshTrigger = 0,
    currentLuck,
    lastSpinPatternCount = 0,
    optimisticItems = EMPTY_ARRAY,
    hiddenItemIds = EMPTY_ARRAY,
    symbolScores = [7, 5, 4, 3, 2],
    blocked666 = false,
    itemsOverride = EMPTY_ARRAY,
    practiceMode = false,
    diamondChipBonusUnits = 0,
}: GameStatsPanelProps) {
    const [fetchedItems, setFetchedItems] = useState<ContractItem[]>([]);
    const [items, setItems] = useState<ContractItem[]>([]);
    const [luck, setLuck] = useState<number>(0);
    const latestItemsRequestRef = useRef(0);
    const latestLuckRequestRef = useRef(0);
    const progress = Math.min((score / threshold) * 100, 100);

    useEffect(() => {
        const ownedIds = new Set(fetchedItems.map(i => i.item_id));
        const uniqueOptimistic = optimisticItems.filter(
            (i) => !ownedIds.has(i.item_id) && i.effect_type !== ItemEffectType.SpinBonus,
        );
        const allItems = [...fetchedItems, ...uniqueOptimistic];
        const filteredItems = allItems.filter(
            (i) => !hiddenItemIds.includes(i.item_id) && i.effect_type !== ItemEffectType.SpinBonus,
        );
        setItems(filteredItems);
    }, [fetchedItems, optimisticItems, hiddenItemIds]);

    useEffect(() => {
        if (typeof currentLuck !== 'undefined') {
            setLuck(currentLuck);
        } else if (practiceMode) {
            setLuck(0);
        } else if (sessionId) {
            loadLuck();
        }
    }, [currentLuck, practiceMode, sessionId, refreshTrigger, lastSpinPatternCount, items]);

    useEffect(() => {
        if (practiceMode) {
            setFetchedItems(itemsOverride);
        } else if (sessionId) {
            loadItems();
        }
    }, [practiceMode, itemsOverride, sessionId, refreshTrigger]);

    function getLuckBreakdown(): { sources: string[], total: number } {
        const sources: string[] = [];
        let total = 0;
        const inventoryCount = items.length;

        items.forEach(item => {
            const entries = getCharmLuckEntries(item.charmInfo?.metadata ?? null, {
                level,
                score,
                spinsRemaining,
                lastSpinPatternCount,
                inventoryCount,
                blocked666,
            });

            entries.forEach((entry) => {
                const label = entry.label ? ` (${entry.label})` : '';
                sources.push(`${item.name}: +${entry.value}${label}`);
                total += entry.value;
            });
        });

        return { sources, total };
    }

    const luckBreakdown = getLuckBreakdown();
    const charmItems = items.filter(item => isCharmItem(item.item_id));
    const canDeriveCharmLuck =
        charmItems.length > 0 &&
        charmItems.every(item => Boolean(item.charmInfo?.metadata));
    const displayedLuck = canDeriveCharmLuck ? luckBreakdown.total : luck;
    const luckTooltip = canDeriveCharmLuck ? luckBreakdown.sources.join('\n') : undefined;

    async function loadItems() {
        const requestId = ++latestItemsRequestRef.current;
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
                                effect_type: 7 as ItemEffectType,
                                effect_value: charmInfo.luck,
                                target_symbol: '',
                                charmInfo,
                            } as ContractItem;
                        }
                    }
                    return getItemInfo(pi.item_id);
                })
            );
            if (requestId !== latestItemsRequestRef.current) {
                return;
            }

            const resolved = itemDetails.filter((item): item is ContractItem => item != null);
            setFetchedItems(resolved.filter((i) => i.effect_type !== ItemEffectType.SpinBonus));
        } catch (err) {
            console.error('Failed to load items for stats panel:', err);
        }
    }

    async function loadLuck() {
        const requestId = ++latestLuckRequestRef.current;
        try {
            let sessionLuck = 0;
            if (typeof currentLuck !== 'undefined') {
                sessionLuck = currentLuck;
            } else {
                sessionLuck = await getSessionLuck(sessionId!);
            }

            if (requestId !== latestLuckRequestRef.current) {
                return;
            }

            setLuck(sessionLuck);
        } catch (err) {
            console.error('Failed to load session luck:', err);
        }
    }

    function getModifiedSymbols(): (SymbolConfig & {
        currentWeight: number;
        points: number;
        weightDelta: number;
        probabilityDelta: number;
    })[] {
        const scoreIndices: Record<string, number> = {
            seven: 0,
            diamond: 1,
            cherry: 2,
            coin: 3,
            lemon: 4,
        };
        const probabilityByType = new Map(
            getSymbolProbabilityDistribution(DEFAULT_GAME_CONFIG, items).map((symbol) => [
                symbol.type,
                symbol,
            ])
        );

        return DEFAULT_GAME_CONFIG.symbols
            .filter(s => s.type !== 'six')
            .map(symbol => {
                let weightDelta = 0;
                let fallbackPointBonus = 0;

                items.forEach(item => {
                    const targetType = symbolNameToType[item.target_symbol?.toLowerCase() || ''];
                    const matchesSymbol = targetType === symbol.type || !item.target_symbol;

                    if (item.effect_type === ItemEffectType.DirectScoreBonus && matchesSymbol) {
                        fallbackPointBonus += item.effect_value;
                    }

                    if (item.effect_type === ItemEffectType.SymbolProbabilityBoost) {
                        if (item.target_symbol === 'anti-coin' && symbol.type === 'coin') {
                            weightDelta -= item.effect_value;
                        } else if (matchesSymbol) {
                            weightDelta += item.effect_value;
                        }
                    }
                });

                const scoreIndex = scoreIndices[symbol.type];
                const currentScore =
                    Array.isArray(symbolScores) && symbolScores.length >= 5
                        ? symbolScores[scoreIndex] ?? symbol.points
                        : symbol.points + fallbackPointBonus;
                const probabilityEntry = probabilityByType.get(symbol.type);

                return {
                    ...symbol,
                    currentWeight: probabilityEntry?.finalWeight ?? symbol.probability,
                    points: currentScore,
                    probability: probabilityEntry?.probability ?? symbol.probability,
                    weightDelta,
                    probabilityDelta: probabilityEntry?.delta ?? 0,
                };
            });
    }

    function getModifiedPatterns(): (PatternMultiplier & { bonus: number; retrigger: number })[] {
        const bonuses = getPatternBonusMap(items);
        const retriggers = getPatternRetriggerMap(items);

        return DEFAULT_GAME_CONFIG.patternMultipliers.map(pm => ({
            ...pm,
            bonus: bonuses[pm.type],
            retrigger: retriggers[pm.type],
        }));
    }

    const modifiedSymbols = getModifiedSymbols();
    const modifiedPatterns = getModifiedPatterns();
    const patternBonuses = getPatternBonusMap(items);

    return (
        <div className="game-stats-panel">
            {/* Level Progress */}
            <div className="stats-section level-section">
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

            {/* Resources Row: Spins */}
            <div className="stats-section resources-section" style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '8px',
            }}>
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <span style={{
                        fontFamily: "'PressStart2P', monospace",
                        fontSize: '9px',
                        color: 'rgba(255, 255, 255, 0.5)',
                    }}>SPINS</span>
                    <span style={{
                        fontFamily: "'PressStart2P', monospace",
                        fontSize: '14px',
                        color: '#FFEA00',
                    }}>{spinsRemaining}</span>
                </div>
                {diamondChipBonusUnits > 0 && (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: 'rgba(255, 209, 102, 0.08)',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 209, 102, 0.18)'
                    }}>
                        <span style={{
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: '9px',
                            color: 'rgba(255, 255, 255, 0.5)',
                        }}>DIAMOND CHIP</span>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: '12px',
                            color: '#FFD166',
                        }}>
                            +{diamondChipBonusUnits}
                            <img
                                src={CHIP_TOKEN_IMAGE_URL}
                                alt="CHIP"
                                width={14}
                                height={14}
                                loading="lazy"
                                style={{ objectFit: 'contain' }}
                            />
                        </span>
                    </div>
                )}
            </div>

            {/* Luck Row */}
            {displayedLuck > 0 && (
                <div className="stats-section luck-section" title={luckTooltip}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'help'
                    }}>
                        <div style={{
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: '10px',
                            color: 'rgba(255, 255, 255, 0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}>
                            LUCK
                        </div>
                        <div style={{
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: '14px',
                            color: '#FFEA00',
                        }}>
                            +{displayedLuck}
                        </div>
                    </div>
                </div>
            )}

            {/* Symbol Values */}
            <div className="stats-section symbols-section">
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
                            currentWeight={symbol.currentWeight}
                            probability={symbol.probability}
                            weightDelta={symbol.weightDelta}
                            probabilityDelta={symbol.probabilityDelta}
                        />
                    ))}
                </div>
            </div>

            {/* Pattern Multipliers */}
            <div className="stats-section patterns-section">
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
                        const displayMultiplier =
                            pm.multiplier * (1 + (patternBonuses[pm.type] ?? 0) / 100);
                        const hasBoost = pm.bonus > 0 || pm.retrigger > 1;
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
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-end',
                                    gap: '2px',
                                }}>
                                    <span style={{ color: hasBoost ? '#00FF64' : '#FFD700' }}>
                                        x{displayMultiplier.toFixed(1)}
                                    </span>
                                    {pm.retrigger > 1 && (
                                        <span style={{
                                            color: '#FF841C',
                                            fontSize: '8px',
                                            lineHeight: 1,
                                        }}>
                                            TRG x{pm.retrigger}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .game-stats-panel {
                    background: rgba(0, 0, 0, 0.85);
                    border: 2px solid #FF841C;
                    border-radius: 8px;
                    padding: 12px;
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .stats-section {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                @media (max-width: 1024px) {
                    .game-stats-panel {
                        width: 100%;
                        min-height: 100%;
                        flex: 1;
                        border: none;
                        background: transparent;
                        padding: 6px 0 0;
                        gap: 16px;
                    }
                    .stats-section {
                        width: 100%;
                        gap: 10px;
                    }
                    .symbols-section, .patterns-section {
                        flex: 1;
                        justify-content: center;
                    }
                    .symbols-section > div, .patterns-section > div {
                        gap: 8px !important;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        height: 100%;
                    }
                }
            ` }} />
        </div>
    );
}

interface SymbolRowProps {
    symbolType: SymbolType;
    points: number;
    currentWeight: number;
    probability: number;
    weightDelta: number;
    probabilityDelta: number;
}

function SymbolRow({ symbolType, points, currentWeight, probability, weightDelta, probabilityDelta }: SymbolRowProps) {
    const info = SYMBOL_INFO[symbolType];
    const basePoints = DEFAULT_GAME_CONFIG.symbols.find(s => s.type === symbolType)?.points || 0;
    const hasWeightShift = weightDelta !== 0;
    const hasProbShift = Math.abs(probabilityDelta) >= 0.05;
    const isBaseScore = points > basePoints;
    const hasAnyBonus = isBaseScore || hasWeightShift || hasProbShift;
    const probabilityColor =
        probabilityDelta > 0.05
            ? '#00FF64'
            : probabilityDelta < -0.05
                ? '#FF7A7A'
                : '#666';
    const rowBackground =
        weightDelta < 0
            ? 'rgba(255, 122, 122, 0.1)'
            : hasAnyBonus
                ? 'rgba(0, 255, 100, 0.1)'
                : 'rgba(255, 255, 255, 0.05)';

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 8px',
            background: rowBackground,
            borderRadius: '4px',
        }}>
            <div style={{ width: 24, height: 24, position: 'relative' }}>
                <img
                    src={info.image}
                    alt={info.name}
                    width={24}
                    height={24}
                    loading="lazy"
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
                color: isBaseScore ? '#00FF64' : '#fff',
            }}>
                {points}pt
            </span>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '2px',
                minWidth: '64px',
            }}>
                <span style={{
                    fontFamily: "'PressStart2P', monospace",
                    fontSize: '9px',
                    color: probabilityColor,
                }}>
                    {probability.toFixed(1)}%
                </span>
                <span style={{
                    fontFamily: "'PressStart2P', monospace",
                    fontSize: '8px',
                    color: hasWeightShift
                        ? weightDelta > 0
                            ? '#00FF64'
                            : '#FF7A7A'
                        : 'rgba(255,255,255,0.45)',
                }}>
                    W {currentWeight}
                    {hasWeightShift ? ` (${weightDelta > 0 ? '+' : ''}${weightDelta})` : ''}
                </span>
            </div>
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
