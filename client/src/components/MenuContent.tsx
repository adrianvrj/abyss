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

    const handleDiscord = useCallback(() => {
        window.open("https://discord.gg/UspD94Z5p7", "_blank");
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
                <button style={styles.iconButton} onClick={handleDiscord}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
