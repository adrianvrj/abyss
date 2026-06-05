import { useNetwork } from "@starknet-react/core";
import { useCallback, useMemo } from "react";
import { CallData } from "starknet";
import ControllerConnector from "@cartridge/connector/controller";
import { getRpcProvider } from "@/api/rpc/provider";
import { getGameConfig, getUsdCostInToken } from "@/api/rpc/play";
import { captureAbyss, posthog } from "@/lib/posthog";
import {
  DEFAULT_CHAIN_ID,
  getCharmAddress,
  getChipAddress,
  getMarketAddress,
  getPlayAddress,
  getRelicAddress,
  getWorldAddress,
  getSetupAddress,
  getGoldenChipAddress,
  tryGetStreakAddress,
  getCharmMarketAddress,
  tryGetCharmMarketAddress,
  tryGetSeasonAddress,
} from "@/config";
import { getGoldenChipMintPrice } from "@/api/rpc/goldenChip";
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
  const goldenChipAddress = useMemo(() => getGoldenChipAddress(chainId), [chainId]);
  const streakAddress = useMemo(() => tryGetStreakAddress(chainId), [chainId]);
  const charmMarketAddress = useMemo(() => tryGetCharmMarketAddress(chainId), [chainId]);
  const seasonAddress = useMemo(() => tryGetSeasonAddress(chainId), [chainId]);

  const receiptEventContracts = useMemo(() => {
    // Keep indices 0-4 stable (world, play, market, relic, charm) — the receipt
    // parser resolves CharmMarket at index 5.
    const list = [worldAddress, playAddress, marketAddress, relicAddress, charmAddress];
    if (charmMarketAddress) {
      list.push(charmMarketAddress);
    }
    if (streakAddress) {
      list.push(streakAddress);
    }
    // Season is appended last; PrizeClaimed is matched by selector (not index),
    // so its position here only matters for the address filter.
    if (seasonAddress) {
      list.push(seasonAddress);
    }
    return list;
  }, [worldAddress, playAddress, marketAddress, relicAddress, charmAddress, charmMarketAddress, streakAddress, seasonAddress]);

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

      const receipt = await executeCalls(calls);
      captureAbyss("session_created", {
        player_address: account.address,
        chain_id: chainId,
        payment_token: selectedPaymentToken,
        transaction_hash: receipt.transactionHash,
      });
      return receipt;
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
            captureAbyss("free_session_claimed", {
              bundle_id: bundleId,
              chain_id: chainId,
            });
            onComplete?.();
          },
          socialClaimOptions,
        });
      } catch (error) {
        console.error("[ABYSS_ACTIONS] claimsocial:error", error);
        posthog.captureException(error);
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

      const receipt = await executeCalls(
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
      captureAbyss("spin_requested", {
        session_id: sessionId,
        player_address: account.address,
        chain_id: chainId,
        transaction_hash: receipt.transactionHash,
      });
      return receipt;
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
    async (sessionId: number, itemId: number, quantity: number = 1) => {
      const receipt = await executeCalls([
        {
          contractAddress: marketAddress,
          entrypoint: "sell_item",
          calldata: CallData.compile([sessionId, itemId, quantity]),
        },
      ]);
      captureAbyss("item_sold", {
        session_id: sessionId,
        item_id: itemId,
        quantity,
        transaction_hash: receipt.transactionHash,
      });
      return receipt;
    },
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

      const receipt = await executeCalls([
        {
          contractAddress: relicAddress,
          entrypoint: "equip_relic",
          calldata: CallData.compile([sessionId, low, high]),
        },
      ]);
      captureAbyss("relic_equipped", {
        session_id: sessionId,
        relic_token_id: tokenId.toString(),
        transaction_hash: receipt.transactionHash,
      });
      return receipt;
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

      const receipt = await executeCalls(calls);
      captureAbyss("relic_activated", {
        session_id: sessionId,
        relic_id: relicId,
        transaction_hash: receipt.transactionHash,
      });
      return receipt;
    },
    [account, executeCalls, playAddress, relicAddress],
  );

  const rerollCharms = useCallback(
    async (tokenIds: [bigint, bigint, bigint], paymentToken: string, amount: bigint) => {
      if (!account) {
        throw new Error("Wallet not connected");
      }

      const [tokenId1, tokenId2, tokenId3] = tokenIds;
      const receipt = await executeCalls([
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
      captureAbyss("charm_rerolled", {
        player_address: account.address,
        payment_token: paymentToken,
        transaction_hash: receipt.transactionHash,
      });
      return receipt;
    },
    [account, charmAddress, executeCalls],
  );

  const listCharm = useCallback(
    async (tokenId: bigint, priceChipWei: bigint) => {
      if (!account) {
        throw new Error("Wallet not connected");
      }
      const market = charmMarketAddress ?? getCharmMarketAddress(chainId);
      const receipt = await executeCalls([
        {
          contractAddress: charmAddress,
          entrypoint: "approve",
          calldata: CallData.compile([market, ...toUint256(tokenId)]),
        },
        {
          contractAddress: market,
          entrypoint: "list_charm",
          calldata: CallData.compile([...toUint256(tokenId), ...toUint256(priceChipWei)]),
        },
      ]);
      captureAbyss("charm_listed", {
        player_address: account.address,
        token_id: tokenId.toString(),
        price: priceChipWei.toString(),
        transaction_hash: receipt.transactionHash,
      });
      return receipt;
    },
    [account, chainId, charmAddress, charmMarketAddress, executeCalls],
  );

  const buyCharm = useCallback(
    async (listingId: number | bigint, priceChipWei: bigint) => {
      if (!account) {
        throw new Error("Wallet not connected");
      }
      const market = charmMarketAddress ?? getCharmMarketAddress(chainId);
      const receipt = await executeCalls([
        {
          contractAddress: chipAddress,
          entrypoint: "approve",
          calldata: CallData.compile([market, ...toUint256(priceChipWei)]),
        },
        {
          contractAddress: market,
          entrypoint: "buy_charm",
          calldata: CallData.compile([listingId.toString()]),
        },
      ]);
      captureAbyss("charm_bought", {
        player_address: account.address,
        listing_id: listingId.toString(),
        price: priceChipWei.toString(),
        transaction_hash: receipt.transactionHash,
      });
      return receipt;
    },
    [account, chainId, charmMarketAddress, chipAddress, executeCalls],
  );

  const cancelListing = useCallback(
    async (listingId: number | bigint) => {
      if (!account) {
        throw new Error("Wallet not connected");
      }
      const market = charmMarketAddress ?? getCharmMarketAddress(chainId);
      const receipt = await executeCalls([
        {
          contractAddress: market,
          entrypoint: "cancel_listing",
          calldata: CallData.compile([listingId.toString()]),
        },
      ]);
      captureAbyss("charm_listing_cancelled", {
        player_address: account.address,
        listing_id: listingId.toString(),
        transaction_hash: receipt.transactionHash,
      });
      return receipt;
    },
    [account, chainId, charmMarketAddress, executeCalls],
  );

  const endSession = useCallback(
    async (sessionId: number) => {
      const receipt = await executeCalls([
        {
          contractAddress: playAddress,
          entrypoint: "end_session",
          calldata: CallData.compile([sessionId]),
        },
      ]);
      captureAbyss("session_ended", {
        session_id: sessionId,
        transaction_hash: receipt.transactionHash,
      });
      return receipt;
    },
    [executeCalls, playAddress],
  );

  const claimChips = useCallback(
    async (sessionId: number) => {
      const receipt = await executeCalls([
        {
          contractAddress: playAddress,
          entrypoint: "claim_chips",
          calldata: CallData.compile([sessionId]),
        },
      ]);
      captureAbyss("chips_claimed", {
        session_id: sessionId,
        transaction_hash: receipt.transactionHash,
      });
      return receipt;
    },
    [executeCalls, playAddress],
  );

  const mintGoldenChip = useCallback(async () => {
    if (!account) {
      throw new Error("Wallet not connected");
    }

    const config = await getGameConfig(chainId).catch((error) => {
      console.warn("failed to fetch game config before golden chip mint, using fallback token", error);
      return null;
    });
    const paymentToken = config?.quoteToken || CONTRACTS.USDC_TOKEN;
    const price = await getGoldenChipMintPrice(chainId);

    const calls: ExecuteCall[] = [];
    if (price > 0n) {
      calls.push({
        contractAddress: paymentToken,
        entrypoint: "approve",
        calldata: CallData.compile([goldenChipAddress, ...toUint256(price)]),
      });
    }
    calls.push({
      contractAddress: goldenChipAddress,
      entrypoint: "mint",
      calldata: [],
    });

    const receipt = await executeCalls(calls);
    captureAbyss("golden_chip_minted", {
      player_address: account.address,
      chain_id: chainId,
      payment_token: paymentToken,
      price: price.toString(),
      transaction_hash: receipt.transactionHash,
    });
    return receipt;
  }, [account, chainId, executeCalls, goldenChipAddress]);

  const claimStreakLoot = useCallback(async () => {
    if (!account) {
      throw new Error("Wallet not connected");
    }
    if (!streakAddress) {
      throw new Error("Streak contract unavailable (migrate + sync manifest)");
    }
    const receipt = await executeCalls([
      {
        contractAddress: streakAddress,
        entrypoint: "claim_streak_loot",
        calldata: [],
      },
    ]);
    captureAbyss("streak_loot_claimed", {
      player_address: account.address,
      transaction_hash: receipt.transactionHash,
    });
    return receipt;
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

  const claimPrize = useCallback(
    async (seasonId: number) => {
      if (!account) {
        throw new Error("Wallet not connected");
      }
      if (!seasonAddress) {
        throw new Error("Season contract unavailable (migrate + sync manifest)");
      }
      const receipt = await executeCalls([
        {
          contractAddress: seasonAddress,
          entrypoint: "claim_prize",
          calldata: CallData.compile([seasonId]),
        },
      ]);
      captureAbyss("season_prize_claimed", {
        season_id: seasonId,
        amount: receipt.events.prizeClaimed?.amount?.toString() ?? null,
        ranks_mask: receipt.events.prizeClaimed?.ranksMask ?? null,
      });
      return receipt;
    },
    [account, executeCalls, seasonAddress],
  );

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
    goldenChipAddress,
    streakAddress,
    charmMarketAddress,
    seasonAddress,
    createSession,
    mintGoldenChip,
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
    listCharm,
    buyCharm,
    cancelListing,
    endSession,
    claimChips,
    claimStreakLoot,
    recoverStreak,
    claimPrize,
    waitForReceipt,
  };
}
