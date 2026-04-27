import { useCallback, useEffect, useState } from "react";
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
    delegateAddress: string | null;
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
    const [delegateAddress, setDelegateAddress] = useState<string | null>(null);
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

    useEffect(() => {
        let cancelled = false;

        const loadDelegate = async () => {
            if (status !== "connected" || !connector) {
                setDelegateAddress(null);
                return;
            }

            try {
                const delegate =
                    await ((connector as any)?.delegateAccount?.() ??
                        (connector as any)?.controller?.delegateAccount?.());
                if (!cancelled) {
                    setDelegateAddress(delegate ?? null);
                }
            } catch {
                if (!cancelled) {
                    setDelegateAddress(null);
                }
            }
        };

        loadDelegate();
        return () => {
            cancelled = true;
        };
    }, [connector, status]);

    return {
        account,
        connector,
        address,
        delegateAddress,
        username: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
        isConnecting: status === "connecting",
        isConnected: status === "connected",
        isReady: connectors.length > 0,
        error: null,
        connect: handleConnect,
        disconnect: handleDisconnect,
    };
}
