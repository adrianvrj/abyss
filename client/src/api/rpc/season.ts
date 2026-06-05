import { getRpcProvider } from "@/api/rpc/provider";
import { getGameConfig } from "@/api/rpc/play";
import { readUint256Balance } from "@/api/rpc/token";
import { getSeasonAddress } from "@/config";

type ChainLike = bigint | string | undefined | null;

export type RpcSeason = {
  seasonId: number;
  leaderboardId: string;
  endTs: number;
  poolAmount: bigint;
  finalized: boolean;
  claimedMask: number;
  top: { sessionId: number; score: number }[];
};

// Serde layout of the `Season` model returned by `get_active_season` /
// `get_season` (keys are included in the returned struct):
//   0 season_id (u32)
//   1 leaderboard_id (felt252)
//   2 end_ts (u64)
//   3 pool_amount low, 4 pool_amount high (u256)
//   5 finalized (bool)
//   6 claimed_mask (u8)
//   7..12 top1..top3 (session,score pairs)
function decodeSeason(result: string[]): RpcSeason {
  return {
    seasonId: Number(result[0] ?? 0),
    leaderboardId: String(result[1] ?? "0x0"),
    endTs: Number(BigInt(result[2] ?? "0")),
    poolAmount: BigInt(result[3] ?? "0") + (BigInt(result[4] ?? "0") << 128n),
    finalized: BigInt(result[5] ?? "0") !== 0n,
    claimedMask: Number(result[6] ?? 0),
    top: [
      { sessionId: Number(result[7] ?? 0), score: Number(result[8] ?? 0) },
      { sessionId: Number(result[9] ?? 0), score: Number(result[10] ?? 0) },
      { sessionId: Number(result[11] ?? 0), score: Number(result[12] ?? 0) },
    ],
  };
}

export async function getActiveSeason(chainId: ChainLike): Promise<RpcSeason> {
  const provider = getRpcProvider(chainId);
  const seasonAddress = getSeasonAddress(chainId);
  const result = await provider.callContract({
    contractAddress: seasonAddress,
    entrypoint: "get_active_season",
    calldata: [],
  });
  return decodeSeason(result as string[]);
}

// Live prize pool = USDC currently held by the SeasonManager contract. The
// active season's `pool_amount` stays 0 until it's finalized (snapshotted at
// rollover), so for the running season we read the balance directly. This
// reflects the 25%-of-entries accrual in real time and any manual USDC seeded
// to the contract address.
export async function getSeasonPoolLive(chainId: ChainLike): Promise<bigint> {
  const seasonAddress = getSeasonAddress(chainId);
  const { quoteToken } = await getGameConfig(chainId);
  return readUint256Balance(chainId, quoteToken, seasonAddress);
}

export async function getSeason(chainId: ChainLike, seasonId: number): Promise<RpcSeason> {
  const provider = getRpcProvider(chainId);
  const seasonAddress = getSeasonAddress(chainId);
  const result = await provider.callContract({
    contractAddress: seasonAddress,
    entrypoint: "get_season",
    calldata: [seasonId.toString()],
  });
  return decodeSeason(result as string[]);
}
