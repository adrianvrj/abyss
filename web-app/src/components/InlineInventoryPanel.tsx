'use client';

import React, { useState, useEffect } from 'react';
import {
    getSessionItems,
    getItemInfo,
    ContractItem,
} from '@/utils/abyssContract';
import { getItemImage } from '@/utils/itemImages';
import Image from 'next/image';

interface InlineInventoryPanelProps {
    sessionId: number;
    controller: any;
    currentScore: number;
    onUpdateScore: (newScore: number) => void;
    onItemClick: (item: ContractItem) => void;
    refreshTrigger?: number; // Increment to force refresh
}

export default function InlineInventoryPanel({
    sessionId,
    onItemClick,
    refreshTrigger = 0
}: InlineInventoryPanelProps) {
    const [loading, setLoading] = useState(true);
    const [ownedItems, setOwnedItems] = useState<ContractItem[]>([]);

    useEffect(() => {
        if (sessionId) loadInventory();
    }, [sessionId, refreshTrigger]);

    async function loadInventory() {
        try {
            setLoading(true);
            const playerItems = await getSessionItems(sessionId);
            const items = await Promise.all(playerItems.map(pi => getItemInfo(pi.item_id)));
            setOwnedItems(items);
        } catch (error) {
            console.error("Failed to load inventory:", error);
        } finally {
            setLoading(false);
        }
    }

    // Fixed 7 slots
    const slots = Array.from({ length: 7 }, (_, i) => ownedItems[i] || null);

    return (
        <div className="inline-inventory-panel">
            <div className="inventory-slots">
                {slots.map((item, index) => (
                    <div
                        key={index}
                        className={`inv-slot ${item ? 'has-item' : 'empty'}`}
                        onClick={() => item && onItemClick(item)}
                        title={item ? `${item.name} - Click to sell` : 'Empty slot'}
                    >
                        {item ? (
                            <Image
                                src={getItemImage(item.item_id)}
                                alt={item.name}
                                width={40}
                                height={40}
                                style={{ objectFit: 'contain' }}
                            />
                        ) : (
                            <span className="empty-slot-icon">+</span>
                        )}
                    </div>
                ))}
            </div>

            <style jsx>{`
                .inline-inventory-panel {
                    background: rgba(0, 0, 0, 0.85);
                    border: 2px solid #FF841C;
                    border-radius: 8px;
                    padding: 10px;
                    width: 320px;
                }
                .inventory-slots {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    justify-content: center;
                }
                .inv-slot {
                    width: 36px;
                    height: 36px;
                    background: rgba(0, 0, 0, 0.5);
                    border: 1px solid #FF841C44;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .inv-slot.has-item {
                    cursor: pointer;
                    border-color: #FF841C;
                }
                .inv-slot.has-item:hover {
                    background: #FF841C33;
                }
                .inv-slot.empty {
                    opacity: 0.3;
                }
                .empty-slot-icon {
                    font-family: 'PressStart2P', monospace;
                    font-size: 14px;
                    color: #FF841C44;
                }
            `}</style>
        </div>
    );
}
