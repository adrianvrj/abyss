import { useEffect } from "react";
import { motion } from "framer-motion";

interface BibliaSaveAnimationProps {
    onComplete: () => void;
    discarded?: boolean;
}

const embers = Array.from({ length: 18 }, (_, index) => ({
    id: index,
    left: `${(index * 29) % 100}%`,
    delay: `${(index % 6) * 0.08}s`,
    duration: `${1.05 + (index % 4) * 0.16}s`,
    size: `${6 + (index % 3) * 3}px`,
}));

export default function BibliaSaveAnimation({
    onComplete,
    discarded = true,
}: BibliaSaveAnimationProps) {
    useEffect(() => {
        const timer = window.setTimeout(onComplete, 2200);
        return () => window.clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 100005,
                pointerEvents: "none",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                    "radial-gradient(circle at 50% 46%, rgba(255, 241, 194, 0.22), rgba(26, 15, 0, 0.88) 42%, rgba(0, 0, 0, 0.98) 78%)",
            }}
        >
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.95, 0.18, 0] }}
                transition={{ duration: 0.58, times: [0, 0.16, 0.52, 1] }}
                style={{
                    position: "absolute",
                    inset: 0,
                    background:
                        "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,238,180,0.88) 32%, rgba(255,212,116,0.18) 100%)",
                    mixBlendMode: "screen",
                }}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: [0.18, 0.45, 0.18], scale: [0.9, 1.05, 1] }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                style={{
                    position: "absolute",
                    width: "min(82vw, 760px)",
                    height: "min(82vw, 760px)",
                    borderRadius: "50%",
                    border: "2px solid rgba(255, 233, 160, 0.2)",
                    boxShadow:
                        "0 0 34px rgba(255, 213, 122, 0.28), inset 0 0 60px rgba(255, 241, 194, 0.14)",
                }}
            />

            <div className="abyss-biblia-beam" />
            <div className="abyss-biblia-scanlines" />

            {embers.map((ember) => (
                <span
                    key={ember.id}
                    className="abyss-biblia-ember"
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
                initial={{ opacity: 0, scale: 1.2, filter: "blur(8px)" }}
                animate={{
                    opacity: [0, 0.24, 0.08, 0],
                    scale: [1.2, 1, 1.08, 1.12],
                    filter: ["blur(8px)", "blur(0px)", "blur(0px)", "blur(6px)"],
                }}
                transition={{ duration: 1.3, times: [0, 0.18, 0.56, 1] }}
                style={{
                    position: "absolute",
                    fontFamily: "'PressStart2P', monospace",
                    fontSize: "clamp(72px, 18vw, 240px)",
                    lineHeight: 1,
                    color: "#FF6B3D",
                    textShadow: "0 0 28px rgba(255, 60, 0, 0.45)",
                    letterSpacing: "0.06em",
                }}
            >
                666
            </motion.div>

            <motion.div
                initial={{ scale: 0.75, y: 26, filter: "blur(5px)" }}
                animate={{
                    scale: [0.75, 1.09, 1],
                    y: [26, -8, 0],
                    filter: ["blur(5px)", "blur(0px)", "blur(0px)"],
                }}
                transition={{ duration: 0.54, ease: "easeOut" }}
                style={{
                    position: "relative",
                    textAlign: "center",
                    fontFamily: "'PressStart2P', monospace",
                    color: "#FFF3C7",
                    textShadow:
                        "0 0 10px rgba(255, 243, 199, 0.85), 0 0 28px rgba(255, 206, 104, 0.5), 4px 4px 0 rgba(40, 20, 0, 0.9)",
                    padding: "24px",
                }}
            >
                <motion.div
                    animate={{ rotate: [0, -5, 4, 0], y: [0, -10, 0] }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    style={{
                        width: "min(30vw, 220px)",
                        margin: "0 auto",
                        position: "relative",
                    }}
                >
                    <div className="abyss-biblia-ward-ring" />
                    <img
                        src="/images/item40.png"
                        alt="Biblia"
                        style={{
                            width: "100%",
                            height: "auto",
                            objectFit: "contain",
                            filter:
                                "drop-shadow(0 0 18px rgba(255, 243, 199, 0.9)) drop-shadow(0 0 44px rgba(255, 206, 104, 0.55))",
                        }}
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.24 }}
                    style={{
                        marginTop: "22px",
                        fontSize: "clamp(22px, 5vw, 50px)",
                        lineHeight: 1.1,
                        letterSpacing: "0.08em",
                    }}
                >
                    CURSE DENIED
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.34, duration: 0.22 }}
                    style={{
                        marginTop: "18px",
                        fontSize: "clamp(11px, 2vw, 16px)",
                        lineHeight: 1.8,
                        color: discarded ? "#FFD36B" : "#FFF9E4",
                        maxWidth: "min(82vw, 640px)",
                        marginLeft: "auto",
                        marginRight: "auto",
                    }}
                >
                    {discarded ? "THE BIBLIA BURNED AWAY TO SAVE YOUR RUN" : "THE BIBLIA HELD THE LINE"}
                </motion.div>
            </motion.div>

            <style
                dangerouslySetInnerHTML={{
                    __html: `
                        .abyss-biblia-beam {
                            position: absolute;
                            top: -12%;
                            left: 50%;
                            width: min(34vw, 280px);
                            height: 130%;
                            transform: translateX(-50%);
                            background:
                                linear-gradient(
                                    180deg,
                                    rgba(255, 255, 255, 0.0) 0%,
                                    rgba(255, 247, 214, 0.78) 18%,
                                    rgba(255, 216, 125, 0.42) 46%,
                                    rgba(255, 216, 125, 0.08) 100%
                                );
                            filter: blur(10px);
                            opacity: 0.9;
                            animation: abyssBibliaBeamPulse 1.3s ease-in-out infinite;
                        }

                        .abyss-biblia-scanlines {
                            position: absolute;
                            inset: 0;
                            opacity: 0.1;
                            background: repeating-linear-gradient(
                                to bottom,
                                rgba(255, 245, 210, 0.3) 0,
                                rgba(255, 245, 210, 0.3) 1px,
                                transparent 2px,
                                transparent 7px
                            );
                        }

                        .abyss-biblia-ember {
                            position: absolute;
                            bottom: -30px;
                            border-radius: 999px;
                            background: #FFF3C7;
                            box-shadow:
                                0 0 10px rgba(255, 243, 199, 0.95),
                                0 0 22px rgba(255, 206, 104, 0.6);
                            animation-name: abyssBibliaEmberRise;
                            animation-timing-function: ease-out;
                            animation-iteration-count: infinite;
                        }

                        .abyss-biblia-ward-ring {
                            position: absolute;
                            inset: -12%;
                            border-radius: 50%;
                            border: 2px solid rgba(255, 233, 160, 0.32);
                            box-shadow:
                                inset 0 0 30px rgba(255, 245, 210, 0.18),
                                0 0 36px rgba(255, 206, 104, 0.28);
                            animation: abyssBibliaWardSpin 5s linear infinite;
                        }

                        .abyss-biblia-ward-ring::before,
                        .abyss-biblia-ward-ring::after {
                            content: "";
                            position: absolute;
                            inset: 16%;
                            border-radius: 50%;
                            border: 2px dashed rgba(255, 245, 210, 0.28);
                        }

                        .abyss-biblia-ward-ring::after {
                            inset: 34%;
                            border-style: solid;
                            transform: rotate(45deg);
                        }

                        @keyframes abyssBibliaBeamPulse {
                            0%, 100% { opacity: 0.72; transform: translateX(-50%) scaleY(0.98); }
                            50% { opacity: 1; transform: translateX(-50%) scaleY(1.02); }
                        }

                        @keyframes abyssBibliaWardSpin {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }

                        @keyframes abyssBibliaEmberRise {
                            0% { transform: translateY(0) scale(0.6); opacity: 0; }
                            10% { opacity: 1; }
                            80% { opacity: 0.85; }
                            100% { transform: translateY(-108vh) translateX(28px) scale(1.4); opacity: 0; }
                        }
                    `,
                }}
            />
        </motion.div>
    );
}
