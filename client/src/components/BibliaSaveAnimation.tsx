import { useEffect } from "react";
import { motion } from "framer-motion";

interface BibliaSaveAnimationProps {
    onComplete: () => void;
    discarded?: boolean;
}

const holyParticles = Array.from({ length: 16 }, (_, index) => ({
    id: index,
    left: `${6 + ((index * 11) % 88)}%`,
    delay: `${(index % 6) * 0.08}s`,
    duration: `${1.25 + (index % 4) * 0.18}s`,
    size: `${8 + (index % 3) * 4}px`,
}));

const sacrificeParticles = Array.from({ length: 22 }, (_, index) => ({
    id: index,
    left: `${4 + ((index * 9) % 92)}%`,
    delay: `${(index % 7) * 0.05}s`,
    duration: `${0.95 + (index % 5) * 0.12}s`,
    size: `${5 + (index % 4) * 3}px`,
}));

const fractureLines = Array.from({ length: 3 }, (_, index) => ({
    id: index,
    rotate: [-24, 11, 32][index],
    top: `${24 + index * 16}%`,
    width: `${58 - index * 10}%`,
    delay: `${0.18 + index * 0.08}s`,
}));

export default function BibliaSaveAnimation({
    onComplete,
    discarded = true,
}: BibliaSaveAnimationProps) {
    const isSacrifice = discarded;
    const particles = isSacrifice ? sacrificeParticles : holyParticles;

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
                background: isSacrifice
                    ? "radial-gradient(circle at 50% 46%, rgba(255, 220, 144, 0.32), rgba(49, 19, 0, 0.92) 42%, rgba(0, 0, 0, 0.985) 78%)"
                    : "radial-gradient(circle at 50% 46%, rgba(255, 250, 226, 0.3), rgba(42, 24, 0, 0.86) 40%, rgba(0, 0, 0, 0.97) 76%)",
            }}
        >
            <motion.div
                initial={{ opacity: 0 }}
                animate={
                    isSacrifice
                        ? { opacity: [0, 1, 0.24, 0], scale: [0.95, 1.08, 1.02, 1.1] }
                        : { opacity: [0, 0.92, 0.16, 0], scale: [0.96, 1.03, 1.01, 1.02] }
                }
                transition={{ duration: isSacrifice ? 0.72 : 0.58, times: [0, 0.18, 0.62, 1] }}
                style={{
                    position: "absolute",
                    inset: 0,
                    background: isSacrifice
                        ? "linear-gradient(180deg, rgba(255,248,224,0.98) 0%, rgba(255,214,110,0.96) 25%, rgba(255,112,45,0.18) 100%)"
                        : "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,244,206,0.9) 30%, rgba(255,220,120,0.14) 100%)",
                    mixBlendMode: "screen",
                }}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.82 }}
                animate={
                    isSacrifice
                        ? { opacity: [0.18, 0.58, 0.14], scale: [0.82, 1.14, 1] }
                        : { opacity: [0.14, 0.38, 0.12], scale: [0.9, 1.03, 1] }
                }
                transition={{ duration: 1.18, ease: "easeOut" }}
                style={{
                    position: "absolute",
                    width: "min(82vw, 760px)",
                    height: "min(82vw, 760px)",
                    borderRadius: "50%",
                    border: isSacrifice
                        ? "2px solid rgba(255, 194, 98, 0.22)"
                        : "2px solid rgba(255, 244, 214, 0.22)",
                    boxShadow: isSacrifice
                        ? "0 0 36px rgba(255, 179, 84, 0.32), inset 0 0 60px rgba(255, 236, 198, 0.08)"
                        : "0 0 34px rgba(255, 225, 154, 0.24), inset 0 0 60px rgba(255, 249, 225, 0.14)",
                }}
            />

            <div className={`abyss-biblia-beam ${isSacrifice ? "sacrifice" : "preserved"}`} />
            <div className="abyss-biblia-scanlines" />

            {particles.map((particle) => (
                <span
                    key={particle.id}
                    className={`abyss-biblia-particle ${isSacrifice ? "ash" : "feather"}`}
                    style={{
                        left: particle.left,
                        width: particle.size,
                        height: particle.size,
                        animationDelay: particle.delay,
                        animationDuration: particle.duration,
                    }}
                />
            ))}

            <motion.div
                initial={{ opacity: 0, scale: 1.18, filter: "blur(8px)" }}
                animate={{
                    opacity: [0, isSacrifice ? 0.28 : 0.18, 0.08, 0],
                    scale: [1.18, 1, 1.08, 1.12],
                    filter: ["blur(8px)", "blur(0px)", "blur(0px)", "blur(6px)"],
                }}
                transition={{ duration: 1.3, times: [0, 0.18, 0.56, 1] }}
                style={{
                    position: "absolute",
                    fontFamily: "'PressStart2P', monospace",
                    fontSize: "clamp(72px, 18vw, 240px)",
                    lineHeight: 1,
                    color: isSacrifice ? "#FF6B3D" : "#FFD784",
                    textShadow: isSacrifice
                        ? "0 0 28px rgba(255, 60, 0, 0.45)"
                        : "0 0 28px rgba(255, 225, 140, 0.28)",
                    letterSpacing: "0.06em",
                }}
            >
                666
            </motion.div>

            <motion.div
                initial={{ scale: 0.75, y: 26, filter: "blur(5px)" }}
                animate={{
                    scale: isSacrifice ? [0.75, 1.11, 0.98] : [0.8, 1.05, 1],
                    y: isSacrifice ? [26, -10, 2] : [26, -4, 0],
                    filter: ["blur(5px)", "blur(0px)", "blur(0px)"],
                }}
                transition={{ duration: 0.54, ease: "easeOut" }}
                style={{
                    position: "relative",
                    textAlign: "center",
                    fontFamily: "'PressStart2P', monospace",
                    color: "#FFF3C7",
                    textShadow: isSacrifice
                        ? "0 0 10px rgba(255, 243, 199, 0.85), 0 0 28px rgba(255, 164, 86, 0.55), 4px 4px 0 rgba(40, 20, 0, 0.9)"
                        : "0 0 10px rgba(255, 250, 232, 0.9), 0 0 26px rgba(255, 218, 132, 0.44), 4px 4px 0 rgba(40, 20, 0, 0.9)",
                    padding: "24px",
                }}
            >
                <motion.div
                    animate={
                        isSacrifice
                            ? { rotate: [0, -8, 6, -4], y: [0, -10, 0] }
                            : { rotate: [0, -2, 1.5, 0], y: [0, -8, 0] }
                    }
                    transition={{ duration: 0.78, ease: "easeOut" }}
                    style={{
                        width: "min(30vw, 220px)",
                        margin: "0 auto",
                        position: "relative",
                    }}
                >
                    <div className={`abyss-biblia-ward-ring ${isSacrifice ? "sacrifice" : "preserved"}`} />

                    {isSacrifice && (
                        <>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.7 }}
                                animate={{ opacity: [0, 0.95, 0], scale: [0.7, 1.28, 1.38] }}
                                transition={{ duration: 0.6, times: [0, 0.3, 1] }}
                                className="abyss-biblia-burst-ring"
                            />
                            {fractureLines.map((line) => (
                                <span
                                    key={line.id}
                                    className="abyss-biblia-fracture"
                                    style={{
                                        top: line.top,
                                        width: line.width,
                                        transform: `translateX(-50%) rotate(${line.rotate}deg)`,
                                        animationDelay: line.delay,
                                    }}
                                />
                            ))}
                        </>
                    )}

                    <motion.img
                        src="/images/item40.png"
                        alt="Biblia"
                        animate={
                            isSacrifice
                                ? {
                                    filter: [
                                        "drop-shadow(0 0 18px rgba(255, 245, 210, 0.95)) drop-shadow(0 0 44px rgba(255, 180, 92, 0.62))",
                                        "drop-shadow(0 0 24px rgba(255, 245, 210, 0.98)) drop-shadow(0 0 60px rgba(255, 132, 28, 0.88))",
                                        "drop-shadow(0 0 18px rgba(255, 230, 170, 0.78)) drop-shadow(0 0 30px rgba(255, 132, 28, 0.48))",
                                    ],
                                    scale: [1, 1.08, 0.94],
                                    opacity: [1, 1, 0.82],
                                }
                                : {
                                    filter: [
                                        "drop-shadow(0 0 18px rgba(255, 249, 225, 0.95)) drop-shadow(0 0 44px rgba(255, 217, 124, 0.48))",
                                        "drop-shadow(0 0 24px rgba(255, 255, 244, 0.98)) drop-shadow(0 0 54px rgba(255, 228, 158, 0.58))",
                                        "drop-shadow(0 0 18px rgba(255, 249, 225, 0.92)) drop-shadow(0 0 40px rgba(255, 217, 124, 0.5))",
                                    ],
                                    scale: [1, 1.03, 1],
                                }
                        }
                        transition={{ duration: 0.72, ease: "easeOut" }}
                        style={{
                            width: "100%",
                            height: "auto",
                            objectFit: "contain",
                            position: "relative",
                            zIndex: 2,
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
                    {isSacrifice ? "SACRED SACRIFICE" : "CURSE DENIED"}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.34, duration: 0.22 }}
                    style={{
                        marginTop: "18px",
                        fontSize: "clamp(11px, 2vw, 16px)",
                        lineHeight: 1.8,
                        color: isSacrifice ? "#FFD36B" : "#FFF9E4",
                        maxWidth: "min(82vw, 640px)",
                        marginLeft: "auto",
                        marginRight: "auto",
                    }}
                >
                    {isSacrifice
                        ? "THE BIBLIA SHATTERED TO SAVE YOUR RUN"
                        : "THE BIBLIA HELD THE LINE"}
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
                            filter: blur(10px);
                            animation: abyssBibliaBeamPulse 1.3s ease-in-out infinite;
                        }

                        .abyss-biblia-beam.preserved {
                            background:
                                linear-gradient(
                                    180deg,
                                    rgba(255, 255, 255, 0.02) 0%,
                                    rgba(255, 249, 224, 0.82) 18%,
                                    rgba(255, 226, 142, 0.4) 46%,
                                    rgba(255, 226, 142, 0.08) 100%
                                );
                            opacity: 0.84;
                        }

                        .abyss-biblia-beam.sacrifice {
                            background:
                                linear-gradient(
                                    180deg,
                                    rgba(255, 255, 255, 0.06) 0%,
                                    rgba(255, 240, 194, 0.88) 16%,
                                    rgba(255, 176, 83, 0.6) 42%,
                                    rgba(255, 94, 37, 0.12) 100%
                                );
                            opacity: 0.94;
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

                        .abyss-biblia-particle {
                            position: absolute;
                            bottom: -30px;
                            animation-timing-function: ease-out;
                            animation-iteration-count: infinite;
                        }

                        .abyss-biblia-particle.feather {
                            border-radius: 999px 999px 999px 999px / 70% 70% 35% 35%;
                            background: linear-gradient(180deg, #FFFDF4 0%, #FFE09A 100%);
                            box-shadow:
                                0 0 12px rgba(255, 252, 239, 0.9),
                                0 0 24px rgba(255, 216, 123, 0.45);
                            animation-name: abyssBibliaFeatherRise;
                        }

                        .abyss-biblia-particle.ash {
                            border-radius: 999px;
                            background: linear-gradient(180deg, #FFF2CA 0%, #FF9A4F 100%);
                            box-shadow:
                                0 0 10px rgba(255, 232, 182, 0.95),
                                0 0 22px rgba(255, 150, 62, 0.62);
                            animation-name: abyssBibliaAshRise;
                        }

                        .abyss-biblia-ward-ring {
                            position: absolute;
                            inset: -12%;
                            border-radius: 50%;
                            animation: abyssBibliaWardSpin 5s linear infinite;
                        }

                        .abyss-biblia-ward-ring.preserved {
                            border: 2px solid rgba(255, 245, 210, 0.36);
                            box-shadow:
                                inset 0 0 34px rgba(255, 249, 225, 0.16),
                                0 0 32px rgba(255, 225, 140, 0.22);
                        }

                        .abyss-biblia-ward-ring.sacrifice {
                            border: 2px solid rgba(255, 216, 126, 0.32);
                            box-shadow:
                                inset 0 0 30px rgba(255, 239, 198, 0.14),
                                0 0 36px rgba(255, 159, 73, 0.28);
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

                        .abyss-biblia-burst-ring {
                            position: absolute;
                            inset: -16%;
                            border-radius: 50%;
                            border: 2px solid rgba(255, 213, 113, 0.7);
                            box-shadow: 0 0 28px rgba(255, 150, 52, 0.38);
                            z-index: 1;
                        }

                        .abyss-biblia-fracture {
                            position: absolute;
                            left: 50%;
                            height: 2px;
                            border-radius: 999px;
                            background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.95) 45%, rgba(255, 158, 67, 0.92) 100%);
                            box-shadow:
                                0 0 8px rgba(255, 255, 255, 0.9),
                                0 0 18px rgba(255, 132, 28, 0.8);
                            opacity: 0;
                            z-index: 3;
                            animation: abyssBibliaFractureFlash 0.5s ease-out forwards;
                        }

                        @keyframes abyssBibliaBeamPulse {
                            0%, 100% { opacity: 0.72; transform: translateX(-50%) scaleY(0.98); }
                            50% { opacity: 1; transform: translateX(-50%) scaleY(1.02); }
                        }

                        @keyframes abyssBibliaWardSpin {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }

                        @keyframes abyssBibliaFeatherRise {
                            0% { transform: translateY(0) scale(0.55) rotate(-8deg); opacity: 0; }
                            10% { opacity: 1; }
                            78% { opacity: 0.82; }
                            100% { transform: translateY(-108vh) translateX(20px) scale(1.35) rotate(20deg); opacity: 0; }
                        }

                        @keyframes abyssBibliaAshRise {
                            0% { transform: translateY(0) scale(0.6); opacity: 0; }
                            10% { opacity: 1; }
                            78% { opacity: 0.86; }
                            100% { transform: translateY(-106vh) translateX(30px) scale(1.45); opacity: 0; }
                        }

                        @keyframes abyssBibliaFractureFlash {
                            0% { opacity: 0; transform: translateX(-50%) scaleX(0.3); }
                            30% { opacity: 1; transform: translateX(-50%) scaleX(1); }
                            100% { opacity: 0.18; transform: translateX(-50%) scaleX(1.1); }
                        }
                    `,
                }}
            />
        </motion.div>
    );
}
