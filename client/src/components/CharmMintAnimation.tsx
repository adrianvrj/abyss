import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CharmMintAnimationProps {
    charmId: number;
    charmName: string;
    charmImage: string;
    rarity: string;
    chipRewardAmount?: number;
    onComplete: () => void;
}

function getCharmChipRewardAmount(rarity: string) {
    switch (rarity.toLowerCase()) {
        case 'common':
            return 60;
        case 'rare':
            return 240;
        case 'epic':
            return 800;
        case 'legendary':
            return 1500;
        default:
            return 0;
    }
}

export default function CharmMintAnimation({
    charmName,
    charmImage,
    rarity,
    chipRewardAmount,
    onComplete
}: CharmMintAnimationProps) {
    const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');
    const rewardAmount = chipRewardAmount ?? getCharmChipRewardAmount(rarity);

    useEffect(() => {
        const holdTimer = setTimeout(() => setPhase('hold'), 600);
        return () => clearTimeout(holdTimer);
    }, []);

    const handleClick = () => {
        if (phase === 'hold') {
            setPhase('exit');
        }
    };

    return (
        <AnimatePresence>
            <div
                onClick={handleClick}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100002,
                    background: 'rgba(0, 0, 0, 0.9)',
                    cursor: phase === 'hold' ? 'pointer' : 'default',
                }}
            >
                <motion.div
                    initial={{ y: '100vh', scale: 0.5 }}
                    animate={{
                        y: phase === 'exit' ? '-100vh' : 0,
                        scale: phase === 'hold' ? 1.2 : 1,
                    }}
                    transition={{
                        type: 'spring',
                        stiffness: 150,
                        damping: 24,
                        duration: 0.6
                    }}
                    onAnimationComplete={() => {
                        if (phase === 'exit') onComplete();
                    }}
                    style={{
                        position: 'relative',
                        width: '300px',
                        height: '300px',
                        marginBottom: '40px',
                    }}
                >
                    <img
                        src={charmImage}
                        alt={charmName}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                        }}
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                        opacity: phase === 'hold' ? 1 : 0,
                        y: phase === 'hold' ? 0 : 20,
                    }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                    style={{
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        color: '#fff',
                        fontFamily: "'PressStart2P', monospace",
                    }}
                >
                    <div style={{
                        fontSize: '14px',
                        color: '#888',
                        letterSpacing: '2px',
                    }}>
                        YOU DISCOVERED A SOUL CHARM
                    </div>

                    <div style={{
                        fontSize: '24px',
                        color: '#A78BFA',
                        textTransform: 'uppercase',
                        lineHeight: '1.4',
                    }}>
                        {charmName}
                    </div>

                    {rewardAmount > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.92 }}
                            animate={{
                                opacity: phase === 'hold' ? 1 : 0,
                                y: phase === 'hold' ? 0 : 10,
                                scale: phase === 'hold' ? 1 : 0.92,
                            }}
                            transition={{ delay: 0.72, duration: 0.35 }}
                            style={{
                                alignSelf: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '10px 14px',
                                border: '1px solid rgba(255, 132, 28, 0.65)',
                                borderRadius: '6px',
                                background: 'rgba(255, 132, 28, 0.08)',
                                color: '#FFD36A',
                                fontSize: '12px',
                                lineHeight: 1.4,
                                boxShadow: '0 0 26px rgba(255, 132, 28, 0.16)',
                            }}
                        >
                            <span style={{ color: 'rgba(255,255,255,0.45)' }}>+</span>
                            <span>{rewardAmount.toLocaleString()} CHIP</span>
                        </motion.div>
                    )}

                    <div style={{
                        fontSize: '10px',
                        color: '#666',
                        marginTop: '32px',
                        animation: 'blink 1.5s infinite',
                    }}>
                        CLICK ANYWHERE TO CONTINUE
                    </div>
                </motion.div>

                <style dangerouslySetInnerHTML={{ __html: `
                    @keyframes blink {
                        0%, 100% { opacity: 0.4; }
                        50% { opacity: 1; }
                    }
                ` }} />
            </div>
        </AnimatePresence>
    );
}
