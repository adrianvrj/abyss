'use client';

import React from 'react';
import { ContractItem } from '@/utils/abyssContract';
import { getItemImage } from '@/utils/itemImages';
import ModalWrapper from './modals/ModalWrapper';
import Image from 'next/image';

interface SellConfirmModalProps {
    item: ContractItem;
    onConfirm: () => void;
    onCancel: () => void;
    isSelling?: boolean;
}

export default function SellConfirmModal({ item, onConfirm, onCancel, isSelling }: SellConfirmModalProps) {
    return (
        <ModalWrapper onClose={onCancel} title="SELL ITEM">
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                padding: '20px 0',
            }}>
                <div style={{
                    background: 'rgba(0, 0, 0, 0.5)',
                    borderRadius: 12,
                    padding: 20,
                }}>
                    <Image
                        src={getItemImage(item.item_id)}
                        alt={item.name}
                        width={100}
                        height={100}
                        style={{ objectFit: 'contain' }}
                    />
                </div>

                <div style={{
                    fontFamily: "'PressStart2P', monospace",
                    fontSize: 14,
                    color: '#FF841C',
                    textAlign: 'center',
                }}>
                    {item.name}
                </div>

                <div style={{
                    fontFamily: "'PressStart2P', monospace",
                    fontSize: 12,
                    color: '#fff',
                    textAlign: 'center',
                }}>
                    Sell for <span style={{ color: '#FF4444' }}>{item.sell_price}</span> pts?
                </div>

                <div style={{
                    display: 'flex',
                    gap: 12,
                    width: '100%',
                    marginTop: 10,
                }}>
                    <button
                        onClick={onCancel}
                        disabled={isSelling}
                        style={{
                            flex: 1,
                            padding: 14,
                            borderRadius: 8,
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: 11,
                            cursor: isSelling ? 'not-allowed' : 'pointer',
                            background: 'transparent',
                            border: '2px solid #666',
                            color: '#666',
                            transition: 'all 0.2s',
                        }}
                    >
                        CANCEL
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isSelling}
                        style={{
                            flex: 1,
                            padding: 14,
                            borderRadius: 8,
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: 11,
                            cursor: isSelling ? 'not-allowed' : 'pointer',
                            background: '#FF4444',
                            border: 'none',
                            color: '#000',
                            opacity: isSelling ? 0.5 : 1,
                            transition: 'all 0.2s',
                        }}
                    >
                        {isSelling ? "..." : "SELL"}
                    </button>
                </div>
            </div>
        </ModalWrapper>
    );
}
