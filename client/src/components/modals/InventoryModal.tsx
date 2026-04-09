import { useState, useEffect } from 'react';
import { getSessionItems, getItemInfo, ContractItem } from '@/utils/abyssContract';
import { getItemImage } from '@/utils/itemImages';
import ModalWrapper from './ModalWrapper';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAbyssGame } from '@/hooks/useAbyssGame';
import { useAccount } from '@starknet-react/core';

interface InventoryModalProps {
    sessionId: number;
    currentScore: number;
    onClose: () => void;
    onUpdateScore: (newScore: number) => void;
}

export default function InventoryModal({ sessionId, currentScore, onClose, onUpdateScore }: InventoryModalProps) {
    const { account } = useAccount();
    const { sellItem } = useAbyssGame(account);

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

    const inventorySlots = [...ownedItems];
    while (inventorySlots.length < 7) {
        inventorySlots.push(null as any);
    }

    async function handleSell(item: ContractItem) {
        if (!confirm(`Sell ${item.name} for ${item.sell_price} pts?`)) return;

        setSellingItemId(item.item_id);
        try {
            await sellItem(sessionId, item.item_id);
            onUpdateScore(currentScore + item.sell_price);
            await loadInventory();
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

    return (
        <ModalWrapper onClose={onClose} title="INVENTORY">
            {loading ? (
                <div className="inv-loading">Loading...</div>
            ) : (
                <div className="inv-content">
                    <div className="inv-carousel">
                        <button className="inv-nav-arrow" onClick={handlePrev}><ChevronLeft /></button>

                        <div className="inv-item-card">
                            {currentItem ? (
                                <>
                                    <div>
                                        <img
                                            src={getItemImage(currentItem.item_id)}
                                            alt={currentItem.name}
                                            width={150}
                                            height={150}
                                            style={{ objectFit: 'contain' }}
                                        />
                                    </div>
                                    <div className="inv-item-info">
                                        <h3>{currentItem.name}</h3>
                                        <p className="inv-desc">{currentItem.description}</p>
                                    </div>

                                    <button
                                        className="inv-sell-btn"
                                        onClick={() => handleSell(currentItem)}
                                        disabled={!!sellingItemId}
                                    >
                                        {sellingItemId === currentItem.item_id ? "..." : `SELL ${currentItem.sell_price}`}
                                    </button>
                                </>
                            ) : (
                                <div className="inv-empty-slot">EMPTY</div>
                            )}
                        </div>

                        <button className="inv-nav-arrow" onClick={handleNext}><ChevronRight /></button>
                    </div>

                    <div className="inv-pagination">
                        {currentItemIndex + 1} / 7
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                .inv-content { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                .inv-loading { color: #fff; font-family: 'PressStart2P', monospace; text-align: center; margin-top: 40px; }
                .inv-carousel { display: flex; align-items: center; gap: 10px; }
                .inv-nav-arrow { background: none; border: none; color: #FF841C; font-size: 24px; cursor: pointer; }
                .inv-item-card { background: rgba(0,0,0,0.6); border: 2px solid #FF841C; border-radius: 12px; padding: 20px; width: 280px; height: 380px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; }
                .inv-item-info { text-align: center; color: #fff; }
                .inv-item-info h3 { font-family: 'PressStart2P', monospace; font-size: 14px; color: #FF841C; margin-bottom: 10px; }
                .inv-desc { font-size: 12px; margin-bottom: 10px; color: #ccc; }
                .inv-sell-btn { width: 100%; padding: 12px; background: #333; border: 1px solid #FF4444; color: #FF4444; border-radius: 8px; font-family: 'PressStart2P', monospace; cursor: pointer; font-size: 12px; }
                .inv-sell-btn:hover { background: #FF4444; color: #000; }
                .inv-empty-slot { flex: 1; display: flex; align-items: center; justify-content: center; color: #555; font-family: 'PressStart2P', monospace; font-size: 20px; }
                .inv-pagination { margin-top: 15px; color: #666; font-family: 'PressStart2P', monospace; font-size: 10px; }
            ` }} />
        </ModalWrapper>
    );
}
