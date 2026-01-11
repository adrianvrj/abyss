"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface BibliaSaveAnimationProps {
    onComplete: () => void;
    discarded?: boolean;
}

export default function BibliaSaveAnimation({ onComplete, discarded = true }: BibliaSaveAnimationProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 99999,
                pointerEvents: "none",
            }}
        >
            {/* White flash overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.5, 0.5, 0] }}
                transition={{ duration: 3, times: [0, 0.25, 0.7, 1] }}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "#FFFFFF",
                }}
            />

            {/* Biblia image animation */}
            <motion.div
                initial={{ y: "100vh", opacity: 1, scale: 1 }}
                animate={{
                    y: ["100vh", "0vh", "0vh", "100vh"],
                    opacity: [1, 1, 1, 0],
                }}
                transition={{
                    duration: 3,
                    times: [0, 0.27, 0.67, 1],
                    ease: ["easeOut", "linear", "easeIn"],
                }}
                onAnimationComplete={onComplete}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <div style={{
                    width: "45vmin",
                    height: "45vmin",
                    position: "relative",
                    marginBottom: "2rem",
                }}>
                    <Image
                        src="/images/item40.png"
                        alt="Biblia"
                        fill
                        style={{ objectFit: "contain" }}
                        priority
                    />
                </div>

                {/* Status Text */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1.1 }}
                    transition={{ delay: 1, duration: 0.5 }}
                    style={{
                        color: discarded ? "#FF4444" : "#44FF44",
                        fontSize: "clamp(24px, 5vw, 42px)",
                        fontWeight: "bold",
                        textShadow: "0px 0px 10px rgba(0,0,0,0.8)",
                        textAlign: "center",
                        padding: "0 20px",
                        fontFamily: "'Cinzel', serif",
                    }}
                >
                    {discarded ? "THE BIBLIA BROKE..." : "THE BIBLIA SURVIVED!"}
                </motion.div>
            </motion.div>
        </motion.div>
    );
}
