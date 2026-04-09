import type * as torii from "@dojoengine/torii-wasm";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useAccount } from "@starknet-react/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { readTokenSymbol, readUint256Balance } from "@/api/rpc/token";
import { getUnclaimedPrize } from "@/api/rpc/treasury";
import { RewardsApi } from "@/api/torii/rewards";
import { subscribeEntities } from "@/api/torii/subscribe";
import { getTreasuryAddress } from "@/config";
import type {
  PrizeClaimed,
  PrizePool,
  PrizeToken,
  PrizeTokenBalance,
} from "@/models";
import { useEntities } from "@/context/entities";

type RewardsProviderProps = {
  children: React.ReactNode;
};

type RewardsProviderState = {
  prizePool?: PrizePool;
  prizeTokens: PrizeToken[];
  tokenBalances: PrizeTokenBalance[];
  claimed?: PrizeClaimed;
  unclaimedPrize: bigint;
  status: "loading" | "error" | "success";
  refresh: () => Promise<void>;
};

const RewardsProviderContext = createContext<
  RewardsProviderState | undefined
>(undefined);

export function RewardsProvider({ children }: RewardsProviderProps) {
  const { address } = useAccount();
  const { client, chainId } = useEntities();
  const queryClient = useQueryClient();
  const poolSubscriptionRef = useRef<torii.Subscription | null>(null);
  const tokensSubscriptionRef = useRef<torii.Subscription | null>(null);
  const claimedSubscriptionRef = useRef<torii.Subscription | null>(null);
  const prizePoolQueryKey = useMemo(
    () => [...RewardsApi.keys.prizePool(), chainId] as const,
    [chainId],
  );
  const prizeTokensQueryKey = useMemo(
    () => [...RewardsApi.keys.prizeTokens(), chainId] as const,
    [chainId],
  );
  const claimedQueryKey = useMemo(
    () => [...RewardsApi.keys.claimed(address ?? "0x0"), chainId] as const,
    [address, chainId],
  );

  const {
    data: prizePool,
    isLoading: poolLoading,
    isError: poolError,
    refetch: refetchPool,
  } = useQuery<PrizePool | undefined>({
    queryKey: prizePoolQueryKey,
    queryFn: async () => {
      if (!client) {
        return undefined;
      }
      return RewardsApi.fetchPrizePool(client);
    },
    enabled: !!client,
  });

  const {
    data: prizeTokens = [],
    isLoading: tokensLoading,
    isError: tokensError,
    refetch: refetchTokens,
  } = useQuery<PrizeToken[]>({
    queryKey: prizeTokensQueryKey,
    queryFn: async () => {
      if (!client) {
        return [];
      }
      return RewardsApi.fetchPrizeTokens(client);
    },
    enabled: !!client,
  });

  const {
    data: claimed,
    isLoading: claimedLoading,
    isError: claimedError,
    refetch: refetchClaimed,
  } = useQuery<PrizeClaimed | undefined>({
    queryKey: claimedQueryKey,
    queryFn: async () => {
      if (!client || !address) {
        return undefined;
      }
      return RewardsApi.fetchClaimed(client, address);
    },
    enabled: !!client && !!address,
  });

  const tokenAddressesKey = useMemo(
    () => prizeTokens.map((item) => item.tokenAddress).join(","),
    [prizeTokens],
  );

  const {
    data: tokenBalances = [],
    isLoading: balancesLoading,
    isError: balancesError,
    refetch: refetchBalances,
  } = useQuery<PrizeTokenBalance[]>({
    queryKey: ["reward-token-balances", chainId, tokenAddressesKey],
    queryFn: async () => {
      const treasuryAddress = getTreasuryAddress(chainId);
      return Promise.all(
        prizeTokens.map(async (token) => ({
          tokenAddress: token.tokenAddress,
          balance: await readUint256Balance(chainId, token.tokenAddress, treasuryAddress),
          symbol: await readTokenSymbol(chainId, token.tokenAddress),
        })),
      );
    },
    enabled: prizeTokens.length > 0,
  });

  const {
    data: unclaimedPrize = 0n,
    isLoading: unclaimedLoading,
    isError: unclaimedError,
    refetch: refetchUnclaimed,
  } = useQuery<bigint>({
    queryKey: ["unclaimed-prize", chainId, address ?? "0x0"],
    queryFn: async () => {
      if (!address) {
        return 0n;
      }
      return getUnclaimedPrize(chainId, address);
    },
    enabled: !!address,
  });

  const handlePrizePoolUpdate = useCallback(
    (entities: torii.Entity[]) => {
      const parsed = RewardsApi.parsePrizePool(entities);
      if (parsed) {
        queryClient.setQueryData(prizePoolQueryKey, parsed);
      }
    },
    [prizePoolQueryKey, queryClient],
  );

  const handlePrizeTokensUpdate = useCallback(
    (entities: torii.Entity[]) => {
      const parsed = RewardsApi.parsePrizeTokens(entities);
      if (parsed.length === 0) {
        return;
      }

      queryClient.setQueryData<PrizeToken[]>(prizeTokensQueryKey, (current) => {
        const next = new Map<number, PrizeToken>();
        for (const item of current ?? []) {
          next.set(item.index, item);
        }
        for (const item of parsed) {
          next.set(item.index, item);
        }
        return Array.from(next.values()).sort((left, right) => left.index - right.index);
      });
    },
    [prizeTokensQueryKey, queryClient],
  );

  const handleClaimedUpdate = useCallback(
    (entities: torii.Entity[]) => {
      const parsed = RewardsApi.parseClaimed(entities);
      if (parsed) {
        queryClient.setQueryData(claimedQueryKey, parsed);
      }
    },
    [claimedQueryKey, queryClient],
  );

  useEffect(() => {
    if (!client) {
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      const subscription = await subscribeEntities(
        client,
        RewardsApi.prizePoolQuery().build().clause,
        handlePrizePoolUpdate,
      );

      if (cancelled) {
        subscription.cancel();
        return;
      }

      if (poolSubscriptionRef.current) {
        poolSubscriptionRef.current.cancel();
      }
      poolSubscriptionRef.current = subscription;
    };

    run().catch((error: unknown) => {
      console.error("failed to subscribe to prize pool:", error);
    });

    return () => {
      cancelled = true;
      if (poolSubscriptionRef.current) {
        poolSubscriptionRef.current.cancel();
        poolSubscriptionRef.current = null;
      }
    };
  }, [client, handlePrizePoolUpdate]);

  useEffect(() => {
    if (!client) {
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      const subscription = await subscribeEntities(
        client,
        RewardsApi.prizeTokensQuery().build().clause,
        handlePrizeTokensUpdate,
      );

      if (cancelled) {
        subscription.cancel();
        return;
      }

      if (tokensSubscriptionRef.current) {
        tokensSubscriptionRef.current.cancel();
      }
      tokensSubscriptionRef.current = subscription;
    };

    run().catch((error: unknown) => {
      console.error("failed to subscribe to prize tokens:", error);
    });

    return () => {
      cancelled = true;
      if (tokensSubscriptionRef.current) {
        tokensSubscriptionRef.current.cancel();
        tokensSubscriptionRef.current = null;
      }
    };
  }, [client, handlePrizeTokensUpdate]);

  useEffect(() => {
    if (!client || !address) {
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      const subscription = await subscribeEntities(
        client,
        RewardsApi.claimedQuery(address).build().clause,
        handleClaimedUpdate,
      );

      if (cancelled) {
        subscription.cancel();
        return;
      }

      if (claimedSubscriptionRef.current) {
        claimedSubscriptionRef.current.cancel();
      }
      claimedSubscriptionRef.current = subscription;
    };

    run().catch((error: unknown) => {
      console.error("failed to subscribe to claimed prizes:", error);
    });

    return () => {
      cancelled = true;
      if (claimedSubscriptionRef.current) {
        claimedSubscriptionRef.current.cancel();
        claimedSubscriptionRef.current = null;
      }
    };
  }, [address, client, handleClaimedUpdate]);

  const refresh = useCallback(async () => {
    await Promise.all([
      refetchPool(),
      refetchTokens(),
      refetchClaimed(),
      refetchBalances(),
      refetchUnclaimed(),
    ]);
  }, [
    refetchBalances,
    refetchClaimed,
    refetchPool,
    refetchTokens,
    refetchUnclaimed,
  ]);

  const value: RewardsProviderState = {
    prizePool,
    prizeTokens,
    tokenBalances,
    claimed,
    unclaimedPrize,
    status:
      poolError ||
      tokensError ||
      claimedError ||
      balancesError ||
      unclaimedError
        ? "error"
        : poolLoading ||
            tokensLoading ||
            claimedLoading ||
            balancesLoading ||
            unclaimedLoading ||
            !client
          ? "loading"
          : "success",
    refresh,
  };

  return (
    <RewardsProviderContext.Provider value={value}>
      {children}
    </RewardsProviderContext.Provider>
  );
}

export function useRewards() {
  const context = useContext(RewardsProviderContext);
  if (!context) {
    throw new Error("useRewards must be used within a RewardsProvider");
  }
  return context;
}
