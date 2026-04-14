import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useConnect } from "@starknet-react/core";
import { useLocation } from "react-router-dom";
import { useController } from "@/hooks/useController";

export default function ControllerButton() {
    const { isConnected, address } = useController();
    const { pathname } = useLocation();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const { connectors } = useConnect();
    const controllerConnector = connectors.find(c => c.id === "controller");

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
    }, [controllerConnector]);

    const displayAddress = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : "Profile";

    // Hide when not connected or on specific routes
    if (!isConnected || pathname === "/game" || pathname === "/practice") return null;

    return (
        <div style={{
            position: "fixed",
            ...(isMobile
                ? { top: "16px", right: "16px" }
                : { bottom: "24px", right: "24px" }),
            zIndex: 1000,
        }}>
            <motion.button
                style={{
                    background: "#000000",
                    border: "2px solid #FF841C",
                    borderRadius: "8px",
                    padding: isMobile ? "7px 10px" : "10px 14px",
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

