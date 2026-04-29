import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import ControllerProvider from "@cartridge/controller";
import {
  buildControllerOptions,
  ensureControllerSession,
} from "@/lib/controllerConfig";
import { DEFAULT_CHAIN_ID } from "@/config";
import { getRpcProvider } from "@/api/rpc/provider";
import {
  StarkZapControllerContext,
  type StarkZapAccountAdapter,
  type StarkZapConnectorAdapter,
  type StarkZapControllerContextValue,
} from "@/lib/starkzapControllerContext";

const STARKZAP_AUTO_CONNECT_KEY = "abyss:starkzap:auto-connect";

declare global {
  interface Window {
    starknet_controller?: unknown;
    starknet_controller_session?: unknown;
    __cartridge_connector__?: unknown;
    __cartridge_connector_config_key__?: string;
  }
}

type ControllerAccount = {
  address: string;
  execute: (calls: unknown[]) => Promise<{ transaction_hash: string }>;
};

type ControllerSession = {
  account: ControllerAccount;
  controller: ControllerProvider;
  disconnect: () => Promise<void>;
  username?: () => Promise<string | undefined>;
};

function createController() {
  return new ControllerProvider(buildControllerOptions(DEFAULT_CHAIN_ID));
}

function createControllerSession(
  controller: ControllerProvider,
  account: ControllerAccount,
): ControllerSession {
  return {
    account,
    controller,
    disconnect: () => controller.disconnect(),
    username: () => Promise.resolve(controller.username()),
  };
}

function createAccountAdapter(session: ControllerSession): StarkZapAccountAdapter {
  const provider = getRpcProvider(DEFAULT_CHAIN_ID);

  return {
    address: session.account.address,
    async execute(calls) {
      const callList = Array.isArray(calls) ? calls : [calls];
      return session.account.execute(callList as never);
    },
    waitForTransaction(transactionHash, options) {
      return provider.waitForTransaction(transactionHash, options as never);
    },
    provider: {
      getTransactionReceipt(transactionHash) {
        return provider.getTransactionReceipt(transactionHash);
      },
    },
  };
}

function createConnectorAdapter(session: ControllerSession): StarkZapConnectorAdapter {
  return {
    id: "controller",
    name: "Cartridge",
    controller: session.controller,
    async delegateAccount() {
      return session.controller.delegateAccount();
    },
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to connect Cartridge";
}

function readAutoConnectPreference() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(STARKZAP_AUTO_CONNECT_KEY) === "true";
  } catch {
    return false;
  }
}

function writeAutoConnectPreference(enabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (enabled) {
      window.localStorage.setItem(STARKZAP_AUTO_CONNECT_KEY, "true");
    } else {
      window.localStorage.removeItem(STARKZAP_AUTO_CONNECT_KEY);
    }
  } catch {
    // Ignore storage failures and fall back to manual connect.
  }
}

function cleanupCartridgeRuntime({ clearStorage }: { clearStorage: boolean }) {
  if (typeof window === "undefined") {
    return;
  }

  delete window.starknet_controller;
  delete window.starknet_controller_session;
  delete window.__cartridge_connector__;
  delete window.__cartridge_connector_config_key__;

  try {
    document
      .querySelectorAll('[id="controller"], iframe[id^="controller-"]')
      .forEach((node) => node.remove());
  } catch {
    // Ignore DOM cleanup failures; the next Controller init will recreate what it needs.
  }

  if (!clearStorage) {
    return;
  }

  try {
    clearCartridgeStorage(window.localStorage);
    clearCartridgeStorage(window.sessionStorage);
  } catch {
    // Ignore storage cleanup failures and allow a fresh connect attempt.
  }
}

function clearCartridgeStorage(storage: Storage) {
  const explicitKeys = new Set([
    "lastUsedConnector",
    "session",
    "sessionSigner",
    "sessionPolicies",
    "controller_standalone",
    STARKZAP_AUTO_CONNECT_KEY,
  ]);

  for (const key of explicitKeys) {
    storage.removeItem(key);
  }

  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    const normalized = key?.toLowerCase() ?? "";
    if (key && (
      normalized.startsWith("@cartridge/") ||
      normalized.startsWith("abyss:controller-session:") ||
      normalized.includes("cartridge") ||
      normalized.includes("controller")
    )) {
      storage.removeItem(key);
    }
  }
}

