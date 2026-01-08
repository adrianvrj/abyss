'use client';

import { DEFAULT_GAME_CONFIG, SYMBOL_INFO, SymbolType } from '@/utils/GameConfig';
import Image from 'next/image';

interface GameStatsPanelProps {
    level: number;
    score: number;
    threshold: number;
}

export default function GameStatsPanel({
    level,
    score,
    threshold
}: GameStatsPanelProps) {
    const progress = Math.min((score / threshold) * 100, 100);

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
            {/* Header */}
            {/* <div style={{
                fontFamily: "'PressStart2P', monospace",
                fontSize: '12px',
                color: '#FF841C',
                textAlign: 'center',
                paddingBottom: '8px',
                borderBottom: '1px solid rgba(255, 132, 28, 0.2)',
            }}>
                GAME INFO
            </div> */}

            {/* Level Progress */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{
                    fontFamily: "'PressStart2P', monospace",
                    fontSize: '10px',
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
                    fontSize: '10px',
                    color: '#fff',
                    textAlign: 'right',
                }}>
                    {score} / {threshold}
                </div>
            </div>

            {/* Symbol Values */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{
                    fontFamily: "'PressStart2P', monospace",
                    fontSize: '10px',
                    color: 'rgba(255, 255, 255, 0.6)',
                }}>
                    SYMBOL VALUES
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {DEFAULT_GAME_CONFIG.symbols
                        .filter(s => s.type !== 'six')
                        .map(symbol => (
                            <SymbolRow
                                key={symbol.type}
                                symbolType={symbol.type}
                                points={symbol.points}
                                probability={symbol.probability}
                            />
                        ))}
                </div>
            </div>

            {/* Pattern Multipliers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{
                    fontFamily: "'PressStart2P', monospace",
                    fontSize: '10px',
                    color: 'rgba(255, 255, 255, 0.6)',
                }}>
                    PATTERNS
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '4px',
                    fontSize: '9px',
                    fontFamily: "'PressStart2P', monospace",
                }}>
                    {DEFAULT_GAME_CONFIG.patternMultipliers.map(pm => (
                        <div
                            key={pm.type}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '4px 6px',
                                background: 'rgba(255, 132, 28, 0.1)',
                                borderRadius: '4px',
                            }}
                        >
                            <span style={{ color: '#999' }}>{formatPatternName(pm.type)}</span>
                            <span style={{ color: '#FFD700' }}>×{pm.multiplier}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

interface SymbolRowProps {
    symbolType: SymbolType;
    points: number;
    probability: number;
}

function SymbolRow({ symbolType, points, probability }: SymbolRowProps) {
    const info = SYMBOL_INFO[symbolType];

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 8px',
            background: 'rgba(255, 255, 255, 0.05)',
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
                fontSize: '9px',
                color: info.color,
                flex: 1,
            }}>
            </span>
            <span style={{
                fontFamily: "'PressStart2P', monospace",
                fontSize: '9px',
                color: '#fff',
            }}>
                {points}pt
            </span>
            <span style={{
                fontFamily: "'PressStart2P', monospace",
                fontSize: '8px',
                color: '#666',
            }}>
                {probability}%
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
