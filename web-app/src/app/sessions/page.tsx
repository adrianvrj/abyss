"use client";

import { useState, useEffect, useCallback } from "react";
import { useController } from "@/hooks/useController";
import { useGameContract } from "@/hooks/useGameContract";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { getAvailableBeastSessions } from "@/utils/abyssContract";
import { CONTRACTS } from "@/lib/constants";
import ModalWrapper from "@/components/modals/ModalWrapper";


interface SessionInfo {
    sessionId: number;
    level: number;
    score: number;
    spinsRemaining: number;
    isActive: boolean;
}


const styles = {
    container: {
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        padding: "48px 24px",
    },
    title: {
        fontFamily: "'Ramagothic', 'PressStart2P', monospace",
        fontSize: "32px",
        color: "#FF841C",
        textTransform: "uppercase" as const,
        letterSpacing: "4px",
        marginBottom: "32px",
    },

    content: {
        width: "100%",
        maxWidth: "600px",
        display: "flex",
        flexDirection: "column" as const,
        gap: "24px",
    },
    sectionTitle: {
        fontFamily: "'PressStart2P', monospace",
        fontSize: "12px",
        color: "#FF841C",
        marginBottom: "16px",
        opacity: 0.8,
    },
    sessionCard: {
        background: "rgba(255, 132, 28, 0.1)",
        border: "2px solid rgba(255, 132, 28, 0.3)",
        borderRadius: "8px",
        padding: "20px",
        cursor: "pointer",
        transition: "all 0.2s ease",
    },
    sessionCardHover: {
        border: "2px solid #FF841C",
        boxShadow: "0 0 20px rgba(255, 132, 28, 0.3)",
    },
    sessionInfo: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    sessionId: {
        fontFamily: "'PressStart2P', monospace",
        fontSize: "14px",
        color: "#FFFFFF",
    },
    sessionStats: {
        display: "flex",
        gap: "24px",
    },
    stat: {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        gap: "4px",
    },
    statValue: {
        fontFamily: "'PressStart2P', monospace",
        fontSize: "16px",
        color: "#FF841C",
    },
    statLabel: {
        fontFamily: "'PressStart2P', monospace",
        fontSize: "8px",
        color: "#FFFFFF",
        opacity: 0.6,
    },
    newSessionButton: {
        background: "transparent",
        border: "none",
        fontFamily: "'PressStart2P', monospace",
        fontSize: "18px",
        color: "#FFFFFF",
        cursor: "pointer",
        padding: "8px",
        marginBottom: "32px",
    },

    noSessions: {
        fontFamily: "'PressStart2P', monospace",
        fontSize: "12px",
        color: "#FFFFFF",
        opacity: 0.5,
        textAlign: "center" as const,
        padding: "32px",
    },
    loading: {
        fontFamily: "'PressStart2P', monospace",
        fontSize: "12px",
        color: "#FFFFFF",
        textAlign: "center" as const,
    },
    spinsWarning: {
        color: "#FF4444",
    },
    navRow: {
        width: "100%",
        maxWidth: "600px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "32px",
    },
    navButton: {
        background: "transparent",
        border: "none",
        color: "#FFFFFF",
        fontFamily: "'PressStart2P', monospace",
        fontSize: "12px",
        cursor: "pointer",
        opacity: 0.7,
    },
};




