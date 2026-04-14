import { useState, useCallback, useEffect } from "react";
import { useController } from "@/hooks/useController";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { usePractice } from "@/context/practice";

const styles = {
    container: {
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        position: "relative" as const,
    },
    topSection: {
        position: "absolute" as const,
        top: "48px",
    },
    menuOptions: {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        gap: "32px",
    },
    menuOption: {
        fontFamily: "var(--font-title)",
        fontSize: "32px",
        color: "#FFFFFF",
        background: "transparent",
        cursor: "pointer",
        textTransform: "uppercase" as const,
        letterSpacing: "2px",
        border: "none",
        padding: "8px 16px",
    },
    bottomSection: {
        position: "absolute" as const,
        bottom: "32px",
        left: "32px",
    },
    iconButton: {
        background: "transparent",
        border: "none",
        padding: "4px",
        cursor: "pointer",
        opacity: 0.8,
    },
};

export function MenuContent() {
    const navigate = useNavigate();
    const { isConnecting, isConnected, connect, disconnect } = useController();
    const { startPractice } = usePractice();
    const [isMobile, setIsMobile] = useState(false);

    const [activeSessionId] = useState<number | null>(null);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const handlePlay = useCallback(async () => {
        if (isConnected) {
            navigate("/sessions");
            return;
        }
        try {
            await connect();
            navigate("/sessions");
        } catch (error) {
            console.error("Connection failed:", error);
        }
    }, [isConnected, connect, navigate]);

    const handleContinue = useCallback(() => {
        if (activeSessionId) {
            navigate(`/game?sessionId=${activeSessionId}`);
        }
    }, [activeSessionId, navigate]);

    const handleLeaderboard = useCallback(() => {
        navigate("/leaderboard");
    }, [navigate]);

    const handlePractice = useCallback(() => {
        startPractice();
        navigate("/practice");
    }, [navigate, startPractice]);

    const handleTelegram = useCallback(() => {
        window.open("https://t.me/+JB4RkO3eZrFhNjYx", "_blank");
    }, []);

    const handleLogout = useCallback(async () => {
        await disconnect();
        navigate("/");
    }, [disconnect, navigate]);

    return (
        <div
            style={{
                ...styles.container,
                width: "100%",
                background: isMobile ? "#000000" : "transparent",
            }}
        >
            {/* App Icon at Top */}
            <div style={styles.topSection}>
                <img
                    src="/images/abyss-logo.png"
                    alt="Abyss"
                    width={50}
                    height={50}
                />
            </div>

            {/* Menu Options */}
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={styles.menuOptions}
                >
                    {/* Continue (if active session) */}
                    {activeSessionId && (
                        <motion.button
                            style={styles.menuOption}
                            onClick={handleContinue}
                            whileHover={{ color: "#FF841C" }}
                            whileTap={{ scale: 0.95 }}
                        >
                            continue game
                        </motion.button>
                    )}

                    {/* Play / New Game */}
                    <motion.button
                        style={{
                            ...styles.menuOption,
                            opacity: isConnecting ? 0.6 : 1,
                        }}
                        onClick={handlePlay}
                        disabled={isConnecting}
                        whileHover={{ color: "#FF841C" }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {isConnecting ? (
                            <span>connecting...</span>
                        ) : !isConnected ? (
                            <span>connect wallet</span>
                        ) : (
                            <span>play</span>
                        )}
                    </motion.button>

                    <motion.button
                        style={styles.menuOption}
                        onClick={handlePractice}
                        whileHover={{ color: "#FF841C" }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <span>practice</span>
                    </motion.button>

                    {/* Relics */}
                    {isConnected && (
                        <motion.button
                            style={styles.menuOption}
                            onClick={() => navigate("/relics")}
                            whileHover={{ color: "#FF841C" }}
                            whileTap={{ scale: 0.95 }}
                        >
                            relics
                        </motion.button>
                    )}

                    {/* Charms */}
                    {isConnected && (
                        <motion.button
                            style={styles.menuOption}
                            onClick={() => navigate("/charms")}
                            whileHover={{ color: "#FF841C" }}
                            whileTap={{ scale: 0.95 }}
                        >
                            charms
                        </motion.button>
                    )}

                    {/* Leaderboard */}
                    <motion.button
                        style={styles.menuOption}
                        onClick={handleLeaderboard}
                        whileHover={{ color: "#FF841C" }}
                        whileTap={{ scale: 0.95 }}
                    >
                        leaderboard
                    </motion.button>

                    {/* Logout - only when connected */}
                    {isConnected && (
                        <motion.button
                            style={{ ...styles.menuOption, color: '#fff' }}
                            onClick={handleLogout}
                            whileHover={{ color: "#FF841C" }}
                            whileTap={{ scale: 0.95 }}
                        >
                            logout
                        </motion.button>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Bottom Icons */}
            <div style={styles.bottomSection}>
                <button style={styles.iconButton} onClick={handleTelegram}>
                    <img
                        src="/images/tg_icon.png"
                        alt="Telegram"
                        width={32}
                        height={32}
                    />
                </button>
            </div>
        </div>
    );
}
