import { shortString } from "starknet";
import { readTokenSymbol, readUint256Balance } from "@/api/rpc/token";
import {
  getAvailableBeastSessions as readAvailableBeastSessions,
  getCharmDropChance as readCharmDropChance,
  getChipsToClaim as readChipsToClaim,
  getGameItem,
  getSessionInventoryCount as readSessionInventoryCount,
  getSessionLuck as readSessionLuck,
} from "@/api/rpc/play";
import { LeaderboardApi } from "@/api/torii/leaderboard";
import { RewardsApi } from "@/api/torii/rewards";
import { initToriiClient } from "@/api/torii/client";
import {
  DEFAULT_CHAIN_ID,
  getMarketAddress,
  getPlayAddress,
  getTreasuryAddress,
} from "@/config";
import { STATIC_ITEM_DEFINITIONS } from "@/lib/itemCatalog";
import { getStaticCharmDefinition } from "@/lib/charmCatalog";
import type { PrizeTokenBalance } from "@/models";
import { getRpcProvider } from "@/api/rpc/provider";

const provider = getRpcProvider(DEFAULT_CHAIN_ID);

const toHex = (value: number | bigint | string): string => {
  if (typeof value === "string") {
    return value.startsWith("0x") ? value : `0x${BigInt(value).toString(16)}`;
  }
  return `0x${BigInt(value).toString(16)}`;
};

const waitForPreConfirmation = async (txHash: string) => {
  return provider.waitForTransaction(txHash, {
    successStates: ["PRE_CONFIRMED", "ACCEPTED_ON_L2", "ACCEPTED_ON_L1"],
    retryInterval: 200,
  });
};

export enum ItemEffectType {
  ScoreMultiplier = 0,
  PatternMultiplierBoost = 1,
  SymbolProbabilityBoost = 2,
  DirectScoreBonus = 3,
  SpinBonus = 4,
  LevelProgressionBonus = 5,
  SixSixSixProtection = 6,
  CharmEffect = 7,
}

export interface ContractItem {
  item_id: number;
  name: string;
  description: string;
  price: number;
  sell_price: number;
  effect_type: ItemEffectType;
  effect_value: number;
  target_symbol: string;
  image?: string;
}

export interface CharmInfo {
  charm_id: number;
  name: string;
  description: string;
  rarity: string;
  effect: string;
  luck: number;
  shop_cost: number;
  image: string;
  background_color: string;
}

export function isCharmItem(itemId: number): boolean {
  return itemId >= 1000;
}

export function getCharmIdFromItemId(itemId: number): number {
  return itemId - 1000;
}

const charmInfoCache = new Map<number, CharmInfo>();
const itemInfoCache = new Map<number, ContractItem>();

async function getClient() {
  return initToriiClient(DEFAULT_CHAIN_ID);
}

export async function getCharmInfo(charmId: number): Promise<CharmInfo | null> {
  if (charmInfoCache.has(charmId)) {
    return charmInfoCache.get(charmId) ?? null;
  }

  const staticDefinition = getStaticCharmDefinition(charmId);

  try {
    const response = await fetch(`/api/charms/${charmId}`);
    if (!response.ok) {
      if (staticDefinition) {
        charmInfoCache.set(charmId, staticDefinition);
        return staticDefinition;
      }
      return null;
    }

    const data = await response.json();
    const getAttribute = (trait: string) =>
      data.attributes?.find((attribute: any) => attribute.trait_type === trait)?.value;

    const info: CharmInfo = {
      charm_id: staticDefinition?.charm_id ?? Number(getAttribute("Charm ID") || charmId),
      name: staticDefinition?.name ?? data.name,
      description: staticDefinition?.description ?? data.description,
      rarity: staticDefinition?.rarity ?? (getAttribute("Rarity") || "Common"),
      effect: staticDefinition?.effect ?? (getAttribute("Effect") || ""),
      luck: staticDefinition?.luck ?? Number(getAttribute("Luck Value") || 0),
      shop_cost: staticDefinition?.shop_cost ?? Number(getAttribute("Shop Cost") || 0),
      image: staticDefinition?.image ?? data.image,
      background_color:
        staticDefinition?.background_color ??
        (data.background_color ? `#${data.background_color}` : ""),
    };

    charmInfoCache.set(charmId, info);
    return info;
  } catch (error) {
    console.error("Failed to fetch charm info:", error);
    if (staticDefinition) {
      charmInfoCache.set(charmId, staticDefinition);
      return staticDefinition;
    }
    return null;
  }
}

