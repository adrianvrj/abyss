import { getRpcProvider } from "@/api/rpc/provider";
import { getGoldenChipAddress } from "@/config";

type ChainLike = bigint | string | undefined | null;

const DEFAULT_GOLDEN_CHIP_MAX_SUPPLY = 200;
const OWNER_LOOKUP_BATCH_SIZE = 20;

function parseBigInt(value: unknown) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string" && value !== "") return BigInt(value);
  return 0n;
}

function parseUint256(result: unknown) {
  if (Array.isArray(result)) {
    return parseBigInt(result[0]) + (parseBigInt(result[1]) << 128n);
  }
  if (result && typeof result === "object" && "low" in result) {
    const value = result as { low?: unknown; high?: unknown };
    return parseBigInt(value.low) + (parseBigInt(value.high) << 128n);
  }
  return parseBigInt(result);
}

function parseFelt(result: unknown) {
  if (Array.isArray(result)) {
    return String(result[0] ?? "0x0");
  }
  return String(result ?? "0x0");
}

function normalizeAddress(address: string | undefined | null) {
  if (!address) return "0x0";
  try {
    return `0x${BigInt(address).toString(16)}`;
  } catch {
    return address.toLowerCase();
  }
}

async function getGoldenChipMaxSupply(chainId: ChainLike) {
  const provider = getRpcProvider(chainId);
  const goldenChipAddress = getGoldenChipAddress(chainId);

  try {
    const result = await provider.callContract({
      contractAddress: goldenChipAddress,
      entrypoint: "get_max_supply",
      calldata: [],
    });
    const maxSupply = Number(parseFelt(result));
    return Number.isFinite(maxSupply) && maxSupply > 0
      ? maxSupply
      : DEFAULT_GOLDEN_CHIP_MAX_SUPPLY;
  } catch {
    return DEFAULT_GOLDEN_CHIP_MAX_SUPPLY;
  }
}

async function ownsAnyGoldenChipByOwnerLookup(
  chainId: ChainLike,
  playerAddress: string,
) {
  const provider = getRpcProvider(chainId);
  const goldenChipAddress = getGoldenChipAddress(chainId);
  const normalizedPlayer = normalizeAddress(playerAddress);
  const maxSupply = await getGoldenChipMaxSupply(chainId);

  for (let start = 1; start <= maxSupply; start += OWNER_LOOKUP_BATCH_SIZE) {
    const end = Math.min(maxSupply, start + OWNER_LOOKUP_BATCH_SIZE - 1);
    const checks: Promise<boolean>[] = [];

    for (let tokenId = start; tokenId <= end; tokenId += 1) {
      checks.push(
        provider
          .callContract({
            contractAddress: goldenChipAddress,
            entrypoint: "owner_of",
            calldata: [tokenId.toString(), "0"],
          })
          .then((result) => normalizeAddress(parseFelt(result)) === normalizedPlayer)
          .catch(() => false),
      );
    }

    if ((await Promise.all(checks)).some(Boolean)) {
      return true;
    }
  }

  return false;
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

  const balance = parseUint256(result);
  if (balance > 0n) {
    return balance;
  }

  return (await ownsAnyGoldenChipByOwnerLookup(chainId, playerAddress)) ? 1n : 0n;
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
