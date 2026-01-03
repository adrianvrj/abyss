"use client";

import React from 'react';
import ModalWrapper from './ModalWrapper';
import { TokenBalance } from '@/utils/abyssContract';

interface PrizePoolModalProps {
    tokenBalances: TokenBalance[];
    onClose: () => void;
}

const DISTRIBUTION = [
    { place: '1st', percent: 40 },
    { place: '2nd', percent: 25 },
    { place: '3rd', percent: 18 },
    { place: '4th', percent: 10 },
    { place: '5th', percent: 7 },
];

export default function PrizePoolModal({ tokenBalances, onClose }: PrizePoolModalProps) {
    return (
        <ModalWrapper onClose={onClose} title="PRIZE POOL">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Token Balances */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{
                        fontFamily: "'PressStart2P', monospace",
                        fontSize: '10px',
                        color: 'rgba(255, 255, 255, 0.7)',
                        margin: 0,
                        textAlign: 'center',
                    }}>
                        Pool Balances
                    </p>
                    {tokenBalances.length === 0 ? (
                        <p style={{
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: '10px',
                            color: 'rgba(255, 255, 255, 0.5)',
                            textAlign: 'center',
                            margin: 0,
                        }}>
                            No tokens registered yet
                        </p>
                    ) : (
                        tokenBalances.map((token, idx) => {
                            // Format with 6 decimals, trim trailing zeros
                            const formatted = (Number(token.balance) / 10 ** 18).toFixed(6).replace(/\.?0+$/, '');
                            return (
                                <div key={idx} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '10px',
                                    background: 'rgba(255, 132, 28, 0.1)',
                                    borderRadius: '8px',
                                }}>
                                    <span style={{
                                        fontFamily: "'PressStart2P', monospace",
                                        fontSize: '10px',
                                        color: '#fff',
                                    }}>{token.symbol}</span>
                                    <span style={{
                                        fontFamily: "'PressStart2P', monospace",
                                        fontSize: '12px',
                                        color: '#FF841C',
                                    }}>{formatted || '0'}</span>
                                </div>
                            );
                        })
                    )}
                </div>

                <div style={{ height: '2px', background: '#FF841C', margin: '8px 0' }} />

                {/* Distribution */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{
                        fontFamily: "'PressStart2P', monospace",
                        fontSize: '10px',
                        color: 'rgba(255, 255, 255, 0.7)',
                        margin: 0,
                        textAlign: 'center',
                    }}>
                        Distribution (Top 5)
                    </p>
                    {DISTRIBUTION.map(({ place, percent }) => (
                        <div key={place} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 0',
                            borderBottom: '1px solid rgba(255, 132, 28, 0.2)',
                        }}>
                            <span style={{
                                background: '#FF841C',
                                padding: '4px 10px',
                                borderRadius: '4px',
                                fontFamily: "'PressStart2P', monospace",
                                fontSize: '8px',
                                color: '#000',
                            }}>
                                {place}
                            </span>
                            <span style={{
                                fontFamily: "'PressStart2P', monospace",
                                fontSize: '10px',
                                color: '#fff',
                            }}>
                                {percent}%
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </ModalWrapper>
    );
}
