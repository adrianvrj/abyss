import { useCallback } from "react";
import {
    useAccount,
    useConnect,
    useDisconnect,
} from "@starknet-react/core";
import { ensureControllerSession } from "@/lib/controllerConfig";

export interface UseControllerReturn {
    account: ReturnType<typeof useAccount>["account"];
    connector: ReturnType<typeof useAccount>["connector"];
    address: string | undefined;
    username: string | null;
    isConnecting: boolean;
    isConnected: boolean;
    isReady: boolean;
    error: string | null;
    connect: () => Promise<void>;
    disconnect: () => void;
}

export function useController(): UseControllerReturn {
    const { address, status, account, connector } = useAccount();
    const { connectAsync, connectors } = useConnect();
    const { disconnect: starknetDisconnect } = useDisconnect();

    const handleConnect = useCallback(async () => {
        if (connectors.length === 0) return;
        const connector = connectors[0];
        await connectAsync({ connector });

        await ensureControllerSession(
            connector,
            (connector as any)?.controller?.account?.address,
        );
    }, [connectAsync, connectors]);

    const handleDisconnect = useCallback(() => {
        starknetDisconnect();
    }, [starknetDisconnect]);

    return {
        account,
        connector,
        address,
        username: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
        isConnecting: status === "connecting",
        isConnected: status === "connected",
        isReady: connectors.length > 0,
        error: null,
        connect: handleConnect,
        disconnect: handleDisconnect,
    };
}
