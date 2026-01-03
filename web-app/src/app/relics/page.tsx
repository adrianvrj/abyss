"use client";

import { useState, useEffect, useCallback } from "react";
import { useController } from "@/hooks/useController";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CONTRACTS } from "@/lib/constants";
import { RpcProvider } from "starknet";

// Relic data matching the contract configuration
const RELICS = [
    {
        id: 1,
        name: "Mortis",
        description: "Gentleman of Death - Forces a random jackpot",
        effect: "Force Random Jackpot",
        price: 8000,
        maxSupply: 5,
        rarity: "Mythic",
        image: "/images/relics/mortis.png",
        cooldown: 5,
        stats: { luck: 1, vitality: 1 },
    },
    {
        id: 2,
        name: "Phantom",
        description: "The Timeless Specter - Resets your spins to 5",
        effect: "Reset Spins",
        price: 5000,
        maxSupply: 7,
        rarity: "Mythic",
        image: "/images/relics/phantom.png",
        cooldown: 5,
        stats: { wisdom: 1 },
    },
    {
        id: 3,
        name: "Lucky the Dealer",
        description: "Doubles down on every bet - 2x next spin score",
        effect: "Double Next Spin",
        price: 3500,
        maxSupply: 10,
        rarity: "Legendary",
        image: "/images/relics/lucky_the_dealer.png",
        cooldown: 3,
        stats: { charisma: 1 },
    },
    {
        id: 4,
        name: "Scorcher",
        description: "Master of the cursed 666 - Triggers 666 pattern",
        effect: "Trigger 666",
        price: 3200,
        maxSupply: 10,
        rarity: "Legendary",
        image: "/images/relics/scorcher.png",
        cooldown: 5,
        stats: { intelligence: 1 },
    },
    {
        id: 5,
        name: "Inferno",
        description: "Hell's marketplace demon - Free market refresh",
        effect: "Free Market Refresh",
        price: 3000,
        maxSupply: 10,
        rarity: "Legendary",
        image: "/images/relics/inferno.png",
        cooldown: 3,
        stats: { dexterity: 1 },
    },
];

const styles = {
    container: {
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0a0a0a 0%, #1a0a0a 100%)",
        padding: "24px",
        fontFamily: "'PressStart2P', monospace",
    },
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "32px",
    },
    backButton: {
        background: "transparent",
        border: "none",
        color: "#888",
        fontSize: "14px",
        cursor: "pointer",
        fontFamily: "'PressStart2P', monospace",
    },
    title: {
        fontSize: "24px",
        color: "#FF841C",
        textAlign: "center" as const,
    },
    chipBalance: {
        fontSize: "12px",
        color: "#FFD700",
    },
    tabs: {
        display: "flex",
        gap: "16px",
        marginBottom: "24px",
        justifyContent: "center",
    },
    tab: {
        padding: "12px 24px",
        background: "transparent",
        border: "2px solid #333",
        color: "#888",
        fontSize: "12px",
        cursor: "pointer",
        fontFamily: "'PressStart2P', monospace",
        borderRadius: "8px",
    },
    activeTab: {
        border: "2px solid #FF841C",
        color: "#FF841C",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: "24px",
        maxWidth: "1200px",
        margin: "0 auto",
    },
    card: {
        background: "linear-gradient(145deg, #1a1a1a 0%, #0a0a0a 100%)",
        border: "2px solid #333",
        borderRadius: "16px",
        padding: "20px",
        position: "relative" as const,
        overflow: "hidden",
    },
    mythicCard: {
        border: "2px solid #FF841C",
    },
    legendaryCard: {
        border: "2px solid #888",
    },
    cardImage: {
        width: "100%",
        height: "180px",
        objectFit: "contain" as const,
        borderRadius: "8px",
        marginBottom: "16px",
        background: "#0a0a0a",
    },
    cardName: {
        fontSize: "16px",
        color: "#fff",
        marginBottom: "8px",
    },
    cardEffect: {
        fontSize: "10px",
        color: "#FF841C",
        marginBottom: "8px",
    },
    cardDescription: {
        fontSize: "9px",
        color: "#888",
        marginBottom: "12px",
        lineHeight: "1.5",
    },
    cardStats: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "12px",
    },
    stat: {
        fontSize: "9px",
        color: "#666",
    },
    supply: {
        fontSize: "10px",
        color: "#4ade80",
    },
    soldOut: {
        color: "#ef4444",
    },
    price: {
        fontSize: "14px",
        color: "#FFD700",
        marginBottom: "12px",
    },
    mintButton: {
        width: "100%",
        padding: "12px",
        background: "linear-gradient(90deg, #FF841C 0%, #FF5500 100%)",
        border: "none",
        borderRadius: "8px",
        color: "#fff",
        fontSize: "12px",
        cursor: "pointer",
        fontFamily: "'PressStart2P', monospace",
    },
    disabledButton: {
        background: "#333",
        cursor: "not-allowed",
    },
    rarityBadge: {
        position: "absolute" as const,
        top: "12px",
        right: "12px",
        padding: "4px 8px",
        borderRadius: "4px",
        fontSize: "8px",
        fontWeight: "bold",
    },
    mythicBadge: {
        background: "#FF841C",
        color: "#000",
    },
    legendaryBadge: {
        background: "#666",
        color: "#fff",
    },
    ownedBadge: {
        position: "absolute" as const,
        top: "12px",
        left: "12px",
        padding: "4px 8px",
        background: "#22c55e",
        borderRadius: "4px",
        fontSize: "8px",
        color: "#fff",
    },
    emptyState: {
        textAlign: "center" as const,
        color: "#666",
        fontSize: "12px",
        padding: "48px",
    },
    cooldown: {
        fontSize: "9px",
        color: "#888",
    },
};

