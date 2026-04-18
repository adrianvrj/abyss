import { useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface TrickyDiceCashOutAnimationProps {
    onComplete: () => void;
}

const sparks = Array.from({ length: 18 }, (_, index) => ({
    id: index,
    left: `${6 + ((index * 9) % 88)}%`,
    delay: `${(index % 6) * 0.08}s`,
    duration: `${1.1 + (index % 5) * 0.12}s`,
    size: `${5 + (index % 4) * 3}px`,
}));

const chips = Array.from({ length: 10 }, (_, index) => ({
    id: index,
    left: `${14 + ((index * 13) % 72)}%`,
    rotate: [-18, 14, -8, 20, -12][index % 5],
    delay: `${0.16 + index * 0.06}s`,
}));

export default function TrickyDiceCashOutAnimation({
    onComplete,
}: TrickyDiceCashOutAnimationProps) {
    const completedRef = useRef(false);

    const handleComplete = useCallback(() => {
        if (completedRef.current) {
            return;
        }
        completedRef.current = true;
        onComplete();
    }, [onComplete]);

    useEffect(() => {
        completedRef.current = false;
        const timer = window.setTimeout(handleComplete, 2400);
        return () => window.clearTimeout(timer);
    }, [handleComplete]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={handleComplete}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 100006,
                pointerEvents: "auto",
                cursor: "pointer",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                    "radial-gradient(circle at 50% 44%, rgba(255, 199, 89, 0.34), rgba(77, 28, 0, 0.94) 38%, rgba(0, 0, 0, 0.985) 76%)",
            }}
        >
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.9, 0.24, 0], scale: [0.96, 1.05, 1.02, 1.08] }}
                transition={{ duration: 0.78, times: [0, 0.18, 0.56, 1] }}
                style={{
                    position: "absolute",
                    inset: 0,
                    background:
                        "linear-gradient(180deg, rgba(255,245,210,0.96) 0%, rgba(255,193,73,0.94) 24%, rgba(255,115,0,0.16) 100%)",
                    mixBlendMode: "screen",
                }}
            />

            <div className="abyss-cashout-scanlines" />
            <div className="abyss-cashout-ring" />

            {sparks.map((spark) => (
                <span
                    key={spark.id}
                    className="abyss-cashout-spark"
                    style={{
                        left: spark.left,
                        width: spark.size,
                        height: spark.size,
                        animationDelay: spark.delay,
                        animationDuration: spark.duration,
                    }}
                />
            ))}

            {chips.map((chip) => (
                <span
                    key={chip.id}
                    className="abyss-cashout-chip"
                    style={{
                        left: chip.left,
                        rotate: `${chip.rotate}deg`,
                        animationDelay: chip.delay,
                    }}
                />
            ))}

            <motion.div
                initial={{ opacity: 0, scale: 1.2, filter: "blur(10px)" }}
                animate={{
                    opacity: [0, 0.24, 0.08, 0],
                    scale: [1.2, 1, 1.06, 1.12],
                    filter: ["blur(10px)", "blur(0px)", "blur(0px)", "blur(6px)"],
                }}
                transition={{ duration: 1.2, times: [0, 0.16, 0.56, 1] }}
                style={{
                    position: "absolute",
                    fontFamily: "'PressStart2P', monospace",
                    fontSize: "clamp(54px, 15vw, 180px)",
                    lineHeight: 1,
                    color: "#FFDD72",
                    textShadow: "0 0 24px rgba(255, 197, 74, 0.55)",
                    letterSpacing: "0.08em",
                }}
            >
                CASH
            </motion.div>

            <motion.div
                initial={{ scale: 0.78, y: 28, filter: "blur(5px)" }}
                animate={{
                    scale: [0.78, 1.09, 1],
                    y: [28, -8, 0],
                    filter: ["blur(5px)", "blur(0px)", "blur(0px)"],
                }}
                transition={{ duration: 0.56, ease: "easeOut" }}
                style={{
                    position: "relative",
                    textAlign: "center",
                    fontFamily: "'PressStart2P', monospace",
                    color: "#FFF4CA",
                    textShadow:
                        "0 0 10px rgba(255, 244, 202, 0.88), 0 0 26px rgba(255, 164, 46, 0.56), 4px 4px 0 rgba(50, 20, 0, 0.92)",
                    padding: "24px",
                }}
            >
                <motion.div
                    animate={{ rotate: [0, -10, 8, -5, 0], y: [0, -8, 0] }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    style={{
                        width: "min(28vw, 180px)",
                        margin: "0 auto",
                        position: "relative",
                    }}
                >
                    <motion.div
                        animate={{ rotate: [0, 180, 360], scale: [0.96, 1.08, 1] }}
                        transition={{ duration: 0.92, ease: "easeOut" }}
                        className="abyss-cashout-dice-glow"
                    />
                    <motion.img
                        src="/images/item41.png"
                        alt="Tricky Dice"
                        animate={{
                            filter: [
                                "drop-shadow(0 0 18px rgba(255, 240, 186, 0.95)) drop-shadow(0 0 44px rgba(255, 160, 40, 0.64))",
                                "drop-shadow(0 0 24px rgba(255, 240, 186, 0.98)) drop-shadow(0 0 60px rgba(255, 125, 0, 0.84))",
                                "drop-shadow(0 0 18px rgba(255, 232, 162, 0.78)) drop-shadow(0 0 30px rgba(255, 125, 0, 0.46))",
                            ],
                            scale: [1, 1.08, 0.98],
                        }}
                        transition={{ duration: 0.76, ease: "easeOut" }}
                        style={{
                            width: "100%",
                            height: "auto",
                            objectFit: "contain",
                            imageRendering: "pixelated",
                            position: "relative",
                            zIndex: 2,
                        }}
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.24, duration: 0.24 }}
                    style={{
                        marginTop: "24px",
                        fontSize: "clamp(22px, 5vw, 46px)",
                        letterSpacing: "0.1em",
                    }}
                >
                    CASH OUT
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.44, duration: 0.22 }}
                    style={{
                        marginTop: "18px",
                        fontSize: "clamp(12px, 2.6vw, 22px)",
                        letterSpacing: "0.08em",
                        color: "#FFD167",
                    }}
                >
                    RUN SECURED
                </motion.div>
            </motion.div>

            <style
                dangerouslySetInnerHTML={{
                    __html: `
                        .abyss-cashout-ring {
                            position: absolute;
                            width: min(80vw, 700px);
                            height: min(80vw, 700px);
                            border-radius: 50%;
                            border: 2px solid rgba(255, 194, 98, 0.24);
                            box-shadow:
                                inset 0 0 56px rgba(255, 155, 56, 0.22),
                                0 0 80px rgba(255, 143, 28, 0.2);
                            animation: abyssCashoutPulse 3.4s ease-in-out infinite;
                        }

                        .abyss-cashout-ring::before,
                        .abyss-cashout-ring::after {
                            content: "";
                            position: absolute;
                            inset: 14%;
                            border-radius: 50%;
                            border: 2px dashed rgba(255, 214, 130, 0.26);
                        }

                        .abyss-cashout-ring::after {
                            inset: 28%;
                            border-style: solid;
                            border-color: rgba(255, 153, 41, 0.28);
                        }

                        .abyss-cashout-scanlines {
                            position: absolute;
                            inset: 0;
                            opacity: 0.14;
                            background: repeating-linear-gradient(
                                to bottom,
                                rgba(255, 190, 72, 0.22) 0,
                                rgba(255, 190, 72, 0.22) 1px,
                                transparent 2px,
                                transparent 8px
                            );
                        }

                        .abyss-cashout-spark {
                            position: absolute;
                            bottom: -26px;
                            border-radius: 999px;
                            background: #FFD46E;
                            box-shadow: 0 0 14px #FFD46E, 0 0 28px rgba(255, 128, 0, 0.7);
                            animation-name: abyssCashoutSparkRise;
                            animation-timing-function: ease-out;
                            animation-iteration-count: infinite;
                        }

                        .abyss-cashout-chip {
                            position: absolute;
                            top: 54%;
                            width: 24px;
                            height: 24px;
                            margin-left: -12px;
                            border-radius: 50%;
                            border: 2px solid rgba(86, 42, 0, 0.7);
                            background: radial-gradient(circle at 30% 30%, #ffe6a6, #ffad33 62%, #d96300 100%);
                            box-shadow: 0 0 16px rgba(255, 178, 78, 0.46);
                            animation: abyssCashoutChipBurst 1.4s ease-out forwards;
                            opacity: 0;
                        }

                        .abyss-cashout-dice-glow {
                            position: absolute;
                            inset: 10%;
                            border-radius: 26px;
                            box-shadow: 0 0 48px rgba(255, 167, 63, 0.48);
                        }

                        @keyframes abyssCashoutPulse {
                            0%, 100% { transform: scale(1); opacity: 0.78; }
                            50% { transform: scale(1.05); opacity: 1; }
                        }

                        @keyframes abyssCashoutSparkRise {
                            0% { transform: translateY(0) translateX(0) scale(0.5); opacity: 0; }
                            12% { opacity: 1; }
                            100% { transform: translateY(-110vh) translateX(36px) scale(1.6); opacity: 0; }
                        }

                        @keyframes abyssCashoutChipBurst {
                            0% { transform: translateY(0) scale(0.6); opacity: 0; }
                            18% { opacity: 1; }
                            100% { transform: translateY(-180px) scale(1.1); opacity: 0; }
                        }
                    `,
                }}
            />
        </motion.div>
    );
}
