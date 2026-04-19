import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Lock, Flame, X } from "lucide-react";
import ModalWrapper from "./ModalWrapper";
import { STATIC_CHARM_DEFINITIONS, type StaticCharmDefinition } from "@/lib/charmCatalog";

const MAX_CHARMS = 3;

const RARITY_PALETTE: Record<string, { border: string; glow: string; tint: string; label: string }> = {
    Common: {
        border: "#4B5563",
        glow: "rgba(156, 163, 175, 0.35)",
        tint: "rgba(156, 163, 175, 0.08)",
        label: "#9CA3AF",
    },
    Rare: {
        border: "#2563EB",
        glow: "rgba(59, 130, 246, 0.45)",
        tint: "rgba(59, 130, 246, 0.10)",
        label: "#60A5FA",
    },
    Epic: {
        border: "#7C3AED",
        glow: "rgba(168, 85, 247, 0.50)",
        tint: "rgba(168, 85, 247, 0.12)",
        label: "#C084FC",
    },
    Legendary: {
        border: "#D97706",
        glow: "rgba(255, 188, 48, 0.55)",
        tint: "rgba(255, 188, 48, 0.14)",
        label: "#FFD27A",
    },
};

function rarity(def: StaticCharmDefinition) {
    return RARITY_PALETTE[def.rarity] ?? RARITY_PALETTE.Common;
}

interface CharmLoadoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    ownedCharmIds: number[];
    loadout: number[];
    onToggle: (charmId: number) => void;
    onClear: () => void;
    onSeal: () => Promise<void> | void;
    isLocked: boolean;
    isSubmitting?: boolean;
    alreadyEquippedIds?: number[];
}