export default function RelicsPage() {
    const router = useRouter();
    const { account } = useController();
    const [activeTab, setActiveTab] = useState<"shop" | "owned">("shop");
    const [ownedRelics, setOwnedRelics] = useState<number[]>([]);
    const [supplyData, setSupplyData] = useState<Record<number, { current: number; max: number }>>({});
    const [chipBalance, setChipBalance] = useState<bigint>(BigInt(0));
    const [minting, setMinting] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load supply and owned relics
    useEffect(() => {
        async function loadData() {
            if (!account) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);

            const provider = new RpcProvider({ nodeUrl: "https://api.cartridge.gg/x/starknet/sepolia" });

            // Load CHIP balance using direct call
            try {
                const result = await provider.callContract({
                    contractAddress: CONTRACTS.CHIP_TOKEN,
                    entrypoint: "balance_of",
                    calldata: [account.address],
                });
                const low = BigInt(result[0]);
                const high = BigInt(result[1]);
                const balance = low + (high << BigInt(128));
                setChipBalance(balance / BigInt(10 ** 18));
            } catch (e) {
                console.error("Failed to load CHIP balance:", e);
            }

            // Load supply for each relic
            const supplies: Record<number, { current: number; max: number }> = {};
            for (const relic of RELICS) {
                try {
                    const result = await provider.callContract({
                        contractAddress: CONTRACTS.RELIC_NFT,
                        entrypoint: "get_supply_info",
                        calldata: [relic.id.toString()],
                    });
                    supplies[relic.id] = {
                        current: Number(result[0]),
                        max: Number(result[1]),
                    };
                } catch (e) {
                    supplies[relic.id] = { current: 0, max: relic.maxSupply };
                }
            }
            setSupplyData(supplies);

            // Load owned relics
            try {
                const ownedTokensResult = await provider.callContract({
                    contractAddress: CONTRACTS.RELIC_NFT,
                    entrypoint: "get_player_relics",
                    calldata: [account.address],
                });

                const length = Number(ownedTokensResult[0]);
                const ownedIds = new Set<number>();

                for (let i = 0; i < length; i++) {
                    const low = BigInt(ownedTokensResult[1 + i * 2]);
                    const high = BigInt(ownedTokensResult[1 + i * 2 + 1]);

                    try {
                        const metaResult = await provider.callContract({
                            contractAddress: CONTRACTS.RELIC_NFT,
                            entrypoint: "get_relic_metadata",
                            calldata: [low.toString(), high.toString()]
                        });
                        const relicId = Number(metaResult[0]);
                        if (relicId > 0) {
                            ownedIds.add(relicId);
                        }
                    } catch (err) {
                        console.error("Failed to fetch metadata for token", low, err);
                    }
                }

                setOwnedRelics(Array.from(ownedIds));
            } catch (e) {
                console.error("Failed to load owned relics:", e);
            } finally {
                setIsLoading(false);
            }
        }

        loadData();
    }, [account]);

    const handleMint = useCallback(async (relicId: number, price: number) => {
        if (!account) return;

        setMinting(relicId);
        try {
            const priceWei = BigInt(price) * BigInt(10 ** 18);

            // Split uint256 into low and high
            const low = priceWei & ((BigInt(1) << BigInt(128)) - BigInt(1));
            const high = priceWei >> BigInt(128);

            // First approve CHIP spending
            const approveCall = {
                contractAddress: CONTRACTS.CHIP_TOKEN,
                entrypoint: "approve",
                calldata: [CONTRACTS.RELIC_NFT, low.toString(), high.toString()],
            };

            // Then mint
            const mintCall = {
                contractAddress: CONTRACTS.RELIC_NFT,
                entrypoint: "mint_relic",
                calldata: [relicId.toString()],
            };

            const tx = await account.execute([approveCall, mintCall]);

            // Wait for transaction to complete
            const provider = new RpcProvider({ nodeUrl: "https://api.cartridge.gg/x/starknet/sepolia" });
            await provider.waitForTransaction(tx.transaction_hash);

            // Refresh data
            window.location.reload();
        } catch (e) {
            console.error("Mint failed:", e);
        } finally {
            setMinting(null);
        }
    }, [account]);

    const filteredRelics = activeTab === "owned"
        ? RELICS.filter(r => ownedRelics.includes(r.id))
        : RELICS;

    return (
        <div style={styles.container}>
            {isLoading && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.95)',
                    zIndex: 9999,
                    fontFamily: "'PressStart2P', monospace",
                    fontSize: '16px',
                    color: '#FF841C',
                }}>
                    Loading...
                </div>
            )}
            <div style={styles.header}>
                <button style={styles.backButton} onClick={() => router.push("/")}>
                    &lt; BACK
                </button>
                <h1 style={styles.title}>RELICS</h1>
                <div style={styles.chipBalance}>
                    {chipBalance.toString()} CHIP
                </div>
            </div>

            <div style={styles.tabs}>
                <button
                    style={{ ...styles.tab, ...(activeTab === "shop" ? styles.activeTab : {}) }}
                    onClick={() => setActiveTab("shop")}
                >
                    SHOP
                </button>
                <button
                    style={{ ...styles.tab, ...(activeTab === "owned" ? styles.activeTab : {}) }}
                    onClick={() => setActiveTab("owned")}
                >
                    MY RELICS
                </button>
            </div>

            {activeTab === "owned" && filteredRelics.length === 0 ? (
                <div style={styles.emptyState}>
                    <p>You don&apos;t own any relics yet.</p>
                    <p style={{ marginTop: "16px" }}>Visit the shop to mint your first!</p>
                </div>
            ) : (
                <div style={styles.grid}>
                    {filteredRelics.map((relic) => {
                        const supply = supplyData[relic.id] || { current: 0, max: relic.maxSupply };
                        const isSoldOut = supply.current >= supply.max;
                        const canAfford = chipBalance >= BigInt(relic.price);
                        const isOwned = ownedRelics.includes(relic.id);

                        return (
                            <motion.div
                                key={relic.id}
                                style={{
                                    ...styles.card,
                                    ...(relic.rarity === "Mythic" ? styles.mythicCard : styles.legendaryCard),
                                }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                {/* Rarity Badge */}
                                <div style={{
                                    ...styles.rarityBadge,
                                    ...(relic.rarity === "Mythic" ? styles.mythicBadge : styles.legendaryBadge),
                                }}>
                                    {relic.rarity.toUpperCase()}
                                </div>

                                {/* Owned Badge */}
                                {isOwned && <div style={styles.ownedBadge}>OWNED</div>}

                                <Image
                                    src={relic.image}
                                    alt={relic.name}
                                    width={300}
                                    height={200}
                                    style={styles.cardImage}
                                />

                                <h3 style={styles.cardName}>{relic.name}</h3>
                                <p style={styles.cardEffect}>{relic.effect}</p>
                                <p style={styles.cardDescription}>{relic.description}</p>

                                <div style={styles.cardStats}>
                                    <span style={styles.cooldown}>
                                        {relic.cooldown} spin cooldown
                                    </span>
                                    <span style={{
                                        ...styles.supply,
                                        ...(isSoldOut ? styles.soldOut : {}),
                                    }}>
                                        {isSoldOut ? "SOLD OUT" : `${supply.current}/${supply.max} minted`}
                                    </span>
                                </div>

                                <p style={styles.price}>{relic.price.toLocaleString()} CHIP</p>

                                {activeTab === "shop" && (
                                    <motion.button
                                        style={{
                                            ...styles.mintButton,
                                            ...(isSoldOut || !canAfford ? styles.disabledButton : {}),
                                        }}
                                        onClick={() => handleMint(relic.id, relic.price)}
                                        disabled={isSoldOut || !canAfford || minting !== null}
                                        whileHover={!isSoldOut && canAfford ? { scale: 1.02 } : {}}
                                        whileTap={!isSoldOut && canAfford ? { scale: 0.98 } : {}}
                                    >
                                        {minting === relic.id ? "MINTING..." :
                                            isSoldOut ? "SOLD OUT" :
                                                !canAfford ? "INSUFFICIENT CHIP" :
                                                    "MINT RELIC"}
                                    </motion.button>
                                )}

                                {activeTab === "owned" && (
                                    <motion.button
                                        style={styles.mintButton}
                                        onClick={() => {
                                            // For now, just show alert - needs session integration
                                            alert(`To equip ${relic.name}, you need an active game session. Start a game first, then equip from the game screen.`);
                                        }}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        EQUIP TO SESSION
                                    </motion.button>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
