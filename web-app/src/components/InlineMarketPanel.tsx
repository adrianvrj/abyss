import React, { useState, useEffect } from 'react';
import { useAbyssGame } from '@/hooks/useAbyssGame';
import {
    getItemInfo,
    ContractItem,
    SessionMarket,
    ItemEffectType,
    isCharmItem,
    getCharmIdFromItemId,
    getCharmInfo,
    CharmInfo
} from '@/utils/abyssContract';
import { getItemImage } from '@/utils/itemImages';
import Image from 'next/image';
import { FaRotate, FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

interface InlineMarketPanelProps {
    sessionId: number;
    controller: any;
    currentScore: number;
    currentTickets: number;
    onUpdateScore: (newScore: number) => void;
    onUpdateTickets?: (newTickets: number) => void;
    onInventoryChange?: () => void;
    onPurchaseSuccess?: (item: ContractItem) => void;
}

export default function InlineMarketPanel({
    sessionId,
    controller,
    currentScore,
    currentTickets,
    onUpdateScore,
    onUpdateTickets,
    onInventoryChange,
    onPurchaseSuccess
}: InlineMarketPanelProps) {
    const [loading, setLoading] = useState(true);
    const [marketData, setMarketData] = useState<SessionMarket | null>(null);
    const [marketItems, setMarketItems] = useState<ContractItem[]>([]);
    const [charmInfoMap, setCharmInfoMap] = useState<Map<number, CharmInfo>>(new Map());
    const [ownedItemIds, setOwnedItemIds] = useState<Set<number>>(new Set());
    const [inventoryCount, setInventoryCount] = useState(0);
    const [purchasedInCurrentMarket, setPurchasedInCurrentMarket] = useState<Set<number>>(new Set());
    const [refreshing, setRefreshing] = useState(false);
    const [purchasingSlot, setPurchasingSlot] = useState<number | null>(null);
    const [currentItemIndex, setCurrentItemIndex] = useState(0);

    const {
        getSessionMarket,
        getSessionItems,
        getSessionInventoryCount,
        isMarketSlotPurchased,
        buyItem,
        refreshMarket
    } = useAbyssGame(controller);

    useEffect(() => {
        if (sessionId) loadMarketData();
    }, [sessionId]);

    async function loadMarketData() {
        try {
            setLoading(true);
            const market = await getSessionMarket(sessionId);
            setMarketData(market);

            if (!market) return; // Safety check

            const itemIds = [
                market.item_slot_1,
                market.item_slot_2,
                market.item_slot_3,
                market.item_slot_4,
                market.item_slot_5,
                market.item_slot_6,
            ];

            // Fetch items and charms separately
            const items: ContractItem[] = [];
            const charmMap = new Map<number, CharmInfo>();

            for (const id of itemIds) {
                if (isCharmItem(id)) {
                    // It's a charm - fetch from charm API
                    const charmId = getCharmIdFromItemId(id);
                    const charmInfo = await getCharmInfo(charmId);
                    if (charmInfo) {
                        charmMap.set(id, charmInfo);
                        // Create a dummy ContractItem for compatibility
                        items.push({
                            item_id: id,
                            name: charmInfo.name,
                            description: charmInfo.description,
                            price: charmInfo.shop_cost,
                            sell_price: 0,
                            effect_type: 7 as ItemEffectType, // LuckBoost marker
                            effect_value: charmInfo.luck,
                            target_symbol: charmInfo.rarity
                        });
                    }
                } else {
                    // Regular item
                    const item = await getItemInfo(id);
                    items.push(item);
                }
            }

            setMarketItems(items);
            setCharmInfoMap(charmMap);

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
            // refreshMarket returns ParsedEvents
            const events = await refreshMarket(sessionId);

            const refreshEvent = events.marketRefreshed;
            if (refreshEvent) {
                // Optimistic Update using Event Data
                const newScore = refreshEvent.newScore;
                onUpdateScore(newScore);
                setPurchasedInCurrentMarket(new Set());

                // Update Market Data State
                const newMarketData: SessionMarket = {
                    // We don't have refresh_count from event, but we can increment local
                    // session_id is irrelevant for display usually
                    refresh_count: marketData.refresh_count + 1,
                    item_slot_1: refreshEvent.slots[0],
                    item_slot_2: refreshEvent.slots[1],
                    item_slot_3: refreshEvent.slots[2],
                    item_slot_4: refreshEvent.slots[3],
                    item_slot_5: refreshEvent.slots[4],
                    item_slot_6: refreshEvent.slots[5],
                };
                setMarketData(newMarketData);

                // Fetch Info for new items directly
                const items: ContractItem[] = [];
                const charmMap = new Map<number, CharmInfo>();

                for (const id of refreshEvent.slots) {
                    if (isCharmItem(id)) {
                        const charmId = getCharmIdFromItemId(id);
                        // Try to get from existing map first? No, likely new.
                        const charmInfo = await getCharmInfo(charmId);
                        if (charmInfo) {
                            charmMap.set(id, charmInfo);
                            items.push({
                                item_id: id,
                                name: charmInfo.name,
                                description: charmInfo.description,
                                price: charmInfo.shop_cost,
                                sell_price: 0,
                                effect_type: 7 as ItemEffectType,
                                effect_value: charmInfo.luck,
                                target_symbol: charmInfo.rarity
                            });
                        }
                    } else {
                        // Regular item - check cache? simple fetch for now
                        const item = await getItemInfo(id);
                        items.push(item);
                    }
                }
                setMarketItems(items);
                setCharmInfoMap(charmMap);
                setCurrentItemIndex(0);

                // No need to call loadMarketData(); we have everything!
            } else {
                // Fallback if event missing (shouldn't happen with new contract)
                await loadMarketData();
            }

        } catch (e) {
            console.error("Refresh failed", e);
            // On error, try to reload to be safe
            await loadMarketData();
        } finally {
            setRefreshing(false);
        }
    }

    async function handleBuy(slot: number, item: ContractItem) {
        if (currentTickets < item.price) return;
        setPurchasingSlot(slot);
        try {
            if (onUpdateTickets) onUpdateTickets(currentTickets - item.price);
            await buyItem(sessionId, slot);
            setPurchasedInCurrentMarket(prev => new Set(prev).add(slot));
            setOwnedItemIds(prev => new Set(prev).add(item.item_id));
            setInventoryCount(prev => prev + 1);
            onInventoryChange?.();
            onPurchaseSuccess?.(item);
        } catch (e) {
            console.error("Purchase failed", e);
            if (onUpdateTickets) onUpdateTickets(currentTickets);
        } finally {
            setPurchasingSlot(null);
        }
    }

    const handleNext = () => setCurrentItemIndex(prev => (prev + 1) % marketItems.length);
    const handlePrev = () => setCurrentItemIndex(prev => (prev - 1 + marketItems.length) % marketItems.length);

    const currentItem = marketItems[currentItemIndex];
    const currentSlot = currentItemIndex + 1;
    const isCurrentCharm = currentItem ? isCharmItem(currentItem.item_id) : false;
    const currentCharmInfo = currentItem ? charmInfoMap.get(currentItem.item_id) : undefined;
    const isOwned = currentItem ? ownedItemIds.has(currentItem.item_id) : false;
    const wasPurchased = purchasedInCurrentMarket.has(currentSlot);
    const isInventoryFull = inventoryCount >= 7 && !isOwned && !isCurrentCharm; // Charms don't use inventory
    const canAfford = currentItem ? currentTickets >= currentItem.price : false;
    const canPurchase = currentItem && !isOwned && !wasPurchased && !isInventoryFull && canAfford && !purchasingSlot;

    function getEffectDetails(item: ContractItem): string {
        // If the item has a description, use it as the source of truth
        if (item.description && item.description.length > 0) {
            return item.description;
        }

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

    function getRarityColor(rarity: string): string {
        switch (rarity) {
            case 'Legendary': return '#FFD700';
            case 'Epic': return '#A855F7';
            case 'Rare': return '#3B82F6';
            default: return '#9CA3AF';
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
        <div className={`inline-market-panel ${isCurrentCharm ? 'charm-mode' : ''}`}>
            <div className={`panel-header ${isCurrentCharm ? 'charm-header' : ''}`}>
                {isCurrentCharm ? 'CHARM' : 'MARKET'}
            </div>

            <div className={`item-display ${isCurrentCharm ? 'charm-display' : ''}`} style={{ position: 'relative', overflow: 'hidden' }}>
                {marketItems.map((item, index) => {
                    const isVisible = index === currentItemIndex;
                    const slot = index + 1;
                    const isPurchasedSlot = purchasedInCurrentMarket.has(slot);
                    const isItemCharm = isCharmItem(item.item_id);
                    const charmInfo = charmInfoMap.get(item.item_id);

                    return (
                        <div key={`${item.item_id}-${index}`} style={{
                            display: isVisible ? 'flex' : 'none',
                            width: '100%',
                            height: '100%',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {isPurchasedSlot ? (
                                <div className="sold-state">
                                    <div className="item-image sold">
                                        {isItemCharm && charmInfo ? (
                                            <Image
                                                src={charmInfo.image}
                                                alt={charmInfo.name}
                                                width={180}
                                                height={180}
                                                style={{ objectFit: 'contain', filter: 'grayscale(100%) opacity(0.3)' }}
                                            />
                                        ) : (
                                            <Image
                                                src={getItemImage(item.item_id)}
                                                alt={item.name}
                                                width={180}
                                                height={180}
                                                style={{ objectFit: 'contain', filter: 'grayscale(100%) opacity(0.3)' }}
                                            />
                                        )}
                                    </div>
                                    <div className="sold-badge">SOLD</div>
                                </div>
                            ) : isItemCharm && charmInfo ? (
                                <>
                                    <div className="charm-image">
                                        <Image
                                            src={charmInfo.image}
                                            alt={charmInfo.name}
                                            width={140}
                                            height={140}
                                            priority={index === 0} // Priority for first item
                                            style={{ objectFit: 'contain' }}
                                        />
                                    </div>
                                    {charmInfo.rarity && (
                                        <div className="charm-rarity" style={{ color: getRarityColor(charmInfo.rarity) }}>
                                            {charmInfo.rarity.toUpperCase()}
                                        </div>
                                    )}
                                    <div className="item-name charm-name">{charmInfo.name}</div>
                                    <div className="charm-effect">{charmInfo.effect || charmInfo.description}</div>
                                </>
                            ) : (
                                <>
                                    <div className="item-image">
                                        <Image
                                            src={getItemImage(item.item_id)}
                                            alt={item.name}
                                            width={180}
                                            height={180}
                                            priority={index === 0} // Priority for first item
                                            style={{ objectFit: 'contain' }}
                                        />
                                    </div>
                                    <div className="item-name">{item.name}</div>
                                    <div className="effect-badge">{getEffectDetails(item)}</div>
                                </>
                            )}
                        </div>
                    );
                })}
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
                                !currentItem ? "..." :
                                    !canAfford ? (
                                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            NEED {currentItem.price ?? '...'}
                                            <Image src="/images/ticket.png" alt="Tickets" width={18} height={9} />
                                        </span>
                                    ) : (
                                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            BUY {currentItem.price ?? '...'}
                                            <Image src="/images/ticket.png" alt="Tickets" width={18} height={9} />
                                        </span>
                                    )
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
    
    .charm-image {
        width: 160px;
        height: 160px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 12px;
    }
    .charm-rarity {
        font-family: 'PressStart2P', monospace;
        font-size: 8px;
        margin-bottom: 6px;
    }

    .charm-effect {
        font-family: 'PressStart2P', monospace;
        font-size: 8px;
        color: #000;
        text-align: center;
        padding: 6px 10px;
        background: #FF841C;
        border-radius: 4px;
        margin-top: 4px;
    }
    .charm-luck {
        font-family: 'PressStart2P', monospace;
        font-size: 10px;
        color: #A78BFA;
        margin-top: 8px;
    }

    @media (max-width: 1024px) {
        .inline-market-panel {
            width: 100%;
            height: 100%;
            border: none;
            background: transparent;
            padding: 0;
            justify-content: space-between;
        }
        
        .panel-header {
            font-size: 16px;
            padding: 15px 0;
        }

        .item-display {
            flex: 1;
            width: 100%;
            height: auto;
            margin: 10px 0;
            background: rgba(255, 132, 28, 0.05);
            border: 1px solid #FF841C44;
        }

        .buy-btn, .refresh-btn {
            padding: 15px;
            font-size: 12px;
        }

        .carousel-nav button {
            padding: 10px 15px;
            font-size: 20px;
        }
    }
`;
