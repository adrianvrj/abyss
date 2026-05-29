import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import type { AccountInterface } from "starknet";
import { getRpcProvider } from "@/api/rpc/provider";
import { DEFAULT_CHAIN_ID } from "@/config";
import { getControllerConnector } from "@/lib/controllerConfig";
import {
  ControllerContext,
  type ControllerAccountAdapter,
  type ControllerConnectorAdapter,
  type ControllerContextValue,
} from "@/lib/controllerContext";

function createAccountAdapter(account: AccountInterface): ControllerAccountAdapter {
  const provider = getRpcProvider(DEFAULT_CHAIN_ID);

  return {
    address: account.address,
    async execute(calls, details) {
      const callList = Array.isArray(calls) ? calls : [calls];
      return account.execute(callList as never, details as never);
    },
    waitForTransaction(transactionHash, options) {
      return account.waitForTransaction(transactionHash, options as never);
    },
    provider: {
      getTransactionReceipt(transactionHash) {
        return provider.getTransactionReceipt(transactionHash);
      },
    },
  };
}

export function ControllerProvider({ children }: PropsWithChildren) {
  const controllerConnector = getControllerConnector();
  const { account, address, isConnected } = useAccount();
  const { connectAsync, status, error } = useConnect();
  const { disconnectAsync } = useDisconnect();

  const [username, setUsername] = useState<string | null>(null);
  const [delegateAddress, setDelegateAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      setUsername(null);
      setDelegateAddress(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const [nextUsername, nextDelegate] = await Promise.all([
        Promise.resolve(controllerConnector.username?.()).catch(() => undefined),
        controllerConnector.delegateAccount?.().catch(() => null),
      ]);
      if (cancelled) {
        return;
      }
      setUsername(
        nextUsername ?? `${address.slice(0, 6)}...${address.slice(-4)}`,
      );
      setDelegateAddress(nextDelegate ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [controllerConnector, isConnected, address]);

  const connect = useCallback(async () => {
    await connectAsync({ connector: controllerConnector });
  }, [connectAsync, controllerConnector]);

  const disconnect = useCallback(async () => {
    await disconnectAsync();
  }, [disconnectAsync]);

  const accountAdapter = useMemo<ControllerAccountAdapter | null>(
    () => (account ? createAccountAdapter(account) : null),
    [account],
  );

  const connectorAdapter = useMemo<ControllerConnectorAdapter | null>(
    () =>
      isConnected
        ? {
            id: "controller",
            name: "Cartridge",
            controller: controllerConnector.controller,
            delegateAccount: () => controllerConnector.delegateAccount(),
          }
        : null,
    [controllerConnector, isConnected],
  );

  const value = useMemo<ControllerContextValue>(
    () => ({
      account: accountAdapter,
      connector: connectorAdapter,
      address,
      delegateAddress,
      username,
      isConnecting: status === "pending",
      isConnected: Boolean(account),
      isReady: true,
      error: error ? error.message : null,
      connect,
      disconnect,
    }),
    [
      accountAdapter,
      connectorAdapter,
      address,
      delegateAddress,
      username,
      status,
      account,
      error,
      connect,
      disconnect,
    ],
  );

  return (
    <ControllerContext.Provider value={value}>
      {children}
    </ControllerContext.Provider>
  );
}

export default ControllerProvider;
