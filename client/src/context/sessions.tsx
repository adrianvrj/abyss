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
import { SessionApi } from "@/api/torii/session";
import { subscribeEntities } from "@/api/torii/subscribe";
import type {
  BeastSessionsUsed,
  PlayerSessionEntry,
  Session,
  SessionInventory,
  SessionMarket,
  SpinResult,
} from "@/models";
import { useEntities } from "@/context/entities";

type SessionsProviderProps = {
  children: React.ReactNode;
};

type SessionsProviderState = {
  playerEntries: PlayerSessionEntry[];
  playerSessionIds: number[];
  beastSessionsUsed?: BeastSessionsUsed;
  status: "loading" | "error" | "success";
  refresh: () => Promise<void>;
};

const SessionsProviderContext = createContext<
  SessionsProviderState | undefined
>(undefined);

function mergeInventory(
  current: SessionInventory[] | undefined,
  incoming: SessionInventory[],
) {
  const next = new Map<number, SessionInventory>();

  for (const item of current ?? []) {
    next.set(item.itemId, item);
  }

  for (const item of incoming) {
    if (item.quantity > 0) {
      next.set(item.itemId, item);
    } else {
      next.delete(item.itemId);
    }
  }

  return Array.from(next.values()).sort((left, right) => left.itemId - right.itemId);
}

export function SessionsProvider({ children }: SessionsProviderProps) {
  const { address } = useAccount();
  const { client, chainId } = useEntities();
  const queryClient = useQueryClient();
  const entriesSubscriptionRef = useRef<torii.Subscription | null>(null);
  const beastSubscriptionRef = useRef<torii.Subscription | null>(null);
  const entriesQueryKey = useMemo(
    () => [...SessionApi.keys.playerEntries(address ?? "0x0"), chainId] as const,
    [address, chainId],
  );
  const beastQueryKey = useMemo(
    () => [...SessionApi.keys.beastSessions(address ?? "0x0"), chainId] as const,
    [address, chainId],
  );

  const {
    data: playerEntries = [],
    isLoading: entriesLoading,
    isError: entriesError,
    refetch: refetchEntries,
  } = useQuery<PlayerSessionEntry[]>({
    queryKey: entriesQueryKey,
    queryFn: async () => {
      if (!client || !address) {
        return [];
      }
      return SessionApi.fetchPlayerEntries(client, address);
    },
    enabled: !!client && !!address,
  });

  const {
    data: beastSessionsUsed,
    isLoading: beastLoading,
    isError: beastError,
    refetch: refetchBeast,
  } = useQuery<BeastSessionsUsed | undefined>({
    queryKey: beastQueryKey,
    queryFn: async () => {
      if (!client || !address) {
        return undefined;
      }
      return SessionApi.fetchBeastSessionsUsed(client, address);
    },
    enabled: !!client && !!address,
  });

  const handleEntriesUpdate = useCallback(
    (entities: torii.Entity[]) => {
      const parsed = SessionApi.parsePlayerEntries(entities);
      if (parsed.length === 0) {
        return;
      }

      queryClient.setQueryData<PlayerSessionEntry[]>(entriesQueryKey, (current) => {
        const next = new Map<string, PlayerSessionEntry>();
        for (const item of current ?? []) {
          next.set(`${item.player}-${item.index}`, item);
        }
        for (const item of parsed) {
          next.set(`${item.player}-${item.index}`, item);
        }
        return Array.from(next.values()).sort((left, right) => left.index - right.index);
      });
    },
    [entriesQueryKey, queryClient],
  );

  const handleBeastUpdate = useCallback(
    (entities: torii.Entity[]) => {
      const parsed = SessionApi.parseBeastSessions(entities);
      if (parsed) {
        queryClient.setQueryData(beastQueryKey, parsed);
      }
    },
    [beastQueryKey, queryClient],
  );

  useEffect(() => {
    if (!client || !address) {
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      const subscription = await subscribeEntities(
        client,
        SessionApi.playerEntriesQuery(address).build().clause,
        handleEntriesUpdate,
      );

      if (cancelled) {
        subscription.cancel();
        return;
      }

      if (entriesSubscriptionRef.current) {
        entriesSubscriptionRef.current.cancel();
      }
      entriesSubscriptionRef.current = subscription;
    };

    run().catch((error: unknown) => {
      console.error("failed to subscribe to player session entries:", error);
    });

    return () => {
      cancelled = true;
      if (entriesSubscriptionRef.current) {
        entriesSubscriptionRef.current.cancel();
        entriesSubscriptionRef.current = null;
      }
    };
  }, [address, client, handleEntriesUpdate]);

  useEffect(() => {
    if (!client || !address) {
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      const subscription = await subscribeEntities(
        client,
        SessionApi.beastSessionsQuery(address).build().clause,
        handleBeastUpdate,
      );

      if (cancelled) {
        subscription.cancel();
        return;
      }

      if (beastSubscriptionRef.current) {
        beastSubscriptionRef.current.cancel();
      }
      beastSubscriptionRef.current = subscription;
    };

    run().catch((error: unknown) => {
      console.error("failed to subscribe to beast session usage:", error);
    });

    return () => {
      cancelled = true;
      if (beastSubscriptionRef.current) {
        beastSubscriptionRef.current.cancel();
        beastSubscriptionRef.current = null;
      }
    };
  }, [address, client, handleBeastUpdate]);

  const refresh = useCallback(async () => {
    await Promise.all([refetchEntries(), refetchBeast()]);
  }, [refetchBeast, refetchEntries]);

  const value: SessionsProviderState = {
    playerEntries,
    playerSessionIds: playerEntries.map((item) => item.sessionId),
    beastSessionsUsed,
    status:
      entriesError || beastError
        ? "error"
        : entriesLoading || beastLoading || !client
          ? "loading"
          : "success",
    refresh,
  };

  return (
    <SessionsProviderContext.Provider value={value}>
      {children}
    </SessionsProviderContext.Provider>
  );
}

