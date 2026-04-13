import { useState, useEffect, useCallback } from "react";
import type ControllerConnector from "@cartridge/connector/controller";
import { useNetwork } from "@starknet-react/core";
import { useController } from "@/hooks/useController";
import { useAbyssGame } from "@/hooks/useAbyssGame";
import { useBundles } from "@/context/bundles";
import { getSetupAddress } from "@/config";
import { CONTRACTS } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

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
        fontFamily: "var(--font-title)",
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
        fontFamily: "var(--font-title)",
        fontSize: "32px",
        color: "#FFFFFF",
        cursor: "pointer",
        padding: "8px",
        marginBottom: "32px",
        letterSpacing: "2px",
        textAlign: "center" as const,
    },
    noSessions: {
        fontFamily: "'PressStart2P', monospace",
        fontSize: "12px",
        color: "#FFFFFF",
        opacity: 0.5,
        textAlign: "center" as const,
        padding: "32px",
    },
    perksPanel: {
        border: "1px solid rgba(255, 132, 28, 0.35)",
        borderRadius: "12px",
        background: "#0a0402",
        padding: "14px",
        display: "flex",
        flexDirection: "column" as const,
        gap: "12px",
        boxShadow: "0 0 0 1px rgba(255,132,28,0.08) inset",
    },
    perksHeader: {
        fontFamily: "'PressStart2P', monospace",
        fontSize: "10px",
        color: "#FF841C",
        opacity: 0.9,
        textTransform: "uppercase" as const,
        letterSpacing: "1px",
    },
    perksGrid: {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "10px",
    },
    perkCard: {
        border: "1px solid rgba(255, 132, 28, 0.25)",
        borderRadius: "10px",
        background: "#000000",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column" as const,
        gap: "8px",
    },
    perkTitleRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
    },
    perkTitle: {
        fontFamily: "'PressStart2P', monospace",
        fontSize: "10px",
        color: "#FFFFFF",
        textTransform: "uppercase" as const,
    },
    perkBadge: {
        fontFamily: "'PressStart2P', monospace",
        fontSize: "8px",
        color: "#FF841C",
        border: "1px solid rgba(255, 132, 28, 0.5)",
        borderRadius: "999px",
        padding: "4px 8px",
        background: "#120700",
        whiteSpace: "nowrap" as const,
    },
    perkBody: {
        fontFamily: "'PressStart2P', monospace",
        fontSize: "10px",
        lineHeight: 1.7,
        color: "rgba(255,255,255,0.72)",
    },
    perkAction: {
        alignSelf: "flex-start" as const,
        background: "#160900",
        border: "1px solid #FF841C",
        borderRadius: "999px",
        color: "#FF841C",
        fontFamily: "'PressStart2P', monospace",
        fontSize: "9px",
        padding: "8px 12px",
        cursor: "pointer",
        textTransform: "uppercase" as const,
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

export function SessionsContent() {
    const navigate = useNavigate();
    const { chain } = useNetwork();
    const { account, connector, isConnected, disconnect } = useController();
    const {
        getPlayerSessions,
        getSessionData,
        getAvailableBeastSessions,
        getAvailableXShareSessions,
        claimBeastSession,
        claimXShareSession,
        isReady,
    } = useAbyssGame(account);
    const { bundles, status: bundlesStatus, refresh: refreshBundles } = useBundles();

    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [beastSessions, setBeastSessions] = useState(0);
    const [xShareSessions, setXShareSessions] = useState(0);
    const shareIntentUrl = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(
        "I survived the Abyss. Spin the cursed machine at https://play.abyssgame.fun",
    );

    // Redirect to home if not connected
    useEffect(() => {
        if (!isConnected) {
            navigate("/");
        }
    }, [isConnected, navigate]);

    const loadSessions = useCallback(async () => {
        if (!isReady || !account) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            console.log("Loading sessions for:", account.address);
            const [sessionIds, availableBeastSessions, availableXShareSessions] = await Promise.all([
                getPlayerSessions(account.address),
                getAvailableBeastSessions(account.address),
                getAvailableXShareSessions(account.address),
            ]);
            console.log("Session IDs found:", sessionIds);
            setBeastSessions(availableBeastSessions);
            setXShareSessions(availableXShareSessions);
            const sessionPromises = sessionIds.map(async (id: number) => {
                const data = await getSessionData(id);
                console.log("Session data for", id, ":", data);
                if (!data) return null;
                return {
                    sessionId: id,
                    level: data.level,
                    score: data.score,
                    spinsRemaining: data.spinsRemaining,
                    isActive: data.isActive,
                } as SessionInfo;
            });

            const allSessions = await Promise.all(sessionPromises);
            const activeSessions = allSessions.filter((s): s is SessionInfo => s !== null && s.isActive);
            setSessions(activeSessions);
        } catch (error) {
            console.error("Failed to load sessions:", error);
        } finally {
            setIsLoading(false);
        }
    }, [
        isReady,
        account,
        getPlayerSessions,
        getAvailableBeastSessions,
        getAvailableXShareSessions,
        getSessionData,
    ]);

    // Load initial data
    useEffect(() => {
        loadSessions();
    }, [isReady, account?.address, loadSessions]);

    const handleSelectSession = useCallback((sessionId: number) => {
        navigate(`/game?sessionId=${sessionId}`);
    }, [navigate]);

    const handleCreateSessionClick = useCallback(async () => {
        if (!account) {
            console.error("No account connected");
            return;
        }

        setIsCreating(true);
        try {
            let availableBundles = bundles;
            let sessionBundle =
                availableBundles.find((bundle) => bundle.id === CONTRACTS.SESSION_BUNDLE_ID) ??
                availableBundles.find((bundle) => bundle.price === 0n) ??
                availableBundles[0];

            if (!sessionBundle) {
                const refreshed = await refreshBundles();
                availableBundles = refreshed ?? availableBundles;
                sessionBundle =
                    availableBundles.find((bundle) => bundle.id === CONTRACTS.SESSION_BUNDLE_ID) ??
                    availableBundles.find((bundle) => bundle.price === 0n) ??
                    availableBundles[0];
            }

            if (!sessionBundle && Number.isFinite(CONTRACTS.SESSION_BUNDLE_ID)) {
                sessionBundle = {
                    id: CONTRACTS.SESSION_BUNDLE_ID,
                    referralPercentage: 0,
                    reissuable: false,
                    price: 0n,
                    paymentToken: "0x0",
                    paymentReceiver: "0x0",
                    totalIssued: 0n,
                    createdAt: 0,
                    metadata: "",
                    contract: "0x0",
                    allower: "0x0",
                };
            }

            console.log("Opening session flow for:", account.address);
            console.log("Session bundle selection:", {
                configuredBundleId: CONTRACTS.SESSION_BUNDLE_ID,
                selectedBundleId: sessionBundle?.id,
                selectedBundlePrice: sessionBundle?.price?.toString(),
                allBundles: availableBundles.map((bundle) => ({
                    id: bundle.id,
                    price: bundle.price.toString(),
                    paymentToken: bundle.paymentToken,
                })),
            });

            if (!sessionBundle) {
                console.error("No session bundle found; refusing to fallback to paid create_session.");
                await loadSessions();
                return;
            }

            if (!connector) {
                console.error("No controller connector available for openBundle.");
                return;
            }

            const controller = connector as ControllerConnector;
            const registry = getSetupAddress(chain?.id);
            const previousSessionIds = await getPlayerSessions(account.address);

            await controller.controller.openBundle(sessionBundle.id, registry, {
                onPurchaseComplete: async () => {
                    for (let attempt = 0; attempt < 10; attempt++) {
                        const nextSessionIds = await getPlayerSessions(account.address);
                        const createdSessionId = nextSessionIds.find(
                            (sessionId) => !previousSessionIds.includes(sessionId),
                        );

                        if (createdSessionId !== undefined) {
                            await loadSessions();
                            navigate(`/game?sessionId=${createdSessionId}`);
                            return;
                        }

                        await new Promise((resolve) => setTimeout(resolve, 400));
                    }

                    await loadSessions();
                },
            });
        } catch (error: any) {
            console.error("Failed to create session:", error);
        } finally {
            setIsCreating(false);
        }
    }, [account, bundles, chain?.id, connector, getPlayerSessions, loadSessions, navigate, refreshBundles]);

    const handleBack = useCallback(() => {
        navigate("/");
    }, [navigate]);

    const handleLogout = useCallback(async () => {
        await disconnect();
        navigate("/");
    }, [disconnect, navigate]);

    const waitForClaimedSession = useCallback(
        async (claimFn: () => Promise<number>) => {
            if (!account) {
                return;
            }

            const previousSessionIds = await getPlayerSessions(account.address);
            await claimFn();

            for (let attempt = 0; attempt < 10; attempt += 1) {
                const nextSessionIds = await getPlayerSessions(account.address);
                const createdSessionId = nextSessionIds.find(
                    (sessionId) => !previousSessionIds.includes(sessionId),
                );

                if (createdSessionId !== undefined) {
                    await loadSessions();
                    navigate(`/game?sessionId=${createdSessionId}`);
                    return;
                }

                await new Promise((resolve) => setTimeout(resolve, 400));
            }

            await loadSessions();
        },
        [account, getPlayerSessions, loadSessions, navigate],
    );

    const handleShareOnX = useCallback(() => {
        if (typeof window === "undefined") {
            return;
        }

        window.open(shareIntentUrl, "_blank", "noopener,noreferrer");
    }, [shareIntentUrl]);

    const handleClaimBeastSession = useCallback(async () => {
        setIsCreating(true);
        try {
            await waitForClaimedSession(claimBeastSession);
        } catch (error) {
            console.error("Failed to claim Beast session:", error);
        } finally {
            setIsCreating(false);
        }
    }, [claimBeastSession, waitForClaimedSession]);

    const handleClaimXShareSession = useCallback(async () => {
        setIsCreating(true);
        try {
            await waitForClaimedSession(claimXShareSession);
        } catch (error) {
            console.error("Failed to claim X share session:", error);
        } finally {
            setIsCreating(false);
        }
    }, [claimXShareSession, waitForClaimedSession]);

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
                    whileHover={{ color: "#FF841C" }}
                    whileTap={{ scale: 0.95 }}
                >
                    {isCreating ? (
                        <span>
                            &gt; OPENING...{" "}
                            <motion.span
                                animate={{ rotate: 360 }}
                                transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                                style={{ display: "inline-block" }}
                            >
                                ⟳
                            </motion.span>
                        </span>
                    ) : bundlesStatus === "loading" ? (
                        <span>&gt; LOADING RUN...</span>
                    ) : (
                        <span>&gt; NEW RUN</span>
                    )}
                </motion.button>

                <motion.div
                    style={styles.perksPanel}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <div style={styles.perksHeader}>Abyss Perks</div>
                    <div style={styles.perksGrid}>
                        {beastSessions > 0 && (
                            <div style={styles.perkCard}>
                                <div style={styles.perkTitleRow}>
                                    <span style={styles.perkTitle}>Beast Holder Bonus</span>
                                    <span style={styles.perkBadge}>
                                        {beastSessions} FREE RUN{beastSessions !== 1 ? "S" : ""}
                                    </span>
                                </div>
                                <div style={styles.perkBody}>
                                    Your wallet holds a Beast. Claim your complimentary session directly onchain.
                                </div>
                                <motion.button
                                    style={styles.perkAction}
                                    onClick={handleClaimBeastSession}
                                    disabled={isCreating}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    Claim Beast Run
                                </motion.button>
                            </div>
                        )}

                        <div style={styles.perkCard}>
                            <div style={styles.perkTitleRow}>
                                <span style={styles.perkTitle}>Whisper Abyss on X</span>
                                <span style={styles.perkBadge}>
                                    {xShareSessions > 0 ? "CLAIM READY" : "FREE MINT SIGNAL"}
                                </span>
                            </div>
                            <div style={styles.perkBody}>
                                Share the game on X and let players know the cursed machine is awake. Once your share is verified, one free session claim can be unlocked onchain.
                            </div>
                            {xShareSessions > 0 ? (
                                <motion.button
                                    style={styles.perkAction}
                                    onClick={handleClaimXShareSession}
                                    disabled={isCreating}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    Claim X Run
                                </motion.button>
                            ) : (
                                <motion.button
                                    style={styles.perkAction}
                                    onClick={handleShareOnX}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    Share on X
                                </motion.button>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Active Sessions */}
                <div>
                    <p style={styles.sectionTitle}>active runs</p>

                    {isLoading ? (
                        <p style={styles.loading}>loading runs...</p>
                    ) : sessions.length === 0 ? (
                        <p style={styles.noSessions}>no active runs</p>
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
                                            RUN #{session.sessionId}
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
        </div>
    );
}
