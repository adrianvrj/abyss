import { useEffect } from 'react';
import { motion } from 'framer-motion';

interface LuckyScoreBoostAnimationProps {
    totalScore: number;
    luckyBonus: number;
    onComplete: () => void;
}

const sparks = Array.from({ length: 18 }, (_, index) => ({
    id: index,
    left: `${(index * 19) % 100}%`,
    top: `${8 + ((index * 11) % 46)}%`,
    delay: `${(index % 6) * 0.08}s`,
}));

export default function LuckyScoreBoostAnimation({
    totalScore,
    luckyBonus,
    onComplete,
}: LuckyScoreBoostAnimationProps) {
    useEffect(() => {
        const timer = window.setTimeout(onComplete, 1500);
        return () => window.clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 100003,
                pointerEvents: 'none',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.82)',
            }}
        >
            {sparks.map((spark) => (
                <motion.span
                    key={spark.id}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{
                        opacity: [0, 0.95, 0],
                        scale: [0.5, 1.2, 0.7],
                        y: [0, -16, -34],
                    }}
                    transition={{
                        duration: 0.8,
                        delay: Number.parseFloat(spark.delay),
                        ease: 'easeOut',
                    }}
                    style={{
                        position: 'absolute',
                        left: spark.left,
                        top: spark.top,
                        width: '8px',
                        height: '8px',
                        borderRadius: '999px',
                        background: '#FFD54A',
                        boxShadow: '0 0 10px #FFD54A, 0 0 24px rgba(255, 132, 28, 0.8)',
                    }}
                />
            ))}

            <motion.div
                initial={{ scale: 0.88, y: 14, opacity: 0 }}
                animate={{ scale: [0.88, 1.03, 1], y: [14, -4, 0], opacity: 1 }}
                transition={{ duration: 0.42, ease: 'easeOut' }}
                style={{
                    minWidth: 'min(88vw, 520px)',
                    padding: '22px 26px',
                    border: '3px solid rgba(255, 132, 28, 0.95)',
                    borderRadius: '18px',
                    background: '#120700',
                    boxShadow:
                        '0 0 0 2px rgba(255, 213, 74, 0.22), 0 18px 55px rgba(0, 0, 0, 0.72), 0 0 34px rgba(255, 132, 28, 0.25)',
                    textAlign: 'center',
                    fontFamily: "'PressStart2P', monospace",
                    color: '#FF841C',
                }}
            >
                <motion.div
                    animate={{ letterSpacing: ['0.08em', '0.13em', '0.08em'] }}
                    transition={{ duration: 0.9, repeat: 1, repeatType: 'mirror' }}
                    style={{
                        fontSize: 'clamp(13px, 2.4vw, 18px)',
                        lineHeight: 1.5,
                        textShadow: '0 0 12px rgba(255, 132, 28, 0.55)',
                    }}
                >
                    LUCKY THE DEALER
                </motion.div>

                <div
                    style={{
                        marginTop: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        alignItems: 'center',
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.16, duration: 0.24 }}
                        style={{
                            fontSize: 'clamp(22px, 5vw, 38px)',
                            color: '#FFD54A',
                            textShadow: '0 0 14px rgba(255, 213, 74, 0.6)',
                        }}
                    >
                        +{luckyBonus}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.26, duration: 0.2 }}
                        style={{
                            fontSize: 'clamp(10px, 1.9vw, 14px)',
                            color: 'rgba(255, 132, 28, 0.9)',
                        }}
                    >
                        BONUS FROM LUCKY
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.34, duration: 0.24 }}
                        style={{
                            marginTop: '6px',
                            fontSize: 'clamp(11px, 2vw, 15px)',
                            color: '#F4E8C2',
                        }}
                    >
                        SPIN TOTAL {totalScore}
                    </motion.div>
                </div>
            </motion.div>
        </motion.div>
    );
}
