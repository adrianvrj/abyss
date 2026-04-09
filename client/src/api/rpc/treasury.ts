import { getRpcProvider } from "@/api/rpc/provider";
import { getTreasuryAddress } from "@/config";

type ChainLike = bigint | string | undefined | null;

export async function getUnclaimedPrize(
  chainId: ChainLike,
  playerAddress: string,
) {
  const provider = getRpcProvider(chainId);
  const treasuryAddress = getTreasuryAddress(chainId);

  const result = await provider.callContract({
    contractAddress: treasuryAddress,
    entrypoint: "get_unclaimed_prize",
    calldata: [playerAddress],
  });

  const low = BigInt(result[0] ?? "0");
  const high = BigInt(result[1] ?? "0");
  return low + (high << 128n);
}

