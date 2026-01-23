'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { getCharmDropChance } from '@/utils/abyssContract';

interface GameOverModalProps {
    isVisible: boolean;
    reason: '666' | 'no_spins' | 'scorched' | null;
    finalScore: number;
    totalScore?: number;
    sessionId?: number;
    level?: number;
    chipsClaimed?: boolean;
    onBackToMenu: () => void;
}

export default function GameOverModal({
    isVisible,
    reason,
    finalScore,
    totalScore, // Cumulative score for chips calculation
    sessionId,
    level = 1,
    chipsClaimed = false,
    onBackToMenu
}: GameOverModalProps) {
    // calculate chips from total score (lifetime), fallback to finalScore if not provided
    const scoreForChips = totalScore ?? finalScore;
    const chipsEarned = Math.floor(scoreForChips / 20);
    const [charmChance, setCharmChance] = useState(0);

    useEffect(() => {
        if (isVisible && sessionId) {
            getCharmDropChance(sessionId).then(setCharmChance);
        }
    }, [isVisible, sessionId]);

    const displayChance = charmChance || Math.min(finalScore / 125, 50);

    // MAIN MODAL - Now simplified since chips are auto-claimed and charm detection is in page.tsx
    return (
        <AnimatePresence>
            {isVisible && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 99999,
                }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        style={{
                            background: '#000',
                            border: '1px solid #FF841C',
                            padding: '40px 60px',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '32px',
                            minWidth: '400px',
                            maxWidth: '90vw',
                            position: 'relative'
                        }}
                    >
                        {/* Header */}
                        <h2 style={{
                            fontSize: '24px',
                            color: '#FF841C',
                            fontFamily: "'PressStart2P', monospace",
                            margin: 0,
                            letterSpacing: '2px'
                        }}>
                            GAME OVER
                        </h2>

                        {/* Loss Reason */}
                        <div style={{
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: '12px',
                            color: '#FF4444',
                            textAlign: 'center',
                            marginTop: '-16px'
                        }}>
                            {reason === '666' ? "THE BEAST HAS AWAKENED (666)" :
                                reason === 'no_spins' ? "OUT OF SPINS" :
                                    reason === 'scorched' ? "SESSION ENDED BY RELIC" : ""}
                        </div>

                        {/* Stats Display */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '12px' }}>
                                <span style={{ fontFamily: "'PressStart2P', monospace", fontSize: '10px', color: '#666' }}>FINAL SCORE</span>
                                <span style={{ fontFamily: "'PressStart2P', monospace", fontSize: '14px', color: '#FFF' }}>{finalScore.toLocaleString()}</span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '12px' }}>
                                <span style={{ fontFamily: "'PressStart2P', monospace", fontSize: '10px', color: '#666' }}>$CHIPS EARNED</span>
                                <span style={{ fontFamily: "'PressStart2P', monospace", fontSize: '14px', color: '#4ade80' }}>+{chipsEarned}</span>
                            </div>
                        </div>

                        {/* Return to Menu Button - Always show since auto-claim is done in request_spin */}
                        <button
                            onClick={onBackToMenu}
                            style={{
                                background: '#FF841C',
                                border: 'none',
                                color: '#000',
                                padding: '20px 40px',
                                fontFamily: "'PressStart2P', monospace",
                                fontSize: '14px',
                                cursor: 'pointer',
                                width: '100%',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#FF9944'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#FF841C'}
                        >
                            RETURN TO MENU
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
