import { getRpcProvider } from "@/api/rpc/provider";
import { initToriiClient } from "@/api/torii/client";
import { getGoldenChipAddress, getToriiUrl } from "@/config";

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

function padAddress(address: string) {
  try {
    return `0x${BigInt(address).toString(16).padStart(64, "0")}`;
  } catch {
    return address;
  }
}

function tokenPagination(limit: number) {
  return {
    limit,
    cursor: undefined,
    direction: "Forward" as const,
    order_by: [],
  };
}

async function getGoldenChipBalanceFromToriiGraphql(
  chainId: ChainLike,
  playerAddress: string,
) {
  try {
    const goldenChipAddress = getGoldenChipAddress(chainId);
    const graphqlUrl = `${getToriiUrl(chainId).replace(/\/$/, "")}/graphql`;
    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query GoldenChipBalances($accountAddress: String!) {
            tokenBalances(accountAddress: $accountAddress, first: 100) {
              edges {
                node {
                  tokenMetadata {
                    __typename
                    ... on ERC721__Token {
                      contractAddress
                    }
                  }
                }
              }
            }
          }
        `,
        variables: { accountAddress: playerAddress },
      }),
    });

    if (!response.ok) {
      return 0n;
    }

    const payload = await response.json() as {
      data?: {
        tokenBalances?: {
          edges?: Array<{
            node?: {
              tokenMetadata?: {
                __typename?: string;
                contractAddress?: string;
              };
            };
          }>;
        };
      };
    };
    const normalizedGoldenChip = normalizeAddress(goldenChipAddress);
    const edges = payload.data?.tokenBalances?.edges ?? [];
    const hasGoldenChip = edges.some((edge) => {
      const metadata = edge.node?.tokenMetadata;
      return metadata?.__typename === "ERC721__Token"
        && normalizeAddress(metadata.contractAddress) === normalizedGoldenChip;
    });

    return hasGoldenChip ? 1n : 0n;
  } catch (error) {
    console.warn("[ABYSS_GOLDEN_CHIP] torii-graphql:error", error);
    return 0n;
  }
}

async function getGoldenChipBalanceFromTorii(
  chainId: ChainLike,
  playerAddress: string,
) {
  try {
    const client = await initToriiClient(chainId);
    const goldenChipAddress = getGoldenChipAddress(chainId);
    const balances = await client.getTokenBalances({
      contract_addresses: [
        goldenChipAddress,
        padAddress(goldenChipAddress),
      ],
      account_addresses: [playerAddress],
      token_ids: [],
      pagination: tokenPagination(100),
    });

    const hasBalance = balances.items.some((item) => parseBigInt(item.balance) > 0n);

    return hasBalance ? 1n : 0n;
  } catch (error) {
    console.warn("[ABYSS_GOLDEN_CHIP] torii-wasm:error", error);
    return 0n;
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
    const resolved = Number.isFinite(maxSupply) && maxSupply > 0
      ? maxSupply
      : DEFAULT_GOLDEN_CHIP_MAX_SUPPLY;
    return resolved;
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

  const graphqlBalance = await getGoldenChipBalanceFromToriiGraphql(chainId, playerAddress);
  if (graphqlBalance > 0n) {
    return graphqlBalance;
  }

  const toriiBalance = await getGoldenChipBalanceFromTorii(chainId, playerAddress);
  if (toriiBalance > 0n) {
    return toriiBalance;
  }

  try {
    const result = await provider.callContract({
      contractAddress: goldenChipAddress,
      entrypoint: "balance_of",
      calldata: [playerAddress],
    });

    const balance = parseUint256(result);
    if (balance > 0n) {
      return balance;
    }
  } catch {
    // Some Golden Chip contracts do not expose balance_of; Torii is the primary path.
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
