'use client';

import React, { useState, useEffect } from 'react';
import { useAbyssGame } from '@/hooks/useAbyssGame';
import {
    getItemInfo,
    ContractItem,
} from '@/utils/abyssContract';
import { getItemImage } from '@/utils/itemImages';
import Image from 'next/image';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

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
    onOpenRelics?: () => void;
    sellingItemId?: number;
    hiddenItemIds?: number[];
}

export default function InlineInventoryPanel({
    sessionId,
    controller, // Added controller to destructuring if it wasn't there implicitly
    onItemClick,
    currentTickets = 0,
    refreshTrigger = 0,
    optimisticItems = [],
    onOpenRelics,
    sellingItemId,
    hiddenItemIds = []
}: InlineInventoryPanelProps) {
    const [loading, setLoading] = useState(true);
    const [ownedItems, setOwnedItems] = useState<ContractItem[]>([]);
    const [hoveredItem, setHoveredItem] = useState<ContractItem | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % 7);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + 7) % 7);
    };

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

    const allItems = [...ownedItems, ...uniqueOptimisticItems];
    const displayItems = allItems.filter(item => !hiddenItemIds?.includes(item.item_id));

    const inventoryCount = displayItems.length;
    const slots = Array.from({ length: 7 }, (_, i) => displayItems[i] || null);

    return (
        <div className="inline-inventory-panel">
            {/* Desktop Grid View */}
            <div className="inventory-slots desktop-view">
                {slots.map((item, index) => {
                    const isSelling = item && sellingItemId !== undefined && item.item_id === sellingItemId;
                    return (
                        <div
                            key={index}
                            className={`inv-slot ${item ? 'has-item' : 'empty'} ${isSelling ? 'selling' : ''}`}
                            onClick={() => item && !isSelling && onItemClick(item)}
                            onMouseEnter={() => item && setHoveredItem(item)}
                            onMouseLeave={() => setHoveredItem(null)}
                        >
                            {item ? (
                                <Image
                                    src={item.image || getItemImage(item.item_id)}
                                    alt={item.name}
                                    width={40}
                                    height={40}
                                    style={{ objectFit: 'contain', opacity: isSelling ? 0.5 : 1 }}
                                />
                            ) : (
                                <span className="empty-slot-icon">+</span>
                            )}

                            {isSelling && (
                                <div className="selling-overlay">
                                    <div className="spinner-mini"></div>
                                </div>
                            )}

                            {/* Custom Tooltip */}
                            {hoveredItem && item && hoveredItem.item_id === item.item_id && !isSelling && (
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
                    );
                })}
            </div>

            {/* Mobile Carousel View */}
            <div className="mobile-carousel-view">
                <div className="carousel-header" style={{ position: 'relative' }}>
                    <span>INVENTORY ({inventoryCount} / 7)</span>
                    {onOpenRelics && (
                        <button
                            onClick={onOpenRelics}
                            style={{
                                position: 'absolute',
                                right: 0,
                                top: '-5px',
                                background: '#FF841C22',
                                border: '1px solid #FF841C',
                                fontSize: '8px',
                                color: '#FF841C',
                                fontFamily: "'PressStart2P', monospace",
                                padding: '6px 8px',
                                cursor: 'pointer',
                                borderRadius: '4px'
                            }}
                        >
                            RELICS
                        </button>
                    )}
                </div>

                <div className="carousel-display">
                    {slots[currentIndex] ? (
                        <>
                            <div className="carousel-image">
                                <Image
                                    src={slots[currentIndex]?.image || getItemImage(slots[currentIndex]?.item_id || 1)}
                                    alt={slots[currentIndex]?.name || "Item"}
                                    width={140}
                                    height={140}
                                    style={{ objectFit: 'contain' }}
                                />
                            </div>
                            <div className="carousel-item-name">{slots[currentIndex]?.name}</div>
                            <div className="carousel-item-effect">{formatItemEffect(slots[currentIndex]!)}</div>
                        </>
                    ) : (
                        <div className="carousel-empty">
                            <span className="empty-plus">+</span>
                            <span>Empty Slot</span>
                        </div>
                    )}
                </div>

                <div className="carousel-nav">
                    <button onClick={handlePrev}><FaChevronLeft /></button>
                    <span>{currentIndex + 1} / 7</span>
                    <button onClick={handleNext}><FaChevronRight /></button>
                </div>

                <button
                    className={`carousel-action-btn ${!slots[currentIndex] ? 'disabled' : ''}`}
                    onClick={() => slots[currentIndex] && onItemClick(slots[currentIndex]!)}
                    disabled={!slots[currentIndex]}
                >
                    {slots[currentIndex] ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            SELL {slots[currentIndex]!.sell_price}
                            <Image src="/images/ticket.png" alt="Tickets" width={24} height={24} />
                        </span>
                    ) : (
                        "EMPTY"
                    )}
                </button>
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
                
                /* Mobile Carousel Styles */
                .mobile-carousel-view {
                    display: none;
                    flex-direction: column;
                    height: 100%;
                    width: 100%;
                    gap: 16px;
                }
                
                .carousel-header {
                    font-family: 'PressStart2P', monospace;
                    font-size: 14px;
                    color: #FF841C;
                    text-align: center;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #FF841C33;
                }

                .carousel-display {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 132, 28, 0.05);
                    border: 1px solid #FF841C44;
                    border-radius: 8px;
                    padding: 20px;
                }

                .carousel-image {
                    margin-bottom: 16px;
                }

                .carousel-item-name {
                    font-family: 'PressStart2P', monospace;
                    font-size: 14px;
                    color: #fff;
                    margin-bottom: 8px;
                    text-align: center;
                }

                .carousel-item-effect {
                     font-family: 'PressStart2P', monospace;
                     font-size: 10px;
                     color: #FFEA00;
                     text-align: center;
                     background: #000;
                     padding: 6px 10px;
                     border-radius: 4px;
                }

                .carousel-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    color: #FF841C44;
                    font-family: 'PressStart2P', monospace;
                }

                .empty-plus {
                    font-size: 48px;
                    margin-bottom: 8px;
                }

                .carousel-nav {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .carousel-nav button {
                    background: transparent;
                    border: 2px solid #FF841C;
                    color: #FF841C;
                    padding: 10px 15px;
                    font-size: 18px;
                    border-radius: 4px;
                    cursor: pointer;
                }

                .carousel-nav span {
                    font-family: 'PressStart2P', monospace;
                    color: #666;
                    font-size: 12px;
                }

                .carousel-action-btn {
                    width: 100%;
                    padding: 16px;
                    background: #FF841C;
                    color: #000;
                    border: none;
                    border-radius: 6px;
                    font-family: 'PressStart2P', monospace;
                    font-size: 14px;
                    cursor: pointer;
                }

                .carousel-action-btn.disabled {
                    background: #333;
                    color: #666;
                    cursor: not-allowed;
                }

                @media (max-width: 1024px) {
                    .inline-inventory-panel {
                        width: 100%;
                        height: 100%;
                        border: none;
                        background: transparent;
                        padding: 0;
                        display: flex;
                        flex-direction: column;
                    }
                    
                    /* Hide Desktop Grid on Mobile */
                    .desktop-view {
                        display: none;
                    }

                    /* Show Mobile Carousel */
                    .mobile-carousel-view {
                        display: flex;
                    }
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

                @media (max-width: 1024px) {
                    .inline-inventory-panel {
                        width: 100%;
                        height: 100%;
                        border: none;
                        background: transparent;
                        padding: 10px;
                    }
                    .inventory-slots {
                        gap: 12px;
                    }
                    .inv-slot {
                        width: 60px;
                        height: 60px;
                    }
                }
                .inv-slot.selling {
                    cursor: not-allowed;
                    border-color: #666;
                }
                .selling-overlay {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0,0,0,0.6);
                    border-radius: 4px;
                }
                .spinner-mini {
                    width: 16px;
                    height: 16px;
                    border: 2px solid #FF841C;
                    border-top-color: transparent;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .inv-slot.selling {
                    cursor: not-allowed;
                    border-color: #666;
                }
                .selling-overlay {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0,0,0,0.6);
                    border-radius: 4px;
                }
                .spinner-mini {
                    width: 16px;
                    height: 16px;
                    border: 2px solid #FF841C;
                    border-top-color: transparent;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
