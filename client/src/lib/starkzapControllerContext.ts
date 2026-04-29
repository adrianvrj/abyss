import { createContext } from "react";

export type StarkZapAccountAdapter = {
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

export type StarkZapConnectorAdapter = {
  id: "controller";
  name: string;
  controller: unknown;
  delegateAccount?: () => Promise<string | null>;
};

export type StarkZapControllerContextValue = {
  account: StarkZapAccountAdapter | null;
  connector: StarkZapConnectorAdapter | null;
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

export const StarkZapControllerContext =
  createContext<StarkZapControllerContextValue | null>(null);
