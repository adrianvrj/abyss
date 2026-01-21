"use client";

import { useState, useEffect } from "react";
import { useController } from "@/hooks/useController";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CONTRACTS } from "@/lib/constants";
import { RpcProvider } from "starknet";

// All 20 Soul Charms
const ALL_CHARMS = [
    // Common (8)
    { id: 1, name: "Whisper Stone", rarity: "Common", effect: "+3 Luck", description: "A stone that whispers secrets of fortune", luck: 3, cost: 1, image: "/images/charms/whisper_stone.png" },
    { id: 2, name: "Faded Coin", rarity: "Common", effect: "+4 Luck", description: "An ancient coin worn smooth by time", luck: 4, cost: 1, image: "/images/charms/faded_coin.png" },
    { id: 3, name: "Broken Mirror", rarity: "Common", effect: "+5 Luck (no pattern)", description: "See the future in its fragments", luck: 5, cost: 1, image: "/images/charms/broken_mirror.png" },
    { id: 4, name: "Dusty Hourglass", rarity: "Common", effect: "+6 Luck (low spins)", description: "Time bends for the desperate", luck: 6, cost: 1, image: "/images/charms/dusty_hourglass.png" },
    { id: 5, name: "Cracked Skull", rarity: "Common", effect: "+5 Luck", description: "Memento of a lucky gambler", luck: 5, cost: 1, image: "/images/charms/cracked_skull.png" },
    { id: 6, name: "Rusty Key", rarity: "Common", effect: "+2 Luck/item", description: "Unlocks hidden potential", luck: 2, cost: 1, image: "/images/charms/rusty_key.png" },
    { id: 7, name: "Moth Wing", rarity: "Common", effect: "+6 Luck", description: "Drawn to the light of fortune", luck: 6, cost: 1, image: "/images/charms/moth_wing.png" },
    { id: 8, name: "Bone Dice", rarity: "Common", effect: "+8 Luck (low score)", description: "Roll with the ancestors", luck: 8, cost: 1, image: "/images/charms/bone_dice.png" },
    // Rare (4)
    { id: 9, name: "Soul Fragment", rarity: "Rare", effect: "+10 Luck", description: "A piece of pure fortune", luck: 10, cost: 2, image: "/images/charms/soul_fragment.png" },
    { id: 10, name: "Cursed Pendant", rarity: "Rare", effect: "H3 Retrigger x2", description: "Patterns repeat in the darkness", luck: 0, cost: 2, image: "/images/charms/cursed_pendant.png" },
    { id: 11, name: "Shadow Lantern", rarity: "Rare", effect: "+8 Luck, +4 high level", description: "Illuminates hidden paths", luck: 8, cost: 2, image: "/images/charms/shadow_lantern.png" },
    { id: 12, name: "Ethereal Chain", rarity: "Rare", effect: "+12 Luck (666 blocked)", description: "Bound by fate's protection", luck: 12, cost: 2, image: "/images/charms/ethereal_chain.png" },
    // Epic (6)
    { id: 13, name: "Void Compass", rarity: "Epic", effect: "+1 spin, +5 Luck", description: "Points to fortune in the void", luck: 5, cost: 3, image: "/images/charms/void_compass.png" },
    { id: 14, name: "Demon's Tooth", rarity: "Epic", effect: "Diagonal Retrigger x2", description: "Bite through bad luck", luck: 0, cost: 3, image: "/images/charms/demons_tooth.png" },
    { id: 15, name: "Abyssal Eye", rarity: "Epic", effect: "+20 Luck", description: "See all possibilities", luck: 20, cost: 4, image: "/images/charms/abyssal_eye.png" },
    { id: 16, name: "Phoenix Feather", rarity: "Epic", effect: "+2 spins, +10 Luck", description: "Rise from the ashes", luck: 10, cost: 4, image: "/images/charms/phoenix_feather.png" },
    { id: 17, name: "Reaper's Mark", rarity: "Epic", effect: "All patterns x2", description: "Death favors the bold", luck: 0, cost: 5, image: "/images/charms/reapers_mark.png" },
    { id: 18, name: "Chaos Orb", rarity: "Epic", effect: "+15 Luck (666 blocked)", description: "Embrace the chaos", luck: 15, cost: 5, image: "/images/charms/chaos_orb.png" },
    // Legendary (2)
    { id: 19, name: "Soul of the Abyss", rarity: "Legendary", effect: "+30 Luck, Jackpot x2", description: "The heart of fortune itself", luck: 30, cost: 6, image: "/images/charms/soul_of_abyss.png" },
    { id: 20, name: "Void Heart", rarity: "Legendary", effect: "+25 Luck, +1 spin", description: "Become one with the void", luck: 25, cost: 7, image: "/images/charms/void_heart.png" },
];

