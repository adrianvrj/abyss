import { useCallback, useEffect, useMemo, useState } from "react";
import { useNetwork } from "@starknet-react/core";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingCart, Tag, X } from "lucide-react";
import { DEFAULT_CHAIN_ID, getCharmAddress, getChipAddress } from "@/config";
import { getCharmMetadata, getPlayerCharms } from "@/api/rpc/relic";
import { readUint256Balance } from "@/api/rpc/token";
import { getActiveListings, type MarketListing } from "@/api/torii/charmMarket";
import { useAbyssActions } from "@/hooks/actions";
import { useController } from "@/hooks/useController";
import { CHIP_TOKEN_IMAGE_URL } from "@/lib/constants";
import { STATIC_CHARM_DEFINITIONS } from "@/lib/charmCatalog";

const RARITY_COLORS: Record<string, string> = {
    Common: "#9CA3AF",
    Rare: "#60A5FA",
    Epic: "#C084FC",
    Legendary: "#FFD36A",
};

const ONE_CHIP = 10n ** 18n;

interface OwnedCharmToken {
    tokenId: bigint;
    charmId: number;
    name: string;
    rarity: string;
    image: string;
}

const formatTokenId = (tokenId: bigint) => `#${tokenId.toString().slice(-6)}`;

function formatChip(amount: bigint): string {
    const whole = amount / ONE_CHIP;
    const fraction = (amount % ONE_CHIP) / 10n ** 16n; // 2 decimals
    if (fraction === 0n) return whole.toLocaleString("en-US");
    return `${whole.toLocaleString("en-US")}.${fraction.toString().padStart(2, "0")}`;
}

function charmInfo(charmId: number) {
    const def = STATIC_CHARM_DEFINITIONS[charmId];
    return {
        name: def?.name ?? "Unknown Charm",
        rarity: def?.rarity ?? "Common",
        image: def?.image ?? "/images/charms/1.png",
        effect: def?.effect ?? "",
    };
}

// Returns a user-facing message, or null when the user simply cancelled/rejected
// the wallet prompt (in which case nothing should be shown).
function parseError(error: unknown): string | null {
    let message: string;
    if (error instanceof Error) {
        message = error.message;
    } else if (typeof error === "string") {
        message = error;
    } else if (error && typeof error === "object") {
        const obj = error as Record<string, unknown>;
        message = typeof obj.message === "string" ? obj.message : JSON.stringify(obj);
    } else {
        message = String(error ?? "Transaction failed");
    }

    const lower = message.toLowerCase();
    // User dismissed the wallet prompt — not an error worth surfacing.
    if (
        lower.includes("reject") ||
        lower.includes("cancel") ||
        lower.includes("denied") ||
        lower.includes("declined") ||
        lower.includes("abort") ||
        lower.includes("user closed") ||
        lower.includes("closed the controller")
    ) {
        return null;
    }
    if (lower.includes("not active")) return "Listing no longer available";
    if (lower.includes("own listing")) return "You can't buy your own listing";
    if (lower.includes("not charm owner") || lower.includes("not owner")) return "Not owner";
    if (lower.includes("allowance") || lower.includes("approve")) return "Missing approval";
    if (lower.includes("balance") || lower.includes("insufficient")) return "Insufficient CHIP balance";
    return message.slice(0, 140);
}

