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
import { SYMBOL_INFO } from '@/utils/GameConfig';
import { CHIP_TOKEN_IMAGE_URL } from '@/lib/constants';
import { RotateCw } from 'lucide-react';
import { useAccount } from '@starknet-react/core';

const DEBUG_MARKET_SYNC =
    import.meta.env.DEV || import.meta.env.VITE_ABYSS_DEBUG_MARKET === 'true';
const BIBLIA_ITEM_ID = 40;

function logMarketDebug(stage: string, payload?: unknown) {
    if (!DEBUG_MARKET_SYNC) {
        return;
    }

    console.log(`[ABYSS_MARKET] ${stage}`, payload);
}

function getDiamondChipBonus(item: ContractItem) {
    if (item.item_id === 2 || item.item_id === 8) return 1;
    if (item.item_id === 26 || item.item_id === 27) return 2;
    if (item.item_id === 35 || item.item_id === 36) return 3;
    return 0;
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
    practiceMode?: boolean;
    practiceMarketItems?: ContractItem[];
    practiceOwnedItems?: ContractItem[];
    practiceBibliaPurchaseCount?: number;
    practicePurchasedSlots?: number[];
    practiceRefreshCount?: number;
    onPracticeRefresh?: () => Promise<void> | void;
    onPracticeBuy?: (slotIndex: number, item: ContractItem) => Promise<void> | void;
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
    practiceMode = false,
    practiceMarketItems = [],
    practiceOwnedItems = [],
    practiceBibliaPurchaseCount = 0,
    practicePurchasedSlots = [],
    practiceRefreshCount = 0,
    onPracticeRefresh,
    onPracticeBuy,
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
    const latestMarketRequestRef = useRef(0);

    const {
        getSessionData,
        getSessionMarket,
        getSessionItems,
        getSessionItemPurchasePrice,
        isMarketSlotPurchased,
        buyItem,
        refreshMarket
    } = useAbyssGame(account);

    function getDisplayedPrice(item: ContractItem | null | undefined) {
        if (!item) {
            return 0;
        }

        if (practiceMode && item.item_id === BIBLIA_ITEM_ID) {
            return item.price + practiceBibliaPurchaseCount;
        }

        return item.price;
    }

    async function applySessionItemPrices(items: ContractItem[]) {
        return Promise.all(
            items.map(async (item) => {
                if (practiceMode || item.item_id !== BIBLIA_ITEM_ID) {
                    return item;
                }

                const dynamicPrice = await getSessionItemPurchasePrice(sessionId, item.item_id);
                return dynamicPrice > 0 ? { ...item, price: dynamicPrice } : item;
            }),
        );
    }

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
        if (!practiceMode) {
            return;
        }

        const practiceCharmMap = new Map<number, CharmInfo>();
        practiceMarketItems.forEach((item) => {
            if (isCharmItem(item.item_id) && item.charmInfo) {
                practiceCharmMap.set(item.item_id, item.charmInfo);
            }
        });

        setLoading(false);
        setMarketData({
            refresh_count: practiceRefreshCount,
            item_slot_1: practiceMarketItems[0]?.item_id ?? 0,
            item_slot_2: practiceMarketItems[1]?.item_id ?? 0,
            item_slot_3: practiceMarketItems[2]?.item_id ?? 0,
            item_slot_4: practiceMarketItems[3]?.item_id ?? 0,
            item_slot_5: practiceMarketItems[4]?.item_id ?? 0,
            item_slot_6: practiceMarketItems[5]?.item_id ?? 0,
        });
        setMarketItems(practiceMarketItems);
        setCharmInfoMap(practiceCharmMap);
        setOwnedItemIds(new Set(practiceOwnedItems.map((item) => item.item_id)));
        setPurchasedInCurrentMarket(new Set(practicePurchasedSlots));
    }, [practiceMode, practiceMarketItems, practiceOwnedItems, practicePurchasedSlots, practiceRefreshCount]);

    useEffect(() => {
        if (practiceMode || !externalRefreshEvent || externalRefreshEvent.sessionId !== sessionId) {
            return;
        }

        void processMarketRefreshedEvent(externalRefreshEvent);
    }, [externalRefreshEvent, practiceMode, sessionId]);

    useEffect(() => {
        if (practiceMode) {
            return;
        }

        if (sessionId) loadMarketData();
    }, [practiceMode, sessionId, refreshTrigger]);

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

            const pricedItems = await applySessionItemPrices(items);

            setMarketData(market);
            setMarketItems(pricedItems);
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

    const refreshCost = practiceMode
        ? calculateRefreshCost(practiceRefreshCount)
        : (marketData ? calculateRefreshCost(marketData.refresh_count) : 2);

    async function processMarketRefreshedEvent(refreshEvent: import('@/utils/gameEvents').MarketRefreshedEvent) {
        if (!refreshEvent) return;

        const newScore = refreshEvent.newScore;
        onUpdateScore(newScore);
        if (onUpdateLuck && refreshEvent.currentLuck !== undefined) {
            onUpdateLuck(refreshEvent.currentLuck);
        }
        setPurchasedInCurrentMarket(new Set());
        setMarketData((prev) => ({
            refresh_count: (prev?.refresh_count ?? 0) + 1,
            item_slot_1: refreshEvent.slots[0] ?? 0,
            item_slot_2: refreshEvent.slots[1] ?? 0,
            item_slot_3: refreshEvent.slots[2] ?? 0,
            item_slot_4: refreshEvent.slots[3] ?? 0,
            item_slot_5: refreshEvent.slots[4] ?? 0,
            item_slot_6: refreshEvent.slots[5] ?? 0,
        }));

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
        const pricedItems = await applySessionItemPrices(items);
        setMarketItems(pricedItems);
        setCharmInfoMap(charmMap);
    }

    async function handleRefresh() {
        if (practiceMode) {
            if (currentScore < refreshCost || refreshing) return;
            setRefreshing(true);
            try {
                await onPracticeRefresh?.();
            } catch (e) {
                console.error("Practice refresh failed", e);
            } finally {
                setRefreshing(false);
            }
            return;
        }

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
        const itemPrice = getDisplayedPrice(item);

        if (practiceMode) {
            if (!onPracticeBuy || currentTickets < itemPrice) return;
            setPurchasingSlot(slotIndex);
            try {
                await onPracticeBuy(slotIndex, item);
            } catch (e) {
                console.error("Practice purchase failed", e);
            } finally {
                setPurchasingSlot(null);
            }
            return;
        }

        if (currentTickets < itemPrice) return;
        setPurchasingSlot(slotIndex);
        setPurchasedInCurrentMarket(prev => new Set(prev).add(slotIndex));
        try {
            logMarketDebug('buy:start', {
                sessionId,
                slotIndex,
                itemId: item.item_id,
                currentTickets,
                itemPrice,
            });
            if (onUpdateTickets) onUpdateTickets(currentTickets - itemPrice);

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

            if (purchasedItem && purchasedItem.effect_type !== ItemEffectType.SpinBonus) {
                setOwnedItemIds(prev => new Set(prev).add(purchasedItemId));
            }
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

    const visibleInventoryCount = Array.from(ownedItemIds).filter((itemId) => itemId < 1000).length;

    function getEffectDetails(item: ContractItem): string {
        if (item.description && item.description.length > 0) return item.description;

        const val = item.effect_value;
        const target = item.target_symbol || '';
        switch (item.effect_type) {
            case ItemEffectType.DirectScoreBonus:
                return target ? `+${val} pts to ${target}` : `+${val} pts`;
            case ItemEffectType.SymbolProbabilityBoost:
                if (target === 'anti-coin') {
                    return `-${val} coin weight`;
                }
                return target ? `+${val} ${target} weight` : `+${val} weight`;
            case ItemEffectType.PatternMultiplierBoost:
                return (target && target !== '0') ? `+${val}% ${target} patterns` : `+${val}% all patterns`;
            case ItemEffectType.ScoreMultiplier:
                return `x${val} score multiplier`;
            case ItemEffectType.SpinBonus:
                return `+${val} instant spins`;
            case ItemEffectType.LevelProgressionBonus:
                return `-${val}% level requirement`;
            case ItemEffectType.SixSixSixProtection:
                return `666 protection`;
            default:
                return item.description || "";
        }
    }

    function renderDiamondChipBonus(item: ContractItem) {
        const chipBonus = getDiamondChipBonus(item);
        if (!chipBonus) {
            return null;
        }

        return (
            <span className="desktop-effect-inline desktop-effect-chip">
                <span>+{chipBonus}</span>
                <img
                    src={CHIP_TOKEN_IMAGE_URL}
                    alt="CHIP"
                    width={11}
                    height={11}
                    loading="lazy"
                />
            </span>
        );
    }

    function renderEffectDisplay(item: ContractItem, compact = false) {
        if (item.effect_type === ItemEffectType.SymbolProbabilityBoost && item.target_symbol === 'anti-coin') {
            return (
                <span className={`desktop-effect-inline ${compact ? 'compact-effect' : ''}`}>
                    <span>-{item.effect_value}</span>
                    <img
                        src={SYMBOL_INFO.coin.image}
                        alt={SYMBOL_INFO.coin.name}
                        width={compact ? 16 : 11}
                        height={compact ? 16 : 11}
                        loading="lazy"
                    />
                    <span>weight</span>
                </span>
            );
        }

        if (
            (item.effect_type === ItemEffectType.DirectScoreBonus || item.effect_type === ItemEffectType.SymbolProbabilityBoost)
            && item.target_symbol === 'diamond'
        ) {
            const primary = item.effect_type === ItemEffectType.DirectScoreBonus
                ? (
                    <span className="desktop-effect-inline">
                        <span>+{item.effect_value}</span>
                        <img
                            src={SYMBOL_INFO.diamond.image}
                            alt={SYMBOL_INFO.diamond.name}
                            width={compact ? 16 : 11}
                            height={compact ? 16 : 11}
                            loading="lazy"
                        />
                    </span>
                )
                : (
                    <span className="desktop-effect-inline">
                        <span>+{item.effect_value}%</span>
                        <img
                            src={SYMBOL_INFO.diamond.image}
                            alt={SYMBOL_INFO.diamond.name}
                            width={compact ? 16 : 11}
                            height={compact ? 16 : 11}
                            loading="lazy"
                        />
                    </span>
                );

            const chip = renderDiamondChipBonus(item);
            return (
                <span className={`effect-stack ${compact ? 'compact-effect' : ''}`}>
                    {primary}
                    {chip}
                </span>
            );
        }

        const targetSymbol = item.target_symbol as keyof typeof SYMBOL_INFO | '';
        const symbolInfo = targetSymbol && targetSymbol in SYMBOL_INFO ? SYMBOL_INFO[targetSymbol] : null;

        if (item.effect_type === ItemEffectType.DirectScoreBonus && symbolInfo) {
            return (
                <span className={`desktop-effect-inline ${compact ? 'compact-effect' : ''}`}>
                    <span>+{item.effect_value}</span>
                    <img
                        src={symbolInfo.image}
                        alt={symbolInfo.name}
                        width={compact ? 16 : 11}
                        height={compact ? 16 : 11}
                        loading="lazy"
                    />
                </span>
            );
        }

        if (item.effect_type === ItemEffectType.SymbolProbabilityBoost && symbolInfo) {
            return (
                <span className={`desktop-effect-inline ${compact ? 'compact-effect' : ''}`}>
                    <span>+{item.effect_value}%</span>
                    <img
                        src={symbolInfo.image}
                        alt={symbolInfo.name}
                        width={compact ? 16 : 11}
                        height={compact ? 16 : 11}
                        loading="lazy"
                    />
                </span>
            );
        }

        return getEffectDetails(item);
    }

    function getRarityColor(rarity: string): string {
        switch (rarity) {
            case 'Legendary': return '#FFD700';
            case 'Epic': return '#A855F7';
            case 'Rare': return '#3B82F6';
            default: return '#9CA3AF';
        }
    }

    function renderDesktopEffect(item: ContractItem, charmInfo?: CharmInfo) {
        if (isCharmItem(item.item_id) && charmInfo) {
            return charmInfo.effect || charmInfo.description;
        }

        return renderEffectDisplay(item);
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
        <div className="inline-market-panel">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>MARKET</span>
                <div className="ticket-balance" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px', color: '#fff' }}>{currentTickets}</span>
                    <img src="/images/ticket.png" alt="Tickets" width={28} height={14} loading="lazy" />
                </div>
            </div>

            <div className="desktop-market-view">
                <div className="desktop-market-grid">
                    {marketItems.map((item, index) => {
                        const isPurchasedSlot = purchasedInCurrentMarket.has(index);
                        const isItemCharm = isCharmItem(item.item_id);
                        const charmInfo = charmInfoMap.get(item.item_id);
                        const itemPrice = getDisplayedPrice(item);
                        const isDesktopOwned =
                            ownedItemIds.has(item.item_id) && !hiddenItemIds.includes(item.item_id);
                        const isDesktopInventoryFull =
                            visibleInventoryCount >= 7 && !isDesktopOwned && !isItemCharm;
                        const canDesktopAfford = currentTickets >= itemPrice;
                        const isDesktopPurchasing = purchasingSlot === index;
                        const canDesktopPurchase =
                            !isDesktopOwned
                            && !isPurchasedSlot
                            && !isDesktopInventoryFull
                            && canDesktopAfford
                            && purchasingSlot === null;
                        const desktopEffect = renderDesktopEffect(item, charmInfo);
                        const desktopImage = isItemCharm && charmInfo
                            ? charmInfo.image
                            : getItemImage(item.item_id);

                        return (
                            <div
                                key={`desktop-${item.item_id}-${index}`}
                                className={`desktop-market-card ${isPurchasedSlot ? 'sold' : ''}`}
                            >
                                <div className="desktop-market-image-frame">
                                    <img
                                        src={desktopImage}
                                        alt={item.name}
                                        width={76}
                                        height={76}
                                        loading="lazy"
                                        style={{
                                            objectFit: 'contain',
                                            filter: isPurchasedSlot ? 'grayscale(100%) opacity(0.3)' : 'none',
                                        }}
                                    />
                                </div>

                                <div className="desktop-market-effect">{desktopEffect}</div>

                                <button
                                    className={`desktop-market-buy buy-btn ${!canDesktopPurchase ? 'disabled' : ''}`}
                                    onClick={() => canDesktopPurchase && handleBuy(index, item)}
                                    disabled={!canDesktopPurchase}
                                >
                                    {isDesktopPurchasing ? '...' : (
                                        isPurchasedSlot ? 'SOLD' :
                                            isDesktopOwned ? 'OWNED' :
                                                isDesktopInventoryFull ? 'FULL' :
                                                    !canDesktopAfford ? (
                                                        <span className="desktop-buy-copy">
                                                            <span>NEED {itemPrice}</span>
                                                            <img src="/images/ticket.png" alt="Tickets" width={18} height={9} loading="lazy" />
                                                        </span>
                                                    ) : (
                                                        <span className="desktop-buy-copy">
                                                            <span>BUY {itemPrice}</span>
                                                            <img src="/images/ticket.png" alt="Tickets" width={18} height={9} loading="lazy" />
                                                        </span>
                                                    )
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>

                <button
                    className="refresh-btn"
                    onClick={handleRefresh}
                    disabled={refreshing || currentScore < refreshCost}
                >
                    <RotateCw className={refreshing ? 'spinning' : ''} size={14} />
                    <span>REFRESH {refreshCost}</span>
                </button>
            </div>

            <div className="mobile-market-view">
                <div className="mobile-market-grid">
                    {marketItems.map((item, index) => {
                        const isPurchasedSlot = purchasedInCurrentMarket.has(index);
                        const isItemCharm = isCharmItem(item.item_id);
                        const charmInfo = charmInfoMap.get(item.item_id);
                        const itemPrice = getDisplayedPrice(item);
                        const isOwned =
                            ownedItemIds.has(item.item_id) && !hiddenItemIds.includes(item.item_id);
                        const isSpinConsumable = item.effect_type === ItemEffectType.SpinBonus;
                        const isInventoryFull =
                            visibleInventoryCount >= 7 && !isOwned && !isItemCharm && !isSpinConsumable;
                        const canAfford = currentTickets >= itemPrice;
                        const isPurchasing = purchasingSlot === index;
                        const canPurchase =
                            !isOwned
                            && !isPurchasedSlot
                            && !isInventoryFull
                            && canAfford
                            && purchasingSlot === null;
                        const mobileImage = isItemCharm && charmInfo
                            ? charmInfo.image
                            : getItemImage(item.item_id);
                        const mobileEffect = isItemCharm && charmInfo
                            ? (charmInfo.effect || charmInfo.description)
                            : renderEffectDisplay(item);

                        return (
                            <div
                                key={`${item.item_id}-${index}`}
                                className={`mobile-market-card ${isPurchasedSlot ? 'sold' : ''}`}
                            >
                                <div className="mobile-market-image-frame">
                                    <img
                                        src={mobileImage}
                                        alt={item.name}
                                        width={88}
                                        height={88}
                                        loading="lazy"
                                        style={{
                                            objectFit: 'contain',
                                            filter: isPurchasedSlot ? 'grayscale(100%) opacity(0.3)' : 'none',
                                        }}
                                    />
                                </div>

                                {isItemCharm && charmInfo?.rarity && (
                                    <div className="mobile-charm-rarity" style={{ color: getRarityColor(charmInfo.rarity) }}>
                                        {charmInfo.rarity.toUpperCase()}
                                    </div>
                                )}

                                <div className="mobile-market-name">{item.name}</div>
                                <div className="mobile-market-effect">{mobileEffect}</div>

                                <button
                                    className={`mobile-market-buy buy-btn ${!canPurchase ? 'disabled' : ''}`}
                                    onClick={() => canPurchase && handleBuy(index, item)}
                                    disabled={!canPurchase}
                                >
                                    {isPurchasing ? '...' : (
                                        isPurchasedSlot ? 'SOLD' :
                                            isOwned ? 'OWNED' :
                                                isInventoryFull ? 'FULL' :
                                                    !canAfford ? (
                                                        <span className="desktop-buy-copy">
                                                            <span>NEED {itemPrice}</span>
                                                            <img src="/images/ticket.png" alt="Tickets" width={18} height={9} loading="lazy" />
                                                        </span>
                                                    ) : (
                                                        <span className="desktop-buy-copy">
                                                            <span>BUY {itemPrice}</span>
                                                            <img src="/images/ticket.png" alt="Tickets" width={18} height={9} loading="lazy" />
                                                        </span>
                                                    )
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>

                <button
                    className="refresh-btn"
                    onClick={handleRefresh}
                    disabled={refreshing || currentScore < refreshCost}
                >
                    <RotateCw className={refreshing ? 'spinning' : ''} size={14} />
                    <span>REFRESH {refreshCost}</span>
                </button>
            </div>

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
    .desktop-market-view {
        display: none;
    }
    .mobile-market-view {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .panel-header {
        font-family: 'PressStart2P', monospace;
        font-size: 11px;
        color: #FF841C;
        text-align: left;
        padding-bottom: 8px;
        border-bottom: 1px solid #FF841C33;
    }
    .ticket-balance {
        background: transparent;
        padding: 0;
    }
    .loading {
        color: #666;
        font-family: 'PressStart2P', monospace;
        font-size: 8px;
        text-align: center;
        padding: 40px 0;
    }
    .mobile-market-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
    }
    .mobile-market-card {
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 132, 28, 0.18);
        border-radius: 14px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-height: 220px;
    }
    .mobile-market-card.sold {
        opacity: 0.8;
    }
    .mobile-market-image-frame {
        min-height: 92px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .mobile-market-name {
        font-family: 'PressStart2P', monospace;
        font-size: 9px;
        color: #fff;
        line-height: 1.5;
        text-align: center;
        min-height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .mobile-market-effect {
        font-family: 'PressStart2P', monospace;
        font-size: 7px;
        line-height: 1.55;
        color: #d2d2d2;
        min-height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
    }
    .mobile-market-effect .desktop-effect-inline,
    .mobile-market-effect .compact-effect {
        color: #fff;
    }
    .mobile-charm-rarity {
        font-family: 'PressStart2P', monospace;
        font-size: 7px;
        text-align: center;
        letter-spacing: 0.08em;
    }
    .mobile-market-buy {
        margin-top: auto;
        min-height: 42px;
        border-radius: 10px;
        font-size: 8px;
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
        background: #FF841C;
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
    .desktop-market-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
    }
    .desktop-market-card {
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 132, 28, 0.18);
        border-radius: 8px;
        padding: 9px;
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-height: 176px;
    }
    .desktop-market-card.sold {
        opacity: 0.82;
    }
    .desktop-market-image-frame {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 82px;
        padding: 2px 0 0;
    }
    .desktop-market-effect {
        font-family: 'PressStart2P', monospace;
        font-size: 7px;
        line-height: 1.55;
        color: #d2d2d2;
        min-height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
    }
    .desktop-effect-inline {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        color: #fff;
    }
    .effect-stack {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        flex-wrap: wrap;
    }
    .compact-effect {
        color: #000;
    }
    .desktop-effect-chip img {
        border-radius: 999px;
    }
    .desktop-market-buy {
        margin-top: auto;
        padding: 7px;
        font-size: 8px;
    }
    .desktop-buy-copy {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
    }
    .spinning {
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    @media (max-width: 1024px) {
        .inline-market-panel {
            width: 100%;
            height: 100%;
            border: none;
            background: transparent;
            padding: 0;
            justify-content: flex-start;
            gap: 12px;
        }
        .mobile-market-view {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            padding-right: 2px;
        }
        .panel-header {
            font-size: 11px;
            padding: 0 0 10px;
            flex: 0 0 auto;
        }
        .buy-btn, .refresh-btn {
            min-height: 50px;
            padding: 14px 15px;
            font-size: 9px;
            border-radius: 12px;
        }
        .mobile-market-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
        }
        .mobile-market-card {
            min-height: 246px;
            padding: 12px;
            gap: 10px;
        }
        .mobile-market-image-frame {
            min-height: 110px;
        }
        .mobile-market-image-frame img {
            width: auto;
            height: auto;
            max-width: min(88%, 112px);
            max-height: 110px;
            object-fit: contain;
        }
        .mobile-market-name {
            font-size: 9px;
            min-height: 34px;
        }
        .mobile-market-effect {
            font-size: 7px;
            min-height: 44px;
        }
    }
    @media (max-width: 420px) {
        .mobile-market-grid {
            gap: 10px;
        }
        .mobile-market-card {
            min-height: 224px;
            padding: 10px;
        }
        .mobile-market-image-frame {
            min-height: 92px;
        }
        .mobile-market-image-frame img {
            max-width: min(86%, 88px);
            max-height: 92px;
        }
        .mobile-market-name {
            font-size: 8px;
            min-height: 28px;
        }
        .mobile-market-effect {
            font-size: 6px;
            min-height: 34px;
        }
    }
    @media (min-width: 1025px) {
        .inline-market-panel {
            width: min(332px, calc(100vw - 40px));
            max-height: calc(100vh - 260px);
            gap: 8px;
        }
        .desktop-market-view {
            display: flex;
            flex-direction: column;
            gap: 8px;
            min-height: 0;
        }
        .mobile-market-view {
            display: none;
        }
        .desktop-market-grid {
            overflow-y: auto;
            padding-right: 2px;
        }
        .desktop-market-grid::-webkit-scrollbar {
            width: 6px;
        }
        .desktop-market-grid::-webkit-scrollbar-thumb {
            background: rgba(255, 132, 28, 0.28);
            border-radius: 999px;
        }
    }
`;
