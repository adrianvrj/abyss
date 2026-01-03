"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { controllerConnector } from "@/components/providers/StarknetProvider";
import { useController } from "@/hooks/useController";

export default function ControllerButton() {
    const { isConnected, address } = useController();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleOpenController = useCallback(() => {
        try {
            const connector = controllerConnector as any;
            if (connector?.controller?.openProfile) {
                connector.controller.openProfile();
            } else if (connector?.openProfile) {
                connector.openProfile();
            } else if (connector?.controller?.openSettings) {
                connector.controller.openSettings();
            }
        } catch (e) {
            console.log("Controller profile not available:", e);
        }
    }, []);

    // Hide on mobile or when not connected
    if (!isConnected || isMobile) return null;

    const displayAddress = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : "Profile";

    return (
        <div style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 1000,
        }}>
            <motion.button
                style={{
                    background: "#000000",
                    border: "2px solid #FF841C",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontFamily: "'PressStart2P', monospace",
                    fontSize: "10px",
                    color: "#FF841C",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                }}
                onClick={handleOpenController}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <span>{displayAddress}</span>
            </motion.button>
        </div>
    );
}
