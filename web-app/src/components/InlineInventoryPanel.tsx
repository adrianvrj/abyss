'use client';

import React, { useState, useEffect } from 'react';
import { useAbyssGame } from '@/hooks/useAbyssGame';
import {
    getItemInfo,
    ContractItem,
} from '@/utils/abyssContract';
import { getItemImage } from '@/utils/itemImages';
import Image from 'next/image';

interface InlineInventoryPanelProps {
    sessionId: number;
    controller: any;
    currentScore: number;
    currentTickets?: number;
    onUpdateScore: (newScore: number) => void;
    onUpdateTickets?: (newTickets: number) => void;
    onItemClick: (item: ContractItem) => void;
    refreshTrigger?: number;
    optimisticItems?: ContractItem[];
}

export default function InlineInventoryPanel({
    sessionId,
    controller, // Added controller to destructuring if it wasn't there implicitly
    onItemClick,
    currentTickets = 0,
    refreshTrigger = 0,
    optimisticItems = []
}: InlineInventoryPanelProps) {
    const [loading, setLoading] = useState(true);
    const [ownedItems, setOwnedItems] = useState<ContractItem[]>([]);
    const [hoveredItem, setHoveredItem] = useState<ContractItem | null>(null);

    const { getSessionItems } = useAbyssGame(controller);

    useEffect(() => {
        if (sessionId) loadInventory();
    }, [sessionId, refreshTrigger]);

    async function loadInventory() {
        try {
            setLoading(true);
            const playerItems = await getSessionItems(sessionId);

            const items = await Promise.all(playerItems.map(async (pi) => {
                if (pi.item_id >= 1000) {
                    // It's a charm
                    const charmId = pi.item_id - 1000;
                    const charmInfo = await import('@/utils/abyssContract').then(m => m.getCharmInfo(charmId));
                    if (!charmInfo) return null;

                    // Map CharmInfo to ContractItem for display
                    return {
                        item_id: pi.item_id,
                        name: charmInfo.name,
                        description: charmInfo.description,
                        price: charmInfo.shop_cost,
                        sell_price: 0, // Charms cannot be sold back to shop currently
                        effect_type: 7, // Custom type for Charms
                        effect_value: charmInfo.luck,
                        target_symbol: charmInfo.rarity,
                        image: charmInfo.image
                    } as ContractItem;
                } else {
                    // Regular item
                    return getItemInfo(pi.item_id);
                }
            }));

            // Filter out any failed loads
            setOwnedItems(items.filter((i): i is ContractItem => i !== null));
        } catch (error) {
            console.error("Failed to load inventory:", error);
        } finally {
            setLoading(false);
        }
    }

    function formatItemEffect(item: ContractItem): string {
        const effectType = item.effect_type;
        const targetSymbol = item.target_symbol || null;
        const value = item.effect_value;

        switch (effectType) {
            case 0: return `+${value}% score multiplier`;
            case 1: return targetSymbol ? `+${value}% ${targetSymbol} patterns` : `+${value}% all patterns`;
            case 2: return targetSymbol ? `+${value}% ${targetSymbol} chance` : `+${value}% symbol chance`;
            case 3: return targetSymbol ? `+${value} pts per ${targetSymbol}` : `+${value} pts per symbol`;
            case 4: return `+${value} bonus spins`;
            case 5: return `+${value}% level progress`;
            case 6: return `666 protection (${value} spins)`;
            case 7: return `${targetSymbol} | +${value}% LUCK | ${item.description}`;
            default: return item.description || `Effect: ${value}`;
        }
    }

    // Merge owned and optimistic items, but limit to 7 slots total
    // We filter out optimistic items that are already in ownedItems to prevent duplication
    const ownedIds = new Set(ownedItems.map(i => i.item_id));
    const uniqueOptimisticItems = optimisticItems.filter(i => !ownedIds.has(i.item_id));

    const displayItems = [...ownedItems, ...uniqueOptimisticItems];
    const slots = Array.from({ length: 7 }, (_, i) => displayItems[i] || null);

    return (
        <div className="inline-inventory-panel">
            <div className="inventory-slots">
                {slots.map((item, index) => (
                    <div
                        key={index}
                        className={`inv-slot ${item ? 'has-item' : 'empty'}`}
                        onClick={() => item && onItemClick(item)}
                        onMouseEnter={() => item && setHoveredItem(item)}
                        onMouseLeave={() => setHoveredItem(null)}
                    >
                        {item ? (
                            <Image
                                src={item.image || getItemImage(item.item_id)}
                                alt={item.name}
                                width={40}
                                height={40}
                                style={{ objectFit: 'contain' }}
                            />
                        ) : (
                            <span className="empty-slot-icon">+</span>
                        )}

                        {/* Custom Tooltip */}
                        {hoveredItem && item && hoveredItem.item_id === item.item_id && (
                            <div className="item-tooltip">
                                <div className="tooltip-name">{item.name}</div>
                                <div className="tooltip-effect">{formatItemEffect(item)}</div>
                                <div style={{
                                    marginTop: '4px',
                                    fontSize: '10px',
                                    color: '#FF841C',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px'
                                }}>
                                    SELL FOR {item.sell_price}
                                    <Image src="/images/ticket.png" alt="Tickets" width={12} height={12} />
                                </div>
                                <div className="tooltip-action">Click to sell</div>
                            </div>
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
                    position: relative;
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
                .item-tooltip {
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    margin-bottom: 8px;
                    background: rgba(0, 0, 0, 0.95);
                    border: 2px solid #FF841C;
                    border-radius: 6px;
                    padding: 8px 12px;
                    min-width: 140px;
                    z-index: 1000;
                    pointer-events: none;
                }
                .item-tooltip::after {
                    content: '';
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    border: 6px solid transparent;
                    border-top-color: #FF841C;
                }
                .tooltip-name {
                    font-family: 'PressStart2P', monospace;
                    font-size: 9px;
                    color: #FF841C;
                    margin-bottom: 6px;
                    text-align: center;
                    white-space: nowrap;
                }
                .tooltip-effect {
                    font-family: 'PressStart2P', monospace;
                    font-size: 8px;
                    color: #FFEA00;
                    margin-bottom: 6px;
                    text-align: center;
                }
                .tooltip-action {
                    font-family: 'PressStart2P', monospace;
                    font-size: 7px;
                    color: rgba(255, 255, 255, 0.5);
                    text-align: center;
                }
            `}</style>
        </div>
    );
}
