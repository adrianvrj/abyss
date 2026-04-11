import { useState, useEffect, useRef } from 'react';
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
import { RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAccount } from '@starknet-react/core';

const DEBUG_MARKET_SYNC =
    import.meta.env.DEV || import.meta.env.VITE_ABYSS_DEBUG_MARKET === 'true';

function logMarketDebug(stage: string, payload?: unknown) {
    if (!DEBUG_MARKET_SYNC) {
        return;
    }

    console.log(`[ABYSS_MARKET] ${stage}`, payload);
}

interface InlineMarketPanelProps {
    sessionId: number;
    currentScore: number;
    currentTickets: number;
    symbolScores?: number[];
    onUpdateScore: (newScore: number) => void;
    onUpdateTickets?: (newTickets: number) => void;
    onUpdateSpins?: (newSpins: number) => void;
    onUpdateLuck?: (newLuck: number) => void;
    onUpdateSymbolScores?: (newSymbolScores: number[]) => void;
    onInventoryChange?: () => void;
    onPurchaseSuccess?: (item: ContractItem) => void;
    initialItems?: ContractItem[];
    refreshTrigger?: number;
    externalRefreshEvent?: import('@/utils/gameEvents').MarketRefreshedEvent | null;
    hiddenItemIds?: number[];
}

