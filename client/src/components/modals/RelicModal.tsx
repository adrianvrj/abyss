import ModalWrapper from './ModalWrapper';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface OwnedRelic {
    tokenId: bigint;
    relicId: number;
    name: string;
    cooldown: number;
}

interface RelicModalProps {
    ownedRelics: OwnedRelic[];
    equippedRelic: OwnedRelic | null;
    relicIndex: number;
    isEquippingRelic: boolean;
    onClose: () => void;
    onSetRelicIndex: (index: number) => void;
    onEquipRelic: (relic: OwnedRelic) => Promise<void>;
}

const RELIC_DATA: Record<number, { effect: string; flavor: string; rarity: string; rarityColor: string }> = {
    1: {
        effect: 'FORCE RANDOM JACKPOT',
        flavor: 'Bends the next spin toward a loaded miracle.',
        rarity: 'MYTHIC',
        rarityColor: '#FF4444',
    },
    2: {
        effect: 'RESET TO MAX SPINS',
        flavor: 'Pulls the run backward and restores its breath.',
        rarity: 'MYTHIC',
        rarityColor: '#FF4444',
    },
    3: {
        effect: '5X NEXT SPIN SCORE',
        flavor: 'Turns the next score event into a payday.',
        rarity: 'LEGENDARY',
        rarityColor: '#FFD700',
    },
    4: {
        effect: 'END SESSION NOW',
        flavor: 'Locks the run where it stands and secures the score.',
        rarity: 'LEGENDARY',
        rarityColor: '#FFD700',
    },
    5: {
        effect: 'FREE MARKET REFRESH',
        flavor: 'Rips open the market once without cost.',
        rarity: 'LEGENDARY',
        rarityColor: '#FFD700',
    },
};