export interface SessionMarket {
  refresh_count: number;
  item_slot_1: number;
  item_slot_2: number;
  item_slot_3: number;
  item_slot_4: number;
  item_slot_5: number;
  item_slot_6: number;
  relicPendingEffect?: number;
}

export interface PlayerItem {
  item_id: number;
  quantity: number;
}

export async function getSessionMarket(sessionId: number): Promise<SessionMarket> {
  const result = await provider.callContract({
    contractAddress: getPlayAddress(DEFAULT_CHAIN_ID),
    entrypoint: "get_session_market",
    calldata: [sessionId.toString()],
  });

  const offset = result.length >= 8 ? 1 : 0;

  return {
    refresh_count: Number(result[offset] ?? 0),
    item_slot_1: Number(result[offset + 1] ?? 0),
    item_slot_2: Number(result[offset + 2] ?? 0),
    item_slot_3: Number(result[offset + 3] ?? 0),
    item_slot_4: Number(result[offset + 4] ?? 0),
    item_slot_5: Number(result[offset + 5] ?? 0),
    item_slot_6: Number(result[offset + 6] ?? 0),
  };
}

export async function getSessionItems(sessionId: number): Promise<PlayerItem[]> {
  const result = await provider.callContract({
    contractAddress: getPlayAddress(DEFAULT_CHAIN_ID),
    entrypoint: "get_session_items",
    calldata: [sessionId.toString()],
  });

  const count = Number(result[0] ?? 0);
  const items: PlayerItem[] = [];

  for (let index = 0; index < count; index += 1) {
    const offset = 1 + index * 2;
    items.push({
      item_id: Number(result[offset] ?? 0),
      quantity: Number(result[offset + 1] ?? 0),
    });
  }

  return items.filter((item) => item.item_id > 0 && item.quantity > 0);
}

export async function getItemInfo(itemId: number): Promise<ContractItem> {
  if (itemInfoCache.has(itemId)) {
    return itemInfoCache.get(itemId)!;
  }

  const item = await getGameItem(DEFAULT_CHAIN_ID, itemId).catch((error) => {
    console.warn("failed to fetch item via rpc, falling back to cached definitions", error);
    return null;
  });
  const fallback = STATIC_ITEM_DEFINITIONS[itemId];

  const resolvedName = item?.name || fallback?.name || `Item #${itemId}`;
  const resolvedDescription = item?.description || fallback?.description || "";
  const resolvedPrice =
    item && item.price > 0 ? item.price : (fallback?.price ?? 0);
  const resolvedSellPrice =
    item && item.sellPrice > 0 ? item.sellPrice : (fallback?.sell_price ?? 0);
  const resolvedEffectValue =
    item && item.effectValue > 0 ? item.effectValue : (fallback?.effect_value ?? 0);
  const resolvedTargetSymbol = item?.targetSymbol || fallback?.target_symbol || "";
  const resolvedEffectType =
    item && (item.effectType > 0 || resolvedEffectValue > 0 || resolvedTargetSymbol.length > 0)
      ? item.effectType
      : (fallback?.effect_type ?? 0);

  const mapped: ContractItem = {
    item_id: item?.itemId ?? itemId,
    name: resolvedName,
    description: resolvedDescription,
    price: resolvedPrice,
    sell_price: resolvedSellPrice,
    effect_type: resolvedEffectType as ItemEffectType,
    effect_value: resolvedEffectValue,
    target_symbol: resolvedTargetSymbol,
  };

  itemInfoCache.set(itemId, mapped);
  return mapped;
}

export async function isMarketSlotPurchased(
  sessionId: number,
  marketSlot: number,
): Promise<boolean> {
  const result = await provider.callContract({
    contractAddress: getPlayAddress(DEFAULT_CHAIN_ID),
    entrypoint: "is_market_slot_purchased",
    calldata: [sessionId.toString(), marketSlot.toString()],
  });

  return Number(result[0] ?? 0) !== 0;
}

