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
        price: 44444,
        maxSupply: 5,
        rarity: "Mythic",
        image: "/images/relics/mortis.png",
        cooldown: 5,
        stats: { luck: 1, vitality: 1 },
    },
    {
        id: 2,
        name: "Phantom",
        description: "The Timeless Specter - Resets to Max Spins",
        effect: "Reset to Max Spins",
        price: 33333,
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
        price: 22222,
        maxSupply: 10,
        rarity: "Legendary",
        image: "/images/relics/lucky_the_dealer.png",
        cooldown: 3,
        stats: { charisma: 1 },
    },
    {
        id: 4,
        name: "Scorcher",
        description: "Master of the cursed 666 - Immediately End Session",
        effect: "End Session",
        price: 15555,
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
        price: 11111,
        maxSupply: 10,
        rarity: "Legendary",
        image: "/images/relics/inferno.png",
        cooldown: 3,
        stats: { dexterity: 1 },
    },
];

const RARITY_COLORS: Record<string, string> = {
    Mythic: "#FF4444",
    Legendary: "#FFD700",
};

export default function RelicsPage() {
    const router = useRouter();
    const { account } = useController();
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

    return (
        <div style={{
            height: "100vh",
            overflowY: "auto",
            minHeight: "100vh",
            background: "#000",
            padding: "24px",
            fontFamily: "'PressStart2P', monospace",
        }}>
            {isLoading && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.95)',
                    zIndex: 9999,
                    fontSize: '16px',
                    color: '#FF841C',
                }}>
                    Loading...
                </div>
            )}

            {/* Header */}
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "32px",
            }}>
                <button
                    onClick={() => router.push("/")}
                    style={{
                        background: "transparent",
                        border: "none",
                        color: "#888",
                        fontSize: "14px",
                        cursor: "pointer",
                        fontFamily: "'PressStart2P', monospace",
                    }}
                >
                    &lt; BACK
                </button>
                <h1 style={{
                    fontSize: "24px",
                    color: "#FF841C",
                }}>
                    RELICS
                </h1>
                <div style={{ fontSize: "12px", color: "#FFD700" }}>
                    {chipBalance.toString()} CHIP
                </div>
            </div>

            {/* Relic Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "24px",
                maxWidth: "1400px",
                margin: "0 auto",
            }}>
                {RELICS.map((relic) => {
                    const supply = supplyData[relic.id] || { current: 0, max: relic.maxSupply };
                    const isSoldOut = supply.current >= supply.max;
                    const canAfford = chipBalance >= BigInt(relic.price);
                    const isOwned = ownedRelics.includes(relic.id);
                    const rarityColor = RARITY_COLORS[relic.rarity];

                    return (
                        <motion.div
                            key={relic.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            style={{
                                background: "linear-gradient(145deg, #1a1a1a 0%, #0a0a0a 100%)",
                                border: `2px solid ${isOwned ? rarityColor : "#333"}`,
                                borderRadius: "16px",
                                padding: "20px",
                                position: "relative",
                                overflow: "hidden",
                            }}
                        >
                            {/* Rarity Badge */}
                            <div style={{
                                position: "absolute",
                                top: "12px",
                                right: "12px",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontSize: "8px",
                                background: isOwned ? rarityColor : "#333",
                                color: isOwned ? "#000" : "#666",
                            }}>
                                {relic.rarity.toUpperCase()}
                            </div>

                            {/* Owned Badge */}
                            {isOwned && (
                                <div style={{
                                    position: "absolute",
                                    top: "12px",
                                    left: "12px",
                                    padding: "4px 8px",
                                    background: "#22c55e",
                                    borderRadius: "4px",
                                    fontSize: "8px",
                                    color: "#fff",
                                }}>
                                    OWNED
                                </div>
                            )}

                            {/* Relic Image */}
                            <div style={{
                                width: "100%",
                                height: "160px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: "16px",
                                background: "#0a0a0a",
                                borderRadius: "12px",
                            }}>
                                <Image
                                    src={relic.image}
                                    alt={relic.name}
                                    width={120}
                                    height={120}
                                    style={{
                                        objectFit: "contain",
                                        filter: isOwned ? "none" : "grayscale(100%)",
                                    }}
                                />
                            </div>

                            <h3 style={{
                                fontSize: "14px",
                                color: isOwned ? "#fff" : "#666",
                                marginBottom: "8px",
                            }}>
                                {relic.name}
                            </h3>

                            <p style={{
                                fontSize: "10px",
                                color: isOwned ? rarityColor : "#444",
                                marginBottom: "8px",
                            }}>
                                {relic.effect}
                            </p>

                            <p style={{
                                fontSize: "8px",
                                color: "#666",
                                lineHeight: "1.5",
                                marginBottom: "16px",
                                height: "30px",
                            }}>
                                {relic.description}
                            </p>

                            {/* Stats */}
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "16px",
                                fontSize: "9px",
                                color: "#666",
                            }}>
                                <span>{relic.cooldown} spin CD</span>
                                <span style={{
                                    color: isSoldOut ? "#ef4444" : "#4ade80",
                                }}>
                                    {isSoldOut ? "SOLD OUT" : `${supply.current}/${supply.max} minted`}
                                </span>
                            </div>

                            {/* Price / Mint Button */}
                            {!isOwned ? (
                                <>
                                    <div style={{
                                        fontSize: "12px",
                                        color: "#FFD700",
                                        marginBottom: "12px",
                                        textAlign: "center",
                                    }}>
                                        {relic.price.toLocaleString()} CHIP
                                    </div>

                                    <motion.button
                                        style={{
                                            width: "100%",
                                            padding: "12px",
                                            background: isSoldOut || !canAfford
                                                ? "#333"
                                                : "linear-gradient(90deg, #FF841C 0%, #FF5500 100%)",
                                            border: "none",
                                            borderRadius: "8px",
                                            color: isSoldOut || !canAfford ? "#666" : "#fff",
                                            fontSize: "10px",
                                            cursor: isSoldOut || !canAfford ? "not-allowed" : "pointer",
                                            fontFamily: "'PressStart2P', monospace",
                                        }}
                                        onClick={() => handleMint(relic.id, relic.price)}
                                        disabled={isSoldOut || !canAfford || minting !== null}
                                        whileHover={!isSoldOut && canAfford ? { scale: 1.02 } : {}}
                                        whileTap={!isSoldOut && canAfford ? { scale: 0.98 } : {}}
                                    >
                                        {minting === relic.id ? "MINTING..." :
                                            isSoldOut ? "SOLD OUT" :
                                                !canAfford ? "NEED CHIPS" :
                                                    "MINT RELIC"}
                                    </motion.button>
                                </>
                            ) : (
                                <div style={{
                                    width: "100%",
                                    padding: "12px",
                                    background: "#22c55e20",
                                    border: "1px solid #22c55e",
                                    borderRadius: "8px",
                                    color: "#22c55e",
                                    fontSize: "10px",
                                    textAlign: "center",
                                    fontFamily: "'PressStart2P', monospace",
                                }}>
                                    OWNED
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
