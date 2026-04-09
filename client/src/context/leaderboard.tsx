import type * as torii from "@dojoengine/torii-wasm";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LeaderboardApi } from "@/api/torii/leaderboard";
import { subscribeEntities } from "@/api/torii/subscribe";
import type { LeaderboardEntry } from "@/models";
import { useEntities } from "@/context/entities";

type LeaderboardProviderProps = {
  children: React.ReactNode;
};

type LeaderboardProviderState = {
  entries: LeaderboardEntry[];
  status: "loading" | "error" | "success";
  refresh: () => Promise<void>;
};

const LeaderboardProviderContext = createContext<
  LeaderboardProviderState | undefined
>(undefined);

export function LeaderboardProvider({
  children,
}: LeaderboardProviderProps) {
  const { client, chainId } = useEntities();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<torii.Subscription | null>(null);
  const queryKey = useMemo(
    () => [...LeaderboardApi.keys.all(), chainId] as const,
    [chainId],
  );

  const {
    data: entries = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<LeaderboardEntry[]>({
    queryKey,
    queryFn: async () => {
      if (!client) {
        return [];
      }
      return LeaderboardApi.fetchAll(client);
    },
    enabled: !!client,
  });

  const handleUpdate = useCallback(
    (entities: torii.Entity[]) => {
      const parsed = LeaderboardApi.parse(entities);
      if (parsed.length === 0) {
        return;
      }

      queryClient.setQueryData<LeaderboardEntry[]>(queryKey, (current) => {
        const next = new Map<number, LeaderboardEntry>();
        for (const item of current ?? []) {
          next.set(item.rank, item);
        }
        for (const item of parsed) {
          next.set(item.rank, item);
        }
        return Array.from(next.values()).sort((left, right) => left.rank - right.rank);
      });
    },
    [queryClient, queryKey],
  );

  useEffect(() => {
    if (!client) {
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      const subscription = await subscribeEntities(
        client,
        LeaderboardApi.query().build().clause,
        handleUpdate,
      );

      if (cancelled) {
        subscription.cancel();
        return;
      }

      if (subscriptionRef.current) {
        subscriptionRef.current.cancel();
      }
      subscriptionRef.current = subscription;
    };

    run().catch((error: unknown) => {
      console.error("failed to subscribe to leaderboard:", error);
    });

    return () => {
      cancelled = true;
      if (subscriptionRef.current) {
        subscriptionRef.current.cancel();
        subscriptionRef.current = null;
      }
    };
  }, [client, handleUpdate]);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const value: LeaderboardProviderState = {
    entries,
    status: isError ? "error" : isLoading || !client ? "loading" : "success",
    refresh,
  };

  return (
    <LeaderboardProviderContext.Provider value={value}>
      {children}
    </LeaderboardProviderContext.Provider>
  );
}

export function useLeaderboard() {
  const context = useContext(LeaderboardProviderContext);
  if (!context) {
    throw new Error("useLeaderboard must be used within a LeaderboardProvider");
  }
  return context;
}
