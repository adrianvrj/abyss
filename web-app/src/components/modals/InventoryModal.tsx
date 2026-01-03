import React, { useState, useEffect } from 'react';
import {
    getSessionItems,
    getItemInfo,
    sellItem,
    ContractItem,
    ItemEffectType
} from '@/utils/abyssContract';
import { getItemImage } from '@/utils/itemImages';
import ModalWrapper from './ModalWrapper';
import Image from 'next/image';
import { FaCoins, FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

interface InventoryModalProps {
    sessionId: number;
    controller: any;
    currentScore: number;
    onClose: () => void;
    onUpdateScore: (newScore: number) => void;
}

export default function InventoryModal({ sessionId, controller, currentScore, onClose, onUpdateScore }: InventoryModalProps) {
    const [loading, setLoading] = useState(true);
    const [ownedItems, setOwnedItems] = useState<ContractItem[]>([]);
    const [sellingItemId, setSellingItemId] = useState<number | null>(null);
    const [currentItemIndex, setCurrentItemIndex] = useState(0);

    useEffect(() => {
        loadInventory();
    }, [sessionId]);

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

    // Slots fixed to 7
    const inventorySlots = [...ownedItems];
    while (inventorySlots.length < 7) {
        inventorySlots.push(null as any);
    }

    async function handleSell(item: ContractItem) {
        if (!confirm(`Sell ${item.name} for ${item.sell_price} pts?`)) return;

        setSellingItemId(item.item_id);
        try {
            await sellItem(sessionId, item.item_id, 1, controller);
            onUpdateScore(currentScore + item.sell_price);
            await loadInventory(); // Reload to remove item
            // Adjust index if needed
            if (currentItemIndex >= ownedItems.length - 1 && currentItemIndex > 0) {
                setCurrentItemIndex(curr => curr - 1);
            }
        } catch (e) {
            console.error("Sell failed", e);
        } finally {
            setSellingItemId(null);
        }
    }

    const handleNext = () => setCurrentItemIndex(prev => (prev + 1) % 7);
    const handlePrev = () => setCurrentItemIndex(prev => (prev - 1 + 7) % 7);

    const currentItem = inventorySlots[currentItemIndex];

    function getEffectDetails(item: ContractItem) {
        return `Effect: ${item.effect_value}`; // Simplified for brevity
    }

    return (
        <ModalWrapper onClose={onClose} title="INVENTORY">
            {loading ? (
                <div className="loading">Loading...</div>
            ) : (
                <div className="inventory-content">
                    <div className="carousel">
                        <button className="nav-arrow" onClick={handlePrev}><FaChevronLeft /></button>

                        <div className="item-card">
                            {currentItem ? (
                                <>
                                    <div className="item-image-container">
                                        <Image
                                            src={getItemImage(currentItem.item_id)}
                                            alt={currentItem.name}
                                            width={150}
                                            height={150}
                                            style={{ objectFit: 'contain' }}
                                        />
                                    </div>
                                    <div className="item-info">
                                        <h3>{currentItem.name}</h3>
                                        <p className="desc">{currentItem.description}</p>
                                    </div>

                                    <button
                                        className="sell-btn"
                                        onClick={() => handleSell(currentItem)}
                                        disabled={!!sellingItemId}
                                    >
                                        {sellingItemId === currentItem.item_id ? "..." : `SELL ${currentItem.sell_price}`}
                                    </button>
                                </>
                            ) : (
                                <div className="empty-slot">EMPTY</div>
                            )}
                        </div>

                        <button className="nav-arrow" onClick={handleNext}><FaChevronRight /></button>
                    </div>

                    <div className="pagination">
                        {currentItemIndex + 1} / 7
                    </div>
                </div>
            )}

            <style jsx>{`
                 .inventory-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }
                .loading {
                    color: #fff;
                    font-family: 'PressStart2P', monospace;
                    text-align: center;
                    margin-top: 40px;
                }
                .carousel {
                    display: flex;
                    align-items: center;
                    gap: 10px;
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
                    height: 380px;
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
                .sell-btn {
                    width: 100%;
                    padding: 12px;
                    background: #333;
                    border: 1px solid #FF4444;
                    color: #FF4444;
                    border-radius: 8px;
                    font-family: 'PressStart2P', monospace;
                    cursor: pointer;
                    font-size: 12px;
                }
                .sell-btn:hover {
                    background: #FF4444;
                    color: #000;
                }
                .empty-slot {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #555;
                    font-family: 'PressStart2P', monospace;
                    font-size: 20px;
                }
                .pagination {
                    margin-top: 15px;
                    color: #666;
                    font-family: 'PressStart2P', monospace;
                    font-size: 10px;
                }
            `}</style>
        </ModalWrapper>
    );
}
