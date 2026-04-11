import { shortString } from "starknet";
import { getRpcProvider } from "@/api/rpc/provider";
import type { CharmContractMetadata } from "@/lib/charmRules";

type ChainLike = bigint | string | undefined | null;

export interface OwnedRelicToken {
  tokenId: bigint;
}

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
  const provider = getRpcProvider(chainId);
  const result = await provider.callContract({
    contractAddress: charmContractAddress,
    entrypoint: "get_player_charms",
    calldata: [playerAddress],
  });

  const length = Number(result[0] ?? 0);
  const tokenIds: bigint[] = [];

  for (let index = 0; index < length; index += 1) {
    const low = BigInt(result[1 + index * 2] ?? "0");
    const high = BigInt(result[2 + index * 2] ?? "0");
    tokenIds.push(low + (high << 128n));
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
