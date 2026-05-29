import { type Chain } from "@starknet-react/chains";
import {
    jsonRpcProvider,
    StarknetConfig,
} from "@starknet-react/core";
import { type PropsWithChildren } from "react";
import { CONTROLLER_RPC_URL, getControllerConnector } from "@/lib/controllerConfig";
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

export function StarknetProvider({ children }: PropsWithChildren) {
    return (
        <StarknetConfig
            chains={[chains[DEFAULT_CHAIN_ID]]}
            connectors={[getControllerConnector()]}
            provider={provider}
            autoConnect
        >
            {children}
        </StarknetConfig>
    );
}

export default StarknetProvider;
