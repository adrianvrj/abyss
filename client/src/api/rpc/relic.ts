import { shortString } from "starknet";
import { getRpcProvider } from "@/api/rpc/provider";
import { initToriiClient } from "@/api/torii/client";
import type { CharmContractMetadata } from "@/lib/charmRules";

type ChainLike = bigint | string | undefined | null;

export interface OwnedRelicToken {
  tokenId: bigint;
}

const CHARM_OWNER_LOOKUP_BATCH_SIZE = 25;
const CHARM_OWNER_LOOKUP_LIMIT = 1_200;

function decodeFeltString(value: string | undefined) {
  if (!value) {
    return "";
  }

  try {
    return shortString.decodeShortString(value);
  } catch {
    return "";
  }
}

function parseBigInt(value: unknown) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string" && value !== "") return BigInt(value);
  return 0n;
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

export function parseCharmMetadataResult(result: string[]): CharmContractMetadata {
  return {
    charmId: Number(result[0] ?? 0),
    name: decodeFeltString(result[1]),
    description: decodeFeltString(result[2]),
    effectType: Number(result[3] ?? 0),
    effectValue: Number(result[4] ?? 0),
    effectValue2: Number(result[5] ?? 0),
    conditionType: Number(result[6] ?? 0),
    rarity: Number(result[7] ?? 0),
    shopCost: Number(result[8] ?? 0),
  };
}

export async function getPlayerRelics(
  chainId: ChainLike,
  relicContractAddress: string,
  playerAddress: string,
) {
  const provider = getRpcProvider(chainId);
  const result = await provider.callContract({
    contractAddress: relicContractAddress,
    entrypoint: "get_player_relics",
    calldata: [playerAddress],
  });

  const length = Number(result[0] ?? 0);
  const relics: OwnedRelicToken[] = [];

  for (let index = 0; index < length; index += 1) {
    const low = BigInt(result[1 + index * 2] ?? "0");
    const high = BigInt(result[2 + index * 2] ?? "0");
    relics.push({
      tokenId: low + (high << 128n),
    });
  }

  return relics;
}

export async function getRelicMetadata(
  chainId: ChainLike,
  relicContractAddress: string,
  tokenId: bigint,
) {
  const provider = getRpcProvider(chainId);
  const low = tokenId & ((1n << 128n) - 1n);
  const high = tokenId >> 128n;

  const result = await provider.callContract({
    contractAddress: relicContractAddress,
    entrypoint: "get_relic_metadata",
    calldata: [low.toString(), high.toString()],
  });

  return {
    relicId: Number(result[0] ?? 0),
    name: decodeFeltString(result[1]),
    description: decodeFeltString(result[2]),
    effectType: Number(result[3] ?? 0),
    cooldown: Number(result[4] ?? 0),
    rarity: Number(result[5] ?? 0),
    imageUri: decodeFeltString(result[6]),
    strength: Number(result[7] ?? 0),
    dexterity: Number(result[8] ?? 0),
    intelligence: Number(result[9] ?? 0),
    vitality: Number(result[10] ?? 0),
    wisdom: Number(result[11] ?? 0),
    charisma: Number(result[12] ?? 0),
    luck: Number(result[13] ?? 0),
  };
}

export async function getPlayerCharms(
  chainId: ChainLike,
  charmContractAddress: string,
  playerAddress: string,
) {
  const toriiTokenIds = await getPlayerCharmsFromTorii(chainId, charmContractAddress, playerAddress);
  if (toriiTokenIds) {
    return toriiTokenIds;
  }

  const provider = getRpcProvider(chainId);
  let result: string[];

  try {
    result = await provider.callContract({
      contractAddress: charmContractAddress,
      entrypoint: "get_player_charms",
      calldata: [playerAddress],
    });
  } catch (error) {
    console.warn("[ABYSS_CHARMS] get_player_charms failed; falling back to owner_of scan", error);
    return getPlayerCharmsByOwnerLookup(chainId, charmContractAddress, playerAddress);
  }

  const length = Number(result[0] ?? 0);
  const tokenIds: bigint[] = [];

  for (let index = 0; index < length; index += 1) {
    const low = BigInt(result[1 + index * 2] ?? "0");
    const high = BigInt(result[2 + index * 2] ?? "0");
    tokenIds.push(low + (high << 128n));
  }

  return tokenIds;
}