export default function RelicModal({
    ownedRelics,
    equippedRelic,
    relicIndex,
    isEquippingRelic,
    onClose,
    onSetRelicIndex,
    onEquipRelic,
}: RelicModalProps) {
    const handlePrev = () => onSetRelicIndex((relicIndex - 1 + ownedRelics.length) % ownedRelics.length);
    const handleNext = () => onSetRelicIndex((relicIndex + 1) % ownedRelics.length);

    const currentRelic = ownedRelics[relicIndex];
    const relicData = currentRelic ? RELIC_DATA[currentRelic.relicId] : null;
    const isEquipped = equippedRelic?.tokenId === currentRelic?.tokenId;
    const isRelicSlotLocked = Boolean(equippedRelic);
    const isEquipDisabled = !currentRelic || isEquipped || isRelicSlotLocked || isEquippingRelic;

    return (
        <ModalWrapper onClose={onClose} title="RELICS" maxWidth={420}>
            {ownedRelics.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <p style={{ color: '#555', fontFamily: "'PressStart2P', monospace", fontSize: '14px', margin: 0 }}>EMPTY</p>
                    <p style={{ color: '#888', fontFamily: "'PressStart2P', monospace", fontSize: '10px', marginTop: '16px', lineHeight: 1.8 }}>
                        MINT RELICS IN THE SHOP
                    </p>
                </div>
            ) : (
                <div className="relic-modal-layout">
                    <div className="relic-carousel">
                        <button className="relic-nav-arrow" onClick={handlePrev}><ChevronLeft /></button>

                        <div className="relic-card">
                            {currentRelic && relicData && (
                                <>
                                    <div className="relic-card-top">
                                        <div
                                            className="relic-rarity-pill"
                                            style={{
                                                background: relicData.rarityColor,
                                                color: '#000',
                                            }}
                                        >
                                            {relicData.rarity}
                                        </div>

                                        {isEquipped && (
                                            <div className="relic-state-pill relic-state-pill--equipped">EQUIPPED</div>
                                        )}
                                    </div>

                                    <div className="relic-image-frame">
                                        <img
                                            src={`/images/relics/${currentRelic.name.toLowerCase().replace(/ /g, '_')}.png`}
                                            alt={currentRelic.name}
                                            className="relic-image"
                                        />
                                    </div>

                                    <div className="relic-main-info">
                                        <h3>{currentRelic.name}</h3>
                                        <p className="relic-effect">{relicData.effect}</p>
                                        <p className="relic-flavor">{relicData.flavor}</p>
                                    </div>

                                    <div className="relic-meta-grid">
                                        <div className="relic-meta-box">
                                            <span className="relic-meta-label">COOLDOWN</span>
                                            <span className="relic-meta-value">{currentRelic.cooldown} SPINS</span>
                                        </div>
                                        <div className="relic-meta-box">
                                            <span className="relic-meta-label">TOKEN</span>
                                            <span className="relic-meta-value">#{currentRelic.tokenId.toString().slice(-6)}</span>
                                        </div>
                                    </div>

                                    <div className="relic-status-box">
                                        {isEquipped
                                            ? 'THIS RELIC IS ALREADY BOUND TO THE SESSION.'
                                            : isRelicSlotLocked
                                                ? 'ANOTHER RELIC ALREADY SEALED THE SESSION SLOT.'
                                                : 'YOU CAN STILL BIND THIS RELIC TO THE CURRENT RUN.'}
                                    </div>

                                    <button
                                        className={`relic-equip-btn ${isEquipDisabled ? 'disabled' : ''}`}
                                        onClick={() => currentRelic && onEquipRelic(currentRelic)}
                                        disabled={isEquipDisabled}
                                    >
                                        {isEquippingRelic
                                            ? '...'
                                            : isEquipped
                                                ? 'EQUIPPED'
                                                : isRelicSlotLocked
                                                    ? 'LOCKED'
                                                    : 'EQUIP'}
                                    </button>
                                </>
                            )}
                        </div>

                        <button className="relic-nav-arrow" onClick={handleNext}><ChevronRight /></button>
                    </div>

                    <div className="relic-pagination">
                        {relicIndex + 1} / {ownedRelics.length}
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                .relic-modal-layout { display: flex; flex-direction: column; align-items: center; gap: 12px; }
                .relic-carousel { display: flex; align-items: center; gap: 10px; width: 100%; justify-content: center; }
                .relic-nav-arrow { background: none; border: none; color: #FF841C; font-size: 24px; cursor: pointer; padding: 6px; }
                .relic-card {
                    background: rgba(0,0,0,0.6);
                    border: 2px solid #FF841C;
                    border-radius: 12px;
                    padding: 16px;
                    width: 290px;
                    min-height: 430px;
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }
                .relic-card-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    min-height: 20px;
                }
                .relic-rarity-pill, .relic-state-pill {
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-family: 'PressStart2P', monospace;
                    font-size: 8px;
                    line-height: 1;
                }
                .relic-state-pill--equipped {
                    background: #4ADE80;
                    color: #000;
                }
                .relic-image-frame {
                    height: 140px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255,132,28,0.06);
                    border: 1px solid rgba(255,132,28,0.2);
                    border-radius: 10px;
                }
                .relic-image {
                    max-width: 120px;
                    max-height: 120px;
                    object-fit: contain;
                }
                .relic-main-info h3 {
                    font-family: 'PressStart2P', monospace;
                    font-size: 13px;
                    color: #FF841C;
                    margin: 0 0 10px;
                    line-height: 1.5;
                    text-align: center;
                }
                .relic-effect {
                    font-family: 'PressStart2P', monospace;
                    font-size: 9px;
                    color: #FFD700;
                    text-align: center;
                    margin: 0 0 10px;
                    line-height: 1.7;
                }
                .relic-flavor {
                    font-family: 'PressStart2P', monospace;
                    font-size: 8px;
                    color: #AAA;
                    text-align: center;
                    margin: 0;
                    line-height: 1.8;
                }
                .relic-meta-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 8px;
                }
                .relic-meta-box {
                    background: #111;
                    border: 1px solid rgba(255,132,28,0.18);
                    border-radius: 8px;
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .relic-meta-label {
                    font-family: 'PressStart2P', monospace;
                    font-size: 7px;
                    color: #666;
                }
                .relic-meta-value {
                    font-family: 'PressStart2P', monospace;
                    font-size: 8px;
                    color: #FFF;
                    line-height: 1.6;
                }
                .relic-status-box {
                    background: #111;
                    border: 1px solid rgba(255,132,28,0.18);
                    border-radius: 8px;
                    padding: 10px;
                    font-family: 'PressStart2P', monospace;
                    font-size: 7px;
                    color: #888;
                    line-height: 1.8;
                    text-align: center;
                    min-height: 54px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .relic-equip-btn {
                    width: 100%;
                    padding: 12px;
                    background: #FF841C;
                    border: none;
                    border-radius: 8px;
                    font-family: 'PressStart2P', monospace;
                    cursor: pointer;
                    font-size: 11px;
                    color: #000;
                }
                .relic-equip-btn.disabled {
                    background: #333;
                    color: #888;
                    border: 1px solid #555;
                    cursor: not-allowed;
                }
                .relic-pagination {
                    color: #666;
                    font-family: 'PressStart2P', monospace;
                    font-size: 10px;
                }
            ` }} />
        </ModalWrapper>
    );
}
