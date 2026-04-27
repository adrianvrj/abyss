import { getRpcProvider } from "@/api/rpc/provider";
import { getGoldenChipAddress } from "@/config";

type ChainLike = bigint | string | undefined | null;

function parseUint256(result: string[]) {
  return BigInt(result[0] ?? "0") + (BigInt(result[1] ?? "0") << 128n);
}

export async function getGoldenChipBalance(
  chainId: ChainLike,
  playerAddress: string,
) {
  const provider = getRpcProvider(chainId);
  const goldenChipAddress = getGoldenChipAddress(chainId);
  const result = await provider.callContract({
    contractAddress: goldenChipAddress,
    entrypoint: "balance_of",
    calldata: [playerAddress],
  });

  return parseUint256(result as string[]);
}

export async function getAvailableGoldenChipRuns(
  chainId: ChainLike,
  playerAddress: string,
) {
  const provider = getRpcProvider(chainId);
  const goldenChipAddress = getGoldenChipAddress(chainId);
  const result = await provider.callContract({
    contractAddress: goldenChipAddress,
    entrypoint: "get_available_weekly_runs",
    calldata: [playerAddress],
  });

  return Number(result[0] ?? 0);
}