async function getPlayerCharmsFromTorii(
  chainId: ChainLike,
  charmContractAddress: string,
  playerAddress: string,
): Promise<bigint[] | null> {
  try {
    const client = await initToriiClient(chainId);
    const balances = await client.getTokenBalances({
      contract_addresses: [
        charmContractAddress,
        padAddress(charmContractAddress),
      ],
      account_addresses: [playerAddress],
      token_ids: [],
      pagination: tokenPagination(1_000),
    });

    return balances.items
      .filter((item) => parseBigInt(item.balance) > 0n && item.token_id)
      .map((item) => BigInt(item.token_id!));
  } catch (error) {
    console.warn("[ABYSS_CHARMS] torii token balance lookup failed", error);
    return null;
  }
}

async function getPlayerCharmsByOwnerLookup(
  chainId: ChainLike,
  charmContractAddress: string,
  playerAddress: string,
) {
  const provider = getRpcProvider(chainId);
  const normalizedPlayer = normalizeAddress(playerAddress);
  const tokenIds: bigint[] = [];

  for (let start = 1; start <= CHARM_OWNER_LOOKUP_LIMIT; start += CHARM_OWNER_LOOKUP_BATCH_SIZE) {
    const end = Math.min(CHARM_OWNER_LOOKUP_LIMIT, start + CHARM_OWNER_LOOKUP_BATCH_SIZE - 1);
    const checks: Promise<bigint | null>[] = [];

    for (let tokenId = start; tokenId <= end; tokenId += 1) {
      const tokenIdBigInt = BigInt(tokenId);
      checks.push(
        provider
          .callContract({
            contractAddress: charmContractAddress,
            entrypoint: "owner_of",
            calldata: [tokenId.toString(), "0"],
          })
          .then((result) => normalizeAddress(parseFelt(result)) === normalizedPlayer ? tokenIdBigInt : null)
          .catch(() => null),
      );
    }

    tokenIds.push(...(await Promise.all(checks)).filter(Boolean) as bigint[]);
  }

  return tokenIds;
}

export async function getCharmMetadata(
  chainId: ChainLike,
  charmContractAddress: string,
  tokenId: bigint,
) {
  const provider = getRpcProvider(chainId);
  const low = tokenId & ((1n << 128n) - 1n);
  const high = tokenId >> 128n;

  const result = await provider.callContract({
    contractAddress: charmContractAddress,
    entrypoint: "get_charm_metadata",
    calldata: [low.toString(), high.toString()],
  });

  return parseCharmMetadataResult(result);
}

export async function getCharmTypeInfo(
  chainId: ChainLike,
  charmContractAddress: string,
  charmId: number,
) {
  const provider = getRpcProvider(chainId);
  const result = await provider.callContract({
    contractAddress: charmContractAddress,
    entrypoint: "get_charm_type_info",
    calldata: [charmId.toString()],
  });

  return parseCharmMetadataResult(result);
}

export async function getCharmForgeCostInToken(
  chainId: ChainLike,
  charmContractAddress: string,
  paymentToken: string,
) {
  const provider = getRpcProvider(chainId);
  const result = await provider.callContract({
    contractAddress: charmContractAddress,
    entrypoint: "get_charm_forge_cost_in_token",
    calldata: [paymentToken],
  });

  const low = BigInt(result[0] ?? "0");
  const high = BigInt(result[1] ?? "0");
  return low + (high << 128n);
}

export async function getNftBalance(
  chainId: ChainLike,
  contractAddress: string,
  playerAddress: string,
) {
  const provider = getRpcProvider(chainId);
  const result = await provider.callContract({
    contractAddress,
    entrypoint: "balance_of",
    calldata: [playerAddress],
  });

  const low = BigInt(result[0] ?? "0");
  const high = BigInt(result[1] ?? "0");
  return low + (high << 128n);
}
