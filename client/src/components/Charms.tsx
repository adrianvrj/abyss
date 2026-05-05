import { useCallback, useEffect, useMemo, useState } from "react";
import { useNetwork } from "@starknet-react/core";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, RefreshCw, Sparkles, X } from "lucide-react";
import { DEFAULT_CHAIN_ID, getCharmAddress, getChipAddress } from "@/config";
import { getCharmForgeCostInToken, getCharmMetadata, getPlayerCharms } from "@/api/rpc/relic";
import { useAbyssActions } from "@/hooks/actions";
import { useController } from "@/hooks/useController";
import { CHIP_TOKEN_IMAGE_URL } from "@/lib/constants";
import { STATIC_CHARM_DEFINITIONS, type StaticCharmDefinition } from "@/lib/charmCatalog";
import { getCharmRarityLabel } from "@/lib/charmRules";
import CharmForgeAnimation from "@/components/CharmForgeAnimation";

const ALL_CHARMS = Object.values(STATIC_CHARM_DEFINITIONS).map((charm) => ({
    id: charm.charm_id,
    name: charm.name,
    rarity: charm.rarity,
    effect: charm.effect,
    description: charm.description,
    luck: charm.luck,
    cost: charm.shop_cost,
    image: charm.image,
}));

const RARITY_COLORS: Record<string, string> = {
    Common: "#9CA3AF",
    Rare: "#60A5FA",
    Epic: "#C084FC",
    Legendary: "#FFD36A",
};

const RARITY_ORDER: Record<string, number> = {
    Common: 0,
    Rare: 1,
    Epic: 2,
    Legendary: 3,
};

const RARITY_LABELS = ["Common", "Rare", "Epic", "Legendary"] as const;

const ODDS_BY_COMPOSITION: Record<string, [number, number, number, number]> = {
    "0-0-0": [80, 18, 2, 0],
    "0-0-1": [55, 40, 5, 0],
    "0-1-1": [15, 75, 10, 0],
    "1-1-1": [0, 76, 24, 0],
    "0-0-2": [45, 35, 20, 0],
    "0-1-2": [10, 65, 25, 0],
    "1-1-2": [0, 55, 45, 0],
    "0-2-2": [5, 30, 65, 0],
    "1-2-2": [0, 12, 88, 0],
    "2-2-2": [0, 0, 95, 5],
    "0-0-3": [35, 35, 25, 5],
    "0-1-3": [8, 57, 30, 5],
    "1-1-3": [0, 45, 50, 5],
    "0-2-3": [5, 20, 65, 10],
    "1-2-3": [0, 10, 78, 12],
    "2-2-3": [0, 0, 84, 16],
    "0-3-3": [0, 20, 60, 20],
    "1-3-3": [0, 5, 65, 30],
    "2-3-3": [0, 0, 58, 42],
    "3-3-3": [0, 0, 0, 100],
};

interface OwnedCharmToken {
    tokenId: bigint;
    charmId: number;
    name: string;
    rarity: string;
    effect: string;
    description: string;
    image: string;
}

const formatTokenId = (tokenId: bigint) => `#${tokenId.toString().slice(-6)}`;

function toForgeView(charm: OwnedCharmToken) {
    return {
        tokenId: charm.tokenId,
        name: charm.name,
        rarity: charm.rarity,
        image: charm.image,
    };
}

function getStaticFallback(charmId: number): StaticCharmDefinition | null {
    return STATIC_CHARM_DEFINITIONS[charmId] ?? null;
}

function getCompositionOdds(charms: OwnedCharmToken[]) {
    if (charms.length !== 3) return [];

    const key = charms
        .map((charm) => RARITY_ORDER[charm.rarity] ?? 0)
        .sort((a, b) => a - b)
        .join("-");
    const odds = ODDS_BY_COMPOSITION[key];
    if (!odds) return [];

    return odds
        .map((chance, index) => ({ rarity: RARITY_LABELS[index], chance }))
        .filter((entry) => entry.chance > 0);
}

