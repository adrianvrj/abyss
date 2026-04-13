import ControllerConnector from "@cartridge/connector/controller";
import { type Chain } from "@starknet-react/chains";
import {
    type Connector,
    jsonRpcProvider,
    StarknetConfig,
    useAccount,
} from "@starknet-react/core";
import { useEffect, useMemo, useRef, type PropsWithChildren } from "react";
import {
    CONTROLLER_RPC_URL,
    CONTROLLER_SESSION_VERSION,
    buildControllerOptions,
    ensureControllerSession,
    getControllerConnectorConfigKey,
} from "@/lib/controllerConfig";
import {
    DEFAULT_CHAIN_ID,
    DEFAULT_MAINNET_RPC_URL,
    DEFAULT_SEPOLIA_RPC_URL,
    chains,
} from "@/config";

const provider = jsonRpcProvider({
    rpc: (chain: Chain) => {
        if (chain.id === chains[DEFAULT_CHAIN_ID].id) {
            return { nodeUrl: CONTROLLER_RPC_URL };
        }

        if (chain.network === "mainnet") {
            return {
                nodeUrl:
                    import.meta.env.VITE_SN_MAIN_RPC_URL ||
                    import.meta.env.VITE_MAINNET_RPC_URL ||
                    DEFAULT_MAINNET_RPC_URL,
            };
        }

        return {
            nodeUrl:
                import.meta.env.VITE_SN_SEPOLIA_RPC_URL ||
                DEFAULT_SEPOLIA_RPC_URL,
        };
    },
});

declare global {
    interface Window {
        __cartridge_connector__?: Connector;
        __cartridge_connector_config_key__?: string;
        starknet_controller?: unknown;
    }
}

function getConnector(): Connector[] {
    if (typeof window === "undefined") {
        return [];
    }

    try {
        if (window.localStorage.getItem("lastUsedConnector") === "controller_session") {
            window.localStorage.removeItem("lastUsedConnector");
        }
    } catch (error) {
        console.warn("failed to clear stale controller session state", error);
    }

    const connectorConfigKey = getControllerConnectorConfigKey(DEFAULT_CHAIN_ID);

    if (import.meta.env.DEV) {
        console.log("[ABYSS_CONTROLLER] connector", {
            defaultChainId: DEFAULT_CHAIN_ID,
            controllerRpcUrl: CONTROLLER_RPC_URL,
            connectorConfigKey,
        });
    }

    if (
        window.__cartridge_connector__ &&
        window.__cartridge_connector_config_key__ === connectorConfigKey
    ) {
        return [window.__cartridge_connector__];
    }

    delete window.__cartridge_connector__;
    delete window.starknet_controller;

    window.__cartridge_connector__ = new ControllerConnector(
        buildControllerOptions(DEFAULT_CHAIN_ID),
    ) as never as Connector;
    window.__cartridge_connector_config_key__ = connectorConfigKey;
    return [window.__cartridge_connector__];
}

function ControllerSessionSync() {
    const { address, status, connector } = useAccount();
    const syncRef = useRef<string | null>(null);

    useEffect(() => {
        if (status !== "connected" || !address || connector?.id !== "controller") {
            return;
        }

        const syncKey = `${address.toLowerCase()}:${CONTROLLER_SESSION_VERSION}`;
        if (syncRef.current === syncKey) {
            return;
        }

        syncRef.current = syncKey;

        ensureControllerSession(connector, address).catch((error) => {
            console.error("Failed to sync controller session policies:", error);
            syncRef.current = null;
        });
    }, [address, connector, status]);

    return null;
}

export function StarknetProvider({ children }: PropsWithChildren) {
    const connectors = useMemo(() => getConnector(), []);

    if (connectors.length === 0) {
        return <>{children}</>;
    }

    return (
        <StarknetConfig
            autoConnect
            chains={[chains[DEFAULT_CHAIN_ID]]}
            connectors={connectors}
            provider={provider}
        >
            <ControllerSessionSync />
            {children}
        </StarknetConfig>
    );
}

export default StarknetProvider;