export default function InlineMarketPanel({
    sessionId,
    currentScore,
    currentTickets,
    symbolScores = [7, 5, 4, 3, 2],
    onUpdateScore,
    onUpdateTickets,
    onUpdateSpins,
    onUpdateLuck,
    onUpdateSymbolScores,
    onInventoryChange,
    onPurchaseSuccess,
    initialItems = [],
    refreshTrigger = 0,
    externalRefreshEvent = null,
    hiddenItemIds = [],
}: InlineMarketPanelProps) {
    const { account } = useAccount();
    const [loading, setLoading] = useState(!initialItems.length);
    const [marketData, setMarketData] = useState<SessionMarket | null>(null);
    const [marketItems, setMarketItems] = useState<ContractItem[]>(initialItems);
    const [charmInfoMap, setCharmInfoMap] = useState<Map<number, CharmInfo>>(new Map());
    const [ownedItemIds, setOwnedItemIds] = useState<Set<number>>(new Set());
    const [purchasedInCurrentMarket, setPurchasedInCurrentMarket] = useState<Set<number>>(new Set());
    const [refreshing, setRefreshing] = useState(false);
    const [purchasingSlot, setPurchasingSlot] = useState<number | null>(null);
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const latestMarketRequestRef = useRef(0);

    const {
        getSessionData,
        getSessionMarket,
        getSessionItems,
        isMarketSlotPurchased,
        buyItem,
        refreshMarket
    } = useAbyssGame(account);

    function applyDirectScoreBonus(
        currentScores: number[],
        item: ContractItem,
        direction: 1 | -1,
    ): number[] {
        if (item.effect_type !== ItemEffectType.DirectScoreBonus || !item.target_symbol) {
            return currentScores;
        }

        const next = [...currentScores];
        const delta = item.effect_value * direction;

        if (item.target_symbol === 'seven') next[0] = Math.max(0, (next[0] ?? 0) + delta);
        else if (item.target_symbol === 'diamond') next[1] = Math.max(0, (next[1] ?? 0) + delta);
        else if (item.target_symbol === 'cherry') next[2] = Math.max(0, (next[2] ?? 0) + delta);
        else if (item.target_symbol === 'coin') next[3] = Math.max(0, (next[3] ?? 0) + delta);
        else if (item.target_symbol === 'lemon') next[4] = Math.max(0, (next[4] ?? 0) + delta);

        return next;
    }

    async function resolveMarketItem(itemId: number): Promise<ContractItem | null> {
        if (isCharmItem(itemId)) {
            const charmId = getCharmIdFromItemId(itemId);
            const charmInfo = await getCharmInfo(charmId);
            if (!charmInfo) {
                return null;
            }

            return {
                item_id: itemId,
                name: charmInfo.name,
                description: charmInfo.description,
                price: charmInfo.shop_cost,
                sell_price: 0,
                effect_type: 7 as ItemEffectType,
                effect_value: charmInfo.luck,
                target_symbol: charmInfo.rarity,
                image: charmInfo.image,
                charmInfo,
            };
        }

        return getItemInfo(itemId);
    }

    async function syncSessionState() {
        const session = await getSessionData(sessionId);
        if (!session) {
            return null;
        }

        onUpdateScore(session.score);
        if (onUpdateTickets) onUpdateTickets(session.tickets);
        if (onUpdateSpins) onUpdateSpins(session.spinsRemaining);
        if (onUpdateLuck) onUpdateLuck(session.luck);
        return session;
    }

    useEffect(() => {
        if (externalRefreshEvent) {
            processMarketRefreshedEvent(externalRefreshEvent);
        }
    }, [externalRefreshEvent]);

    useEffect(() => {
        if (sessionId) loadMarketData();
    }, [sessionId, refreshTrigger]);

    function isSameMarketSnapshot(nextMarket: SessionMarket) {
        if (!marketData) {
            return false;
        }

        return (
            nextMarket.refresh_count === marketData.refresh_count &&
            nextMarket.item_slot_1 === marketData.item_slot_1 &&
            nextMarket.item_slot_2 === marketData.item_slot_2 &&
            nextMarket.item_slot_3 === marketData.item_slot_3 &&
            nextMarket.item_slot_4 === marketData.item_slot_4 &&
            nextMarket.item_slot_5 === marketData.item_slot_5 &&
            nextMarket.item_slot_6 === marketData.item_slot_6
        );
    }

    async function loadMarketData() {
        const requestId = ++latestMarketRequestRef.current;
        try {
            if (marketItems.length === 0) setLoading(true);
            const market = await getSessionMarket(sessionId);
            if (!market) return;

            const itemIds = [
                market.item_slot_1, market.item_slot_2, market.item_slot_3,
                market.item_slot_4, market.item_slot_5, market.item_slot_6,
            ];

            const items: ContractItem[] = [];
            const charmMap = new Map<number, CharmInfo>();

            for (const id of itemIds) {
                const item = await resolveMarketItem(id);
                if (!item) {
                    continue;
                }

                if (isCharmItem(id)) {
                    const charmId = getCharmIdFromItemId(id);
                    const charmInfo = await getCharmInfo(charmId);
                    if (charmInfo) {
                        charmMap.set(id, charmInfo);
                    }
                }

                items.push(item);
            }

            const playerItems = await getSessionItems(sessionId);
            const visiblePlayerItems = playerItems.filter(
                (playerItem) => !hiddenItemIds.includes(playerItem.item_id),
            );

            const purchasedSlots = new Set<number>();
            for (let slot = 0; slot < 6; slot++) {
                const isPurchased = await isMarketSlotPurchased(sessionId, slot);
                if (isPurchased) purchasedSlots.add(slot);
            }

            if (requestId !== latestMarketRequestRef.current) {
                return;
            }

            setMarketData(market);
            setMarketItems(items);
            setCharmInfoMap(charmMap);
            setOwnedItemIds(new Set(visiblePlayerItems.map((playerItem) => playerItem.item_id)));
            setPurchasedInCurrentMarket(prev => {
                if (isSameMarketSnapshot(market)) {
                    return new Set([...prev, ...purchasedSlots]);
                }

                return purchasedSlots;
            });
        } catch (error) {
            console.error("Failed to load market:", error);
        } finally {
            setLoading(false);
        }
    }

    function calculateRefreshCost(refreshCount: number): number {
        const count = refreshCount;
        return 2 + Math.floor((count * (count + 3)) / 2);
    }

    const refreshCost = marketData ? calculateRefreshCost(marketData.refresh_count) : 2;

    async function processMarketRefreshedEvent(refreshEvent: import('@/utils/gameEvents').MarketRefreshedEvent) {
        if (!refreshEvent) return;

        const newScore = refreshEvent.newScore;
        onUpdateScore(newScore);
        if (onUpdateLuck && refreshEvent.currentLuck !== undefined) {
            onUpdateLuck(refreshEvent.currentLuck);
        }
        setPurchasedInCurrentMarket(new Set());

        const newMarketData: SessionMarket = {
            refresh_count: marketData ? marketData.refresh_count + 1 : 0,
            item_slot_1: refreshEvent.slots[0],
            item_slot_2: refreshEvent.slots[1],
            item_slot_3: refreshEvent.slots[2],
            item_slot_4: refreshEvent.slots[3],
            item_slot_5: refreshEvent.slots[4],
            item_slot_6: refreshEvent.slots[5],
        };
        setMarketData(newMarketData);

        const items: ContractItem[] = [];
        const charmMap = new Map<number, CharmInfo>();

        for (const id of refreshEvent.slots) {
            const item = await resolveMarketItem(id);
            if (!item) {
                continue;
            }

            if (isCharmItem(id)) {
                const charmId = getCharmIdFromItemId(id);
                const charmInfo = await getCharmInfo(charmId);
                if (charmInfo) {
                    charmMap.set(id, charmInfo);
                }
            }

            items.push(item);
        }
        setMarketItems(items);
        setCharmInfoMap(charmMap);
        setCurrentItemIndex(0);
    }

    async function handleRefresh() {
        if (!marketData || currentScore < refreshCost) return;
        setRefreshing(true);
        onUpdateScore(currentScore - refreshCost);
        try {
            const events = await refreshMarket(sessionId);
            const refreshEvent = events.marketRefreshed;
            logMarketDebug('refresh:events', events);
            if (refreshEvent) {
                await processMarketRefreshedEvent(refreshEvent);
            } else {
                logMarketDebug('refresh:fallback:scheduled');
                window.setTimeout(() => {
                    void Promise.all([loadMarketData(), syncSessionState()]);
                }, 500);
            }
        } catch (e) {
            console.error("Refresh failed", e);
            onUpdateScore(currentScore);
            await Promise.all([loadMarketData(), syncSessionState()]);
        } finally {
            setRefreshing(false);
        }
    }

    async function handleBuy(slotIndex: number, item: ContractItem) {
        if (currentTickets < item.price) return;
        setPurchasingSlot(slotIndex);
        setPurchasedInCurrentMarket(prev => new Set(prev).add(slotIndex));
        try {
            logMarketDebug('buy:start', {
                sessionId,
                slotIndex,
                itemId: item.item_id,
                currentTickets,
                itemPrice: item.price,
            });
            if (onUpdateTickets) onUpdateTickets(currentTickets - item.price);

            const events = await buyItem(sessionId, slotIndex);
            logMarketDebug('buy:events', events);

            const purchaseEvent = events.itemsPurchased[0];
            const purchasedItemId = purchaseEvent?.itemId ?? item.item_id;
            const purchasedItem =
                purchasedItemId === item.item_id
                    ? item
                    : await resolveMarketItem(purchasedItemId);

            if (purchaseEvent) {
                onUpdateScore(purchaseEvent.newScore);
                if (onUpdateTickets) onUpdateTickets(purchaseEvent.newTickets);
                if (onUpdateSpins) onUpdateSpins(purchaseEvent.newSpins);
                if (onUpdateLuck && purchaseEvent.currentLuck !== undefined) {
                    onUpdateLuck(purchaseEvent.currentLuck);
                }
                if (onUpdateSymbolScores && purchasedItem && !isCharmItem(purchasedItem.item_id)) {
                    onUpdateSymbolScores(applyDirectScoreBonus(symbolScores, purchasedItem, 1));
                }
            } else {
                logMarketDebug('buy:fallback:scheduled', {
                    slotIndex,
                    purchasedItemId,
                });
                window.setTimeout(() => {
                    void Promise.all([loadMarketData(), syncSessionState()]);
                }, 500);
            }

            setOwnedItemIds(prev => new Set(prev).add(purchasedItemId));
            onInventoryChange?.();
            if (purchasedItem) {
                onPurchaseSuccess?.(purchasedItem);
            }
        } catch (e) {
            console.error("Purchase failed", e);
            logMarketDebug('buy:error', {
                slotIndex,
                itemId: item.item_id,
                error: e,
            });
            setPurchasedInCurrentMarket(prev => {
                const next = new Set(prev);
                next.delete(slotIndex);
                return next;
            });
            if (onUpdateTickets) onUpdateTickets(currentTickets);
            await Promise.all([loadMarketData(), syncSessionState()]);
        } finally {
            setPurchasingSlot(null);
        }
    }

    const handleNext = () => setCurrentItemIndex(prev => (prev + 1) % marketItems.length);
    const handlePrev = () => setCurrentItemIndex(prev => (prev - 1 + marketItems.length) % marketItems.length);

    const currentItem = marketItems[currentItemIndex];
    const currentSlotLabel = currentItemIndex + 1;
    const isCurrentCharm = currentItem ? isCharmItem(currentItem.item_id) : false;
    const visibleInventoryCount = Array.from(ownedItemIds).filter((itemId) => itemId < 1000).length;
    const isOwned = currentItem
        ? ownedItemIds.has(currentItem.item_id) && !hiddenItemIds.includes(currentItem.item_id)
        : false;
    const wasPurchased = purchasedInCurrentMarket.has(currentItemIndex);
    const isInventoryFull = visibleInventoryCount >= 7 && !isOwned && !isCurrentCharm;
    const canAfford = currentItem ? currentTickets >= currentItem.price : false;
    const canPurchase = currentItem && !isOwned && !wasPurchased && !isInventoryFull && canAfford && !purchasingSlot;

    function getEffectDetails(item: ContractItem): string {
        if (item.description && item.description.length > 0) return item.description;

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
                <style dangerouslySetInnerHTML={{ __html: styles }} />
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
                    const isPurchasedSlot = purchasedInCurrentMarket.has(index);
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
                                        <img
                                            src={isItemCharm && charmInfo ? charmInfo.image : getItemImage(item.item_id)}
                                            alt={item.name}
                                            width={180}
                                            height={180}
                                            loading="lazy"
                                            style={{ objectFit: 'contain', filter: 'grayscale(100%) opacity(0.3)' }}
                                        />
                                    </div>
                                    <div className="sold-badge">SOLD</div>
                                </div>
                            ) : isItemCharm && charmInfo ? (
                                <>
                                    <div className="charm-image">
                                        <img
                                            src={charmInfo.image}
                                            alt={charmInfo.name}
                                            width={140}
                                            height={140}
                                            loading="lazy"
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
                                        <img
                                            src={getItemImage(item.item_id)}
                                            alt={item.name}
                                            width={180}
                                            height={180}
                                            loading="lazy"
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
                <button onClick={handlePrev}><ChevronLeft /></button>
                <span>{currentSlotLabel}/{marketItems.length}</span>
                <button onClick={handleNext}><ChevronRight /></button>
            </div>

            <button
                className={`buy-btn ${(!canPurchase || wasPurchased) ? 'disabled' : ''}`}
                onClick={() => canPurchase && !wasPurchased && handleBuy(currentItemIndex, currentItem!)}
                disabled={!canPurchase || wasPurchased}
            >
                {wasPurchased ? "SOLD" : (
                    purchasingSlot === currentItemIndex ? "..." : (
                        isOwned ? "OWNED" :
                            isInventoryFull ? "FULL" :
                                !currentItem ? "..." :
                                    !canAfford ? (
                                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            NEED {currentItem.price ?? '...'}
                                            <img src="/images/ticket.png" alt="Tickets" width={18} height={9} loading="lazy" />
                                        </span>
                                    ) : (
                                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            BUY {currentItem.price ?? '...'}
                                            <img src="/images/ticket.png" alt="Tickets" width={18} height={9} loading="lazy" />
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
                <RotateCw className={refreshing ? 'spinning' : ''} size={14} />
                <span>REFRESH {refreshCost}</span>
            </button>

            <style dangerouslySetInnerHTML={{ __html: styles }} />
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
