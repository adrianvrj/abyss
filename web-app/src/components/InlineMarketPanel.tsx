'use client';

import React, { useState, useEffect } from 'react';
import {
    getSessionMarket,
    getItemInfo,
    isMarketSlotPurchased,
    getSessionInventoryCount,
    getSessionItems,
    buyItemFromMarket,
    refreshMarket,
    ContractItem,
    SessionMarket,
    ItemEffectType
} from '@/utils/abyssContract';
import { getItemImage } from '@/utils/itemImages';
import Image from 'next/image';
import { FaRotate, FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

interface InlineMarketPanelProps {
    sessionId: number;
    controller: any;
    currentScore: number;
    onUpdateScore: (newScore: number) => void;
    onInventoryChange?: () => void;
}

export default function InlineMarketPanel({
    sessionId,
    controller,
    currentScore,
    onUpdateScore,
    onInventoryChange
}: InlineMarketPanelProps) {
    const [loading, setLoading] = useState(true);
    const [marketData, setMarketData] = useState<SessionMarket | null>(null);
    const [marketItems, setMarketItems] = useState<ContractItem[]>([]);
    const [ownedItemIds, setOwnedItemIds] = useState<Set<number>>(new Set());
    const [inventoryCount, setInventoryCount] = useState(0);
    const [purchasedInCurrentMarket, setPurchasedInCurrentMarket] = useState<Set<number>>(new Set());
    const [refreshing, setRefreshing] = useState(false);
    const [purchasingSlot, setPurchasingSlot] = useState<number | null>(null);
    const [currentItemIndex, setCurrentItemIndex] = useState(0);

    useEffect(() => {
        if (sessionId) loadMarketData();
    }, [sessionId]);

    async function loadMarketData() {
        try {
            setLoading(true);
            const market = await getSessionMarket(sessionId);
            setMarketData(market);

            const itemIds = [
                market.item_slot_1,
                market.item_slot_2,
                market.item_slot_3,
                market.item_slot_4,
                market.item_slot_5,
                market.item_slot_6,
            ];

            const items = await Promise.all(itemIds.map(id => getItemInfo(id)));
            setMarketItems(items);

            const invCount = await getSessionInventoryCount(sessionId);
            setInventoryCount(invCount);

            const playerItems = await getSessionItems(sessionId);
            setOwnedItemIds(new Set(playerItems.map(pi => pi.item_id)));

            const purchasedSlots = new Set<number>();
            for (let slot = 1; slot <= 6; slot++) {
                const isPurchased = await isMarketSlotPurchased(sessionId, slot);
                if (isPurchased) purchasedSlots.add(slot);
            }
            setPurchasedInCurrentMarket(purchasedSlots);
        } catch (error) {
            console.error("Failed to load market:", error);
        } finally {
            setLoading(false);
        }
    }

    function calculateRefreshCost(refreshCount: number): number {
        const costs = [2, 5, 16, 24, 48, 62, 86, 112, 190, 280, 345, 526, 891, 1200];
        if (refreshCount < costs.length) return costs[refreshCount];
        let cost = 1200;
        for (let i = 0; i < refreshCount - 13; i++) cost += Math.floor(cost / 2);
        return cost;
    }

    const refreshCost = marketData ? calculateRefreshCost(marketData.refresh_count) : 2;

    async function handleRefresh() {
        if (!marketData || currentScore < refreshCost) return;
        setRefreshing(true);
        try {
            await refreshMarket(sessionId, controller);
            onUpdateScore(currentScore - refreshCost);
            setPurchasedInCurrentMarket(new Set());
            await loadMarketData();
            setCurrentItemIndex(0);
        } catch (e) {
            console.error("Refresh failed", e);
        } finally {
            setRefreshing(false);
        }
    }

    async function handleBuy(slot: number, item: ContractItem) {
        if (currentScore < item.price) return;
        setPurchasingSlot(slot);
        try {
            await buyItemFromMarket(sessionId, slot, controller);
            onUpdateScore(currentScore - item.price);
            setPurchasedInCurrentMarket(prev => new Set(prev).add(slot));
            setOwnedItemIds(prev => new Set(prev).add(item.item_id));
            setInventoryCount(prev => prev + 1);
            onInventoryChange?.();
        } catch (e) {
            console.error("Purchase failed", e);
        } finally {
            setPurchasingSlot(null);
        }
    }

    const handleNext = () => setCurrentItemIndex(prev => (prev + 1) % marketItems.length);
    const handlePrev = () => setCurrentItemIndex(prev => (prev - 1 + marketItems.length) % marketItems.length);

    const currentItem = marketItems[currentItemIndex];
    const currentSlot = currentItemIndex + 1;
    const isOwned = currentItem ? ownedItemIds.has(currentItem.item_id) : false;
    const wasPurchased = purchasedInCurrentMarket.has(currentSlot);
    const isInventoryFull = inventoryCount >= 7 && !isOwned;
    const canAfford = currentItem ? currentScore >= currentItem.price : false;
    const canPurchase = currentItem && !isOwned && !wasPurchased && !isInventoryFull && canAfford && !purchasingSlot;

    function getEffectDetails(item: ContractItem): string {
        const val = item.effect_value;
        const target = item.target_symbol || '';
        switch (item.effect_type) {
            case ItemEffectType.DirectScoreBonus:
                return target ? `+${val} pts to ${target}` : `+${val} pts`;
            case ItemEffectType.SymbolProbabilityBoost:
                return target ? `+${val}% ${target} chance` : `+${val}% chance`;
            case ItemEffectType.PatternMultiplierBoost:
                return (target && target !== '0') ? `+${val}% ${target} patterns` : `+${val}% all patterns`;
            case ItemEffectType.ScoreMultiplier:
                return `x${val} score multiplier`;
            case ItemEffectType.SpinBonus:
                return `+${val} extra spins`;
            case ItemEffectType.LevelProgressionBonus:
                return `-${val}% level requirement`;
            case ItemEffectType.SixSixSixProtection:
                return `666 protection`;
            default:
                return item.description || "";
        }
    }

    if (loading) {
        return (
            <div className="inline-market-panel">
                <div className="panel-header">MARKET</div>
                <div className="loading">Loading...</div>
                <style jsx>{styles}</style>
            </div>
        );
    }

    return (
        <div className="inline-market-panel">
            <div className="panel-header">MARKET</div>

            <div className="item-display">
                {wasPurchased ? (
                    <div className="sold-state">
                        <div className="item-image sold">
                            <Image
                                src={getItemImage(currentItem?.item_id || 1)}
                                alt={currentItem?.name || "Item"}
                                width={180}
                                height={180}
                                style={{ objectFit: 'contain', filter: 'grayscale(100%) opacity(0.3)' }}
                            />
                        </div>
                        <div className="sold-badge">SOLD</div>
                    </div>
                ) : (
                    <>
                        <div className="item-image">
                            <Image
                                src={getItemImage(currentItem?.item_id || 1)}
                                alt={currentItem?.name || "Item"}
                                width={180}
                                height={180}
                                style={{ objectFit: 'contain' }}
                            />
                        </div>
                        <div className="item-name">{currentItem?.name}</div>
                        <div className="effect-badge">{currentItem && getEffectDetails(currentItem)}</div>
                    </>
                )}
            </div>

            <div className="carousel-nav">
                <button onClick={handlePrev}><FaChevronLeft /></button>
                <span>{currentSlot}/{marketItems.length}</span>
                <button onClick={handleNext}><FaChevronRight /></button>
            </div>

            <button
                className={`buy-btn ${(!canPurchase || wasPurchased) ? 'disabled' : ''}`}
                onClick={() => canPurchase && !wasPurchased && handleBuy(currentSlot, currentItem!)}
                disabled={!canPurchase || wasPurchased}
            >
                {wasPurchased ? "SOLD" : (
                    purchasingSlot === currentSlot ? "..." : (
                        isOwned ? "OWNED" :
                            isInventoryFull ? "FULL" :
                                !canAfford ? `NEED ${currentItem?.price}` : `BUY ${currentItem?.price}`
                    )
                )}
            </button>

            <button
                className="refresh-btn"
                onClick={handleRefresh}
                disabled={refreshing || currentScore < refreshCost}
            >
                <FaRotate className={refreshing ? 'spinning' : ''} />
                <span>REFRESH {refreshCost}</span>
            </button>

            <style jsx>{styles}</style>
        </div>
    );
}

const styles = `
    .inline-market-panel {
        background: rgba(0, 0, 0, 0.85);
        border: 2px solid #FF841C;
        border-radius: 8px;
        padding: 15px;
        width: 300px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .panel-header {
        font-family: 'PressStart2P', monospace;
        font-size: 12px;
        color: #FF841C;
        text-align: center;
        padding-bottom: 8px;
        border-bottom: 1px solid #FF841C33;
    }
    .loading {
        color: #666;
        font-family: 'PressStart2P', monospace;
        font-size: 8px;
        text-align: center;
        padding: 40px 0;
    }
    .item-display {
        background: rgba(0, 0, 0, 0.5);
        border-radius: 8px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        height: 300px;
        justify-content: center;
    }
    .item-image {
        margin-bottom: 15px;
    }
    .item-name {
        font-family: 'PressStart2P', monospace;
        font-size: 11px;
        color: #fff;
        text-align: center;
        margin-bottom: 8px;
    }
    .effect-badge {
        background: #FF841C;
        color: #000;
        font-family: 'PressStart2P', monospace;
        font-size: 9px;
        padding: 5px 10px;
        border-radius: 4px;
    }
    .sold-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
    }
    .sold-badge {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: 'PressStart2P', monospace;
        font-size: 20px;
        color: #FF841C;
        text-shadow: 0 0 10px rgba(255, 132, 28, 0.5);
    }
    .carousel-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
    }
    .carousel-nav button {
        background: transparent;
        border: 2px solid #FF841C;
        border-radius: 4px;
        color: #FF841C;
        font-size: 16px;
        cursor: pointer;
        padding: 6px 10px;
        transition: all 0.2s;
    }
    .carousel-nav button:hover {
        background: #FF841C22;
    }
    .carousel-nav span {
        font-family: 'PressStart2P', monospace;
        font-size: 8px;
        color: #666;
    }
    .buy-btn {
        width: 100%;
        padding: 10px;
        background: #FF841C;
        border: none;
        border-radius: 6px;
        font-family: 'PressStart2P', monospace;
        font-size: 9px;
        color: #000;
        cursor: pointer;
        transition: all 0.2s;
    }
    .buy-btn:hover:not(.disabled) {
        background: #FFa04C;
    }
    .buy-btn.disabled {
        background: #444;
        color: #666;
        cursor: not-allowed;
    }
    .refresh-btn {
        width: 100%;
        padding: 10px 14px;
        background: transparent;
        border: 1px solid #FF841C;
        border-radius: 6px;
        font-family: 'PressStart2P', monospace;
        font-size: 8px;
        color: #FF841C;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.2s;
    }
    .refresh-btn:hover:not(:disabled) {
        background: #FF841C22;
    }
    .refresh-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    .spinning {
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
