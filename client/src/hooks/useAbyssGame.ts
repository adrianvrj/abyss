import { useCallback, useMemo } from "react";
import { useNetwork } from "@starknet-react/core";
import { CallData } from "starknet";
import { getRpcProvider } from "@/api/rpc/provider";
import {
  get666Probability as read666Probability,
  getAvailableBeastSessions as readAvailableBeastSessions,
  getGameConfig,
  getLevelThreshold as readLevelThreshold,
  getUsdCostInToken,
} from "@/api/rpc/play";
import {
  DEFAULT_CHAIN_ID,
  NAMESPACE,
  getContractAddress,
  getMarketAddress,
  getPlayAddress,
  getRelicAddress,
  getWorldAddress,
} from "@/config";
import { CONTRACTS } from "@/lib/constants";
import { delay } from "@/lib/utils";
import { getLeaderboard as readLeaderboard } from "@/utils/abyssContract";
import {
  hasParsedEvents,
  parseReceiptEvents,
  summarizeReceiptEvents,
} from "@/utils/gameEvents";

export interface SessionData {
  sessionId: number;
  playerAddress: string;
  level: number;
  score: number;
  totalScore: number;
  spinsRemaining: number;
  isCompetitive: boolean;
  isActive: boolean;
  chipsClaimed: boolean;
  equippedRelic: bigint;
  relicLastUsedSpin: number;
  relicPendingEffect: number;
  totalSpins: number;
  luck: number;
  blocked666: boolean;
  tickets: number;
  symbolScores: number[];
}

export interface SpinResult {
  sessionId: number;
  grid: number[];
  score: number;
  patternsCount: number;
  is666: boolean;
  isJackpot: boolean;
  isPending: boolean;
  bibliaUsed: boolean;
}

export interface PlayerItem {
  item_id: number;
  quantity: number;
}

export interface SessionMarket {
  refresh_count: number;
  item_slot_1: number;
  item_slot_2: number;
  item_slot_3: number;
  item_slot_4: number;
  item_slot_5: number;
  item_slot_6: number;
}

export interface LeaderboardEntry {
  player_address: string;
  username: string;
  games_played: number;
  best_score: number;
  total_score: number;
}

type ExecuteCall = {
  contractAddress: string;
  entrypoint: string;
  calldata?: ReturnType<typeof CallData.compile> | string[];
};

type AccountLike = {
  address: string;
  execute: (...args: any[]) => Promise<{ transaction_hash: string }>;
  waitForTransaction?: (...args: any[]) => Promise<unknown>;
  provider?: {
    getTransactionReceipt?: (transactionHash: string) => Promise<unknown>;
  };
};

function isTruthyFelt(value: unknown): boolean {
  return value === "0x1" || value === "1" || value === 1 || value === 1n;
}

function toUint256(value: bigint) {
  const low = value & ((1n << 128n) - 1n);
  const high = value >> 128n;
  return [low.toString(), high.toString()];
}

function parseSessionMarket(result: string[]): SessionMarket | null {
  if (!result.length) {
    return null;
  }

  const offset = result.length >= 8 ? 1 : 0;

  return {
    refresh_count: Number(result[offset] ?? 0),
    item_slot_1: Number(result[offset + 1] ?? 0),
    item_slot_2: Number(result[offset + 2] ?? 0),
    item_slot_3: Number(result[offset + 3] ?? 0),
    item_slot_4: Number(result[offset + 4] ?? 0),
    item_slot_5: Number(result[offset + 5] ?? 0),
    item_slot_6: Number(result[offset + 6] ?? 0),
  };
}