export function usePlayerSessions() {
  const context = useContext(SessionsProviderContext);
  if (!context) {
    throw new Error("usePlayerSessions must be used within a SessionsProvider");
  }
  return context;
}

export function useSession(sessionId: number | null | undefined) {
  const { client, chainId } = useEntities();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<torii.Subscription | null>(null);
  const queryKey = useMemo(
    () => [...SessionApi.keys.session(sessionId ?? 0), chainId] as const,
    [chainId, sessionId],
  );

  const query = useQuery<Session | undefined>({
    queryKey,
    queryFn: async () => {
      if (!client || !sessionId) {
        return undefined;
      }
      return SessionApi.fetchSession(client, sessionId);
    },
    enabled: !!client && !!sessionId,
  });

  const handleUpdate = useCallback(
    (entities: torii.Entity[]) => {
      const parsed = SessionApi.parseSession(entities);
      if (parsed) {
        queryClient.setQueryData(queryKey, parsed);
      }
    },
    [queryClient, queryKey],
  );

  useEffect(() => {
    if (!client || !sessionId) {
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      const subscription = await subscribeEntities(
        client,
        SessionApi.sessionQuery(sessionId).build().clause,
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
      console.error("failed to subscribe to session:", error);
    });

    return () => {
      cancelled = true;
      if (subscriptionRef.current) {
        subscriptionRef.current.cancel();
        subscriptionRef.current = null;
      }
    };
  }, [client, handleUpdate, sessionId]);

  return query;
}

export function useSessionSpinResult(sessionId: number | null | undefined) {
  const { client, chainId } = useEntities();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<torii.Subscription | null>(null);
  const queryKey = useMemo(
    () => [...SessionApi.keys.spinResult(sessionId ?? 0), chainId] as const,
    [chainId, sessionId],
  );

  const query = useQuery<SpinResult | null>({
    queryKey,
    queryFn: async () => {
      if (!client || !sessionId) {
        return null;
      }
      return SessionApi.fetchSpinResult(client, sessionId);
    },
    enabled: !!client && !!sessionId,
  });

  const handleUpdate = useCallback(
    (entities: torii.Entity[]) => {
      const parsed = SessionApi.parseSpinResult(entities);
      if (parsed) {
        queryClient.setQueryData(queryKey, parsed);
      }
    },
    [queryClient, queryKey],
  );

  useEffect(() => {
    if (!client || !sessionId) {
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      const subscription = await subscribeEntities(
        client,
        SessionApi.spinResultQuery(sessionId).build().clause,
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
      console.error("failed to subscribe to spin result:", error);
    });

    return () => {
      cancelled = true;
      if (subscriptionRef.current) {
        subscriptionRef.current.cancel();
        subscriptionRef.current = null;
      }
    };
  }, [client, handleUpdate, sessionId]);

  return query;
}

export function useSessionMarket(sessionId: number | null | undefined) {
  const { client, chainId } = useEntities();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<torii.Subscription | null>(null);
  const queryKey = useMemo(
    () => [...SessionApi.keys.market(sessionId ?? 0), chainId] as const,
    [chainId, sessionId],
  );

  const query = useQuery<SessionMarket | undefined>({
    queryKey,
    queryFn: async () => {
      if (!client || !sessionId) {
        return undefined;
      }
      return SessionApi.fetchMarket(client, sessionId);
    },
    enabled: !!client && !!sessionId,
  });

  const handleUpdate = useCallback(
    (entities: torii.Entity[]) => {
      const parsed = SessionApi.parseMarket(entities);
      if (parsed) {
        queryClient.setQueryData(queryKey, parsed);
      }
    },
    [queryClient, queryKey],
  );

  useEffect(() => {
    if (!client || !sessionId) {
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      const subscription = await subscribeEntities(
        client,
        SessionApi.marketQuery(sessionId).build().clause,
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
      console.error("failed to subscribe to session market:", error);
    });

    return () => {
      cancelled = true;
      if (subscriptionRef.current) {
        subscriptionRef.current.cancel();
        subscriptionRef.current = null;
      }
    };
  }, [client, handleUpdate, sessionId]);

  return query;
}

export function useSessionInventory(sessionId: number | null | undefined) {
  const { client, chainId } = useEntities();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<torii.Subscription | null>(null);
  const queryKey = useMemo(
    () => [...SessionApi.keys.inventory(sessionId ?? 0), chainId] as const,
    [chainId, sessionId],
  );

  const query = useQuery<SessionInventory[]>({
    queryKey,
    queryFn: async () => {
      if (!client || !sessionId) {
        return [];
      }
      return SessionApi.fetchInventory(client, sessionId);
    },
    enabled: !!client && !!sessionId,
  });

  const handleUpdate = useCallback(
    (entities: torii.Entity[]) => {
      const parsed = SessionApi.parseInventory(entities);
      if (parsed.length === 0) {
        return;
      }
      queryClient.setQueryData<SessionInventory[]>(queryKey, (current) =>
        mergeInventory(current, parsed),
      );
    },
    [queryClient, queryKey],
  );

  useEffect(() => {
    if (!client || !sessionId) {
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      const subscription = await subscribeEntities(
        client,
        SessionApi.inventoryQuery(sessionId).build().clause,
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
      console.error("failed to subscribe to session inventory:", error);
    });

    return () => {
      cancelled = true;
      if (subscriptionRef.current) {
        subscriptionRef.current.cancel();
        subscriptionRef.current = null;
      }
    };
  }, [client, handleUpdate, sessionId]);

  return query;
}