const RARITY_COLORS: Record<string, string> = {
    Common: "#9CA3AF",
    Rare: "#3B82F6",
    Epic: "#A855F7",
    Legendary: "#FFD700",
};

const RARITY_BG: Record<string, string> = {
    Common: "rgba(156, 163, 175, 0.1)",
    Rare: "rgba(59, 130, 246, 0.1)",
    Epic: "rgba(168, 85, 247, 0.1)",
    Legendary: "rgba(255, 215, 0, 0.1)",
};

export default function CharmsPage() {
    const router = useRouter();
    const { account } = useController();
    const [ownedCharmIds, setOwnedCharmIds] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadOwnedCharms() {
            if (!account) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);

            try {
                const provider = new RpcProvider({ nodeUrl: "https://api.cartridge.gg/x/starknet/sepolia" });

                // Get player's charm tokens
                const result = await provider.callContract({
                    contractAddress: CONTRACTS.CHARM_NFT || "0x0", // Add to constants if not there
                    entrypoint: "get_player_charms",
                    calldata: [account.address],
                });

                const length = Number(result[0]);
                const ownedIds = new Set<number>();

                for (let i = 0; i < length; i++) {
                    const tokenIdLow = BigInt(result[1 + i * 2]);
                    const tokenIdHigh = BigInt(result[1 + i * 2 + 1]);

                    try {
                        // Get charm metadata to find charm_id
                        const metaResult = await provider.callContract({
                            contractAddress: CONTRACTS.CHARM_NFT || "0x0",
                            entrypoint: "get_charm_metadata",
                            calldata: [tokenIdLow.toString(), tokenIdHigh.toString()]
                        });
                        const charmId = Number(metaResult[0]);
                        if (charmId > 0) {
                            ownedIds.add(charmId);
                        }
                    } catch (e) {
                        console.error("Failed to get charm metadata:", e);
                    }
                }

                setOwnedCharmIds(ownedIds);
            } catch (e) {
                console.error("Failed to load owned charms:", e);
            } finally {
                setIsLoading(false);
            }
        }

        loadOwnedCharms();
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
                    SOUL CHARMS
                </h1>
                <div style={{ fontSize: "10px", color: "#666" }}>
                    {ownedCharmIds.size}/{ALL_CHARMS.length} owned
                </div>
            </div>

            {/* Charm Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: "20px",
                maxWidth: "1400px",
                margin: "0 auto",
            }}>
                {ALL_CHARMS.map((charm) => {
                    const isOwned = ownedCharmIds.has(charm.id);
                    const rarityColor = RARITY_COLORS[charm.rarity];
                    const rarityBg = RARITY_BG[charm.rarity];

                    return (
                        <motion.div
                            key={charm.id}
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
                                transition: "all 0.3s",
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
                                {charm.rarity.toUpperCase()}
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

                            {/* Charm Image */}
                            <div style={{
                                width: "100%",
                                height: "120px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: "16px",
                                background: "#0a0a0a",
                                borderRadius: "12px",
                            }}>
                                <Image
                                    src={charm.image}
                                    alt={charm.name}
                                    width={100}
                                    height={100}
                                    style={{
                                        objectFit: "contain",
                                        filter: isOwned ? "none" : "grayscale(100%)",
                                    }}
                                />
                            </div>

                            {/* Charm Info */}
                            <h3 style={{
                                fontSize: "12px",
                                color: isOwned ? "#fff" : "#666",
                                marginBottom: "8px",
                            }}>
                                {charm.name}
                            </h3>

                            <p style={{
                                fontSize: "10px",
                                color: isOwned ? rarityColor : "#444",
                                marginBottom: "8px",
                            }}>
                                {charm.effect}
                            </p>

                            <p style={{
                                fontSize: "8px",
                                color: "#666",
                                lineHeight: "1.5",
                                marginBottom: "12px",
                            }}>
                                {charm.description}
                            </p>

                            {/* Stats */}
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "9px",
                                color: "#666",
                            }}>
                                {charm.luck > 0 && (
                                    <span style={{ color: isOwned ? "#FF841C" : "#444" }}>
                                        +{charm.luck} LUCK
                                    </span>
                                )}
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {charm.cost}
                                    <Image
                                        src="/images/ticket.png"
                                        alt="Tickets"
                                        width={14}
                                        height={14}
                                        style={{ objectFit: 'contain' }}
                                    />
                                </span>
                            </div>
                        </motion.div>
                    );
                })}
            </div>


        </div>
    );
}
