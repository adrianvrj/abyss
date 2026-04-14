import { AnimatePresence, motion } from 'framer-motion';
import type { ContractItem } from '@/utils/abyssContract';
import { getItemImage } from '@/utils/itemImages';

interface GameOverModalProps {
    isVisible: boolean;
    reason: '666' | 'no_spins' | 'scorched' | null;
    finalScore: number;
    totalScore?: number;
    chipsEarned?: number;
    buildItems?: ContractItem[];
    sessionId?: number;
    level?: number;
    chipsClaimed?: boolean;
    onBackToMenu: () => void;
    practiceMode?: boolean;
    onPlayAgain?: () => void;
}

export default function GameOverModal({
    isVisible,
    finalScore,
    totalScore,
    chipsEarned,
    buildItems = [],
    onBackToMenu,
    practiceMode = false,
    onPlayAgain,
}: GameOverModalProps) {
    const scoreForChips = totalScore ?? finalScore;
    const displayedChipsEarned = chipsEarned ?? Math.floor(scoreForChips / 20);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        zIndex: 99999,
                        background: '#0a0400',
                        padding: '6vh 24px 5vh',
                        boxSizing: 'border-box',
                    }}
                >
                    {/* Top: Title */}
                    <h2 style={{
                        fontSize: 'clamp(32px, 8vw, 72px)',
                        color: '#FF841C',
                        fontFamily: "'Ramagothic', 'PressStart2P', monospace",
                        fontWeight: 'bold',
                        margin: 0,
                        textAlign: 'center',
                        lineHeight: 1,
                        letterSpacing: '0.04em',
                    }}>
                        GAME OVER
                    </h2>

                    {/* Center: Score + Chips + Items + Back */}
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '28px',
                        width: '100%',
                    }}>
                        <div style={{
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: 'clamp(10px, 1.5vw, 14px)',
                            color: '#FF841C',
                            textAlign: 'center',
                            letterSpacing: '0.1em',
                        }}>
                            SCORE: {finalScore.toLocaleString()}
                        </div>
                        <div style={{
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: 'clamp(10px, 1.5vw, 14px)',
                            color: '#FF841C',
                            textAlign: 'center',
                            letterSpacing: '0.1em',
                        }}>
                            {practiceMode ? 'NO ONCHAIN REWARDS IN PRACTICE' : `CHIPS EARNED: ${displayedChipsEarned}`}
                        </div>

                        {/* Items row */}
                        {buildItems.length > 0 ? (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 'clamp(16px, 3vw, 32px)',
                                flexWrap: 'wrap',
                                maxWidth: '900px',
                                marginTop: '12px',
                            }}>
                                {buildItems.map((item, i) => (
                                    <motion.img
                                        key={item.item_id}
                                        src={item.image || getItemImage(item.item_id)}
                                        alt={item.name}
                                        width={88}
                                        height={88}
                                        loading="lazy"
                                        animate={{
                                            y: [0, -10 - (i % 3) * 4, 0],
                                        }}
                                        transition={{
                                            duration: 2.5 + (i % 4) * 0.4,
                                            repeat: Infinity,
                                            ease: 'easeInOut',
                                            delay: i * 0.2,
                                        }}
                                        style={{
                                            objectFit: 'contain',
                                            imageRendering: 'pixelated',
                                        }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div style={{
                                fontFamily: "'PressStart2P', monospace",
                                fontSize: '9px',
                                color: '#FF841C',
                                opacity: 0.5,
                                letterSpacing: '0.1em',
                            }}>
                                NO ITEMS SURVIVED THIS RUN
                            </div>
                        )}

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '10px',
                            marginTop: '8px',
                        }}>
                            {practiceMode && onPlayAgain && (
                                <button
                                    onClick={onPlayAgain}
                                    style={{
                                        background: '#FF841C',
                                        border: '2px solid #FF841C',
                                        color: '#000',
                                        padding: '12px 24px',
                                        fontFamily: "'PressStart2P', monospace",
                                        fontSize: 'clamp(10px, 1.4vw, 13px)',
                                        cursor: 'pointer',
                                        letterSpacing: '0.1em',
                                    }}
                                >
                                    PLAY AGAIN
                                </button>
                            )}

                            <button
                                onClick={onBackToMenu}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#FF841C',
                                    padding: '12px 24px',
                                    fontFamily: "'PressStart2P', monospace",
                                    fontSize: 'clamp(10px, 1.4vw, 13px)',
                                    cursor: 'pointer',
                                    letterSpacing: '0.1em',
                                    textDecoration: 'underline',
                                    textUnderlineOffset: '6px',
                                    textDecorationColor: 'rgba(255,132,28,0.4)',
                                }}
                            >
                                BACK TO MENU &gt;
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
