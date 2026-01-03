"use client";

import { useState, useCallback, useEffect } from "react";
import {
    useAccount,
    useConnect,
    useDisconnect,
} from "@starknet-react/core";
import { controllerConnector } from "@/components/providers/StarknetProvider";

export interface UseControllerReturn {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    account: any | null;
    address: string | undefined;
    username: string | null;
    isConnecting: boolean;
    isConnected: boolean;
    isReady: boolean;
    error: string | null;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
}

export function useController(): UseControllerReturn {
    const { address, status, account } = useAccount();
    const { connect } = useConnect();
    const { disconnect: starknetDisconnect } = useDisconnect();

    const [username, setUsername] = useState<string | null>(() => {
        // Initialize from localStorage only (no controllerConnector.username access)
        if (typeof window !== "undefined") {
            return localStorage.getItem("cartridge_username");
        }
        return null;
    });
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);

    // Check if controller is ready (poll every second)
    useEffect(() => {
        const checkReady = () => {
            try {
                if (controllerConnector) {
                    setIsReady(controllerConnector.isReady());
                }
            } catch {
                // Silently ignore
            }
        };

        checkReady();
        const interval = setInterval(checkReady, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleConnect = useCallback(async () => {
        if (!controllerConnector) {
            setError("Controller not available");
            return;
        }

        if (!isReady) {
            setError("Controller not ready");
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            connect({ connector: controllerConnector });
        } catch (err) {
            console.error("Connection error:", err);
            setError(err instanceof Error ? err.message : "Failed to connect");
        } finally {
            setIsConnecting(false);
        }
    }, [isReady, connect]);

    const handleDisconnect = useCallback(async () => {
        try {
            starknetDisconnect();
            setUsername(null);
            localStorage.removeItem("cartridge_username");
        } catch (err) {
            console.error("Disconnect error:", err);
        }
    }, [starknetDisconnect]);

    return {
        account,
        address,
        username,
        isConnecting: isConnecting || status === "connecting",
        isConnected: status === "connected",
        isReady: isReady && !!controllerConnector,
        error,
        connect: handleConnect,
        disconnect: handleDisconnect,
    };
}
