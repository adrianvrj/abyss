import { createContext } from "react";
import type ControllerConnector from "@cartridge/connector/controller";

export type ControllerAccountAdapter = {
  address: string;
  execute: (
    calls:
      | { contractAddress: string; entrypoint: string; calldata?: unknown }
      | { contractAddress: string; entrypoint: string; calldata?: unknown }[],
    details?: unknown,
    options?: unknown,
  ) => Promise<{ transaction_hash: string }>;
  waitForTransaction: (transactionHash: string, options?: unknown) => Promise<unknown>;
  provider: {
    getTransactionReceipt: (transactionHash: string) => Promise<unknown>;
  };
};

export type ControllerConnectorAdapter = {
  id: "controller";
  name: string;
  controller: ControllerConnector["controller"];
  delegateAccount?: () => Promise<string | null>;
};

export type ControllerContextValue = {
  account: ControllerAccountAdapter | null;
  connector: ControllerConnectorAdapter | null;
  address: string | undefined;
  delegateAddress: string | null;
  username: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  isReady: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

export const ControllerContext = createContext<ControllerContextValue | null>(null);
