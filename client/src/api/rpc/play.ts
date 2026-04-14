import { shortString } from "starknet";
import { getRpcProvider } from "@/api/rpc/provider";
import { getPlayAddress } from "@/config";

type ChainLike = bigint | string | undefined | null;

export type RpcGameConfig = {
  admin: string;
  vrf: string;
  pragmaOracle: string;
  quoteToken: string;
  chipToken: string;
  charmNft: string;
  relicNft: string;
  beastNft: string;
  treasury: string;
  team: string;
  probability666: number;
  chipEmissionRate: number;
  chipBoostMultiplier: number;
  entryPriceUsd: bigint;
};

export type RpcGameItem = {
  itemId: number;
  name: string;
  description: string;
  price: number;
  sellPrice: number;
  effectType: number;
  effectValue: number;
  targetSymbol: string;
};

function decodeShortString(value: string | bigint | undefined) {
  if (value === undefined) {
    return "";
  }

  try {
    const hex =
      typeof value === "string" && value.startsWith("0x")
        ? value
        : `0x${BigInt(value).toString(16)}`;
    return shortString.decodeShortString(hex);
  } catch {
    return "";
  }
}

export async function getGameConfig(chainId: ChainLike): Promise<RpcGameConfig> {
  const provider = getRpcProvider(chainId);
  const playAddress = getPlayAddress(chainId);
  const result = await provider.callContract({
    contractAddress: playAddress,
    entrypoint: "get_config",
    calldata: [],
  });

  return {
    admin: String(result[1] ?? "0x0"),
    vrf: String(result[2] ?? "0x0"),
    pragmaOracle: String(result[3] ?? "0x0"),
    quoteToken: String(result[4] ?? "0x0"),
    chipToken: String(result[5] ?? "0x0"),
    charmNft: String(result[6] ?? "0x0"),
    relicNft: String(result[7] ?? "0x0"),
    beastNft: String(result[8] ?? "0x0"),
    treasury: String(result[9] ?? "0x0"),
    team: String(result[10] ?? "0x0"),
    probability666: Number(result[28] ?? 0),
    chipEmissionRate: Number(result[29] ?? 0),
    chipBoostMultiplier: Number(result[30] ?? 0),
    entryPriceUsd:
      BigInt(result[31] ?? "0") + (BigInt(result[32] ?? "0") << 128n),
  };
}

export async function getGameItem(chainId: ChainLike, itemId: number): Promise<RpcGameItem> {
  const provider = getRpcProvider(chainId);
  const playAddress = getPlayAddress(chainId);
  const result = await provider.callContract({
    contractAddress: playAddress,
    entrypoint: "get_item_info",
    calldata: [itemId.toString()],
  });

  return {
    itemId: Number(result[0] ?? itemId),
    name: decodeShortString(result[1]),
    description: decodeShortString(result[2]),
    price: Number(result[3] ?? 0),
    sellPrice: Number(result[4] ?? 0),
    effectType: Number(result[5] ?? 0),
    effectValue: Number(result[6] ?? 0),
    targetSymbol: decodeShortString(result[7]),
  };
}

export async function getUsdCostInToken(
  chainId: ChainLike,
  paymentToken: string,
) {
  const provider = getRpcProvider(chainId);
  const playAddress = getPlayAddress(chainId);
  const result = await provider.callContract({
    contractAddress: playAddress,
    entrypoint: "get_usd_cost_in_token",
    calldata: [paymentToken],
  });

  const low = BigInt(result[0] ?? "0");
  const high = BigInt(result[1] ?? "0");
  return low + (high << 128n);
}

export async function getLevelThreshold(chainId: ChainLike, level: number) {
  const provider = getRpcProvider(chainId);
  const playAddress = getPlayAddress(chainId);
  const result = await provider.callContract({
    contractAddress: playAddress,
    entrypoint: "get_level_threshold",
    calldata: [level.toString()],
  });

  return Number(result[0] ?? 0);
}

export async function get666Probability(chainId: ChainLike, level: number) {
  const provider = getRpcProvider(chainId);
  const playAddress = getPlayAddress(chainId);
  const result = await provider.callContract({
    contractAddress: playAddress,
    entrypoint: "get_666_probability",
    calldata: [level.toString()],
  });

  return Number(result[0] ?? 0);
}

export async function getSessionLuck(chainId: ChainLike, sessionId: number) {
  const provider = getRpcProvider(chainId);
  const playAddress = getPlayAddress(chainId);
  const result = await provider.callContract({
    contractAddress: playAddress,
    entrypoint: "get_session_luck",
    calldata: [sessionId.toString()],
  });

  return Number(result[0] ?? 0);
}

export async function getSessionInventoryCount(chainId: ChainLike, sessionId: number) {
  const provider = getRpcProvider(chainId);
  const playAddress = getPlayAddress(chainId);
  const result = await provider.callContract({
    contractAddress: playAddress,
    entrypoint: "get_session_inventory_count",
    calldata: [sessionId.toString()],
  });

  return Number(result[0] ?? 0);
}

export async function getCharmDropChance(chainId: ChainLike, sessionId: number) {
  const provider = getRpcProvider(chainId);
  const playAddress = getPlayAddress(chainId);
  const result = await provider.callContract({
    contractAddress: playAddress,
    entrypoint: "get_charm_drop_chance",
    calldata: [sessionId.toString()],
  });

  return Number(result[0] ?? 0);
}

export async function getAvailableBeastSessions(chainId: ChainLike, playerAddress: string) {
  const provider = getRpcProvider(chainId);
  const playAddress = getPlayAddress(chainId);
  const result = await provider.callContract({
    contractAddress: playAddress,
    entrypoint: "get_available_beast_sessions",
    calldata: [playerAddress],
  });

  return Number(result[0] ?? 0);
}

export async function getAvailableXShareSessions(chainId: ChainLike, playerAddress: string) {
  const provider = getRpcProvider(chainId);
  const playAddress = getPlayAddress(chainId);
  const result = await provider.callContract({
    contractAddress: playAddress,
    entrypoint: "get_available_x_share_sessions",
    calldata: [playerAddress],
  });

  return Number(result[0] ?? 0);
}

export async function getChipsToClaim(chainId: ChainLike, sessionId: number) {
  const provider = getRpcProvider(chainId);
  const playAddress = getPlayAddress(chainId);
  const result = await provider.callContract({
    contractAddress: playAddress,
    entrypoint: "get_chips_to_claim",
    calldata: [sessionId.toString()],
  });

  const low = BigInt(result[0] ?? "0");
  const high = BigInt(result[1] ?? "0");
  return low + (high << 128n);
}
