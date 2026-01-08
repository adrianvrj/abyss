'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface GameOverModalProps {
    isVisible: boolean;
    reason: '666' | 'no_spins' | null;
    finalScore: number;
    onBackToMenu: () => void;
}

export default function GameOverModal({
    isVisible,
    reason,
    finalScore,
    onBackToMenu
}: GameOverModalProps) {
    const chipsEarned = Math.floor(finalScore / 20);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 99999,
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        style={{
                            background: '#000',
                            border: '3px solid #FF841C',
                            borderRadius: '12px',
                            padding: '60px 120px',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '40px',
                        }}
                    >
                        <h1 style={{
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: '28px',
                            color: '#FF4848',
                            margin: 0,
                        }}>
                            GAME OVER
                        </h1>
                        <p style={{
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: '12px',
                            color: '#FF4848',
                            margin: 0,
                        }}>
                            {reason === '666' ? '666 triggered' : 'no more spins left'}
                        </p>
                        <p style={{
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: '16px',
                            color: '#FFD700',
                            margin: 0,
                        }}>
                            +{chipsEarned} $CHIPS
                        </p>
                        <button
                            onClick={onBackToMenu}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                fontFamily: "'PressStart2P', monospace",
                                fontSize: '14px',
                                color: '#fff',
                                cursor: 'pointer',
                                marginTop: '16px',
                            }}
                        >
                            &gt; back to menu
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