export async function getSessionLuck(sessionId: number): Promise<number> {
  return readSessionLuck(DEFAULT_CHAIN_ID, sessionId);
}

export async function getCharmDropChance(sessionId: number): Promise<number> {
  return readCharmDropChance(DEFAULT_CHAIN_ID, sessionId);
}

export async function getSessionInventoryCount(sessionId: number): Promise<number> {
  return readSessionInventoryCount(DEFAULT_CHAIN_ID, sessionId);
}

async function executeCall(executor: any, call: Record<string, unknown>) {
  const result = await (executor.execute ? executor.execute(call) : executor(call));
  return waitForPreConfirmation(result.transaction_hash);
}

export async function buyItemFromMarket(
  sessionId: number,
  marketSlot: number,
  executor: any,
): Promise<string> {
  const call = {
    contractAddress: getMarketAddress(DEFAULT_CHAIN_ID),
    entrypoint: "buy_item",
    calldata: [sessionId, marketSlot],
  };

  const result = await (executor.execute ? executor.execute(call) : executor(call));
  await waitForPreConfirmation(result.transaction_hash);
  return result.transaction_hash;
}

export async function sellItem(
  sessionId: number,
  itemId: number,
  quantity: number,
  executor: any,
): Promise<string> {
  const call = {
    contractAddress: getMarketAddress(DEFAULT_CHAIN_ID),
    entrypoint: "sell_item",
    calldata: [sessionId, itemId, quantity],
  };

  const result = await (executor.execute ? executor.execute(call) : executor(call));
  await waitForPreConfirmation(result.transaction_hash);
  return result.transaction_hash;
}

export async function refreshMarket(sessionId: number, executor: any): Promise<string> {
  const call = {
    contractAddress: getMarketAddress(DEFAULT_CHAIN_ID),
    entrypoint: "refresh_market",
    calldata: [sessionId],
  };

  const result = await (executor.execute ? executor.execute(call) : executor(call));
  await waitForPreConfirmation(result.transaction_hash);
  return result.transaction_hash;
}

export interface LeaderboardEntry {
  player_address: string;
  session_id: number;
  level: number;
  total_score: number;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const client = await getClient();
  const entries = await LeaderboardApi.fetchAll(client);
  return entries.map((entry) => ({
    player_address: entry.playerAddress,
    session_id: entry.sessionId,
    level: entry.level,
    total_score: entry.totalScore,
  }));
}

export async function getPrizePool(): Promise<bigint> {
  const client = await getClient();
  const prizePool = await RewardsApi.fetchPrizePool(client);
  return prizePool?.poolAmount ?? 0n;
}

export interface TokenBalance extends PrizeTokenBalance {}

export async function getPrizeTokenBalances(): Promise<TokenBalance[]> {
  const client = await getClient();
  const prizeTokens = await RewardsApi.fetchPrizeTokens(client);
  const treasuryAddress = getTreasuryAddress(DEFAULT_CHAIN_ID);

  return Promise.all(
    prizeTokens.map(async (token) => ({
      tokenAddress: token.tokenAddress,
      balance: await readUint256Balance(
        DEFAULT_CHAIN_ID,
        token.tokenAddress,
        treasuryAddress,
      ),
      symbol: await readTokenSymbol(DEFAULT_CHAIN_ID, token.tokenAddress),
    })),
  );
}

export async function getAvailableBeastSessions(playerAddress: string): Promise<number> {
  return readAvailableBeastSessions(DEFAULT_CHAIN_ID, playerAddress);
}

export async function getChipsToClaim(sessionId: number): Promise<bigint> {
  return readChipsToClaim(DEFAULT_CHAIN_ID, sessionId);
}

export async function claimChips(sessionId: number, executor: any): Promise<any> {
  return executeCall(executor, {
    contractAddress: getPlayAddress(DEFAULT_CHAIN_ID),
    entrypoint: "claim_chips",
    calldata: [sessionId],
  });
}

function feltToString(felt: string | bigint): string {
  try {
    return shortString.decodeShortString(
      typeof felt === "string" && felt.startsWith("0x")
        ? felt
        : toHex(felt),
    );
  } catch {
    return "TOKEN";
  }
}

export { feltToString };