export function Market() {
    const navigate = useNavigate();
    const { chain } = useNetwork();
    const { account } = useController();
    const { listCharm, buyCharm, cancelListing } = useAbyssActions();

    const chainId = chain?.id ?? DEFAULT_CHAIN_ID;
    const charmAddress = getCharmAddress(chainId);
    const chipAddress = getChipAddress(chainId);

    const [tab, setTab] = useState<"browse" | "sell">("browse");
    const [listings, setListings] = useState<MarketListing[]>([]);
    const [ownedCharms, setOwnedCharms] = useState<OwnedCharmToken[]>([]);
    const [chipBalance, setChipBalance] = useState<bigint>(0n);
    const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const myAddress = account?.address ?? null;

    const loadListings = useCallback(async () => {
        const active = await getActiveListings(chainId);
        setListings(active);
        return active;
    }, [chainId]);

    const loadOwned = useCallback(async () => {
        if (!account || !charmAddress || charmAddress === "0x0") {
            setOwnedCharms([]);
            return [] as OwnedCharmToken[];
        }
        const tokenIds = await getPlayerCharms(chainId, charmAddress, account.address);
        const results = await Promise.all(tokenIds.map(async (tokenId) => {
            try {
                const metadata = await getCharmMetadata(chainId, charmAddress, tokenId);
                const charmId = Number(metadata?.charmId ?? 0);
                if (!charmId) return null;
                const info = charmInfo(charmId);
                return { tokenId, charmId, name: info.name, rarity: info.rarity, image: info.image };
            } catch (e) {
                console.warn("Skipping stale charm token:", tokenId.toString(), e);
                return null;
            }
        }));
        const tokens = results.filter(Boolean) as OwnedCharmToken[];
        setOwnedCharms(tokens);
        return tokens;
    }, [account, chainId, charmAddress]);

    const loadBalance = useCallback(async () => {
        if (!account) {
            setChipBalance(0n);
            return;
        }
        try {
            setChipBalance(await readUint256Balance(chainId, chipAddress, account.address));
        } catch (e) {
            console.warn("Failed to read CHIP balance:", e);
        }
    }, [account, chainId, chipAddress]);

    const refreshAll = useCallback(async () => {
        setIsLoading(true);
        try {
            await Promise.all([loadListings(), loadOwned(), loadBalance()]);
        } finally {
            setIsLoading(false);
        }
    }, [loadListings, loadOwned, loadBalance]);

    useEffect(() => {
        refreshAll();
    }, [refreshAll]);

    const myActiveListings = useMemo(() => {
        if (!myAddress) return [];
        let target: bigint;
        try {
            target = BigInt(myAddress);
        } catch {
            return [];
        }
        return listings.filter((l) => {
            try {
                return BigInt(l.seller) === target;
            } catch {
                return false;
            }
        });
    }, [listings, myAddress]);

    const listedTokenIds = useMemo(
        () => new Set(myActiveListings.map((l) => l.tokenId.toString())),
        [myActiveListings],
    );

    const sellableCharms = useMemo(
        () => ownedCharms.filter((c) => !listedTokenIds.has(c.tokenId.toString())),
        [ownedCharms, listedTokenIds],
    );

    const handleBuy = async (listing: MarketListing) => {
        if (!account) {
            setError("Connect your wallet to buy");
            return;
        }
        const key = `buy-${listing.listingId}`;
        setError(null);
        setBusyId(key);
        try {
            await buyCharm(listing.listingId, listing.price);
            await refreshAll();
        } catch (e) {
            setError(parseError(e));
        } finally {
            setBusyId(null);
        }
    };

    const handleList = async (charm: OwnedCharmToken) => {
        if (!account) {
            setError("Connect your wallet to list");
            return;
        }
        const key = charm.tokenId.toString();
        const raw = priceInputs[key];
        const priceWhole = Number(raw);
        if (!raw || !Number.isFinite(priceWhole) || priceWhole <= 0) {
            setError("Enter a valid CHIP price");
            return;
        }
        const priceWei = BigInt(Math.floor(priceWhole)) * ONE_CHIP;
        setError(null);
        setBusyId(`list-${key}`);
        try {
            await listCharm(charm.tokenId, priceWei);
            setPriceInputs((prev) => ({ ...prev, [key]: "" }));
            await refreshAll();
        } catch (e) {
            setError(parseError(e));
        } finally {
            setBusyId(null);
        }
    };

    const handleCancel = async (listing: MarketListing) => {
        const key = `cancel-${listing.listingId}`;
        setError(null);
        setBusyId(key);
        try {
            await cancelListing(listing.listingId);
            await refreshAll();
        } catch (e) {
            setError(parseError(e));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.topbar}>
                <button style={styles.back} onClick={() => navigate("/")}>
                    <ArrowLeft size={20} />
                </button>
                <div style={styles.balance}>
                    <img src={CHIP_TOKEN_IMAGE_URL} alt="CHIP" style={styles.chipIcon} />
                    {formatChip(chipBalance)}
                </div>
            </div>

            <div style={styles.hero}>
                <img src="/images/market.png" alt="Market stall" style={styles.heroImage} />
                <div style={styles.heroText}>
                    <h1 style={styles.title}>MARKET</h1>
                    <p style={styles.subtitle}>
                        Trade CHARM NFTs with other players for $CHIP.
                        Each sale burns 5% and sends 2% to the team.
                    </p>
                </div>
            </div>

            <div style={styles.tabs}>
                <button
                    style={{ ...styles.tab, ...(tab === "browse" ? styles.tabActive : {}) }}
                    onClick={() => setTab("browse")}
                >
                    <ShoppingCart size={16} /> BROWSE
                </button>
                <button
                    style={{ ...styles.tab, ...(tab === "sell" ? styles.tabActive : {}) }}
                    onClick={() => setTab("sell")}
                >
                    <Tag size={16} /> SELL
                </button>
            </div>

            {error && <div style={styles.error}>{error}</div>}
            {isLoading && <div style={styles.loading}>Loading...</div>}

            {tab === "browse" && (
                <div style={styles.grid}>
                    {listings.length === 0 && !isLoading && (
                        <div style={styles.empty}>No charms listed yet. Be the first to sell one!</div>
                    )}
                    {listings.map((listing) => {
                        const info = charmInfo(listing.charmId);
                        const color = RARITY_COLORS[info.rarity] ?? "#FF841C";
                        const isMine = myAddress != null && (() => {
                            try { return BigInt(listing.seller) === BigInt(myAddress); } catch { return false; }
                        })();
                        const key = `buy-${listing.listingId}`;
                        return (
                            <motion.div
                                key={listing.listingId}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={styles.card}
                            >
                                <div style={{ ...styles.pill, background: color }}>{info.rarity.toUpperCase()}</div>
                                <div style={styles.imageWrap}>
                                    <img src={info.image} alt={info.name} style={styles.charmImage} />
                                </div>
                                <h3 style={styles.charmName}>{info.name}</h3>
                                <small style={styles.tokenId}>{formatTokenId(listing.tokenId)}</small>
                                <div style={styles.priceRow}>
                                    <img src={CHIP_TOKEN_IMAGE_URL} alt="CHIP" style={styles.chipIcon} />
                                    <strong>{formatChip(listing.price)}</strong>
                                </div>
                                <button
                                    style={{ ...styles.primaryBtn, ...(isMine ? styles.disabledBtn : {}) }}
                                    disabled={isMine || busyId === key}
                                    onClick={() => handleBuy(listing)}
                                >
                                    {isMine ? "YOUR LISTING" : busyId === key ? "BUYING..." : "BUY"}
                                </button>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {tab === "sell" && (
                <>
                    {myActiveListings.length > 0 && (
                        <>
                            <div style={styles.sectionTitle}>YOUR LISTINGS</div>
                            <div style={styles.grid}>
                                {myActiveListings.map((listing) => {
                                    const info = charmInfo(listing.charmId);
                                    const color = RARITY_COLORS[info.rarity] ?? "#FF841C";
                                    const key = `cancel-${listing.listingId}`;
                                    return (
                                        <div key={listing.listingId} style={styles.card}>
                                            <div style={{ ...styles.pill, background: color }}>{info.rarity.toUpperCase()}</div>
                                            <div style={styles.imageWrap}>
                                                <img src={info.image} alt={info.name} style={styles.charmImage} />
                                            </div>
                                            <h3 style={styles.charmName}>{info.name}</h3>
                                            <small style={styles.tokenId}>{formatTokenId(listing.tokenId)}</small>
                                            <div style={styles.priceRow}>
                                                <img src={CHIP_TOKEN_IMAGE_URL} alt="CHIP" style={styles.chipIcon} />
                                                <strong>{formatChip(listing.price)}</strong>
                                            </div>
                                            <button
                                                style={{ ...styles.cancelBtn }}
                                                disabled={busyId === key}
                                                onClick={() => handleCancel(listing)}
                                            >
                                                <X size={14} /> {busyId === key ? "CANCELLING..." : "CANCEL"}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    <div style={styles.sectionTitle}>YOUR CHARMS</div>
                    {!account && <div style={styles.empty}>Connect your wallet to list charms.</div>}
                    <div style={styles.grid}>
                        {account && sellableCharms.length === 0 && !isLoading && (
                            <div style={styles.empty}>No charms available to list.</div>
                        )}
                        {sellableCharms.map((charm) => {
                            const color = RARITY_COLORS[charm.rarity] ?? "#FF841C";
                            const key = charm.tokenId.toString();
                            return (
                                <div key={key} style={styles.card}>
                                    <div style={{ ...styles.pill, background: color }}>{charm.rarity.toUpperCase()}</div>
                                    <div style={styles.imageWrap}>
                                        <img src={charm.image} alt={charm.name} style={styles.charmImage} />
                                    </div>
                                    <h3 style={styles.charmName}>{charm.name}</h3>
                                    <small style={styles.tokenId}>{formatTokenId(charm.tokenId)}</small>
                                    <input
                                        style={styles.priceInput}
                                        type="number"
                                        min="0"
                                        placeholder="Price in CHIP"
                                        value={priceInputs[key] ?? ""}
                                        onChange={(e) => setPriceInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                                    />
                                    <button
                                        style={styles.primaryBtn}
                                        disabled={busyId === `list-${key}`}
                                        onClick={() => handleList(charm)}
                                    >
                                        {busyId === `list-${key}` ? "LISTING..." : "LIST FOR SALE"}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

// Flat, pixel-game aesthetic. Solid borders, no glows/gradients/shadows.
const BORDER = "#2a2a2a";
const ACCENT = "#FF841C";

const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#fff",
        padding: "16px 16px 80px",
        fontFamily: "'PressStart2P', monospace",
        maxWidth: 1040,
        margin: "0 auto",
    },
    topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
    back: { background: "none", border: `1px solid ${BORDER}`, color: ACCENT, cursor: "pointer", padding: "8px 10px", lineHeight: 0 },
    balance: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, border: `1px solid ${BORDER}`, padding: "8px 12px" },
    chipIcon: { width: 16, height: 16, imageRendering: "pixelated" },
    hero: {
        display: "flex", alignItems: "center", gap: 18, padding: "8px 4px 20px",
        borderBottom: `1px solid ${BORDER}`, marginBottom: 18,
    },
    heroImage: { width: 120, height: 120, objectFit: "contain", imageRendering: "pixelated", flexShrink: 0 },
    heroText: { display: "flex", flexDirection: "column", gap: 10 },
    title: { fontSize: 24, color: ACCENT, letterSpacing: 3, margin: 0 },
    subtitle: { fontSize: 9, lineHeight: 1.9, color: "#8a8a8a", margin: 0, maxWidth: 460 },
    tabs: { display: "flex", gap: 0, marginBottom: 18, border: `1px solid ${BORDER}` },
    tab: {
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        background: "transparent", border: "none", color: "#777", padding: "14px",
        cursor: "pointer", fontSize: 11, fontFamily: "inherit",
    },
    tabActive: { background: ACCENT, color: "#000" },
    error: { border: "1px solid #7a2020", color: "#ff9b9b", padding: 12, fontSize: 9, marginBottom: 14 },
    loading: { textAlign: "center", color: "#777", fontSize: 11, padding: 24 },
    empty: { color: "#666", fontSize: 10, padding: "32px 8px", gridColumn: "1 / -1", textAlign: "center", lineHeight: 1.8 },
    sectionTitle: { fontSize: 11, color: "#888", margin: "24px 0 12px", letterSpacing: 1 },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))", gap: 14 },
    card: {
        position: "relative", background: "#121212", border: `1px solid ${BORDER}`,
        padding: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
    },
    pill: { alignSelf: "flex-start", fontSize: 7, padding: "4px 6px", color: "#000", letterSpacing: 0.5 },
    imageWrap: { width: "100%", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center" },
    charmImage: { maxWidth: "78%", maxHeight: "100%", objectFit: "contain", imageRendering: "pixelated" },
    charmName: { fontSize: 10, textAlign: "center", margin: 0, lineHeight: 1.5, color: "#eee" },
    tokenId: { fontSize: 8, color: "#5a5a5a" },
    priceRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#fff", padding: "4px 0" },
    priceInput: {
        width: "100%", background: "#000", border: `1px solid ${BORDER}`, color: "#fff",
        padding: "10px", fontSize: 10, fontFamily: "inherit", textAlign: "center", boxSizing: "border-box",
    },
    primaryBtn: {
        width: "100%", background: ACCENT, border: "none", color: "#000", padding: "11px",
        cursor: "pointer", fontSize: 10, fontFamily: "inherit",
    },
    cancelBtn: {
        width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        background: "transparent", border: `1px solid ${BORDER}`, color: "#aaa", padding: "10px",
        cursor: "pointer", fontSize: 9, fontFamily: "inherit",
    },
    disabledBtn: { background: "#222", color: "#666", cursor: "not-allowed" },
};

export default Market;
