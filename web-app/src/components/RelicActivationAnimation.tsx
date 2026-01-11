"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface RelicActivationAnimationProps {
    relicName: string;
    onComplete: () => void;
}

export default function RelicActivationAnimation({ relicName, onComplete }: RelicActivationAnimationProps) {
    const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

    useEffect(() => {
        // Enter -> Hold for 1s -> Exit
        const holdTimer = setTimeout(() => setPhase('hold'), 600);
        const exitTimer = setTimeout(() => setPhase('exit'), 1600);

        return () => {
            clearTimeout(holdTimer);
            clearTimeout(exitTimer);
        };
    }, []);

    const imagePath = `/images/relics/${relicName.toLowerCase().replace(/ /g, '_')}.png`;

    return (
        <AnimatePresence>
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                pointerEvents: 'none',
            }}>
                {/* Soft white glow overlay */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{
                        opacity: phase === 'exit' ? 0 : 0.25
                    }}
                    transition={{ duration: 0.5 }}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.5) 0%, transparent 70%)',
                    }}
                />

                {/* Relic image - bigger */}
                <motion.div
                    initial={{ y: '100vh', scale: 0.5 }}
                    animate={{
                        y: phase === 'exit' ? '120vh' : 0, // 120vh for extra clearance
                        scale: phase === 'hold' ? 1.1 : 1,
                    }}
                    transition={{
                        type: 'spring',
                        stiffness: 150,
                        damping: 24,
                        duration: 0.6
                    }}
                    onAnimationComplete={() => {
                        if (phase === 'exit') {
                            onComplete();
                        }
                    }}
                    style={{
                        position: 'relative',
                        width: '250px',
                        height: '250px',
                    }}
                >
                    <Image
                        src={imagePath}
                        alt={relicName}
                        fill
                        style={{
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 0 40px rgba(255, 255, 255, 0.9))'
                        }}
                    />
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
