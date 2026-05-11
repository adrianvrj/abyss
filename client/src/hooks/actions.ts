import { useNetwork } from "@starknet-react/core";
import { useCallback, useMemo } from "react";
import { CallData } from "starknet";
import ControllerConnector from "@cartridge/connector/controller";
import { getRpcProvider } from "@/api/rpc/provider";
import { getGameConfig, getUsdCostInToken } from "@/api/rpc/play";
import {
  DEFAULT_CHAIN_ID,
  getCharmAddress,
  getChipAddress,
  getMarketAddress,
  getPlayAddress,
  getRelicAddress,
  getWorldAddress,
  getSetupAddress,
  tryGetStreakAddress,
} from "@/config";
import { CONTRACTS } from "@/lib/constants";
import { STREAK_RECOVER_CHIP_WEI } from "@/api/rpc/streak";
import { parseReceiptEvents } from "@/utils/gameEvents";
import { useController } from "@/hooks/useController";

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
  const { account: connectedAccount, connector } = useController();
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
  const charmAddress = useMemo(() => getCharmAddress(chainId), [chainId]);
  const chipAddress = useMemo(() => getChipAddress(chainId), [chainId]);
  const streakAddress = useMemo(() => tryGetStreakAddress(chainId), [chainId]);

  const receiptEventContracts = useMemo(() => {
    const list = [worldAddress, playAddress, marketAddress, relicAddress, charmAddress];
    if (streakAddress) {
      list.push(streakAddress);
    }
    return list;
  }, [worldAddress, playAddress, marketAddress, relicAddress, charmAddress, streakAddress]);

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
        events: parseReceiptEvents(receipt, receiptEventContracts),
      };
    },
    [account, charmAddress, marketAddress, playAddress, receiptEventContracts, relicAddress, waitForReceipt, worldAddress],
  );

  const equipCharms = useCallback(
    async (sessionId: number, charmIds: number[]) => {
      if (!account) {
        throw new Error("Wallet not connected");
      }
      if (charmIds.length > 3) {
        throw new Error("Max 3 charms per session");
      }

      return executeCalls([
        {
          contractAddress: playAddress,
          entrypoint: "equip_charms",
          calldata: CallData.compile([
            sessionId,
            charmIds.map((id) => id.toString()),
          ]),
        },
      ]);
    },
    [account, executeCalls, playAddress],
  );

  const setPendingCharmLoadout = useCallback(
    async (charmIds: number[]) => {
      if (!account) {
        throw new Error("Wallet not connected");
      }
      if (charmIds.length > 3) {
        throw new Error("Max 3 charms per session");
      }

      return executeCalls([
        {
          contractAddress: playAddress,
          entrypoint: "set_pending_charm_loadout",
          calldata: CallData.compile([
            charmIds.map((id) => id.toString()),
          ]),
        },
      ]);
    },
    [account, executeCalls, playAddress],
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

  const rerollCharms = useCallback(
    async (tokenIds: [bigint, bigint, bigint], paymentToken: string, amount: bigint) => {
      if (!account) {
        throw new Error("Wallet not connected");
      }

      const [tokenId1, tokenId2, tokenId3] = tokenIds;
      return executeCalls([
        {
          contractAddress: paymentToken,
          entrypoint: "approve",
          calldata: CallData.compile([
            charmAddress,
            ...toUint256(amount),
          ]),
        },
        {
          contractAddress: charmAddress,
          entrypoint: "reroll_charms",
          calldata: CallData.compile([
            ...toUint256(tokenId1),
            ...toUint256(tokenId2),
            ...toUint256(tokenId3),
            paymentToken,
          ]),
        },
      ]);
    },
    [account, charmAddress, executeCalls],
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

  const claimStreakLoot = useCallback(async () => {
    if (!account) {
      throw new Error("Wallet not connected");
    }
    if (!streakAddress) {
      throw new Error("Streak contract unavailable (migrate + sync manifest)");
    }
    return executeCalls([
      {
        contractAddress: streakAddress,
        entrypoint: "claim_streak_loot",
        calldata: [],
      },
    ]);
  }, [account, executeCalls, streakAddress]);

  const recoverStreak = useCallback(async () => {
    if (!account) {
      throw new Error("Wallet not connected");
    }
    if (!streakAddress) {
      throw new Error("Streak contract unavailable (migrate + sync manifest)");
    }
    return executeCalls([
      {
        contractAddress: chipAddress,
        entrypoint: "approve",
        calldata: CallData.compile([streakAddress, ...toUint256(STREAK_RECOVER_CHIP_WEI)]),
      },
      {
        contractAddress: streakAddress,
        entrypoint: "recover_streak",
        calldata: [],
      },
    ]);
  }, [account, chipAddress, executeCalls, streakAddress]);

  return {
    account,
    chainId,
    provider,
    worldAddress,
    playAddress,
    marketAddress,
    relicAddress,
    charmAddress,
    chipAddress,
    streakAddress,
    createSession,
    claimFreeSessionBundle,
    setPendingCharmLoadout,
    equipCharms,
    requestSpin,
    buyItem,
    sellItem,
    refreshMarket,
    equipRelic,
    activateRelic,
    rerollCharms,
    endSession,
    claimChips,
    claimStreakLoot,
    recoverStreak,
    waitForReceipt,
  };
}
