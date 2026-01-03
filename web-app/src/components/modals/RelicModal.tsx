"use client";

import React from 'react';
import ModalWrapper from './ModalWrapper';
import Image from 'next/image';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

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

const RELIC_EFFECTS: Record<number, string> = {
    1: 'Force Random Jackpot',
    2: 'Reset Spins to 5',
    3: 'Double Next Spin',
    4: 'Trigger 666',
    5: 'Free Market Refresh',
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
    const handlePrev = () => {
        onSetRelicIndex((relicIndex - 1 + ownedRelics.length) % ownedRelics.length);
    };

    const handleNext = () => {
        onSetRelicIndex((relicIndex + 1) % ownedRelics.length);
    };

    const currentRelic = ownedRelics[relicIndex];
    const isEquipped = equippedRelic?.tokenId === currentRelic?.tokenId;

    return (
        <ModalWrapper onClose={onClose} title="RELICS">
            {ownedRelics.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <p style={{
                        color: '#555',
                        fontFamily: "'PressStart2P', monospace",
                        fontSize: '14px',
                        margin: 0,
                    }}>EMPTY</p>
                    <p style={{
                        color: '#888',
                        fontFamily: "'PressStart2P', monospace",
                        fontSize: '10px',
                        marginTop: '16px',
                    }}>Mint relics in the shop!</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            onClick={handlePrev}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#FF841C',
                                fontSize: '24px',
                                cursor: 'pointer',
                                padding: '8px',
                            }}
                        >
                            <FaChevronLeft />
                        </button>

                        <div style={{
                            background: 'rgba(0,0,0,0.6)',
                            border: '2px solid #FF841C',
                            borderRadius: '12px',
                            padding: '20px',
                            width: '260px',
                            minHeight: '340px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}>
                            {currentRelic && (
                                <>
                                    <div style={{
                                        width: '120px',
                                        height: '120px',
                                        position: 'relative',
                                        marginBottom: '16px',
                                    }}>
                                        <Image
                                            src={`/images/relics/${currentRelic.name.toLowerCase().replace(/ /g, '_')}.png`}
                                            alt={currentRelic.name}
                                            fill
                                            style={{ objectFit: 'contain' }}
                                        />
                                    </div>
                                    <h3 style={{
                                        fontFamily: "'PressStart2P', monospace",
                                        fontSize: '12px',
                                        color: '#FF841C',
                                        marginBottom: '10px',
                                        textAlign: 'center',
                                    }}>
                                        {currentRelic.name}
                                    </h3>
                                    <p style={{
                                        fontSize: '11px',
                                        color: '#ccc',
                                        marginBottom: '8px',
                                        textAlign: 'center',
                                    }}>
                                        {RELIC_EFFECTS[currentRelic.relicId] || 'Special Effect'}
                                    </p>
                                    <p style={{
                                        fontSize: '10px',
                                        color: '#888',
                                        marginBottom: '20px',
                                    }}>
                                        Cooldown: {currentRelic.cooldown} spins
                                    </p>
                                    <button
                                        onClick={() => onEquipRelic(currentRelic)}
                                        disabled={isEquipped || isEquippingRelic}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            background: isEquipped ? '#333' : '#FF841C',
                                            border: isEquipped ? '1px solid #555' : 'none',
                                            color: isEquipped ? '#888' : '#000',
                                            borderRadius: '8px',
                                            fontFamily: "'PressStart2P', monospace",
                                            cursor: isEquipped ? 'default' : 'pointer',
                                            fontSize: '12px',
                                        }}
                                    >
                                        {isEquippingRelic ? '...' : isEquipped ? 'EQUIPPED' : 'EQUIP'}
                                    </button>
                                </>
                            )}
                        </div>

                        <button
                            onClick={handleNext}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#FF841C',
                                fontSize: '24px',
                                cursor: 'pointer',
                                padding: '8px',
                            }}
                        >
                            <FaChevronRight />
                        </button>
                    </div>

                    <div style={{
                        marginTop: '15px',
                        color: '#666',
                        fontFamily: "'PressStart2P', monospace",
                        fontSize: '10px',
                    }}>
                        {relicIndex + 1} / {ownedRelics.length}
                    </div>
                </div>
            )}
        </ModalWrapper>
    );
}
