import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface ForgeCharmView {
    tokenId: bigint;
    name: string;
    rarity: string;
    image: string;
}

interface CharmForgeAnimationProps {
    materials: ForgeCharmView[];
    result: ForgeCharmView;
    onComplete: () => void;
}

const RARITY_COLOR: Record<string, string> = {
    Common: "#9CA3AF",
    Rare: "#60A5FA",
    Epic: "#C084FC",
    Legendary: "#FFD36A",
};

const forgeEmbers = Array.from({ length: 28 }, (_, index) => ({
    id: index,
    left: `${(index * 29) % 100}%`,
    delay: `${(index % 9) * 0.06}s`,
    duration: `${1.05 + (index % 6) * 0.14}s`,
    size: `${4 + (index % 5) * 2}px`,
}));

const cracks = Array.from({ length: 5 }, (_, index) => ({
    id: index,
    rotate: [-34, -16, 7, 23, 39][index],
    top: `${31 + index * 8}%`,
    width: `${72 - index * 9}%`,
    delay: `${0.36 + index * 0.045}s`,
}));

export default function CharmForgeAnimation({
    materials,
    result,
    onComplete,
}: CharmForgeAnimationProps) {
    const [phase, setPhase] = useState<"sacrifice" | "reveal" | "exit">("sacrifice");
    const completedRef = useRef(false);
    const reduceMotion = useReducedMotion();
    const resultColor = RARITY_COLOR[result.rarity] ?? "#FF841C";

    const handleComplete = useCallback(() => {
        if (completedRef.current) return;
        completedRef.current = true;
        setPhase("exit");
        window.setTimeout(onComplete, 220);
    }, [onComplete]);

    useEffect(() => {
        completedRef.current = false;
        const revealTimer = window.setTimeout(() => setPhase("reveal"), reduceMotion ? 720 : 1550);
        const completeTimer = window.setTimeout(handleComplete, reduceMotion ? 3200 : 4600);
        return () => {
            window.clearTimeout(revealTimer);
            window.clearTimeout(completeTimer);
        };
    }, [handleComplete, reduceMotion]);

    return (
        <motion.div
            className="abyss-forge-shell"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "exit" ? 0 : 1 }}
            transition={{ duration: 0.18 }}
            onClick={phase === "reveal" ? handleComplete : undefined}
        >
            <motion.div
                className="abyss-forge-whiteout"
                initial={{ opacity: 0 }}
                animate={{ opacity: phase === "sacrifice" ? [0, 0.9, 0.18, 0.66, 0] : [0, 0.28, 0] }}
                transition={{ duration: phase === "sacrifice" ? 0.95 : 0.55, times: [0, 0.12, 0.38, 0.58, 1] }}
            />

            <div className="abyss-forge-sigil" />
            <div className="abyss-forge-sigil inner" />
            <div className="abyss-forge-scanlines" />
            <div className="abyss-forge-beam" />

            {forgeEmbers.map((ember) => (
                <span
                    key={ember.id}
                    className="abyss-forge-ember"
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
                className="abyss-forge-title"
                initial={{ opacity: 0, y: 18, scale: 0.92, filter: "blur(5px)" }}
                animate={phase === "sacrifice"
                    ? { opacity: [0, 1, 0.92], y: [18, -4, 0], scale: [0.92, 1.08, 1], filter: ["blur(5px)", "blur(0px)", "blur(0px)"] }
                    : { opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.64, ease: "easeOut" }}
            >
                BURN THE THREE
            </motion.div>

            <div className="abyss-forge-material-stage">
                {materials.slice(0, 3).map((charm, index) => {
                    const angle = index * 120 - 90;
                    const radius = reduceMotion ? 96 : 178;
                    const x = Math.cos((angle * Math.PI) / 180) * radius;
                    const y = Math.sin((angle * Math.PI) / 180) * radius;
                    const color = RARITY_COLOR[charm.rarity] ?? "#FF841C";

                    return (
                        <motion.div
                            key={charm.tokenId.toString()}
                            className="abyss-forge-material"
                            initial={{ opacity: 0, x, y, scale: 0.78, rotate: index % 2 ? 9 : -9 }}
                            animate={phase === "sacrifice"
                                ? {
                                    opacity: [0, 1, 1, 0],
                                    x: reduceMotion ? 0 : [x, x * 0.74, 0],
                                    y: reduceMotion ? 0 : [y, y * 0.74, 0],
                                    scale: reduceMotion ? [0.9, 0.65] : [0.78, 1, 0.16],
                                    rotate: index % 2 ? [9, -15, 80] : [-9, 18, -80],
                                    filter: ["none", "none", "none"],
                                }
                                : { opacity: 0, scale: 0.12 }}
                            transition={{ duration: reduceMotion ? 0.65 : 1.22, ease: "easeInOut", delay: index * 0.08 }}
                            style={{ borderColor: color }}
                        >
                            <img src={charm.image} alt={charm.name} />
                        </motion.div>
                    );
                })}

                {cracks.map((crack) => (
                    <span
                        key={crack.id}
                        className="abyss-forge-crack"
                        style={{
                            top: crack.top,
                            width: crack.width,
                            transform: `translateX(-50%) rotate(${crack.rotate}deg)`,
                            animationDelay: crack.delay,
                        }}
                    />
                ))}
            </div>

            <motion.div
                className="abyss-forge-result"
                initial={{ opacity: 0, scale: 0.62, y: 36, filter: "blur(8px)" }}
                animate={phase === "reveal"
                    ? {
                        opacity: [0, 1, 1],
                        scale: [0.62, 1.14, 1],
                        y: [36, -10, 0],
                        filter: ["blur(8px)", "blur(0px)", "blur(0px)"],
                    }
                    : phase === "exit"
                        ? { opacity: 0, scale: 0.9, y: -26 }
                        : { opacity: 0, scale: 0.62, y: 36 }}
                transition={{ duration: 0.62, ease: "easeOut" }}
                style={{ "--forge-rarity": resultColor } as CSSProperties}
            >
                <div className="abyss-forge-result-label">FORGED CHARM</div>
                <motion.img
                    src={result.image}
                    alt={result.name}
                    animate={phase === "reveal" && !reduceMotion
                        ? {
                            scale: [1, 1.06, 1],
                            filter: ["none", "none", "none"],
                        }
                        : {}}
                    transition={{ duration: 1.1, repeat: phase === "reveal" ? Infinity : 0 }}
                />
                <div className="abyss-forge-result-name">{result.name}</div>
                <div className="abyss-forge-result-rarity">{result.rarity}</div>
                <div className="abyss-forge-continue">CLICK TO CONTINUE</div>
            </motion.div>

            <style>{`
                .abyss-forge-shell {
                    position: fixed;
                    inset: 0;
                    z-index: 100004;
                    pointer-events: auto;
                    cursor: pointer;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background:
                        radial-gradient(circle at 50% 47%, rgba(255,132,28,0.34), rgba(35,7,0,0.94) 42%, rgba(0,0,0,0.985) 78%);
                    font-family: 'PressStart2P', monospace;
                }

                .abyss-forge-whiteout {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(180deg, rgba(255,244,214,0.98), rgba(255,132,28,0.78) 28%, rgba(255,40,0,0.16));
                    mix-blend-mode: screen;
                    pointer-events: none;
                }

                .abyss-forge-sigil,
                .abyss-forge-sigil.inner {
                    position: absolute;
                    width: min(82vw, 700px);
                    height: min(82vw, 700px);
                    border: 2px solid rgba(255,132,28,0.28);
                    border-radius: 50%;
                    box-shadow: none;
                    animation: abyssForgeSpin 5.4s linear infinite;
                }

                .abyss-forge-sigil::before,
                .abyss-forge-sigil::after {
                    content: "";
                    position: absolute;
                    inset: 12%;
                    border: 2px dashed rgba(255,132,28,0.34);
                    transform: rotate(45deg);
                }

                .abyss-forge-sigil::after {
                    inset: 30%;
                    border-style: solid;
                    transform: rotate(-18deg);
                }

                .abyss-forge-sigil.inner {
                    width: min(54vw, 420px);
                    height: min(54vw, 420px);
                    animation-direction: reverse;
                    animation-duration: 3.8s;
                    opacity: 0.7;
                }

                .abyss-forge-scanlines {
                    position: absolute;
                    inset: 0;
                    opacity: 0.2;
                    background: repeating-linear-gradient(
                        to bottom,
                        rgba(255,132,28,0.35) 0,
                        rgba(255,132,28,0.35) 1px,
                        transparent 2px,
                        transparent 7px
                    );
                    pointer-events: none;
                }

                .abyss-forge-beam {
                    position: absolute;
                    width: min(22vw, 160px);
                    height: 120vh;
                    background: linear-gradient(90deg, transparent, rgba(255,132,28,0.24), rgba(255,245,215,0.24), rgba(255,132,28,0.24), transparent);
                    filter: none;
                    transform: rotate(9deg);
                    animation: abyssForgeBeam 0.9s ease-in-out infinite alternate;
                }

                .abyss-forge-ember {
                    position: absolute;
                    bottom: -30px;
                    border-radius: 999px;
                    background: #FF841C;
                    box-shadow: none;
                    animation-name: abyssForgeEmberRise;
                    animation-timing-function: ease-out;
                    animation-iteration-count: infinite;
                }

                .abyss-forge-title {
                    position: absolute;
                    top: clamp(56px, 10vh, 92px);
                    color: #FFF3C7;
                    font-size: clamp(14px, 3vw, 30px);
                    letter-spacing: 0.08em;
                    text-shadow: 4px 4px 0 rgba(42,0,0,0.9);
                    text-align: center;
                }

                .abyss-forge-material-stage {
                    position: relative;
                    width: min(92vw, 620px);
                    height: min(92vw, 620px);
                }

                .abyss-forge-material {
                    position: absolute;
                    left: calc(50% - 48px);
                    top: calc(50% - 56px);
                    width: 96px;
                    height: 112px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: transparent;
                }

                .abyss-forge-material img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    image-rendering: pixelated;
                    filter: none;
                }

                .abyss-forge-crack {
                    position: absolute;
                    left: 50%;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, rgba(255,245,215,0.9), rgba(255,132,28,0.88), transparent);
                    opacity: 0;
                    box-shadow: none;
                    animation: abyssForgeCrack 0.72s ease-out forwards;
                }

                .abyss-forge-result {
                    --forge-rarity: #FF841C;
                    position: absolute;
                    width: min(86vw, 420px);
                    min-height: 390px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    padding: 12px;
                    text-align: center;
                    text-shadow: 3px 3px 0 rgba(0,0,0,0.9);
                }

                .abyss-forge-result-label,
                .abyss-forge-result-rarity,
                .abyss-forge-continue {
                    font-size: 8px;
                    color: rgba(255,255,255,0.58);
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                }

                .abyss-forge-result img {
                    width: 220px;
                    height: 220px;
                    object-fit: contain;
                    image-rendering: pixelated;
                    filter: none;
                }

                .abyss-forge-result-name {
                    color: var(--forge-rarity);
                    font-size: 16px;
                    line-height: 1.35;
                    text-transform: uppercase;
                }

                @keyframes abyssForgeSpin {
                    from { transform: rotate(0deg) scale(1); }
                    50% { transform: rotate(180deg) scale(1.04); }
                    to { transform: rotate(360deg) scale(1); }
                }

                @keyframes abyssForgeBeam {
                    from { opacity: 0.42; transform: rotate(9deg) scaleX(0.8); }
                    to { opacity: 0.82; transform: rotate(-7deg) scaleX(1.12); }
                }

                @keyframes abyssForgeEmberRise {
                    0% { transform: translateY(0) translateX(0) scale(0.45); opacity: 0; }
                    12% { opacity: 1; }
                    80% { opacity: 0.82; }
                    100% { transform: translateY(-112vh) translateX(42px) scale(1.65); opacity: 0; }
                }

                @keyframes abyssForgeCrack {
                    0% { opacity: 0; transform: translateX(-50%) scaleX(0.1) rotate(var(--unused, 0deg)); }
                    18% { opacity: 1; }
                    100% { opacity: 0; transform: translateX(-50%) scaleX(1) rotate(var(--unused, 0deg)); }
                }

                @media (max-width: 520px) {
                    .abyss-forge-title {
                        top: 58px;
                        font-size: 12px;
                    }
                    .abyss-forge-material {
                        left: calc(50% - 36px);
                        top: calc(50% - 44px);
                        width: 72px;
                        height: 88px;
                    }
                    .abyss-forge-result {
                        width: min(90vw, 310px);
                        min-height: 330px;
                        padding: 10px;
                    }
                    .abyss-forge-result img {
                        width: 170px;
                        height: 170px;
                    }
                    .abyss-forge-result-name {
                        font-size: 12px;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .abyss-forge-sigil,
                    .abyss-forge-sigil.inner,
                    .abyss-forge-beam,
                    .abyss-forge-ember,
                    .abyss-forge-crack {
                        animation: none;
                    }
                }
            `}</style>
        </motion.div>
    );
}
