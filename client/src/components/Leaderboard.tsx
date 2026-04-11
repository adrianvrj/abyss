import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getPrizeTokenBalances, LeaderboardEntry, TokenBalance } from "@/utils/abyssContract";
import { ArrowLeft, Trophy, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useController } from "@/hooks/useController";
import { useAbyssGame } from "@/hooks/useAbyssGame";
import { PrizePoolModal } from "./modals/PrizePoolModal";

const headerStyle: React.CSSProperties = {
    fontFamily: "'PressStart2P', monospace",
    fontSize: "10px",
    color: "#FF841C",
};

export function Leaderboard() {
    const navigate = useNavigate();
    const { address, connector } = useController();
    const { getLeaderboard } = useAbyssGame(null);
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
    const [showPrizeModal, setShowPrizeModal] = useState(false);

    const loadData = useCallback(async () => {
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
    }, [getLeaderboard]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleOpenProfile = useCallback(() => {
        try {
            const ctrl = connector as any;
            if (ctrl?.controller?.openProfile) {
                ctrl.controller.openProfile();
            } else if (ctrl?.openProfile) {
                ctrl.openProfile();
            }
        } catch (e) {
            console.log("Controller profile not available:", e);
        }
    }, [connector]);

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
            display: "flex",
            flexDirection: "column" as const,
            alignItems: "center",
        }}>
            {/* Header */}
            <div style={{
                width: "100%",
                maxWidth: "600px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "24px",
            }}>
                <button
                    onClick={() => navigate("/")}
                    style={{
                        background: "transparent",
                        border: "none",
                        color: "#FF841C",
                        cursor: "pointer",
                        padding: "8px",
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{
                    fontFamily: "'PressStart2P', monospace",
                    fontSize: "14px",
                    color: "#FF841C",
                    margin: 0,
                    letterSpacing: "2px",
                }}>
                    LEADERBOARD
                </h1>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button
                        onClick={() => setShowPrizeModal(true)}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "#FF841C",
                            cursor: "pointer",
                            padding: "8px",
                        }}
                    >
                        <Trophy size={20} />
                    </button>
                    <button
                        onClick={handleOpenProfile}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "#FF841C",
                            cursor: "pointer",
                            padding: "8px",
                        }}
                    >
                        <User size={20} />
                    </button>
                </div>
            </div>

            <div style={{ width: "100%", maxWidth: "600px" }}>
                {loading ? (
                    <div style={{
                        display: "flex",
                        flexDirection: "column" as const,
                        alignItems: "center",
                        justifyContent: "center",
                        height: "50vh",
                        gap: "16px",
                    }}>
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            style={{
                                width: "32px",
                                height: "32px",
                                border: "3px solid #FF841C",
                                borderTopColor: "transparent",
                                borderRadius: "50%",
                            }} 
                        />
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
                        <div style={{
                            display: "flex",
                            padding: "12px 16px",
                            borderBottom: "2px solid #FF841C",
                            marginBottom: "8px",
                        }}>
                            <span style={{ ...headerStyle, width: "40px" }}>#</span>
                            <span style={{ ...headerStyle, flex: 1 }}>Player</span>
                            <span style={{ ...headerStyle, width: "60px", textAlign: "center" }}>Runs</span>
                            <span style={{ ...headerStyle, width: "80px", textAlign: "right" }}>Best</span>
                        </div>

                        <AnimatePresence>
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
                                                    <Trophy size={14} color={index === 0 ? "#000" : "#fff"} />
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

                                            <span style={{
                                                flex: 1,
                                                fontFamily: "'PressStart2P', monospace",
                                                fontSize: "10px",
                                                color: isCurrent ? "#FF841C" : "#fff",
                                            }}>
                                                {entry.username || formatAddress(entry.player_address)}
                                            </span>

                                            <span style={{
                                                width: "60px",
                                                textAlign: "center",
                                                fontFamily: "'PressStart2P', monospace",
                                                fontSize: "10px",
                                                color: isPodium ? "#FFD700" : "#fff",
                                            }}>
                                                {entry.games_played}
                                            </span>

                                            <span style={{
                                                width: "80px",
                                                textAlign: "right",
                                                fontFamily: "'PressStart2P', monospace",
                                                fontSize: isPodium ? "12px" : "10px",
                                                color: isPodium ? "#FFD700" : "#fff",
                                                fontWeight: isPodium ? "bold" : "normal",
                                            }}>
                                                {entry.best_score}
                                            </span>
                                        </motion.div>
                                    );
                                })
                            )}
                        </AnimatePresence>
                    </>
                )}
            </div>

            {showPrizeModal && (
                <PrizePoolModal
                    tokenBalances={tokenBalances}
                    onClose={() => setShowPrizeModal(false)}
                />
            )}
        </div>
    );
}
