'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface LevelUpAnimationProps {
    isVisible: boolean;
}

export default function LevelUpAnimation({ isVisible }: LevelUpAnimationProps) {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: "100vh" }}
                    animate={{
                        y: ["100vh", "0vh", "0vh", "100vh"],
                    }}
                    transition={{
                        duration: 1.5,
                        times: [0, 0.3, 0.7, 1],
                        ease: "easeInOut"
                    }}
                    className="level-up-overlay"
                >
                    <span className="level-up-text">LEVEL UP</span>

                    <style jsx>{`
                        .level-up-overlay {
                            position: fixed;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            z-index: 9999;
                            pointer-events: none;
                        }

                        .level-up-text {
                            font-family: 'PressStart2P', monospace;
                            font-size: 48px;
                            color: #FFD700;
                            text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
                        }

                        @media (max-width: 768px) {
                            .level-up-text {
                                font-size: 32px;
                            }
                        }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