export function CharmLoadoutModal({
    isOpen,
    onClose,
    ownedCharmIds,
    loadout,
    onToggle,
    onClear,
    onSeal,
    isLocked,
    isSubmitting = false,
    alreadyEquippedIds,
}: CharmLoadoutModalProps) {
    const [error, setError] = useState<string | null>(null);
    const [hoveredCharm, setHoveredCharm] = useState<number | null>(null);

    useEffect(() => {
        if (!isOpen) setError(null);
    }, [isOpen]);

    const ownedDefs = useMemo(() => {
        return ownedCharmIds
            .map((id) => STATIC_CHARM_DEFINITIONS[id])
            .filter(Boolean)
            .sort((a, b) => {
                const order = ["Legendary", "Epic", "Rare", "Common"];
                const ra = order.indexOf(a.rarity);
                const rb = order.indexOf(b.rarity);
                if (ra !== rb) return ra - rb;
                return a.charm_id - b.charm_id;
            }) as StaticCharmDefinition[];
    }, [ownedCharmIds]);

    const loadoutDefs = useMemo(() => {
        return loadout
            .map((id) => STATIC_CHARM_DEFINITIONS[id])
            .filter(Boolean) as StaticCharmDefinition[];
    }, [loadout]);

    const sealedEquipment = alreadyEquippedIds && alreadyEquippedIds.length > 0;
    const sealedDefs = useMemo(() => {
        if (!sealedEquipment) return [] as StaticCharmDefinition[];
        return (alreadyEquippedIds ?? [])
            .map((id) => STATIC_CHARM_DEFINITIONS[id])
            .filter(Boolean) as StaticCharmDefinition[];
    }, [alreadyEquippedIds, sealedEquipment]);

    const displayedSlots = sealedEquipment ? sealedDefs : loadoutDefs;
    const remaining = MAX_CHARMS - loadout.length;

    const handleSeal = async () => {
        setError(null);
        try {
            await onSeal();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Transaction failed";
            setError(msg);
        }
    };

    if (!isOpen) return null;

    return (
        <ModalWrapper onClose={onClose} title="CHARM LOADOUT" maxWidth={560} maxHeight="92vh">
            <style>{`
                @keyframes abyss-ember {
                    0%, 100% { opacity: 0.55; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.04); }
                }
                @keyframes abyss-scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100%); }
                }
                @keyframes abyss-flicker {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.82; }
                }
                @keyframes abyss-socket-rotate {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .charm-socket-dashes {
                    animation: abyss-socket-rotate 24s linear infinite;
                }
                .charm-ember {
                    animation: abyss-ember 2.4s ease-in-out infinite;
                }
                .charm-scanline::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(
                        180deg,
                        transparent 0%,
                        rgba(255, 132, 28, 0.06) 50%,
                        transparent 100%
                    );
                    animation: abyss-scan 3.2s linear infinite;
                    pointer-events: none;
                }
                .charm-card-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                }
                @media (max-width: 480px) {
                    .charm-card-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
            `}</style>

            {/* Sealed banner */}
            {isLocked && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        border: "1px solid rgba(255, 132, 28, 0.35)",
                        background: "linear-gradient(90deg, rgba(255,132,28,0.08), transparent)",
                        borderRadius: 8,
                        marginBottom: 14,
                    }}
                >
                    <Lock size={14} color="#FF841C" />
                    <span
                        style={{
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: 9,
                            color: "#FF841C",
                            lineHeight: 1.6,
                            letterSpacing: 0.5,
                        }}
                    >
                        {sealedEquipment
                            ? "LOADOUT SEALED — FIRST SPIN CONSUMED"
                            : "RUN ALREADY STARTED — LOADOUT LOCKED"}
                    </span>
                </div>
            )}

            {/* Altar sockets */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 10,
                    marginBottom: 20,
                }}
            >
                {Array.from({ length: MAX_CHARMS }).map((_, idx) => {
                    const def = displayedSlots[idx];
                    const pal = def ? rarity(def) : null;
                    return (
                        <motion.div
                            key={`slot-${idx}`}
                            className="charm-scanline"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: idx * 0.05 }}
                            onClick={() => {
                                if (isLocked) return;
                                if (def) onToggle(def.charm_id);
                            }}
                            style={{
                                position: "relative",
                                aspectRatio: "1 / 1.15",
                                background: def
                                    ? `radial-gradient(circle at 50% 40%, ${pal!.tint}, #000 85%)`
                                    : "radial-gradient(circle at 50% 40%, rgba(255,132,28,0.05), #000 80%)",
                                border: def
                                    ? `1.5px solid ${pal!.border}`
                                    : "1.5px dashed rgba(255, 132, 28, 0.35)",
                                borderRadius: 10,
                                cursor: def && !isLocked ? "pointer" : "default",
                                overflow: "hidden",
                                boxShadow: def
                                    ? `0 0 0 1px rgba(0,0,0,0.4) inset, 0 0 20px ${pal!.glow}`
                                    : "none",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            {/* Corner sigils */}
                            {[0, 1, 2, 3].map((c) => (
                                <span
                                    key={c}
                                    style={{
                                        position: "absolute",
                                        width: 6,
                                        height: 6,
                                        background: def ? pal!.border : "rgba(255, 132, 28, 0.5)",
                                        top: c < 2 ? 4 : "auto",
                                        bottom: c >= 2 ? 4 : "auto",
                                        left: c % 2 === 0 ? 4 : "auto",
                                        right: c % 2 === 1 ? 4 : "auto",
                                    }}
                                />
                            ))}

                            {def ? (
                                <>
                                    <div
                                        className="charm-ember"
                                        style={{
                                            position: "absolute",
                                            inset: 0,
                                            background: `radial-gradient(circle at 50% 55%, ${pal!.glow}, transparent 65%)`,
                                            pointerEvents: "none",
                                        }}
                                    />
                                    <img
                                        src={def.image}
                                        alt={def.name}
                                        style={{
                                            width: "58%",
                                            height: "58%",
                                            objectFit: "contain",
                                            imageRendering: "pixelated",
                                            filter: `drop-shadow(0 0 8px ${pal!.glow})`,
                                            zIndex: 1,
                                        }}
                                    />
                                    <div
                                        style={{
                                            position: "absolute",
                                            bottom: 6,
                                            left: 0,
                                            right: 0,
                                            textAlign: "center",
                                            fontFamily: "'PressStart2P', monospace",
                                            fontSize: 6.5,
                                            color: pal!.label,
                                            letterSpacing: 0.5,
                                            textTransform: "uppercase",
                                            zIndex: 1,
                                            padding: "0 4px",
                                            lineHeight: 1.2,
                                        }}
                                    >
                                        {def.name}
                                    </div>
                                    {!isLocked && (
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: 6,
                                                right: 6,
                                                background: "rgba(0,0,0,0.6)",
                                                border: `1px solid ${pal!.border}`,
                                                borderRadius: 999,
                                                width: 18,
                                                height: 18,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                zIndex: 2,
                                            }}
                                        >
                                            <X size={10} color={pal!.label} />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div
                                        className="charm-socket-dashes"
                                        style={{
                                            position: "absolute",
                                            inset: 14,
                                            border: "1px dashed rgba(255, 132, 28, 0.25)",
                                            borderRadius: "50%",
                                        }}
                                    />
                                    <Flame
                                        size={22}
                                        color="rgba(255, 132, 28, 0.45)"
                                        className="charm-ember"
                                    />
                                    <div
                                        style={{
                                            marginTop: 8,
                                            fontFamily: "'PressStart2P', monospace",
                                            fontSize: 7,
                                            color: "rgba(255, 132, 28, 0.55)",
                                            letterSpacing: 1,
                                        }}
                                    >
                                        EMPTY
                                    </div>
                                </>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Status line */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                    padding: "8px 10px",
                    background: "rgba(255, 132, 28, 0.05)",
                    border: "1px solid rgba(255, 132, 28, 0.2)",
                    borderRadius: 6,
                }}
            >
                <span
                    style={{
                        fontFamily: "'PressStart2P', monospace",
                        fontSize: 8,
                        color: "rgba(255,255,255,0.6)",
                        letterSpacing: 0.5,
                    }}
                >
                    OWNED // {ownedDefs.length}
                </span>
                <span
                    style={{
                        fontFamily: "'PressStart2P', monospace",
                        fontSize: 8,
                        color: isLocked ? "#FF4444" : remaining === 0 ? "#4ADE80" : "#FF841C",
                        letterSpacing: 0.5,
                    }}
                >
                    {isLocked
                        ? "LOCKED"
                        : remaining === 0
                            ? "LOADOUT FULL"
                            : `${remaining} SLOT${remaining === 1 ? "" : "S"} LEFT`}
                </span>
            </div>

            {/* Owned grid */}
            {isLocked ? null : ownedDefs.length === 0 ? (
                <div
                    style={{
                        textAlign: "center",
                        padding: "28px 16px",
                        border: "1px dashed rgba(255, 132, 28, 0.3)",
                        borderRadius: 8,
                        marginBottom: 16,
                    }}
                >
                    <div
                        style={{
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: 10,
                            color: "#FF841C",
                            marginBottom: 10,
                            letterSpacing: 1,
                        }}
                    >
                        NO CHARMS BOUND
                    </div>
                    <div
                        style={{
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: 8,
                            color: "rgba(255,255,255,0.5)",
                            lineHeight: 1.7,
                        }}
                    >
                        survive runs to earn charms.
                        <br />
                        they will appear here.
                    </div>
                </div>
            ) : (
                <div
                    className="charm-card-grid"
                    style={{
                        marginBottom: 16,
                        maxHeight: "min(40vh, 320px)",
                        overflowY: "auto",
                        paddingRight: 4,
                    }}
                >
                    <AnimatePresence>
                        {ownedDefs.map((def, i) => {
                            const pal = rarity(def);
                            const equipped = loadout.includes(def.charm_id);
                            const full = loadout.length >= MAX_CHARMS;
                            const disabled = !equipped && full;
                            const isHovered = hoveredCharm === def.charm_id;

                            return (
                                <motion.button
                                    key={def.charm_id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2, delay: i * 0.02 }}
                                    onMouseEnter={() => setHoveredCharm(def.charm_id)}
                                    onMouseLeave={() => setHoveredCharm(null)}
                                    onClick={() => {
                                        if (disabled) return;
                                        onToggle(def.charm_id);
                                    }}
                                    disabled={disabled}
                                    whileTap={disabled ? {} : { scale: 0.96 }}
                                    style={{
                                        position: "relative",
                                        background: equipped
                                            ? `linear-gradient(180deg, ${pal.tint}, rgba(0,0,0,0.9))`
                                            : "rgba(0,0,0,0.75)",
                                        border: equipped
                                            ? `1.5px solid ${pal.border}`
                                            : `1px solid rgba(255,255,255,0.06)`,
                                        borderRadius: 8,
                                        padding: "10px 8px 8px",
                                        cursor: disabled ? "not-allowed" : "pointer",
                                        opacity: disabled ? 0.3 : 1,
                                        overflow: "hidden",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        gap: 6,
                                        boxShadow: equipped
                                            ? `0 0 14px ${pal.glow}`
                                            : isHovered
                                                ? `0 0 8px rgba(255,132,28,0.25)`
                                                : "none",
                                        transition: "box-shadow 0.18s ease, border 0.18s ease",
                                    }}
                                >
                                    {equipped && (
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: 4,
                                                right: 4,
                                                background: pal.border,
                                                color: "#000",
                                                fontFamily: "'PressStart2P', monospace",
                                                fontSize: 6,
                                                padding: "2px 4px",
                                                borderRadius: 2,
                                                letterSpacing: 0.5,
                                            }}
                                        >
                                            EQ
                                        </div>
                                    )}
                                    <div
                                        style={{
                                            width: "72%",
                                            aspectRatio: "1",
                                            position: "relative",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        {equipped && (
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    inset: -2,
                                                    background: `radial-gradient(circle, ${pal.glow}, transparent 70%)`,
                                                    filter: "blur(4px)",
                                                }}
                                            />
                                        )}
                                        <img
                                            src={def.image}
                                            alt={def.name}
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "contain",
                                                imageRendering: "pixelated",
                                                filter: equipped
                                                    ? `drop-shadow(0 0 4px ${pal.glow})`
                                                    : "grayscale(0.3)",
                                                position: "relative",
                                                zIndex: 1,
                                            }}
                                        />
                                    </div>
                                    <div
                                        style={{
                                            fontFamily: "'PressStart2P', monospace",
                                            fontSize: 7,
                                            color: equipped ? "#FFF" : "rgba(255,255,255,0.7)",
                                            textTransform: "uppercase",
                                            textAlign: "center",
                                            lineHeight: 1.3,
                                            letterSpacing: 0.3,
                                        }}
                                    >
                                        {def.name}
                                    </div>
                                    <div
                                        style={{
                                            fontFamily: "'PressStart2P', monospace",
                                            fontSize: 6,
                                            color: pal.label,
                                            textTransform: "uppercase",
                                            letterSpacing: 1,
                                        }}
                                    >
                                        {def.rarity}
                                    </div>
                                </motion.button>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Error */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        style={{
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: 8,
                            color: "#FF4444",
                            padding: "8px 10px",
                            border: "1px solid rgba(255, 68, 68, 0.4)",
                            borderRadius: 6,
                            background: "rgba(255, 68, 68, 0.08)",
                            marginBottom: 10,
                            lineHeight: 1.6,
                        }}
                    >
                        {error.slice(0, 120)}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer actions */}
            <div
                style={{
                    display: "flex",
                    gap: 10,
                    marginTop: "auto",
                    paddingTop: 10,
                    borderTop: "1px solid rgba(255, 132, 28, 0.2)",
                }}
            >
                {!isLocked && loadout.length > 0 && (
                    <motion.button
                        whileHover={{ color: "#FF4444", borderColor: "#FF4444" }}
                        whileTap={{ scale: 0.96 }}
                        onClick={onClear}
                        style={{
                            flex: "0 0 auto",
                            background: "transparent",
                            border: "1px solid rgba(255,255,255,0.15)",
                            color: "rgba(255,255,255,0.6)",
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: 8,
                            padding: "10px 12px",
                            borderRadius: 6,
                            cursor: "pointer",
                            letterSpacing: 0.5,
                        }}
                    >
                        CLEAR
                    </motion.button>
                )}
                {isLocked ? (
                    <motion.button
                        onClick={onClose}
                        whileTap={{ scale: 0.97 }}
                        style={{
                            flex: 1,
                            background: "#160900",
                            border: "1px solid #FF841C",
                            color: "#FF841C",
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: 10,
                            padding: "12px 16px",
                            borderRadius: 6,
                            cursor: "pointer",
                            letterSpacing: 1.5,
                        }}
                    >
                        <ArrowLeft
                            size={12}
                            style={{ verticalAlign: "middle", marginRight: 6 }}
                        />
                        RETURN
                    </motion.button>
                ) : (
                    <motion.button
                        onClick={handleSeal}
                        disabled={isSubmitting}
                        whileTap={!isSubmitting ? { scale: 0.97 } : {}}
                        whileHover={!isSubmitting ? { backgroundColor: "#1f0c00" } : {}}
                        style={{
                            flex: 1,
                            background: "#160900",
                            border: "1px solid #FF841C",
                            color: "#FF841C",
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: 10,
                            padding: "12px 16px",
                            borderRadius: 6,
                            cursor: isSubmitting ? "default" : "pointer",
                            letterSpacing: 1.5,
                            position: "relative",
                            overflow: "hidden",
                            opacity: isSubmitting ? 0.7 : 1,
                        }}
                    >
                        {isSubmitting ? (
                            <span style={{ opacity: 0.8 }}>
                                SEALING{" "}
                                <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                                    style={{ display: "inline-block" }}
                                >
                                    ⟳
                                </motion.span>
                            </span>
                        ) : loadout.length === 0 ? (
                            "ENTER EMPTY"
                        ) : (
                            "> SEAL LOADOUT"
                        )}
                    </motion.button>
                )}
            </div>

            {/* Footer hint */}
            {!isLocked && (
                <div
                    style={{
                        fontFamily: "'PressStart2P', monospace",
                        fontSize: 7,
                        color: "rgba(255,255,255,0.35)",
                        textAlign: "center",
                        marginTop: 10,
                        lineHeight: 1.6,
                        letterSpacing: 0.5,
                    }}
                >
                    once the first spin rolls, the altar seals shut.
                </div>
            )}
        </ModalWrapper>
    );
}
