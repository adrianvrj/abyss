import { useEffect } from 'react';
import { motion } from 'framer-motion';

interface DemonicScoreResetAnimationProps {
    previousScore: number;
    onComplete: () => void;
}

const embers = Array.from({ length: 22 }, (_, index) => ({
    id: index,
    left: `${(index * 37) % 100}%`,
    delay: `${(index % 7) * 0.13}s`,
    duration: `${1.4 + (index % 5) * 0.18}s`,
    size: `${4 + (index % 4) * 2}px`,
}));

export default function DemonicScoreResetAnimation({
    previousScore,
    onComplete,
}: DemonicScoreResetAnimationProps) {
    useEffect(() => {
        const timer = window.setTimeout(onComplete, 2400);
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
                zIndex: 100004,
                pointerEvents: 'none',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                    'radial-gradient(circle at 50% 48%, rgba(255, 20, 0, 0.4), rgba(20, 0, 0, 0.92) 42%, rgba(0, 0, 0, 0.98) 76%)',
            }}
        >
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.95, 0.35, 0.8, 0] }}
                transition={{ duration: 0.75, times: [0, 0.12, 0.38, 0.62, 1] }}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: '#FF841C',
                    mixBlendMode: 'screen',
                }}
            />

            <div className="abyss-score-reset-sigil" />
            <div className="abyss-score-reset-scanlines" />

            {embers.map((ember) => (
                <span
                    key={ember.id}
                    className="abyss-score-reset-ember"
                    style={{
                        left: ember.left,
                        width: ember.size,
                        height: ember.size,
                        animationDelay: ember.delay,
                        animationDuration: ember.duration,
                    }}
                />
            ))}

            <motion.div
                initial={{ scale: 0.72, y: 26, filter: 'blur(6px)' }}
                animate={{
                    scale: [0.72, 1.12, 1],
                    y: [26, -8, 0],
                    filter: ['blur(6px)', 'blur(0px)', 'blur(0px)'],
                }}
                transition={{ duration: 0.58, ease: 'easeOut' }}
                style={{
                    position: 'relative',
                    textAlign: 'center',
                    fontFamily: "'PressStart2P', monospace",
                    color: '#FF841C',
                    textShadow:
                        '0 0 8px #FF841C, 0 0 22px rgba(255, 50, 0, 0.95), 4px 4px 0 #2A0000',
                    padding: '24px',
                }}
            >
                <motion.div
                    animate={{ x: [0, -6, 4, -3, 0], opacity: [1, 0.7, 1, 0.85, 1] }}
                    transition={{ duration: 0.22, repeat: 5, repeatType: 'mirror' }}
                    style={{
                        fontSize: 'clamp(56px, 14vw, 150px)',
                        lineHeight: 0.9,
                        letterSpacing: '0.04em',
                    }}
                >
                    666
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.34, duration: 0.24 }}
                    style={{
                        marginTop: '20px',
                        fontSize: 'clamp(16px, 4vw, 34px)',
                        letterSpacing: '0.1em',
                    }}
                >
                    SCORE CONSUMED
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.66, duration: 0.26 }}
                    style={{
                        marginTop: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '18px',
                        fontSize: 'clamp(14px, 3vw, 28px)',
                    }}
                >
                    <span>{previousScore}</span>
                    <motion.span
                        animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.12, 0.9] }}
                        transition={{ duration: 0.36, repeat: 4 }}
                    >
                        &gt;
                    </motion.span>
                    <span>0</span>
                </motion.div>
            </motion.div>

            <style dangerouslySetInnerHTML={{ __html: `
                .abyss-score-reset-sigil {
                    position: absolute;
                    width: min(78vw, 680px);
                    height: min(78vw, 680px);
                    border: 2px solid rgba(255, 132, 28, 0.28);
                    border-radius: 50%;
                    box-shadow:
                        inset 0 0 55px rgba(255, 60, 0, 0.35),
                        0 0 80px rgba(255, 60, 0, 0.28);
                    animation: abyssResetSpin 6s linear infinite;
                }

                .abyss-score-reset-sigil::before,
                .abyss-score-reset-sigil::after {
                    content: "";
                    position: absolute;
                    inset: 12%;
                    border: 2px dashed rgba(255, 132, 28, 0.32);
                    transform: rotate(45deg);
                }

                .abyss-score-reset-sigil::after {
                    inset: 28%;
                    border-style: solid;
                    transform: rotate(-18deg);
                }

                .abyss-score-reset-scanlines {
                    position: absolute;
                    inset: 0;
                    opacity: 0.18;
                    background: repeating-linear-gradient(
                        to bottom,
                        rgba(255, 132, 28, 0.3) 0,
                        rgba(255, 132, 28, 0.3) 1px,
                        transparent 2px,
                        transparent 7px
                    );
                }

                .abyss-score-reset-ember {
                    position: absolute;
                    bottom: -24px;
                    border-radius: 999px;
                    background: #FF841C;
                    box-shadow: 0 0 12px #FF841C, 0 0 24px rgba(255, 60, 0, 0.75);
                    animation-name: abyssResetEmberRise;
                    animation-timing-function: ease-out;
                    animation-iteration-count: infinite;
                }

                @keyframes abyssResetSpin {
                    from { transform: rotate(0deg) scale(1); }
                    50% { transform: rotate(180deg) scale(1.05); }
                    to { transform: rotate(360deg) scale(1); }
                }

                @keyframes abyssResetEmberRise {
                    0% { transform: translateY(0) translateX(0) scale(0.5); opacity: 0; }
                    12% { opacity: 1; }
                    80% { opacity: 0.8; }
                    100% { transform: translateY(-110vh) translateX(38px) scale(1.7); opacity: 0; }
                }
            ` }} />
        </motion.div>
    );
}
