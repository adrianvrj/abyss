import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CharmMintAnimationProps {
    charmId: number;
    charmName: string;
    charmImage: string;
    rarity: string;
    onComplete: () => void;
}

export default function CharmMintAnimation({
    charmName,
    charmImage,
    onComplete
}: CharmMintAnimationProps) {
    const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

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