function parseError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error ?? "Transaction failed");
    const lower = message.toLowerCase();
    if (lower.includes("duplicate")) return "Duplicate token IDs";
    if (lower.includes("unsupported")) return "Unsupported token";
    if (lower.includes("not charm owner") || lower.includes("not owner")) return "Not owner";
    if (lower.includes("allowance") || lower.includes("approve")) return "Missing approval";
    if (lower.includes("balance") || lower.includes("insufficient")) return "Insufficient CHIP balance";
    if (lower.includes("reject") || lower.includes("cancel")) return "Transaction rejected";
    return message.slice(0, 140);
}

export function Charms() {
    const navigate = useNavigate();
    const { chain } = useNetwork();
    const { account } = useController();
    const { rerollCharms } = useAbyssActions();
    const [ownedCharms, setOwnedCharms] = useState<OwnedCharmToken[]>([]);
    const [selectedTokenIds, setSelectedTokenIds] = useState<bigint[]>([]);
    const [forgeCost, setForgeCost] = useState<bigint>(4_444n * 10n ** 18n);
    const [isLoading, setIsLoading] = useState(true);
    const [isForging, setIsForging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [animationPayload, setAnimationPayload] = useState<{
        materials: OwnedCharmToken[];
        result: OwnedCharmToken;
    } | null>(null);
    const chainId = chain?.id ?? DEFAULT_CHAIN_ID;
    const charmAddress = getCharmAddress(chainId);
    const chipAddress = getChipAddress(chainId);

    const loadData = useCallback(async () => {
        if (!account || !charmAddress || charmAddress === "0x0") {
            setOwnedCharms([]);
            setIsLoading(false);
            return [] as OwnedCharmToken[];
        }
        setIsLoading(true);

        try {
            const [cost, tokenIds] = await Promise.all([
                getCharmForgeCostInToken(chainId, charmAddress, chipAddress).catch(() => 4_444n * 10n ** 18n),
                getPlayerCharms(chainId, charmAddress, account.address),
            ]);
            setForgeCost(cost);

            const tokenResults = await Promise.all(tokenIds.map(async (tokenId) => {
                try {
                    const metadata = await getCharmMetadata(chainId, charmAddress, tokenId);
                    const staticDef = getStaticFallback(Number(metadata?.charmId ?? 0));
                    const rarity = getCharmRarityLabel(Number(metadata?.rarity ?? RARITY_ORDER[staticDef?.rarity ?? "Common"] ?? 0));
                    return {
                        tokenId,
                        charmId: Number(metadata?.charmId ?? staticDef?.charm_id ?? 0),
                        name: staticDef?.name ?? metadata?.name ?? "Unknown Charm",
                        rarity: staticDef?.rarity ?? rarity,
                        effect: staticDef?.effect ?? "",
                        description: staticDef?.description ?? "",
                        image: staticDef?.image ?? "/images/charms/1.png",
                    };
                } catch (metadataError) {
                    console.warn("Skipping stale charm token:", tokenId.toString(), metadataError);
                    return null;
                }
            }));
            const tokens = tokenResults.filter(Boolean) as OwnedCharmToken[];

            tokens.sort((a, b) => {
                const rarityDiff = (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0);
                if (rarityDiff !== 0) return rarityDiff;
                return a.charmId - b.charmId || Number(a.tokenId - b.tokenId);
            });
            setOwnedCharms(tokens);
            setSelectedTokenIds((prev) => prev.filter((tokenId) => tokens.some((token) => token.tokenId === tokenId)));
            return tokens;
        } catch (e) {
            console.error("Failed to load charms:", e);
            setError("Failed to load charms");
            return [] as OwnedCharmToken[];
        } finally {
            setIsLoading(false);
        }
    }, [account, chainId, charmAddress, chipAddress]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const ownedCharmIds = useMemo(
        () => new Set(ownedCharms.map((charm) => charm.charmId)),
        [ownedCharms],
    );

    const selectedCharms = useMemo(
        () => selectedTokenIds
            .map((tokenId) => ownedCharms.find((charm) => charm.tokenId === tokenId))
            .filter(Boolean) as OwnedCharmToken[],
        [ownedCharms, selectedTokenIds],
    );

    const odds = useMemo(() => getCompositionOdds(selectedCharms), [selectedCharms]);
    const canForge = selectedCharms.length === 3 && !isForging;
    const forgeCostChip = Number(forgeCost / 10n ** 18n).toLocaleString("en-US");

    const toggleSelected = (tokenId: bigint) => {
        setError(null);
        setSelectedTokenIds((prev) => {
            if (prev.includes(tokenId)) return prev.filter((id) => id !== tokenId);
            if (prev.length >= 3) return prev;
            return [...prev, tokenId];
        });
    };

    const handleForge = async () => {
        if (!canForge) return;
        setError(null);
        setIsForging(true);
        const materials = [...selectedCharms];

        try {
            const receipt = await rerollCharms(
                [materials[0]!.tokenId, materials[1]!.tokenId, materials[2]!.tokenId],
                chipAddress,
                forgeCost,
            );
            const nextOwned = await loadData();
            const rerollEvent = receipt.events.charmRerolled;
            const mintedToken = rerollEvent?.newTokenId
                ? nextOwned.find((charm) => charm.tokenId === rerollEvent.newTokenId)
                : null;
            const eventCharm = rerollEvent?.newCharmId
                ? getStaticFallback(rerollEvent.newCharmId)
                : null;
            const result = eventCharm
                ? {
                    tokenId: rerollEvent!.newTokenId,
                    charmId: eventCharm.charm_id,
                    name: eventCharm.name,
                    rarity: eventCharm.rarity,
                    effect: eventCharm.effect,
                    description: eventCharm.description,
                    image: eventCharm.image,
                }
                : mintedToken;

            if (result) {
                setAnimationPayload({ materials, result });
            } else {
                setError("Forge succeeded. Refresh charms to view the result.");
            }
            setSelectedTokenIds([]);
        } catch (e) {
            setError(parseError(e));
        } finally {
            setIsForging(false);
        }
    };

    return (
        <div className="charms-page">
            {isLoading && (
                <div className="charms-loading">
                    Loading...
                </div>
            )}

            <div className="charms-header">
                <button className="charms-back" onClick={() => navigate("/")}>
                    <ArrowLeft size={24} />
                </button>
                <h1>CHARMS</h1>
                <div className="charms-count">
                    {ownedCharmIds.size}/{ALL_CHARMS.length} owned
                </div>
            </div>

            <section className="forge-panel">
                <div className="forge-bg-runes" />
                <div className="forge-copy">
                    <div className="forge-kicker">CHARM FORGE</div>
                    <h2>REROLL CHARM</h2>
                    <p>Burn 3 owned CHARM NFTs + {forgeCostChip} CHIP to forge 1 new random CHARM.</p>
                    <div className="forge-fee-row">
                        <span><img src={CHIP_TOKEN_IMAGE_URL} alt="CHIP" /> {forgeCostChip} CHIP</span>
                    </div>
                </div>

                <div className="forge-altar">
                    <div className="forge-core">
                        <RefreshCw size={34} />
                        <span>{selectedCharms.length}/3</span>
                    </div>
                    {[0, 1, 2].map((slot) => {
                        const charm = selectedCharms[slot];
                        const color = charm ? RARITY_COLORS[charm.rarity] : "#FF841C";
                        return (
                            <button
                                key={`forge-slot-${slot}`}
                                className={`forge-slot forge-slot-${slot + 1} ${charm ? "filled" : ""}`}
                                onClick={() => charm && toggleSelected(charm.tokenId)}
                                style={{ borderColor: color }}
                            >
                                {charm ? (
                                    <>
                                        <X className="forge-slot-remove" size={12} />
                                        <img src={charm.image} alt={charm.name} />
                                        <strong>{charm.name}</strong>
                                        <span style={{ color }}>{charm.rarity} {formatTokenId(charm.tokenId)}</span>
                                    </>
                                ) : (
                                    <>
                                        <Flame size={24} />
                                        <span>EMPTY</span>
                                    </>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="forge-mobile-flow">
                    <div className="forge-mobile-status">
                        <div>
                            <RefreshCw size={24} />
                            <strong>FORGE STATUS</strong>
                        </div>
                        <span>{selectedCharms.length}/3</span>
                    </div>
                    <div className="forge-mobile-steps">
                        <span>1 SELECT 3</span>
                        <span>2 BURN + PAY</span>
                        <span>3 GET 1 NEW</span>
                    </div>
                    <div className="forge-mobile-materials">
                        {[0, 1, 2].map((slot) => {
                            const charm = selectedCharms[slot];
                            const color = charm ? RARITY_COLORS[charm.rarity] : "#FF841C";
                            return (
                                <button
                                    key={`forge-mobile-slot-${slot}`}
                                    className={`forge-mobile-slot ${charm ? "filled" : ""}`}
                                    onClick={() => charm && toggleSelected(charm.tokenId)}
                                    style={{ borderColor: color }}
                                >
                                    {charm ? (
                                        <>
                                            <X className="forge-slot-remove" size={12} />
                                            <img src={charm.image} alt={charm.name} />
                                            <div>
                                                <strong>{charm.name}</strong>
                                                <span style={{ color }}>{charm.rarity} {formatTokenId(charm.tokenId)}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Flame size={18} />
                                            <strong>EMPTY MATERIAL</strong>
                                        </>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <div className="forge-warning">THE 3 SELECTED CHARMS WILL BE BURNED.</div>
                    <div className="forge-odds">
                        <div className="forge-side-label">ODDS</div>
                        <p>Based on all 3 selected rarities.</p>
                        {odds.length > 0 ? odds.map((entry) => (
                            <div key={entry.rarity} className="forge-odd-row">
                                <span style={{ color: RARITY_COLORS[entry.rarity] }}>{entry.rarity}</span>
                                <strong>{entry.chance}%</strong>
                            </div>
                        )) : (
                            <div className="forge-empty-odds">Select 3 charms</div>
                        )}
                        <div className="forge-mobile-cta">
                            <motion.button
                                whileTap={canForge ? { scale: 0.97 } : {}}
                                className="forge-button"
                                disabled={!canForge}
                                onClick={handleForge}
                            >
                                {isForging ? "FORGING..." : "FORGE CHARM"}
                            </motion.button>
                        </div>
                    </div>
                    {error && <div className="forge-error">{error}</div>}
                </div>

                <div className="forge-side">
                    <div className="forge-warning">THE 3 SELECTED CHARMS WILL BE BURNED.</div>
                    <div className="forge-odds">
                        <div className="forge-side-label">ODDS</div>
                        <p>Based on all 3 selected rarities.</p>
                        {odds.length > 0 ? odds.map((entry) => (
                            <div key={entry.rarity} className="forge-odd-row">
                                <span style={{ color: RARITY_COLORS[entry.rarity] }}>{entry.rarity}</span>
                                <strong>{entry.chance}%</strong>
                            </div>
                        )) : (
                            <div className="forge-empty-odds">Select 3 charms</div>
                        )}
                    </div>
                    {error && <div className="forge-error">{error}</div>}
                    <motion.button
                        whileTap={canForge ? { scale: 0.97 } : {}}
                        className="forge-button"
                        disabled={!canForge}
                        onClick={handleForge}
                    >
                        {isForging ? "FORGING..." : "FORGE CHARM"}
                    </motion.button>
                </div>
            </section>

            <div className="owned-token-strip">
                <div>
                    <Sparkles size={14} />
                    OWNED MATERIALS
                </div>
                <span>{ownedCharms.length} NFT{ownedCharms.length === 1 ? "" : "S"}</span>
            </div>

            <div className="owned-token-grid">
                {ownedCharms.map((charm) => {
                    const color = RARITY_COLORS[charm.rarity] ?? "#FF841C";
                    const selected = selectedTokenIds.includes(charm.tokenId);
                    const disabled = !selected && selectedTokenIds.length >= 3;
                    return (
                        <motion.button
                            key={charm.tokenId.toString()}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`owned-token-card ${selected ? "selected" : ""}`}
                            disabled={disabled}
                            onClick={() => toggleSelected(charm.tokenId)}
                            style={{
                                borderColor: selected ? color : "rgba(255,132,28,0.18)",
                                opacity: disabled ? 0.35 : 1,
                                background: selected ? "rgba(255,132,28,0.08)" : undefined,
                            }}
                        >
                            <img src={charm.image} alt={charm.name} />
                            <strong>{charm.name}</strong>
                            <span style={{ color }}>{charm.rarity}</span>
                            <small>{formatTokenId(charm.tokenId)}</small>
                        </motion.button>
                    );
                })}
            </div>

            <div className="charm-collection-title">CATALOG</div>
            <div className="charm-grid">
                {ALL_CHARMS.map((charm) => {
                    const isOwned = ownedCharmIds.has(charm.id);
                    const rarityColor = RARITY_COLORS[charm.rarity];

                    return (
                        <motion.div
                            key={charm.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="charm-catalog-card"
                            style={{ borderColor: isOwned ? rarityColor : "rgba(255, 132, 28, 0.1)" }}
                        >
                            <div className="charm-rarity-pill" style={{ background: rarityColor }}>
                                {charm.rarity.toUpperCase()}
                            </div>

                            {isOwned && <div className="charm-owned-pill">OWNED</div>}

                            <div className="charm-image-wrap">
                                <img
                                    src={charm.image}
                                    alt={charm.name}
                                    style={{ filter: isOwned ? "none" : "grayscale(100%) opacity(0.3)" }}
                                />
                            </div>

                            <h3 style={{ color: isOwned ? "#fff" : "#888" }}>{charm.name}</h3>
                            <p className="charm-effect" style={{ color: isOwned ? rarityColor : "#666" }}>{charm.effect}</p>
                            <p className="charm-description">{charm.description}</p>

                            <div className="charm-card-footer">
                                {charm.luck > 0 && <span style={{ color: isOwned ? "#FF841C" : "#444" }}>+{charm.luck} LUCK</span>}
                                <span>{charm.cost} <img src="/images/ticket.png" alt="T" /></span>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {animationPayload && (
                <CharmForgeAnimation
                    materials={animationPayload.materials.map(toForgeView)}
                    result={toForgeView(animationPayload.result)}
                    onComplete={() => setAnimationPayload(null)}
                />
            )}

            <style>{`
                .charms-page {
                    min-height: 100vh;
                    height: 100vh;
                    overflow-y: auto;
                    background: #000;
                    padding: 24px;
                    font-family: 'PressStart2P', monospace;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    color: #fff;
                }
                .charms-loading {
                    position: fixed;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0,0,0,0.9);
                    z-index: 9999;
                    color: #FF841C;
                }
                .charms-header {
                    width: 100%;
                    max-width: 1200px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 22px;
                }
                .charms-back {
                    background: transparent;
                    border: none;
                    color: #FF841C;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                }
                .charms-header h1 {
                    font-size: 20px;
                    color: #FF841C;
                    margin: 0;
                    letter-spacing: 1px;
                }
                .charms-count {
                    font-size: 10px;
                    color: #777;
                }
                .forge-panel {
                    width: 100%;
                    max-width: 1200px;
                    min-height: 430px;
                    position: relative;
                    overflow: hidden;
                    display: grid;
                    grid-template-columns: 1fr minmax(360px, 1.15fr) 0.85fr;
                    gap: 20px;
                    border: 1px solid rgba(255,132,28,0.32);
                    border-radius: 8px;
                    background:
                        linear-gradient(90deg, rgba(255,132,28,0.055), rgba(0,0,0,0.82)),
                        #050201;
                    padding: 22px;
                    margin-bottom: 18px;
                }
                .forge-bg-runes {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    background: repeating-linear-gradient(90deg, rgba(255,132,28,0.025) 0 1px, transparent 1px 32px);
                    mask-image: radial-gradient(circle at center, black, transparent 78%);
                }
                .forge-copy,
                .forge-side,
                .forge-altar {
                    position: relative;
                    z-index: 1;
                }
                .forge-copy {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 14px;
                }
                .forge-kicker,
                .forge-side-label,
                .charm-collection-title {
                    font-size: 8px;
                    color: rgba(255,132,28,0.72);
                    letter-spacing: 1.5px;
                }
                .forge-copy h2 {
                    font-size: clamp(18px, 3vw, 34px);
                    line-height: 1.18;
                    margin: 0;
                    color: #FF841C;
                }
                .forge-copy p {
                    font-size: 9px;
                    line-height: 1.8;
                    color: rgba(255,255,255,0.66);
                    margin: 0;
                }
                .forge-fee-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .forge-fee-row span {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    border: 1px solid rgba(255,132,28,0.28);
                    border-radius: 6px;
                    background: #0b0400;
                    color: rgba(255,255,255,0.76);
                    padding: 8px;
                    font-size: 7px;
                }
                .forge-fee-row img {
                    width: 14px;
                    height: 14px;
                }
                .forge-altar {
                    min-height: 390px;
                }
                .forge-core {
                    position: absolute;
                    left: 50%;
                    top: 54%;
                    width: 132px;
                    height: 132px;
                    transform: translate(-50%, -50%);
                    border-radius: 50%;
                    border: 1px solid rgba(255,132,28,0.55);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    color: #FF841C;
                    background:
                        conic-gradient(from 0deg, rgba(255,132,28,0.09), rgba(255,132,28,0.02), rgba(255,132,28,0.09)),
                        #000;
                }
                .forge-core span {
                    font-size: 9px;
                }
                .forge-slot {
                    position: absolute;
                    width: 136px;
                    min-height: 168px;
                    border: 1.5px dashed rgba(255,132,28,0.35);
                    border-radius: 8px;
                    background: rgba(0,0,0,0.82);
                    color: rgba(255,132,28,0.55);
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 7px;
                    padding: 10px;
                    overflow: hidden;
                }
                .forge-slot.filled {
                    border-style: solid;
                    color: #fff;
                }
                .forge-slot-1 { left: 50%; top: 4px; transform: translateX(-50%); }
                .forge-slot-2 { left: 8px; bottom: 8px; }
                .forge-slot-3 { right: 8px; bottom: 8px; }
                .forge-slot img {
                    width: 74px;
                    height: 74px;
                    object-fit: contain;
                    image-rendering: pixelated;
                }
                .forge-slot strong {
                    font-size: 7px;
                    line-height: 1.3;
                    text-align: center;
                    text-transform: uppercase;
                }
                .forge-slot span {
                    font-size: 6px;
                    line-height: 1.3;
                    text-align: center;
                    text-transform: uppercase;
                }
                .forge-slot-remove {
                    position: absolute;
                    top: 7px;
                    right: 7px;
                    color: rgba(255,255,255,0.65);
                }
                .forge-side {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 12px;
                }
                .forge-mobile-flow {
                    display: none;
                }
                .forge-warning,
                .forge-error {
                    border: 1px solid rgba(255,68,68,0.45);
                    background: rgba(255,68,68,0.08);
                    color: #FF6B6B;
                    border-radius: 6px;
                    padding: 10px;
                    font-size: 8px;
                    line-height: 1.6;
                }
                .forge-odds {
                    border: 1px solid rgba(255,132,28,0.22);
                    background: rgba(0,0,0,0.58);
                    border-radius: 6px;
                    padding: 12px;
                }
                .forge-odds p {
                    margin: 8px 0 4px;
                    color: rgba(255,255,255,0.5);
                    font-size: 7px;
                    line-height: 1.5;
                }
                .forge-odd-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 9px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    font-size: 8px;
                }
                .forge-odd-row:last-child {
                    border-bottom: none;
                }
                .forge-empty-odds {
                    color: rgba(255,255,255,0.45);
                    font-size: 8px;
                    padding-top: 12px;
                }
                .forge-button {
                    border: 1px solid rgba(255,132,28,0.75);
                    border-radius: 6px;
                    background: #FF841C;
                    color: #000;
                    font-family: 'PressStart2P', monospace;
                    font-size: 10px;
                    padding: 14px 12px;
                    cursor: pointer;
                }
                .forge-button:disabled {
                    cursor: not-allowed;
                    opacity: 0.45;
                    filter: grayscale(0.8);
                }
                .owned-token-strip {
                    width: 100%;
                    max-width: 1200px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin: 8px 0 12px;
                    color: rgba(255,255,255,0.65);
                    font-size: 8px;
                }
                .owned-token-strip div {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #FF841C;
                }
                .owned-token-grid {
                    width: 100%;
                    max-width: 1200px;
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
                    gap: 12px;
                    margin-bottom: 30px;
                }
                .owned-token-card {
                    min-height: 168px;
                    border: 1px solid rgba(255,132,28,0.18);
                    border-radius: 8px;
                    background: rgba(0,0,0,0.72);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 7px;
                    padding: 10px;
                    cursor: pointer;
                    color: #fff;
                    font-family: 'PressStart2P', monospace;
                }
                .owned-token-card.selected {
                    border-style: solid;
                }
                .owned-token-card img {
                    width: 72px;
                    height: 72px;
                    object-fit: contain;
                    image-rendering: pixelated;
                }
                .owned-token-card strong {
                    font-size: 7px;
                    line-height: 1.35;
                    text-align: center;
                    text-transform: uppercase;
                }
                .owned-token-card span,
                .owned-token-card small {
                    font-size: 6px;
                    text-transform: uppercase;
                }
                .charm-collection-title {
                    width: 100%;
                    max-width: 1200px;
                    margin-bottom: 12px;
                }
                .charm-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                    gap: 20px;
                    width: 100%;
                    max-width: 1200px;
                }
                .charm-catalog-card {
                    background: rgba(255, 132, 28, 0.05);
                    border: 2px solid;
                    border-radius: 8px;
                    padding: 20px;
                    position: relative;
                }
                .charm-rarity-pill,
                .charm-owned-pill {
                    position: absolute;
                    top: 12px;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 8px;
                    color: #000;
                }
                .charm-rarity-pill { right: 12px; }
                .charm-owned-pill { left: 12px; background: #4ade80; }
                .charm-image-wrap {
                    width: 100%;
                    height: 100px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 16px;
                }
                .charm-image-wrap img {
                    max-height: 80px;
                    image-rendering: pixelated;
                }
                .charm-catalog-card h3 {
                    font-size: 12px;
                    margin: 0 0 8px;
                    line-height: 1.35;
                }
                .charm-effect {
                    font-size: 10px;
                    margin: 0 0 8px;
                    line-height: 1.5;
                }
                .charm-description {
                    font-size: 8px;
                    color: #666;
                    line-height: 1.6;
                    margin: 0 0 12px;
                }
                .charm-card-footer {
                    display: flex;
                    justify-content: space-between;
                    font-size: 9px;
                }
                .charm-card-footer span:last-child {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    color: #666;
                }
                .charm-card-footer img {
                    height: 12px;
                }
                @media (max-width: 900px) {
                    .forge-panel {
                        grid-template-columns: 1fr;
                    }
                    .forge-altar {
                        min-height: 470px;
                    }
                }
                @media (max-width: 520px) {
                    .charms-page {
                        padding: 14px 12px 18px;
                    }
                    .charms-header {
                        margin-bottom: 14px;
                    }
                    .charms-header h1 {
                        font-size: 17px;
                    }
                    .charms-count {
                        max-width: 92px;
                        font-size: 7px;
                        line-height: 1.35;
                        text-align: right;
                    }
                    .forge-panel {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                        height: auto;
                        min-height: auto;
                        padding: 14px;
                        overflow: visible;
                        margin-bottom: 18px;
                    }
                    .forge-copy,
                    .forge-side {
                        width: 100%;
                    }
                    .forge-copy {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        justify-content: flex-start;
                        flex: 0 0 auto;
                        overflow: visible;
                    }
                    .forge-copy > * {
                        min-width: 0;
                    }
                    .forge-kicker {
                        font-size: 7px;
                    }
                    .forge-copy h2 {
                        font-size: 22px;
                    }
                    .forge-copy p {
                        font-size: 8px;
                        line-height: 1.65;
                    }
                    .forge-fee-row {
                        display: grid;
                        grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr) minmax(0, 0.9fr);
                        gap: 6px;
                    }
                    .forge-fee-row span {
                        justify-content: center;
                        min-width: 0;
                        padding: 7px 5px;
                        font-size: 6px;
                        text-align: center;
                    }
                    .forge-fee-row img {
                        width: 12px;
                        height: 12px;
                    }
                    .forge-altar {
                        display: none;
                    }
                    .forge-side {
                        display: none;
                    }
                    .forge-mobile-flow {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                        width: 100%;
                        flex: 0 0 auto;
                        overflow: visible;
                    }
                    .forge-mobile-status {
                        position: relative;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        min-height: 54px;
                        padding: 10px 12px;
                        border: 1px solid rgba(255,132,28,0.42);
                        border-radius: 8px;
                        background:
                            linear-gradient(90deg, rgba(255,132,28,0.07), rgba(0,0,0,0.55)),
                            #030100;
                        color: #FF841C;
                    }
                    .forge-mobile-status div {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    .forge-mobile-status strong {
                        font-size: 8px;
                        letter-spacing: 1px;
                    }
                    .forge-mobile-status span {
                        font-size: 14px;
                    }
                    .forge-mobile-steps {
                        display: grid;
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                        gap: 6px;
                    }
                    .forge-mobile-steps span {
                        min-width: 0;
                        border: 1px solid rgba(255,132,28,0.24);
                        border-radius: 6px;
                        background: rgba(255,132,28,0.07);
                        color: rgba(255,255,255,0.66);
                        font-size: 5.5px;
                        line-height: 1.35;
                        padding: 7px 4px;
                        text-align: center;
                    }
                    .forge-mobile-materials {
                        display: grid;
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                        gap: 8px;
                        width: 100%;
                    }
                    .forge-mobile-slot {
                        position: relative;
                        width: 100%;
                        height: 110px;
                        border: 1.5px dashed rgba(255,132,28,0.35);
                        border-radius: 8px;
                        background: rgba(0,0,0,0.82);
                        color: rgba(255,132,28,0.72);
                        cursor: pointer;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 7px;
                        padding: 9px 5px;
                        font-family: 'PressStart2P', monospace;
                        text-align: center;
                        overflow: hidden;
                    }
                    .forge-mobile-slot.filled {
                        border-style: solid;
                        color: #fff;
                    }
                    .forge-mobile-slot img {
                        width: 44px;
                        height: 44px;
                        object-fit: contain;
                        image-rendering: pixelated;
                    }
                    .forge-mobile-slot strong {
                        display: block;
                        max-width: 100%;
                        font-size: 5.5px;
                        line-height: 1.35;
                        text-transform: uppercase;
                        overflow-wrap: anywhere;
                    }
                    .forge-mobile-slot span {
                        display: block;
                        margin-top: 5px;
                        font-size: 5px;
                        line-height: 1.3;
                        text-transform: uppercase;
                        overflow-wrap: anywhere;
                    }
                    .forge-mobile-slot:not(.filled) {
                        gap: 8px;
                    }
                    .forge-mobile-slot .forge-slot-remove {
                        top: 9px;
                        right: 9px;
                    }
                    .forge-warning,
                    .forge-error {
                        padding: 8px 10px;
                        font-size: 6px;
                    }
                    .forge-warning,
                    .forge-odds,
                    .forge-error,
                    .forge-mobile-cta,
                    .forge-button {
                        position: static;
                        width: 100%;
                    }
                    .forge-mobile-cta {
                        display: block;
                        padding-top: 10px;
                    }
                    .forge-button {
                        margin-top: 0;
                        min-height: 40px;
                        padding: 9px 12px;
                        font-size: 8px;
                    }
                    .forge-odds .forge-button {
                        border-radius: 5px;
                    }
                    .forge-odds {
                        display: block;
                        padding: 10px;
                    }
                    .forge-odds p {
                        font-size: 6px;
                    }
                    .forge-odd-row {
                        padding: 8px 0;
                        font-size: 7px;
                    }
                    .forge-empty-odds {
                        padding-top: 8px;
                        font-size: 7px;
                    }
                    .owned-token-strip {
                        margin-top: 6px;
                    }
                    .owned-token-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        gap: 10px;
                    }
                    .owned-token-card {
                        min-height: 148px;
                    }
                    .charm-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}
