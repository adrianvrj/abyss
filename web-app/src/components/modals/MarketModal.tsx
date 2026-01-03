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
import ModalWrapper from './ModalWrapper';
import Image from 'next/image';
import { FaRotate, FaCoins, FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

interface MarketModalProps {
    sessionId: number;
    controller: any; // Account/Controller
    currentScore: number;
    onClose: () => void;
    onUpdateScore: (newScore: number) => void;
}

export default function MarketModal({ sessionId, controller, currentScore, onClose, onUpdateScore }: MarketModalProps) {
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
        loadMarketData();
    }, [sessionId]);

    async function loadMarketData(forceRefresh = false) {
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

    // Refresh Cost Calculation
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
            await loadMarketData(true);
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
        } catch (e) {
            console.error("Purchase failed", e);
        } finally {
            setPurchasingSlot(null);
        }
    }

    // Helpers
    const handleNext = () => setCurrentItemIndex(prev => (prev + 1) % marketItems.length);
    const handlePrev = () => setCurrentItemIndex(prev => (prev - 1 + marketItems.length) % marketItems.length);

    const currentItem = marketItems[currentItemIndex];
    const currentSlot = currentItemIndex + 1;
    const isOwned = currentItem ? ownedItemIds.has(currentItem.item_id) : false;
    const wasPurchased = purchasedInCurrentMarket.has(currentSlot);
    const isInventoryFull = inventoryCount >= 7 && !isOwned;
    const canAfford = currentItem ? currentScore >= currentItem.price : false;
    const canPurchase = currentItem && !isOwned && !wasPurchased && !isInventoryFull && canAfford && !purchasingSlot;

    // Effect details helper
    function getEffectDetails(item: ContractItem): string {
        const val = item.effect_value;
        switch (item.effect_type) {
            case ItemEffectType.DirectScoreBonus: return `+${val} pts to ${item.target_symbol}`;
            case ItemEffectType.SymbolProbabilityBoost: return `+${val}% chance ${item.target_symbol}`;
            case ItemEffectType.PatternMultiplierBoost: return `+${val}% patterns`;
            case ItemEffectType.ScoreMultiplier: return `+${val}% score`;
            case ItemEffectType.SpinBonus: return `+${val} spins`;
            case ItemEffectType.LevelProgressionBonus: return `-${val}% level req`;
            default: return "Unknown";
        }
    }

    return (
        <ModalWrapper onClose={onClose}>
            {/* Header / Top Bar */}
            <div className="market-header">
                <div className="balance-box">
                    <span>{currentScore}</span>
                    <FaCoins color="#FFEA00" />
                </div>
                <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing || currentScore < refreshCost}>
                    {refreshing ? "..." : <><FaRotate /> {refreshCost}</>}
                </button>
            </div>

            {loading ? (
                <div className="loading">Loading Market...</div>
            ) : (
                <div className="market-content">
                    {/* Item Display */}
                    <div className="carousel">
                        <button className="nav-arrow" onClick={handlePrev}><FaChevronLeft /></button>

                        <div className="item-card">
                            {wasPurchased ? (
                                <div className="sold-out">
                                    <div className="sold-text">SOLD</div>
                                </div>
                            ) : (
                                <>
                                    <div className="item-image-container">
                                        <Image
                                            src={getItemImage(currentItem?.item_id || 1)}
                                            alt={currentItem?.name || "Item"}
                                            width={150}
                                            height={150}
                                            style={{ objectFit: 'contain' }}
                                        />
                                    </div>
                                    <div className="item-info">
                                        <h3>{currentItem?.name}</h3>
                                        <p className="desc">{currentItem?.description}</p>
                                        <div className="effect-badge">{getEffectDetails(currentItem!)}</div>
                                    </div>

                                    <button
                                        className={`buy-btn ${!canPurchase ? 'disabled' : ''}`}
                                        onClick={() => canPurchase && handleBuy(currentSlot, currentItem!)}
                                        disabled={!canPurchase}
                                    >
                                        {purchasingSlot === currentSlot ? "..." : (
                                            isOwned ? "OWNED" :
                                                isInventoryFull ? "FULL" :
                                                    (!canAfford ? "NEED POINTS" : `${currentItem?.price} PTS`)
                                        )}
                                    </button>
                                </>
                            )}
                        </div>

                        <button className="nav-arrow" onClick={handleNext}><FaChevronRight /></button>
                    </div>

                    <div className="pagination">
                        {currentSlot} / {marketItems.length}
                    </div>
                </div>
            )}

            <style jsx>{`
                .market-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 20px;
                }
                .balance-box {
                    font-family: 'PressStart2P', monospace;
                    color: #FF841C;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                }
                .refresh-btn {
                    background: #333;
                    border: 1px solid #FF841C;
                    color: #FF841C;
                    padding: 8px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-family: 'PressStart2P', monospace;
                    font-size: 10px;
                }
                .market-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .carousel {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    width: 100%;
                    justify-content: center;
                }
                .nav-arrow {
                    background: none;
                    border: none;
                    color: #FF841C;
                    font-size: 24px;
                    cursor: pointer;
                }
                .item-card {
                    background: rgba(0,0,0,0.6);
                    border: 2px solid #FF841C;
                    border-radius: 12px;
                    padding: 20px;
                    width: 280px;
                    height: 400px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: space-between;
                }
                .item-info {
                    text-align: center;
                    color: #fff;
                }
                .item-info h3 {
                    font-family: 'PressStart2P', monospace;
                    font-size: 14px;
                    color: #FF841C;
                    margin-bottom: 10px;
                }
                .desc {
                    font-size: 12px;
                    margin-bottom: 10px;
                    color: #ccc;
                }
                .effect-badge {
                    background: #FF841C;
                    color: #000;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: bold;
                    display: inline-block;
                }
                .buy-btn {
                    width: 100%;
                    padding: 12px;
                    background: #FF841C;
                    border: none;
                    border-radius: 8px;
                    font-family: 'PressStart2P', monospace;
                    cursor: pointer;
                    font-size: 12px;
                    color: #000;
                }
                .buy-btn.disabled {
                    background: #555;
                    cursor: not-allowed;
                    color: #888;
                }
                .pagination {
                    margin-top: 10px;
                    color: #666;
                    font-family: 'PressStart2P', monospace;
                    font-size: 10px;
                }
                .sold-out {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #555;
                    font-family: 'PressStart2P', monospace;
                    font-size: 24px;
                }
                .loading {
                    color: #fff;
                    font-family: 'PressStart2P', monospace;
                    text-align: center;
                    margin-top: 40px;
                }
            `}</style>
        </ModalWrapper>
    );
}
