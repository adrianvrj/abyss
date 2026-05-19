import type * as torii from "@dojoengine/torii-wasm";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNetwork } from "@starknet-react/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfigApi, RewardPoolsApi } from "@/api/torii/config";
import { initToriiClient } from "@/api/torii/client";
import { subscribeEntities } from "@/api/torii/subscribe";
import {
  DEFAULT_CHAIN_ID,
  getRpcUrl,
  getToriiUrl,
  getWorldAddress,
  toChainIdHex,
} from "@/config";
import type { Config, RewardPools } from "@/models";

type EntitiesProviderProps = {
  children: React.ReactNode;
};

type EntitiesProviderState = {
  chainId: string;
  client?: torii.ToriiClient;
  config?: Config;
  rewardPools?: RewardPools;
  rpcUrl: string;
  toriiUrl: string;
  worldAddress: string;
  status: "loading" | "error" | "success";
  refresh: () => Promise<void>;
};

const EntitiesProviderContext = createContext<
  EntitiesProviderState | undefined
>(undefined);

export function EntitiesProvider({
  children,
  ...props
}: EntitiesProviderProps) {
  const { chain } = useNetwork();
  const queryClient = useQueryClient();
  const [client, setClient] = useState<torii.ToriiClient>();
  const subscriptionRef = useRef<{ cancel: () => void } | null>(null);
  const chainId = toChainIdHex(chain?.id ?? DEFAULT_CHAIN_ID);
  const queryKey = useMemo(
    () => [...ConfigApi.keys.singleton(), chainId] as const,
    [chainId],
  );
  const rewardPoolsQueryKey = useMemo(
    () => [...RewardPoolsApi.keys.singleton(), chainId] as const,
    [chainId],
  );

  useEffect(() => {
    let mounted = true;

    const loadClient = async () => {
      try {
        const nextClient = await initToriiClient(chainId);
        if (!mounted) {
          return;
        }
        setClient(nextClient);
      } catch (error) {
        console.error("failed to initialize torii client:", error);
        if (!mounted) {
          return;
        }
        setClient(undefined);
      }
    };

    loadClient();

    return () => {
      mounted = false;
    };
  }, [chainId]);

  const {
    data: config,
    isLoading,
    isError,
    refetch,
  } = useQuery<Config | undefined>({
    queryKey,
    queryFn: async () => {
      if (!client) {
        return undefined;
      }
      return ConfigApi.fetch(client);
    },
    enabled: !!client,
  });

  const {
    data: rewardPools,
    isLoading: isRewardPoolsLoading,
    refetch: refetchRewardPools,
  } = useQuery<RewardPools | undefined>({
    queryKey: rewardPoolsQueryKey,
    queryFn: async () => {
      if (!client) {
        return undefined;
      }
      return RewardPoolsApi.fetch(client);
    },
    enabled: !!client,
  });

  const handleConfigUpdate = useCallback(
    (entities: torii.Entity[]) => {
      const parsed = ConfigApi.parse(entities);
      if (parsed) {
        queryClient.setQueryData(queryKey, parsed);
      }
    },
    [queryClient, queryKey],
  );

  const handleRewardPoolsUpdate = useCallback(
    (entities: torii.Entity[]) => {
      const parsed = RewardPoolsApi.parse(entities);
      if (parsed) {
        queryClient.setQueryData(rewardPoolsQueryKey, parsed);
      }
    },
    [queryClient, rewardPoolsQueryKey],
  );

  useEffect(() => {
    if (!client) {
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      const configSubscription = await subscribeEntities(
        client,
        ConfigApi.query().build().clause,
        handleConfigUpdate,
      );
      const rewardPoolsSubscription = await subscribeEntities(
        client,
        RewardPoolsApi.query().build().clause,
        handleRewardPoolsUpdate,
      );

      if (cancelled) {
        configSubscription.cancel();
        rewardPoolsSubscription.cancel();
        return;
      }

      if (subscriptionRef.current) {
        subscriptionRef.current.cancel();
      }
      subscriptionRef.current = {
        cancel: () => {
          configSubscription.cancel();
          rewardPoolsSubscription.cancel();
        },
      };
    };

    run().catch((error: unknown) => {
      console.error("failed to subscribe to config entities:", error);
    });

    return () => {
      cancelled = true;
      if (subscriptionRef.current) {
        subscriptionRef.current.cancel();
        subscriptionRef.current = null;
      }
    };
  }, [client, handleConfigUpdate, handleRewardPoolsUpdate]);

  const refresh = useCallback(async () => {
    await Promise.all([refetch(), refetchRewardPools()]);
  }, [refetch, refetchRewardPools]);

  const status: EntitiesProviderState["status"] = useMemo(() => {
    if (isError) {
      return "error";
    }
    if (!client || isLoading || isRewardPoolsLoading) {
      return "loading";
    }
    return "success";
  }, [client, isError, isLoading, isRewardPoolsLoading]);

  const value: EntitiesProviderState = {
    chainId,
    client,
    config,
    rewardPools,
    rpcUrl: getRpcUrl(chainId),
    toriiUrl: getToriiUrl(chainId),
    worldAddress: getWorldAddress(chainId),
    status,
    refresh,
  };

  return (
    <EntitiesProviderContext.Provider {...props} value={value}>
      {children}
    </EntitiesProviderContext.Provider>
  );
}

export const useEntities = () => {
  const context = useContext(EntitiesProviderContext);

  if (context === undefined) {
    throw new Error("useEntities must be used within an EntitiesProvider");
  }

  return context;
};