function waitForControllerCleanup() {
  return new Promise((resolve) => window.setTimeout(resolve, 50));
}

export function StarkZapControllerProvider({ children }: PropsWithChildren) {
  const controllerRef = useRef<ControllerProvider | null>(null);
  const autoConnectAttemptedRef = useRef(false);
  const [account, setAccount] = useState<StarkZapAccountAdapter | null>(null);
  const [connector, setConnector] = useState<StarkZapConnectorAdapter | null>(null);
  const [delegateAddress, setDelegateAddress] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getController = useCallback(() => {
    if (!controllerRef.current) {
      controllerRef.current = createController();
    }
    return controllerRef.current;
  }, []);

  const resetController = useCallback(() => {
    controllerRef.current = null;
  }, []);

  const recreateController = useCallback(async () => {
    cleanupCartridgeRuntime({ clearStorage: false });
    resetController();
    await waitForControllerCleanup();
    return getController();
  }, [getController, resetController]);

  useEffect(() => {
    getController();
  }, [getController]);

  const applySession = useCallback(async (nextWallet: ControllerSession) => {
    const nextAccount = createAccountAdapter(nextWallet);
    const nextConnector = createConnectorAdapter(nextWallet);

    setAccount(nextAccount);
    setConnector(nextConnector);

    const [nextUsername, nextDelegate] = await Promise.all([
      nextWallet.username?.().catch(() => undefined),
      nextConnector.delegateAccount?.().catch(() => null),
    ]);

    setUsername(nextUsername ?? `${nextAccount.address.slice(0, 6)}...${nextAccount.address.slice(-4)}`);
    setDelegateAddress(nextDelegate ?? null);
    await ensureControllerSession(nextConnector, nextAccount.address);
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      let controller = getController();
      let controllerAccount = await controller.connect();

      if (!controllerAccount?.address) {
        controller = await recreateController();
        controllerAccount = await controller.connect();
      }

      if (!controllerAccount?.address) {
        throw new Error("Failed to connect Cartridge Controller");
      }
      await applySession(createControllerSession(controller, controllerAccount as ControllerAccount));
      writeAutoConnectPreference(true);
    } catch (connectError) {
      setError(getErrorMessage(connectError));
      writeAutoConnectPreference(false);
      await recreateController().catch(() => undefined);
      throw connectError;
    } finally {
      setIsConnecting(false);
    }
  }, [applySession, getController, recreateController]);

  const disconnect = useCallback(async () => {
    setAccount(null);
    setConnector(null);
    setDelegateAddress(null);
    setUsername(null);
    setError(null);
    writeAutoConnectPreference(false);

    cleanupCartridgeRuntime({ clearStorage: true });
    resetController();
    window.location.reload();
  }, [resetController]);

  useEffect(() => {
    if (autoConnectAttemptedRef.current || account || isConnecting) {
      return;
    }

    if (!readAutoConnectPreference()) {
      return;
    }

    autoConnectAttemptedRef.current = true;
    (async () => {
      const controller = getController();
      const controllerAccount = await controller.probe();
      if (!controllerAccount?.address) {
        writeAutoConnectPreference(false);
        return;
      }
      await applySession(createControllerSession(controller, controllerAccount as ControllerAccount));
    })().catch((autoConnectError) => {
      console.warn("Failed to reconnect StarkZap wallet", autoConnectError);
      writeAutoConnectPreference(false);
    });
  }, [account, applySession, getController, isConnecting]);

  const value = useMemo<StarkZapControllerContextValue>(
    () => ({
      account,
      connector,
      address: account?.address,
      delegateAddress,
      username,
      isConnecting,
      isConnected: Boolean(account),
      isReady: true,
      error,
      connect,
      disconnect,
    }),
    [
      account,
      connector,
      delegateAddress,
      username,
      isConnecting,
      error,
      connect,
      disconnect,
    ],
  );

  return (
    <StarkZapControllerContext.Provider value={value}>
      {children}
    </StarkZapControllerContext.Provider>
  );
}
