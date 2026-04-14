import { useAccount, useNetwork, useConnect } from "@starknet-react/core";
import { useCallback, useMemo } from "react";
import { CallData } from "starknet";
import ControllerConnector from "@cartridge/connector/controller";
import { getRpcProvider } from "@/api/rpc/provider";
import { getGameConfig, getUsdCostInToken } from "@/api/rpc/play";
import {
  DEFAULT_CHAIN_ID,
  getMarketAddress,
  getPlayAddress,
  getRelicAddress,
  getWorldAddress,
  getSetupAddress,
} from "@/config";
import { CONTRACTS } from "@/lib/constants";
import { parseReceiptEvents } from "@/utils/gameEvents";

type ExecuteCall = {
  contractAddress: string;
  entrypoint: string;
  calldata?: ReturnType<typeof CallData.compile> | string[];
};

type AccountLike = {
  address: string;
  execute: (
    calls: ExecuteCall | ExecuteCall[],
    details?: unknown,
    options?: unknown,
  ) => Promise<{ transaction_hash: string }>;
  waitForTransaction?: (transactionHash: string, options?: unknown) => Promise<unknown>;
};

export type ActionReceipt = {
  transactionHash: string;
  receipt: unknown;
  events: ReturnType<typeof parseReceiptEvents>;
};

function toUint256(value: bigint) {
  const low = value & ((1n << 128n) - 1n);
  const high = value >> 128n;
  return [low.toString(), high.toString()];
}