export function useAbyssGame(accountOverride?: AccountLike | null) {
  const { chain } = useNetwork();
  const chainId = chain?.id ?? DEFAULT_CHAIN_ID;
  const provider = useMemo(() => getRpcProvider(chainId), [chainId]);
  const account = accountOverride ?? null;
  const worldAddress = useMemo(() => getWorldAddress(chainId), [chainId]);
  const playAddress = useMemo(() => getPlayAddress(chainId), [chainId]);
  const marketAddress = useMemo(() => getMarketAddress(chainId), [chainId]);
  const relicAddress = useMemo(() => getRelicAddress(chainId), [chainId]);

  const getSystemAddress = useCallback(
    (contractName: string) => getContractAddress(chainId, NAMESPACE, contractName),
    [chainId],
  );

  const debugTransactions =
    import.meta.env.DEV || import.meta.env.VITE_ABYSS_DEBUG_TX === "true";

  const logTxDebug = useCallback(
    (stage: string, payload?: unknown) => {
      if (!debugTransactions) {
        return;
      }

      console.log(`[ABYSS_TX] ${stage}`, payload);
    },
    [debugTransactions],
  );

  const waitForPreConfirmation = useCallback(
    async (txHash: string, retries: number = 0): Promise<any> => {
      if (retries > 300) {
        throw new Error("Transaction validation timed out");
      }

      try {
        if (account?.waitForTransaction) {
          return await account.waitForTransaction(txHash, {
            retryInterval: 100,
            successStates: ["PRE_CONFIRMED", "ACCEPTED_ON_L2", "ACCEPTED_ON_L1"],
          });
        }

        return await provider.waitForTransaction(txHash, {
          retryInterval: 100,
          successStates: ["PRE_CONFIRMED", "ACCEPTED_ON_L2", "ACCEPTED_ON_L1"],
        });
      } catch {
        await delay(200);
        return waitForPreConfirmation(txHash, retries + 1);
      }
    },
    [account, provider],
  );

  const executeAndParse = useCallback(
    async (calls: ExecuteCall | ExecuteCall[], options?: unknown) => {
      if (!account) {
        throw new Error("Not connected");
      }

      const callList = Array.isArray(calls) ? calls : [calls];
      const label = callList.map((call) => call.entrypoint).join("+");

      logTxDebug(`${label}:execute:start`, {
        chainId,
        accountAddress: account.address,
        calls: callList.map((call) => ({
          contractAddress: call.contractAddress,
          entrypoint: call.entrypoint,
          calldataLength: Array.isArray(call.calldata) ? call.calldata.length : 0,
        })),
      });

      const tx = await account.execute(calls, undefined, options);
      logTxDebug(`${label}:execute:submitted`, {
        txHash: tx.transaction_hash,
      });
      const waitedReceipt = await waitForPreConfirmation(tx.transaction_hash);
      logTxDebug(`${label}:receipt:waited`, {
        txHash: tx.transaction_hash,
        summary: summarizeReceiptEvents(waitedReceipt),
      });

      let parsed = parseReceiptEvents(waitedReceipt, [
        worldAddress,
        playAddress,
        marketAddress,
        relicAddress,
      ]);

      logTxDebug(`${label}:parsed:waited`, parsed);

      if (hasParsedEvents(parsed)) {
        return parsed;
      }

      const receiptProviders = [
        account.provider?.getTransactionReceipt ? account.provider : null,
        provider,
      ].filter(
        (value, index, array): value is { getTransactionReceipt: (transactionHash: string) => Promise<unknown> } =>
          Boolean(value?.getTransactionReceipt) && array.indexOf(value) === index,
      );

      for (let attempt = 0; attempt < 2; attempt += 1) {
        for (const receiptProvider of receiptProviders) {
          try {
            const rawReceipt = await receiptProvider.getTransactionReceipt(tx.transaction_hash);
            const providerName =
              receiptProvider === provider ? "hook-provider" : "account-provider";
            parsed = parseReceiptEvents(rawReceipt, [
              worldAddress,
              playAddress,
              marketAddress,
              relicAddress,
            ]);

            logTxDebug(`${label}:receipt:raw`, {
              attempt,
              provider: providerName,
              txHash: tx.transaction_hash,
              summary: summarizeReceiptEvents(rawReceipt),
              parsed,
            });

            if (hasParsedEvents(parsed)) {
              return parsed;
            }
          } catch (error) {
            if (attempt === 1) {
              console.warn("Failed to fetch raw receipt after pre-confirmation:", error);
            }
          }
        }

        await delay(150);
      }

      logTxDebug(`${label}:parsed:none`, {
        txHash: tx.transaction_hash,
      });

      return parsed;
    },
    [
      account,
      marketAddress,
      playAddress,
      provider,
      relicAddress,
      waitForPreConfirmation,
      worldAddress,
      chainId,
      logTxDebug,
    ],
  );

  const createSession = useCallback(
    async (paymentToken?: string): Promise<number> => {
      if (!account) {
        throw new Error("Not connected");
      }

      const config = await getGameConfig(chainId).catch((error) => {
        console.warn("Failed to fetch config before create_session, using fallback token:", error);
        return null;
      });
      const selectedPaymentToken =
        config?.quoteToken || paymentToken || CONTRACTS.USDC_TOKEN;

      if (paymentToken && config?.quoteToken && paymentToken !== config.quoteToken) {
        console.warn("Ignoring mismatched session payment token, using configured quote token", {
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
          calldata: CallData.compile([playAddress, ...toUint256(amount)]),
        });
      }

      calls.push({
        contractAddress: playAddress,
        entrypoint: "create_session",
        calldata: [account.address, selectedPaymentToken],
      });

      const tx = await account.execute(calls);
      await waitForPreConfirmation(tx.transaction_hash);
      return 1;
    },
    [account, chainId, playAddress, waitForPreConfirmation],
  );

  const claimBeastSession = useCallback(
    async (): Promise<number> => {
      if (!account) {
        throw new Error("Not connected");
      }

      const tx = await account.execute({
        contractAddress: playAddress,
        entrypoint: "claim_beast_session",
        calldata: [account.address],
      });
      await waitForPreConfirmation(tx.transaction_hash);
      return 1;
    },
    [account, playAddress, waitForPreConfirmation],
  );

  const requestSpin = useCallback(
    async (sessionId: number) => {
      if (!account) {
        throw new Error("Not connected");
      }

      const config = await getGameConfig(chainId).catch((error) => {
        console.warn("Failed to fetch config before spin, using fallback VRF:", error);
        return null;
      });

      const vrfAddress = config?.vrf || CONTRACTS.CARTRIDGE_VRF;

      logTxDebug("request_spin:config", {
        chainId,
        sessionId,
        vrfAddress,
        playAddress,
        accountAddress: account.address,
      });

      return executeAndParse(
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
            calldata: [sessionId.toString()],
          },
        ],
        { maxFee: 2_000_000_000_000_000n },
      );
    },
    [account, chainId, executeAndParse, playAddress],
  );

  const buyItem = useCallback(
    async (sessionId: number, marketSlot: number) =>
      executeAndParse({
        contractAddress: marketAddress,
        entrypoint: "buy_item",
        calldata: [sessionId.toString(), marketSlot.toString()],
      }),
    [executeAndParse, marketAddress],
  );

  const sellItem = useCallback(
    async (sessionId: number, itemId: number, quantity: number = 1) =>
      executeAndParse({
        contractAddress: marketAddress,
        entrypoint: "sell_item",
        calldata: [sessionId.toString(), itemId.toString(), quantity.toString()],
      }),
    [executeAndParse, marketAddress],
  );

  const refreshMarket = useCallback(
    async (sessionId: number) =>
      executeAndParse({
        contractAddress: marketAddress,
        entrypoint: "refresh_market",
        calldata: [sessionId.toString()],
      }),
    [executeAndParse, marketAddress],
  );

  const equipRelic = useCallback(
    async (sessionId: number, tokenId: bigint) => {
      const low = tokenId & ((1n << 128n) - 1n);
      const high = tokenId >> 128n;

      return executeAndParse({
        contractAddress: relicAddress,
        entrypoint: "equip_relic",
        calldata: [sessionId.toString(), low.toString(), high.toString()],
      });
    },
    [executeAndParse, relicAddress],
  );

  const activateRelic = useCallback(
    async (sessionId: number, relicId?: number) => {
      if (!account) {
        throw new Error("Not connected");
      }

      const calls: ExecuteCall[] = [{
        contractAddress: relicAddress,
        entrypoint: "activate_relic",
        calldata: [sessionId.toString()],
      }];

      if (relicId === 4) {
        calls.push({
          contractAddress: playAddress,
          entrypoint: "end_session",
          calldata: [sessionId.toString()],
        });
      }

      return executeAndParse(calls);
    },
    [account, executeAndParse, playAddress, relicAddress],
  );

  const endSession = useCallback(
    async (sessionId: number): Promise<void> => {
      if (!account) {
        throw new Error("Not connected");
      }

      const tx = await account.execute({
        contractAddress: playAddress,
        entrypoint: "end_session",
        calldata: [sessionId.toString()],
      });

      await waitForPreConfirmation(tx.transaction_hash);
    },
    [account, playAddress, waitForPreConfirmation],
  );

  const getSessionData = useCallback(
    async (sessionId: number): Promise<SessionData | null> => {
      try {
        const result = await provider.callContract({
          contractAddress: playAddress,
          entrypoint: "get_session",
          calldata: [sessionId.toString()],
        });

        const equippedRelicLow = BigInt(result[10] ?? 0);
        const equippedRelicHigh = BigInt(result[11] ?? 0);

        return {
          sessionId: Number(result[0] ?? sessionId),
          playerAddress: String(result[1] ?? "0x0"),
          level: Number(result[2] ?? 0),
          score: Number(result[3] ?? 0),
          totalScore: Number(result[4] ?? 0),
          spinsRemaining: Number(result[5] ?? 0),
          isCompetitive: isTruthyFelt(result[6]),
          isActive: isTruthyFelt(result[7]),
          chipsClaimed: isTruthyFelt(result[9]),
          equippedRelic: equippedRelicLow + (equippedRelicHigh << 128n),
          relicLastUsedSpin: Number(result[12] ?? 0),
          relicPendingEffect: Number(result[13] ?? 0),
          totalSpins: Number(result[14] ?? 0),
          luck: Number(result[15] ?? 0),
          blocked666: isTruthyFelt(result[16]),
          tickets: Number(result[17] ?? 0),
          symbolScores: [
            Number(result[18] ?? 0),
            Number(result[19] ?? 0),
            Number(result[20] ?? 0),
            Number(result[21] ?? 0),
            Number(result[22] ?? 0),
          ],
        };
      } catch (error) {
        console.error("Get session data error:", error);
        return null;
      }
    },
    [playAddress, provider],
  );

  const getLastSpinResult = useCallback(
    async (sessionId: number): Promise<SpinResult | null> => {
      try {
        const result = await provider.callContract({
          contractAddress: playAddress,
          entrypoint: "get_spin_result",
          calldata: [sessionId.toString()],
        });

        return {
          sessionId: Number(result[0] ?? sessionId),
          grid: Array.from({ length: 15 }, (_, index) => Number(result[index + 1] ?? 0)),
          score: Number(result[16] ?? 0),
          patternsCount: Number(result[17] ?? 0),
          is666: isTruthyFelt(result[18]),
          isJackpot: isTruthyFelt(result[19]),
          isPending: isTruthyFelt(result[20]),
          bibliaUsed: isTruthyFelt(result[21]),
        };
      } catch (error) {
        console.error("Get last spin result error:", error);
        return null;
      }
    },
    [playAddress, provider],
  );

  const getPlayerSessions = useCallback(
    async (address: string): Promise<number[]> => {
      try {
        const result = await provider.callContract({
          contractAddress: playAddress,
          entrypoint: "get_player_sessions",
          calldata: CallData.compile([address]),
        });

        const len = Number(result[0] ?? 0);
        const sessions: number[] = [];

        for (let index = 0; index < len; index += 1) {
          sessions.push(Number(result[index + 1] ?? 0));
        }

        return sessions.filter((sessionId) => sessionId > 0);
      } catch (error) {
        console.error("Get player sessions error:", error);
        return [];
      }
    },
    [playAddress, provider],
  );

  const getLevelThreshold = useCallback(
    async (level: number) => readLevelThreshold(chainId, level),
    [chainId],
  );

  const get666Probability = useCallback(
    async (level: number) => read666Probability(chainId, level),
    [chainId],
  );

  const getSessionItems = useCallback(
    async (sessionId: number): Promise<PlayerItem[]> => {
      try {
        const result = await provider.callContract({
          contractAddress: playAddress,
          entrypoint: "get_session_items",
          calldata: CallData.compile([sessionId]),
        });

        const len = Number(result[0] ?? 0);
        const items: PlayerItem[] = [];
        let offset = 1;

        for (let index = 0; index < len; index += 1) {
          items.push({
            item_id: Number(result[offset] ?? 0),
            quantity: Number(result[offset + 1] ?? 0),
          });
          offset += 2;
        }

        return items.filter((item) => item.item_id > 0 && item.quantity > 0);
      } catch (error) {
        console.error("Get session items error:", error);
        return [];
      }
    },
    [playAddress, provider],
  );

  const getSessionMarket = useCallback(
    async (sessionId: number): Promise<SessionMarket | null> => {
      try {
        const result = await provider.callContract({
          contractAddress: playAddress,
          entrypoint: "get_session_market",
          calldata: CallData.compile([sessionId]),
        });

        return parseSessionMarket(result);
      } catch (error) {
        console.error("Get session market error:", error);
        return null;
      }
    },
    [playAddress, provider],
  );

  const getSessionInventoryCount = useCallback(
    async (sessionId: number): Promise<number> => {
      try {
        const items = await getSessionItems(sessionId);
        return items.filter((item) => item.item_id < 1000).length;
      } catch {
        return 0;
      }
    },
    [getSessionItems],
  );

  const isMarketSlotPurchased = useCallback(
    async (sessionId: number, slotId: number): Promise<boolean> => {
      try {
        const result = await provider.callContract({
          contractAddress: playAddress,
          entrypoint: "is_market_slot_purchased",
          calldata: CallData.compile([sessionId, slotId]),
        });

        return isTruthyFelt(result[0]);
      } catch {
        return false;
      }
    },
    [playAddress, provider],
  );

  const getPlayerItems = useCallback(
    async (sessionId: number) => getSessionItems(sessionId),
    [getSessionItems],
  );

  const getLeaderboard = useCallback(
    async (_limit: number = 10): Promise<LeaderboardEntry[]> => readLeaderboard(chainId),
    [chainId],
  );

  const getAvailableBeastSessions = useCallback(
    async (address: string): Promise<number> => readAvailableBeastSessions(chainId, address),
    [chainId],
  );

  return {
    provider,
    isReady: !!account,
    createSession,
    claimBeastSession,
    requestSpin,
    buyItem,
    sellItem,
    refreshMarket,
    equipRelic,
    activateRelic,
    endSession,
    getSessionData,
    getLastSpinResult,
    getPlayerSessions,
    getLevelThreshold,
    get666Probability,
    getSessionItems,
    getSessionMarket,
    getSessionInventoryCount,
    isMarketSlotPurchased,
    getPlayerItems,
    getSystemAddress,
    getLeaderboard,
    getAvailableBeastSessions,
    toriiClient: null,
  };
}
