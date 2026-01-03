"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useController } from "@/hooks/useController";
import { getLeaderboard, getPrizeTokenBalances, LeaderboardEntry, TokenBalance } from "@/utils/abyssContract";
import { FaArrowLeft, FaTrophy, FaUser } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { controllerConnector } from "@/components/providers/StarknetProvider";
import PrizePoolModal from "@/components/modals/PrizePoolModal";

export default function LeaderboardPage() {
    const router = useRouter();
    const { address } = useController();
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
    const [showPrizeModal, setShowPrizeModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [entries, balances] = await Promise.all([
                getLeaderboard(),
                getPrizeTokenBalances()
            ]);
            setLeaderboardData(entries.slice(0, 10));
            setTokenBalances(balances);
        } catch (err) {
            console.error("Failed to load leaderboard:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenProfile = useCallback(() => {
        try {
            const connector = controllerConnector as any;
            if (connector?.controller?.openProfile) {
                connector.controller.openProfile();
            } else if (connector?.openProfile) {
                connector.openProfile();
            }
        } catch (e) {
            console.log("Controller profile not available:", e);
        }
    }, []);

    const formatAddress = (addr: string) => {
        if (address && addr.toLowerCase() === address.toLowerCase()) {
            return "you";
        }
        if (addr.length <= 10) return addr;
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const isCurrentUser = (addr: string) => {
        return address && addr.toLowerCase() === address.toLowerCase();
    };

    return (
        <div style={{
            minHeight: "100vh",
            background: "#000",
            padding: "20px",
        }}>
            {/* Header */}
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "24px",
            }}>
                <button
                    onClick={() => router.push("/")}
                    style={{
                        background: "transparent",
                        border: "none",
                        color: "#FF841C",
                        fontSize: "24px",
                        cursor: "pointer",
                        padding: "8px",
                    }}
                >
                    <FaArrowLeft />
                </button>
                <h1 style={{
                    fontFamily: "'PressStart2P', monospace",
                    fontSize: "14px",
                    color: "#FF841C",
                    margin: 0,
                }}>
                    Top 10 Players
                </h1>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button
                        onClick={() => setShowPrizeModal(true)}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "#FF841C",
                            fontSize: "20px",
                            cursor: "pointer",
                            padding: "8px",
                        }}
                    >
                        <FaTrophy />
                    </button>
                    <button
                        onClick={handleOpenProfile}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "#FF841C",
                            fontSize: "20px",
                            cursor: "pointer",
                            padding: "8px",
                        }}
                    >
                        <FaUser />
                    </button>
                </div>
            </div>

            {/* Loading */}
            {loading ? (
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "50vh",
                    gap: "16px",
                }}>
                    <div style={{
                        width: "32px",
                        height: "32px",
                        border: "3px solid #FF841C",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                    }} />
                    <span style={{
                        fontFamily: "'PressStart2P', monospace",
                        fontSize: "10px",
                        color: "#FF841C",
                    }}>
                        Loading...
                    </span>
                </div>
            ) : (
                <>
                    {/* Table Header */}
                    <div style={{
                        display: "flex",
                        padding: "12px 16px",
                        borderBottom: "2px solid #FF841C",
                        marginBottom: "8px",
                    }}>
                        <span style={{ ...headerStyle, width: "40px" }}>#</span>
                        <span style={{ ...headerStyle, flex: 1 }}>Player</span>
                        <span style={{ ...headerStyle, width: "50px", textAlign: "center" }}>Lvl</span>
                        <span style={{ ...headerStyle, width: "80px", textAlign: "right" }}>Score</span>
                    </div>

                    {/* Leaderboard Entries */}
                    {leaderboardData.length === 0 ? (
                        <div style={{
                            textAlign: "center",
                            padding: "40px",
                            color: "rgba(255,255,255,0.5)",
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: "10px",
                        }}>
                            No entries yet
                        </div>
                    ) : (
                        leaderboardData.map((entry, index) => {
                            const isPodium = index < 3;
                            const isCurrent = isCurrentUser(entry.player_address);
                            const medalColors = ["#FFD700", "#C0C0C0", "#CD7F32"];

                            return (
                                <motion.div
                                    key={`${entry.player_address}-${index}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.08 }}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "12px 16px",
                                        marginBottom: "8px",
                                        background: isCurrent
                                            ? "rgba(255, 132, 28, 0.15)"
                                            : isPodium
                                                ? "rgba(255, 215, 0, 0.05)"
                                                : "rgba(255, 255, 255, 0.03)",
                                        borderRadius: "8px",
                                        border: isCurrent
                                            ? "2px solid #FF841C"
                                            : isPodium
                                                ? `2px solid ${medalColors[index]}`
                                                : "1px solid rgba(255, 255, 255, 0.1)",
                                    }}
                                >
                                    {/* Rank */}
                                    <div style={{
                                        width: "32px",
                                        height: "32px",
                                        borderRadius: "50%",
                                        background: isPodium ? medalColors[index] : "rgba(255, 255, 255, 0.1)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginRight: "12px",
                                    }}>
                                        {isPodium ? (
                                            <FaTrophy size={14} color={index === 0 ? "#000" : "#fff"} />
                                        ) : (
                                            <span style={{
                                                fontFamily: "'PressStart2P', monospace",
                                                fontSize: "10px",
                                                color: "#fff",
                                            }}>
                                                {index + 1}
                                            </span>
                                        )}
                                    </div>

                                    {/* Address */}
                                    <span style={{
                                        flex: 1,
                                        fontFamily: "'PressStart2P', monospace",
                                        fontSize: "10px",
                                        color: isCurrent ? "#FF841C" : "#fff",
                                    }}>
                                        {formatAddress(entry.player_address)}
                                    </span>

                                    {/* Level */}
                                    <span style={{
                                        width: "50px",
                                        textAlign: "center",
                                        fontFamily: "'PressStart2P', monospace",
                                        fontSize: "10px",
                                        color: isPodium ? "#FFD700" : "#fff",
                                    }}>
                                        {entry.level}
                                    </span>

                                    {/* Score */}
                                    <span style={{
                                        width: "80px",
                                        textAlign: "right",
                                        fontFamily: "'PressStart2P', monospace",
                                        fontSize: isPodium ? "12px" : "10px",
                                        color: isPodium ? "#FFD700" : "#fff",
                                        fontWeight: isPodium ? "bold" : "normal",
                                    }}>
                                        {entry.total_score}
                                    </span>
                                </motion.div>
                            );
                        })
                    )}
                </>
            )}

            {/* Prize Pool Modal */}
            {showPrizeModal && (
                <PrizePoolModal
                    tokenBalances={tokenBalances}
                    onClose={() => setShowPrizeModal(false)}
                />
            )}

            {/* Spin animation keyframes */}
            <style jsx global>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

const headerStyle: React.CSSProperties = {
    fontFamily: "'PressStart2P', monospace",
    fontSize: "10px",
    color: "#FF841C",
};
