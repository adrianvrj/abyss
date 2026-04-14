import { useQuery } from "@tanstack/react-query";
import { fetchChipsPerUsdc } from "@/api/price";

export function useChipPrice() {
  const { data: chipsPerUsdc = null, isLoading } = useQuery<number | null>({
    queryKey: ["chips-per-usdc"],
    queryFn: fetchChipsPerUsdc,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  return { chipsPerUsdc, isLoading };
}
