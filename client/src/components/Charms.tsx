import { useState, useEffect, useCallback } from "react";
import { useController } from "@/hooks/useController";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CONTRACTS } from "@/lib/constants";
import { RpcProvider } from "starknet";
import { ArrowLeft } from "lucide-react";
import { STATIC_CHARM_DEFINITIONS } from "@/lib/charmCatalog";

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
    Rare: "#3B82F6",
    Epic: "#A855F7",
    Legendary: "#FFD700",
};

export function Charms() {
    const navigate = useNavigate();
    const { account } = useController();
    const [ownedCharmIds, setOwnedCharmIds] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!account) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);

        const provider = new RpcProvider({ nodeUrl: import.meta.env.VITE_STARKNET_RPC_URL || "https://api.cartridge.gg/x/starknet/sepolia" });

        try {
            const result = await provider.callContract({
                contractAddress: CONTRACTS.CHARM_NFT || "0x0",
                entrypoint: "get_player_charms",
                calldata: [account.address],
            });

            const length = Number(result[0]);
            const ownedIds = new Set<number>();
            for (let i = 0; i < length; i++) {
                const tokenIdLow = BigInt(result[1 + i * 2]);
                const tokenIdHigh = BigInt(result[1 + i * 2 + 1]);
                try {
                    const metaResult = await provider.callContract({
                        contractAddress: CONTRACTS.CHARM_NFT || "0x0",
                        entrypoint: "get_charm_metadata",
                        calldata: [tokenIdLow.toString(), tokenIdHigh.toString()]
                    });
                    const charmId = Number(metaResult[0]);
                    if (charmId > 0) ownedIds.add(charmId);
                } catch (e) { /* ignore */ }
            }
            setOwnedCharmIds(ownedIds);
        } catch (e) {
            console.error("Failed to load charms:", e);
        } finally {
            setIsLoading(false);
        }
    }, [account]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return (
        <div style={{
            height: "100vh",
            overflowY: "auto",
            minHeight: "100vh",
            background: "#000",
            padding: "24px",
            fontFamily: "'PressStart2P', monospace",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
        }}>
            {isLoading && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.9)',
                    zIndex: 9999,
                    color: '#FF841C',
                }}>
                    Loading...
                </div>
            )}

            {/* Header */}
            <div style={{
                width: "100%",
                maxWidth: "1200px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "32px",
            }}>
                <button
                    onClick={() => navigate("/")}
                    style={{
                        background: "transparent",
                        border: "none",
                        color: "#FF841C",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ fontSize: "20px", color: "#FF841C", margin: 0 }}>CHARMS</h1>
                <div style={{ fontSize: "10px", color: "#666" }}>
                    {ownedCharmIds.size}/{ALL_CHARMS.length} owned
                </div>
            </div>

            {/* Charm Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: "20px",
                width: "100%",
                maxWidth: "1200px",
            }}>
                {ALL_CHARMS.map((charm) => {
                    const isOwned = ownedCharmIds.has(charm.id);
                    const rarityColor = RARITY_COLORS[charm.rarity];

                    return (
                        <motion.div
                            key={charm.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                background: "rgba(255, 132, 28, 0.05)",
                                border: `2px solid ${isOwned ? rarityColor : "rgba(255, 132, 28, 0.1)"}`,
                                borderRadius: "16px",
                                padding: "20px",
                                position: "relative",
                            }}
                        >
                            <div style={{
                                position: "absolute",
                                top: "12px",
                                right: "12px",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontSize: "8px",
                                background: rarityColor,
                                color: "#000",
                            }}>
                                {charm.rarity.toUpperCase()}
                            </div>

                            {isOwned && (
                                <div style={{
                                    position: "absolute",
                                    top: "12px",
                                    left: "12px",
                                    padding: "4px 8px",
                                    background: "#4ade80",
                                    borderRadius: "4px",
                                    fontSize: "8px",
                                    color: "#000",
                                }}>
                                    OWNED
                                </div>
                            )}

                            <div style={{
                                width: "100%",
                                height: "100px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: "16px",
                            }}>
                                <img
                                    src={charm.image}
                                    alt={charm.name}
                                    style={{
                                        maxHeight: "80px",
                                        filter: isOwned ? "none" : "grayscale(100%) opacity(0.3)",
                                    }}
                                />
                            </div>

                            <h3 style={{ fontSize: "12px", color: isOwned ? "#fff" : "#888", marginBottom: "8px" }}>
                                {charm.name}
                            </h3>

                            <p style={{ fontSize: "10px", color: isOwned ? rarityColor : "#666", marginBottom: "8px" }}>
                                {charm.effect}
                            </p>

                            <p style={{ fontSize: "8px", color: "#666", lineHeight: "1.6", marginBottom: "12px" }}>
                                {charm.description}
                            </p>

                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px" }}>
                                {charm.luck > 0 && (
                                    <span style={{ color: isOwned ? "#FF841C" : "#444" }}>
                                        +{charm.luck} LUCK
                                    </span>
                                )}
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#666' }}>
                                    {charm.cost} <img src="/images/ticket.png" alt="T" style={{ height: '12px' }} />
                                </span>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