export function useAbyssActions(accountOverride?: AccountLike | null) {
  const { account: connectedAccount } = useAccount();
  const { connector } = useConnect();
  const { chain } = useNetwork();
  const account = (
    accountOverride ??
    connectedAccount ??
    null
  ) as AccountLike | null;
  const chainId = chain?.id ?? DEFAULT_CHAIN_ID;
  const provider = useMemo(() => getRpcProvider(chainId), [chainId]);
  const worldAddress = useMemo(() => getWorldAddress(chainId), [chainId]);
  const playAddress = useMemo(() => getPlayAddress(chainId), [chainId]);
  const marketAddress = useMemo(() => getMarketAddress(chainId), [chainId]);
  const relicAddress = useMemo(() => getRelicAddress(chainId), [chainId]);

  const waitForReceipt = useCallback(
    async (transactionHash: string) => {
      const waitedReceipt = account?.waitForTransaction
        ? await account.waitForTransaction(transactionHash, {
          retryInterval: 200,
          successStates: ["PRE_CONFIRMED", "ACCEPTED_ON_L2", "ACCEPTED_ON_L1"],
        })
        : await provider.waitForTransaction(transactionHash, {
            retryInterval: 200,
            successStates: ["PRE_CONFIRMED", "ACCEPTED_ON_L2", "ACCEPTED_ON_L1"],
          });

      const waitedEvents =
        (waitedReceipt as any)?.events ??
        (waitedReceipt as any)?.value?.events ??
        (waitedReceipt as any)?.transaction_receipt?.events;

      if (Array.isArray(waitedEvents) && waitedEvents.length > 0) {
        return waitedReceipt;
      }

      try {
        return await provider.getTransactionReceipt(transactionHash);
      } catch (error) {
        console.warn("failed to fetch raw transaction receipt, falling back to wait result", error);
        return waitedReceipt;
      }
    },
    [account, provider],
  );

  const executeCalls = useCallback(
    async (calls: ExecuteCall[], options?: unknown): Promise<ActionReceipt> => {
      if (!account) {
        throw new Error("Wallet not connected");
      }

      const { transaction_hash } = await account.execute(calls, undefined, options);
      const receipt = await waitForReceipt(transaction_hash);

      return {
        transactionHash: transaction_hash,
        receipt,
        events: parseReceiptEvents(receipt, [
          worldAddress,
          playAddress,
          marketAddress,
          relicAddress,
        ]),
      };
    },
    [account, marketAddress, playAddress, relicAddress, waitForReceipt, worldAddress],
  );

  const createSession = useCallback(
    async (paymentToken?: string) => {
      if (!account) {
        throw new Error("Wallet not connected");
      }

      const config = await getGameConfig(chainId).catch((error) => {
        console.warn("failed to fetch game config before create_session, using fallback token", error);
        return null;
      });
      const selectedPaymentToken =
        config?.quoteToken || paymentToken || CONTRACTS.USDC_TOKEN;

      if (paymentToken && config?.quoteToken && paymentToken !== config.quoteToken) {
        console.warn("ignoring mismatched session payment token, using configured quote token", {
          requested: paymentToken,
          configured: config.quoteToken,
        });
      }

      const amount =
        config?.entryPriceUsd ?? (await getUsdCostInToken(chainId, selectedPaymentToken));
      const calls: ExecuteCall[] = [];

      if (amount > 0n) {
        calls.push({
          contractAddress: selectedPaymentToken,
          entrypoint: "approve",
          calldata: CallData.compile([
            playAddress,
            ...toUint256(amount),
          ]),
        });
      }

      calls.push({
        contractAddress: playAddress,
        entrypoint: "create_session",
        calldata: CallData.compile([account.address, selectedPaymentToken]),
      });

      return executeCalls(calls);
    },
    [account, chainId, executeCalls, playAddress],
  );

  const claimFreeSessionBundle = useCallback(
    async (
      bundleId: number,
      referralLink: string,
      onComplete?: () => void
    ) => {
      const cartridgeConnector = connector as ControllerConnector;
      if (!cartridgeConnector?.controller?.openBundle) {
        console.warn("Cartridge controller not found");
        return;
      }

      const registry = getSetupAddress(chainId);
      const socialClaimOptions = {
        shareMessage: `Minting my free @abyssdotfun session! ${referralLink}`,
      };

      console.log("[ABYSS_ACTIONS] claimsocial:start", {
        bundleId,
        registry,
        socialClaimOptions,
      });

      try {
        await cartridgeConnector.controller.openBundle(bundleId, registry, {
          onPurchaseComplete: () => {
            console.log("[ABYSS_ACTIONS] claimsocial:complete");
            onComplete?.();
          },
          socialClaimOptions,
        });
      } catch (error) {
        console.error("[ABYSS_ACTIONS] claimsocial:error", error);
        throw error;
      }
    },
    [connector, chainId]
  );

  const requestSpin = useCallback(
    async (sessionId: number) => {
      if (!account) {
        throw new Error("Wallet not connected");
      }

      const config = await getGameConfig(chainId).catch((error) => {
        console.warn("failed to fetch game config before spin, using fallback vrf", error);
        return null;
      });
      const vrfAddress = config?.vrf || CONTRACTS.CARTRIDGE_VRF;

      return executeCalls(
        [
          {
            contractAddress: vrfAddress,
            entrypoint: "request_random",
            calldata: CallData.compile({
              caller: playAddress,
              source: { type: 0, address: account.address },
            }),
          },
          {
            contractAddress: playAddress,
            entrypoint: "request_spin",
            calldata: CallData.compile([sessionId]),
          },
        ],
        { maxFee: 2_000_000_000_000_000n },
      );
    },
    [account, chainId, executeCalls, playAddress],
  );

  const buyItem = useCallback(
    async (sessionId: number, marketSlot: number) =>
      executeCalls([
        {
          contractAddress: marketAddress,
          entrypoint: "buy_item",
          calldata: CallData.compile([sessionId, marketSlot]),
        },
      ]),
    [executeCalls, marketAddress],
  );

  const sellItem = useCallback(
    async (sessionId: number, itemId: number, quantity: number = 1) =>
      executeCalls([
        {
          contractAddress: marketAddress,
          entrypoint: "sell_item",
          calldata: CallData.compile([sessionId, itemId, quantity]),
        },
      ]),
    [executeCalls, marketAddress],
  );

  const refreshMarket = useCallback(
    async (sessionId: number) =>
      executeCalls([
        {
          contractAddress: marketAddress,
          entrypoint: "refresh_market",
          calldata: CallData.compile([sessionId]),
        },
      ]),
    [executeCalls, marketAddress],
  );

  const equipRelic = useCallback(
    async (sessionId: number, tokenId: bigint) => {
      const low = tokenId & ((1n << 128n) - 1n);
      const high = tokenId >> 128n;

      return executeCalls([
        {
          contractAddress: relicAddress,
          entrypoint: "equip_relic",
          calldata: CallData.compile([sessionId, low, high]),
        },
      ]);
    },
    [executeCalls, relicAddress],
  );

  const activateRelic = useCallback(
    async (sessionId: number, relicId?: number) => {
      if (!account) {
        throw new Error("Wallet not connected");
      }

      const calls: ExecuteCall[] = [
        {
          contractAddress: relicAddress,
          entrypoint: "activate_relic",
          calldata: CallData.compile([sessionId]),
        },
      ];

      if (relicId === 4) {
        calls.push({
          contractAddress: playAddress,
          entrypoint: "end_session",
          calldata: CallData.compile([sessionId]),
        });
      }

      return executeCalls(calls);
    },
    [account, executeCalls, playAddress, relicAddress],
  );

  const endSession = useCallback(
    async (sessionId: number) =>
      executeCalls([
        {
          contractAddress: playAddress,
          entrypoint: "end_session",
          calldata: CallData.compile([sessionId]),
        },
      ]),
    [executeCalls, playAddress],
  );

  const claimChips = useCallback(
    async (sessionId: number) =>
      executeCalls([
        {
          contractAddress: playAddress,
          entrypoint: "claim_chips",
          calldata: CallData.compile([sessionId]),
        },
      ]),
    [executeCalls, playAddress],
  );

  return {
    account,
    chainId,
    provider,
    worldAddress,
    playAddress,
    marketAddress,
    relicAddress,
    createSession,
    claimFreeSessionBundle,
    requestSpin,
    buyItem,
    sellItem,
    refreshMarket,
    equipRelic,
    activateRelic,
    endSession,
    claimChips,
    waitForReceipt,
  };
}
