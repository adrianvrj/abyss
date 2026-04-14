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
import { BundleApi } from "@/api/torii/bundle";
import { subscribeEntities } from "@/api/torii/subscribe";
import { Bundle } from "@/models/bundle";
import { useEntities } from "@/context/entities";

type BundlesProviderProps = {
  children: React.ReactNode;
};

type BundlesProviderState = {
  bundles: Bundle[];
  status: "loading" | "error" | "success";
  refresh: () => Promise<Bundle[]>;
};

const BundlesProviderContext = createContext<
  BundlesProviderState | undefined
>(undefined);

export function BundlesProvider({ children }: BundlesProviderProps) {
  const { client, chainId } = useEntities();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<torii.Subscription | null>(null);
  const queryKey = useMemo(
    () => [...BundleApi.keys.all(), chainId] as const,
    [chainId],
  );

  const {
    data: bundles = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Bundle[]>({
    queryKey,
    queryFn: async () => {
      if (!client) {
        return [];
      }
      return BundleApi.fetchAll(client);
    },
    enabled: !!client,
  });

  const handleUpdate = useCallback(
    (entities: torii.Entity[]) => {
      const parsed = BundleApi.parse(entities);
      if (parsed.length === 0) {
        return;
      }

      queryClient.setQueryData<Bundle[]>(queryKey, (current) =>
        Bundle.dedupe([...(current ?? []), ...parsed]),
      );
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
        BundleApi.query().build().clause,
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
      console.error("failed to subscribe to bundles:", error);
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
    const result = await refetch();
    return result.data ?? [];
  }, [refetch]);

  const value: BundlesProviderState = {
    bundles,
    status: isError ? "error" : isLoading || !client ? "loading" : "success",
    refresh,
  };

  return (
    <BundlesProviderContext.Provider value={value}>
      {children}
    </BundlesProviderContext.Provider>
  );
}

export const useBundles = () => {
  const context = useContext(BundlesProviderContext);

  if (context === undefined) {
    throw new Error("useBundles must be used within a BundlesProvider");
  }

  return context;
};