export default function SessionsPage() {
    const router = useRouter();
    const { account, isConnected, disconnect } = useController();
    const { getPlayerSessions, getSessionData, createSession, isReady } = useGameContract(account);


    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [beastSessions, setBeastSessions] = useState(0);

    // Redirect to home if not connected
    useEffect(() => {
        if (!isConnected) {
            router.push("/");
        }
    }, [isConnected, router]);

    async function loadSessions() {
        if (!isReady || !account) return;

        setIsLoading(true);
        try {
            const sessionIds = await getPlayerSessions();
            const sessionPromises = sessionIds.map(async (id: number) => {
                const data = await getSessionData(id);
                if (!data) return null;
                return {
                    sessionId: id,
                    level: data.level,
                    score: data.score,
                    spinsRemaining: data.spinsRemaining,
                    isActive: data.isActive,
                };
            });

            const allSessions = await Promise.all(sessionPromises);
            // Filter only active sessions and remove nulls
            const activeSessions = allSessions.filter((s): s is SessionInfo => s !== null && s.isActive);

            setSessions(activeSessions);
        } catch (error) {
            console.error("Failed to load sessions:", error);
        } finally {
            setIsLoading(false);
        }
    }

    // Load player sessions
    useEffect(() => {
        loadSessions();
        // Load Beast free sessions
        if (account?.address) {
            getAvailableBeastSessions(account.address).then(setBeastSessions);
        }
    }, [isReady, account, getPlayerSessions, getSessionData]);

    const handleSelectSession = useCallback((sessionId: number) => {
        router.push(`/game?sessionId=${sessionId}`);
    }, [router]);

    const [showPayment, setShowPayment] = useState(false);
    const [selectedToken, setSelectedToken] = useState<string>(CONTRACTS.ETH_TOKEN);

    const handleCreateSessionClick = useCallback(() => {
        console.log("Create session clicked", { isReady });
        if (!isReady) {
            console.log("Not ready");
            alert("Wallet not ready. Please wait or reconnect.");
            return;
        }
        setShowPayment(true);
        console.log("Setting showPayment to true");
    }, [isReady]);

    const handleConfirmPayment = useCallback(async () => {
        setIsCreating(true);
        setShowPayment(false);
        try {
            await createSession(selectedToken);
            await loadSessions();
        } catch (error) {
            console.error("Failed to create session:", error);
        } finally {
            setIsCreating(false);
        }
    }, [createSession, selectedToken, loadSessions]);

    // ... handleBack, handleLogout ...


    const handleBack = useCallback(() => {
        router.push("/");
    }, [router]);

    const handleLogout = useCallback(async () => {
        await disconnect();
        router.push("/");
    }, [disconnect, router]);




    return (
        <div style={styles.container}>
            {/* Navigation Row */}
            <div style={styles.navRow}>
                <motion.button
                    style={styles.navButton}
                    onClick={handleBack}
                    whileHover={{ opacity: 1, color: "#FF841C" }}
                    whileTap={{ scale: 0.95 }}
                >
                    ← back
                </motion.button>
                <motion.button
                    style={styles.navButton}
                    onClick={handleLogout}
                    whileHover={{ opacity: 1, color: "#FF841C" }}
                    whileTap={{ scale: 0.95 }}
                >
                    logout
                </motion.button>
            </div>

            <div style={styles.content}>
                {/* Create New Session */}
                <motion.button
                    style={{
                        ...styles.newSessionButton,
                        opacity: isCreating ? 0.6 : 1,
                    }}
                    onClick={handleCreateSessionClick}
                    disabled={isCreating}
                    whileHover={{ scale: 1.05, color: "#FF841C" }}
                    whileTap={{ scale: 0.95 }}
                >
                    {isCreating ? (
                        <span>
                            &gt; creating...{" "}
                            <motion.span
                                animate={{ rotate: 360 }}
                                transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                                style={{ display: "inline-block" }}
                            >
                                ⟳
                            </motion.span>
                        </span>
                    ) : (
                        <span>&gt; new session</span>
                    )}
                </motion.button>


                {/* Beast Free Sessions Badge */}
                {beastSessions > 0 && (
                    <div style={{
                        background: "rgba(255, 215, 0, 0.15)",
                        border: "1px solid #FFD700",
                        borderRadius: "8px",
                        padding: "12px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                    }}>
                        <div>
                            <p style={{
                                fontFamily: "'PressStart2P', monospace",
                                fontSize: "10px",
                                color: "#FFD700",
                                margin: 0,
                            }}>
                                Beast Holder Bonus
                            </p>
                            <p style={{
                                fontFamily: "'PressStart2P', monospace",
                                fontSize: "12px",
                                color: "#FFFFFF",
                                margin: 0,
                            }}>
                                {beastSessions} free session{beastSessions !== 1 ? 's' : ''} available
                            </p>
                        </div>
                    </div>
                )}


                {/* Active Sessions */}
                <div>
                    <p style={styles.sectionTitle}>Active Sessions</p>

                    {isLoading ? (
                        <p style={styles.loading}>Loading sessions...</p>
                    ) : sessions.length === 0 ? (
                        <p style={styles.noSessions}>No active sessions</p>
                    ) : (
                        <AnimatePresence>
                            {sessions.map((session) => (
                                <motion.div
                                    key={session.sessionId}
                                    style={styles.sessionCard}
                                    onClick={() => handleSelectSession(session.sessionId)}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    whileHover={styles.sessionCardHover}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div style={styles.sessionInfo}>
                                        <span style={styles.sessionId}>
                                            Session #{session.sessionId}
                                        </span>
                                        <div style={styles.sessionStats}>
                                            <div style={styles.stat}>
                                                <span style={styles.statValue}>{session.level}</span>
                                                <span style={styles.statLabel}>LEVEL</span>
                                            </div>
                                            <div style={styles.stat}>
                                                <span style={styles.statValue}>{session.score}</span>
                                                <span style={styles.statLabel}>SCORE</span>
                                            </div>
                                            <div style={styles.stat}>
                                                <span style={{
                                                    ...styles.statValue,
                                                    ...(session.spinsRemaining <= 1 ? styles.spinsWarning : {}),
                                                }}>
                                                    {session.spinsRemaining}

                                                </span>
                                                <span style={styles.statLabel}>SPINS</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* Payment Modal */}
            {showPayment && (
                <ModalWrapper onClose={() => setShowPayment(false)} title="START SESSION">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{
                                fontFamily: "'PressStart2P', monospace",
                                fontSize: '10px',
                                color: '#fff',
                                opacity: 0.7,
                                margin: '0 0 8px 0',
                            }}>
                                SESSION COST
                            </p>
                            <p style={{
                                fontFamily: "'PressStart2P', monospace",
                                fontSize: '24px',
                                color: '#fff',
                                margin: 0,
                            }}>
                                $1.00 USD
                            </p>
                        </div>

                        <div style={{ width: '100%' }}>
                            <p style={{
                                fontFamily: "'PressStart2P', monospace",
                                fontSize: '10px',
                                color: '#fff',
                                opacity: 0.7,
                                margin: '0 0 8px 0',
                                textAlign: 'left',
                            }}>
                                PAY WITH
                            </p>
                            <select
                                value={selectedToken}
                                onChange={(e) => setSelectedToken(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: '#111',
                                    border: '1px solid #333',
                                    color: '#fff',
                                    fontFamily: "'PressStart2P', monospace",
                                    fontSize: '12px',
                                    borderRadius: '4px',
                                    outline: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                <option value={CONTRACTS.ETH_TOKEN}>ETH</option>
                                <option value={CONTRACTS.STRK_TOKEN}>STRK</option>
                            </select>
                        </div>

                        <button
                            onClick={handleConfirmPayment}
                            disabled={isCreating}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: '#FF841C',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#000',
                                fontFamily: "'PressStart2P', monospace",
                                fontSize: '14px',
                                cursor: 'pointer',
                                opacity: isCreating ? 0.7 : 1,
                            }}
                        >
                            {isCreating ? 'APPROVING...' : 'PAY & START'}
                        </button>
                    </div>
                </ModalWrapper>
            )}
        </div>
    );
}
