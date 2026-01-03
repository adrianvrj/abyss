"use client";

import { useState, useCallback } from "react";
import { useController } from "@/hooks/useController";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";


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
        fontFamily: "'PressStart2P', monospace",
        fontSize: "18px",
        color: "#FFFFFF",
        background: "transparent",
        border: "none",
        padding: "8px",
        cursor: "pointer",
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
    creating: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
};

export default function MenuContent() {
    const router = useRouter();
    const { account, isConnecting, isReady: controllerReady, isConnected, connect, disconnect } = useController();

    const [activeSessionId] = useState<number | null>(null);


    // Step 1: Connect to Cartridge (if not connected)
    const handleConnect = useCallback(async () => {
        if (!controllerReady) {
            console.error("Controller not ready");
            return;
        }
        try {
            await connect();
            // After connecting, redirect to sessions page
            router.push("/sessions");
        } catch (error) {
            console.error("Connection failed:", error);
        }
    }, [controllerReady, connect, router]);

    // Main play handler - decides which step to execute
    const handlePlay = useCallback(async () => {
        if (!isConnected) {
            // Step 1: Connect first
            await handleConnect();
        } else {
            // Step 2: Go to sessions page
            router.push("/sessions");
        }
    }, [isConnected, handleConnect, router]);



    const handleContinue = useCallback(() => {
        if (activeSessionId) {
            router.push(`/game?sessionId=${activeSessionId}`);
        }
    }, [activeSessionId, router]);

    const handleLeaderboard = useCallback(() => {
        router.push("/leaderboard");
    }, [router]);

    const handleTelegram = useCallback(() => {
        window.open("https://t.me/+JB4RkO3eZrFhNjYx", "_blank");
    }, []);

    const handleLogout = useCallback(async () => {
        await disconnect();
        router.push("/");
    }, [disconnect, router]);

    return (
        <div style={styles.container}>
            {/* App Icon at Top */}
            <div style={styles.topSection}>
                <Image
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
                            whileHover={{ scale: 1.05, color: "#FF841C" }}
                            whileTap={{ scale: 0.95 }}
                        >
                            &gt; continue game
                        </motion.button>
                    )}

                    {/* Play / New Game */}
                    <motion.button
                        style={{
                            ...styles.menuOption,
                            opacity: isConnecting || !controllerReady ? 0.6 : 1,
                        }}
                        onClick={handlePlay}
                        disabled={isConnecting || !controllerReady}
                        whileHover={{ scale: 1.05, color: "#FF841C" }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {!controllerReady ? (
                            <span>&gt; loading...</span>
                        ) : isConnecting ? (
                            <span>&gt; connecting...</span>
                        ) : !isConnected ? (
                            <span>&gt; connect wallet</span>
                        ) : (
                            <span>&gt; play</span>
                        )}
                    </motion.button>

                    {/* Relics */}
                    {isConnected && (
                        <motion.button
                            style={styles.menuOption}
                            onClick={() => router.push("/relics")}
                            whileHover={{ scale: 1.05, color: "#FF841C" }}
                            whileTap={{ scale: 0.95 }}
                        >
                            &gt; relics
                        </motion.button>
                    )}

                    {/* Leaderboard */}
                    <motion.button
                        style={styles.menuOption}
                        onClick={handleLeaderboard}
                        disabled={false}
                        whileHover={{ scale: 1.05, color: "#FF841C" }}
                        whileTap={{ scale: 0.95 }}
                    >
                        &gt; leaderboard
                    </motion.button>

                    {/* Logout - only when connected */}
                    {isConnected && (
                        <motion.button
                            style={{ ...styles.menuOption, color: '#888' }}
                            onClick={handleLogout}
                            whileHover={{ scale: 1.05, color: "#FF841C" }}
                            whileTap={{ scale: 0.95 }}
                        >
                            &gt; logout
                        </motion.button>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Bottom Icons */}
            <div style={styles.bottomSection}>
                <button style={styles.iconButton} onClick={handleTelegram}>
                    <Image
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
