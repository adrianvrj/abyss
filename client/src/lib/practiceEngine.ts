import { STATIC_ITEM_DEFINITIONS } from "@/lib/itemCatalog";
import {
  CharmConditionType,
  CharmEffectType,
  getCharmLuckEntries,
  convertFortuneToSpinLuck,
  type CharmLuckContext,
  mergeCharmDisplayData,
  type CharmContractMetadata,
} from "@/lib/charmRules";
import { getStaticCharmDefinition } from "@/lib/charmCatalog";
import {
  applyPatternModifiers,
  growSnowballAdds,
  EMPTY_SNOWBALL_ADDS,
  type SnowballAdds,
} from "@/lib/patternMath";
import { ContractItem, ItemEffectType } from "@/utils/abyssContract";
import { DEFAULT_GAME_CONFIG } from "@/utils/GameConfig";
import { getItemImage } from "@/utils/itemImages";
import { Pattern, detectPatterns } from "@/utils/patternDetector";

const DEFAULT_SYMBOL_SCORES = [7, 5, 4, 3, 2];
const DEFAULT_SPINS = 5;
const MAX_CURRENT_SPINS = 8;
const DEFAULT_TICKETS = 7;
const BIBLIA_ITEM_ID = 40;
const CASH_OUT_ITEM_ID = 41;
const MARKET_SLOT_COUNT = 6;
const INVENTORY_LIMIT = 7;
const MAX_ITEM_ID = 41;
const CHARM_ITEM_OFFSET = 1000;
const MARKET_CHARM_APPEAR_CHANCE = 22;
const MAX_PRACTICE_LOADOUT_CHARMS = 3;
const RETIRED_MARKET_ITEM_IDS = new Set<number>([10, 19, 23, 24, 39]);
const RELIC_EFFECT_RANDOM_JACKPOT = 0;
const RELIC_EFFECT_DOUBLE_NEXT_SPIN = 2;
const RELIC_EFFECT_RESET_SPINS = 3;
const RELIC_EFFECT_FREE_MARKET_REFRESH = 4;

const PRACTICE_RELIC_COOLDOWNS: Record<number, number> = {
  1: 15,
  2: 15,
  3: 9,
  4: 9,
  5: 9,
};

export interface PracticeRunState {
  id: number;
  seed: number;
  rngState: number;
  level: number;
  score: number;
  totalScore: number;
  threshold: number;
  risk: number;
  tickets: number;
  spinsRemaining: number;
  isActive: boolean;
  grid: number[];
  inventoryItems: ContractItem[];
  marketItems: ContractItem[];
  loadoutCharmIds: number[];
  refreshCount: number;
  purchasedSlots: number[];
  symbolScores: number[];
  diamondChipBonusUnits: number;
  blocked666: boolean;
  marketRevision: number;
  inventoryRevision: number;
  sessionRevision: number;
  equippedRelicId: number;
  relicCooldownRemaining: number;
  relicUsedThisSession: boolean;
  pendingRelicEffect: number | null;
  bibliaPurchaseCount: number;
  lastSpinPatternCount: number;
  charmDebtScores: Record<number, number>;
  consecutive666Count: number;
  // Snowball accumulators (hundredths of a multiplier) added to each pattern
  // type's base multiplier; grow as snowball charms' trigger symbols form patterns.
  snowballHAdd: number;
  snowballVAdd: number;
  snowballDAdd: number;
}

export interface PracticeSpinOutcome {
  nextState: PracticeRunState;
  patterns: Pattern[];
  scoreGained: number;
  is666: boolean;
  isJackpot: boolean;
  bibliaUsed: boolean;
  bibliaDiscarded: boolean;
  cashOutSucceeded: boolean;
  cashOutFailed: boolean;
  previousScore: number;
  previousLevel: number;
  awardedTickets: number;
  endedRun: boolean;
  debtCollected: Array<{
    charmId: number;
    collectedScore: number;
    storedScore: number;
    newScore: number;
    newTotalScore: number;
  }>;
  debtPaid: Array<{
    charmId: number;
    storedScore: number;
    multiplier: number;
    payoutScore: number;
    newScore: number;
    newTotalScore: number;
  }>;
  debtDefaulted: Array<{
    charmId: number;
    storedScore: number;
  }>;
}

export interface PracticeBuyOutcome {
  nextState: PracticeRunState;
  purchasedItem: ContractItem;
}

export interface PracticeSellOutcome {
  nextState: PracticeRunState;
  soldItem: ContractItem;
}

export interface PracticeRefreshOutcome {
  nextState: PracticeRunState;
}

export interface PracticeRelicActivationOutcome {
  nextState: PracticeRunState;
  relicId: number;
  effectType: number;
  endedRun: boolean;
  refreshedMarket: boolean;
}

function toNonZeroSeed(seed: number) {
  const normalized = seed >>> 0;
  return normalized === 0 ? 0x9e3779b9 : normalized;
}

function nextRngState(current: number) {
  let next = current >>> 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  return next >>> 0;
}

function takeRandomInt(current: number, maxExclusive: number) {
  const next = nextRngState(current);
  return {
    nextState: next,
    value: maxExclusive > 0 ? next % maxExclusive : 0,
  };
}

function rollPracticePhantomBonusSpins(current: number) {
  const roll = takeRandomInt(current, 100);
  const bonusSpins = roll.value < 40 ? 1 : roll.value < 80 ? 2 : 3;
  return {
    nextState: roll.nextState,
    bonusSpins,
  };
}

function buildPracticeItem(itemId: number): ContractItem {
  const definition = STATIC_ITEM_DEFINITIONS[itemId];

  if (!definition) {
    return {
      item_id: itemId,
      name: `Item #${itemId}`,
      description: "",
      price: 0,
      sell_price: 0,
      effect_type: 0,
      effect_value: 0,
      target_symbol: "",
      image: getItemImage(itemId),
    };
  }

  return {
    item_id: itemId,
    name: definition.name,
    description: definition.description,
    price: definition.price,
    sell_price: definition.sell_price,
    effect_type: definition.effect_type as ItemEffectType,
    effect_value: definition.effect_value,
    target_symbol: definition.target_symbol,
    image: getItemImage(itemId),
  };
}

function getPracticeCharmMetadata(charmId: number): CharmContractMetadata | null {
  const staticDefinition = getStaticCharmDefinition(charmId);
  if (!staticDefinition) {
    return null;
  }

  const base = {
    charmId,
    name: staticDefinition.name,
    description: staticDefinition.description,
    rarity: staticDefinition.rarity === "Legendary" ? 3 : staticDefinition.rarity === "Epic" ? 2 : staticDefinition.rarity === "Rare" ? 1 : 0,
    shopCost: staticDefinition.shop_cost,
  };

  switch (charmId) {
    case 1: return { ...base, effectType: CharmEffectType.LuckBoost, effectValue: 10, effectValue2: 0, conditionType: CharmConditionType.None };
    case 2: return { ...base, effectType: CharmEffectType.LuckBoost, effectValue: 12, effectValue2: 0, conditionType: CharmConditionType.None };
    case 3: return { ...base, effectType: CharmEffectType.ConditionalLuckBoost, effectValue: 18, effectValue2: 0, conditionType: CharmConditionType.NoPatternLastSpin };
    case 4: return { ...base, effectType: CharmEffectType.ConditionalLuckBoost, effectValue: 20, effectValue2: 0, conditionType: CharmConditionType.LowSpinsRemaining };
    case 5: return { ...base, effectType: CharmEffectType.LuckBoost, effectValue: 14, effectValue2: 0, conditionType: CharmConditionType.None };
    case 6: return { ...base, effectType: CharmEffectType.ConditionalLuckBoost, effectValue: 8, effectValue2: 0, conditionType: CharmConditionType.PerItemInInventory };
    case 7: return { ...base, effectType: CharmEffectType.LuckBoost, effectValue: 16, effectValue2: 0, conditionType: CharmConditionType.None };
    case 8: return { ...base, effectType: CharmEffectType.ConditionalLuckBoost, effectValue: 22, effectValue2: 0, conditionType: CharmConditionType.LowScore };
    case 9: return { ...base, effectType: CharmEffectType.LuckBoost, effectValue: 24, effectValue2: 0, conditionType: CharmConditionType.None };
    case 10: return { ...base, effectType: CharmEffectType.PatternRetrigger, effectValue: 2, effectValue2: 1, conditionType: CharmConditionType.None };
    case 11: return { ...base, effectType: CharmEffectType.LuckBoost, effectValue: 14, effectValue2: 18, conditionType: CharmConditionType.HighLevel };
    case 12: return { ...base, effectType: CharmEffectType.ConditionalLuckBoost, effectValue: 12, effectValue2: 0, conditionType: CharmConditionType.None };
    case 13: return { ...base, effectType: CharmEffectType.ExtraSpinWithLuck, effectValue: 2, effectValue2: 25, conditionType: CharmConditionType.None };
    case 14: return { ...base, effectType: CharmEffectType.PatternRetrigger, effectValue: 2, effectValue2: 3, conditionType: CharmConditionType.None };
    case 15: return { ...base, effectType: CharmEffectType.LuckBoost, effectValue: 38, effectValue2: 0, conditionType: CharmConditionType.None };
    case 16: return { ...base, effectType: CharmEffectType.ExtraSpinWithLuck, effectValue: 3, effectValue2: 20, conditionType: CharmConditionType.None };
    case 17: return { ...base, effectType: CharmEffectType.PatternRetrigger, effectValue: 2, effectValue2: 0, conditionType: CharmConditionType.None };
    case 18: return { ...base, effectType: CharmEffectType.ConditionalLuckBoost, effectValue: 140, effectValue2: 0, conditionType: CharmConditionType.Blocked666 };
    case 19: return { ...base, effectType: CharmEffectType.LuckBoost, effectValue: 45, effectValue2: 0, conditionType: CharmConditionType.None };
    case 20: return { ...base, effectType: CharmEffectType.ExtraSpinWithLuck, effectValue: 2, effectValue2: 80, conditionType: CharmConditionType.None };
    case 21: return { ...base, effectType: CharmEffectType.LuckBoost, effectValue: 15, effectValue2: 0, conditionType: CharmConditionType.None };
    case 22: return { ...base, effectType: CharmEffectType.ConditionalLuckBoost, effectValue: 22, effectValue2: 0, conditionType: CharmConditionType.NoPatternLastSpin };
    case 23: return { ...base, effectType: CharmEffectType.ConditionalLuckBoost, effectValue: 9, effectValue2: 0, conditionType: CharmConditionType.PerItemInInventory };
    case 24: return { ...base, effectType: CharmEffectType.PatternRetrigger, effectValue: 2, effectValue2: 2, conditionType: CharmConditionType.None };
    case 25: return { ...base, effectType: CharmEffectType.ExtraSpinWithLuck, effectValue: 2, effectValue2: 28, conditionType: CharmConditionType.None };
    case 26: return { ...base, effectType: CharmEffectType.DebtPledge, effectValue: 5, effectValue2: 10, conditionType: CharmConditionType.Consecutive666 };
    case 27: return { ...base, effectType: CharmEffectType.DebtPledge, effectValue: 10, effectValue2: 12, conditionType: CharmConditionType.AllPatternTypesSameSpin };
    // Snowball charms (28-37): effectValue = increment (hundredths), effectValue2 = trigger
    // symbol (1=seven..5=lemon), conditionType = target pattern (1=H, 2=V, 3=D).
    case 28: return { ...base, effectType: CharmEffectType.PatternSnowball, effectValue: 8, effectValue2: 5, conditionType: 1 };
    case 29: return { ...base, effectType: CharmEffectType.PatternSnowball, effectValue: 10, effectValue2: 3, conditionType: 2 };
    case 30: return { ...base, effectType: CharmEffectType.PatternSnowball, effectValue: 10, effectValue2: 1, conditionType: 3 };
    case 31: return { ...base, effectType: CharmEffectType.PatternSnowball, effectValue: 12, effectValue2: 2, conditionType: 1 };
    case 32: return { ...base, effectType: CharmEffectType.PatternSnowball, effectValue: 15, effectValue2: 1, conditionType: 1 };
    case 33: return { ...base, effectType: CharmEffectType.PatternSnowball, effectValue: 15, effectValue2: 3, conditionType: 3 };
    case 34: return { ...base, effectType: CharmEffectType.PatternSnowball, effectValue: 18, effectValue2: 5, conditionType: 2 };
    case 35: return { ...base, effectType: CharmEffectType.PatternSnowball, effectValue: 25, effectValue2: 5, conditionType: 3 };
    case 36: return { ...base, effectType: CharmEffectType.PatternSnowball, effectValue: 30, effectValue2: 2, conditionType: 2 };
    case 37: return { ...base, effectType: CharmEffectType.PatternSnowball, effectValue: 40, effectValue2: 2, conditionType: 3 };
    default: return null;
  }
}

function buildPracticeCharmItem(charmId: number): ContractItem | null {
  const staticDefinition = getStaticCharmDefinition(charmId);
  const metadata = getPracticeCharmMetadata(charmId);
  const charmInfo = mergeCharmDisplayData({
    charmId,
    staticDefinition,
    apiMetadata: null,
    metadata,
  });

  if (!charmInfo) {
    return null;
  }

  return {
    item_id: CHARM_ITEM_OFFSET + charmId,
    name: charmInfo.name,
    description: charmInfo.description,
    price: charmInfo.shop_cost,
    sell_price: Math.floor(charmInfo.shop_cost / 2),
    effect_type: ItemEffectType.CharmEffect,
    effect_value: charmInfo.luck,
    target_symbol: charmInfo.rarity,
    image: charmInfo.image,
    charmInfo,
  };
}

function normalizePracticeLoadout(charmIds: number[] = []) {
  const seen = new Set<number>();
  const normalized: number[] = [];

  for (const charmId of charmIds) {
    const id = Number(charmId);
    if (
      Number.isInteger(id) &&
      id > 0 &&
      getStaticCharmDefinition(id) &&
      !seen.has(id)
    ) {
      seen.add(id);
      normalized.push(id);
      if (normalized.length >= MAX_PRACTICE_LOADOUT_CHARMS) {
        break;
      }
    }
  }

  return normalized;
}

function getCharmMetadataFromItem(item: ContractItem) {
  return item.charmInfo?.metadata ?? null;
}

function getCharmExtraSpinValue(item: ContractItem) {
  const metadata = getCharmMetadataFromItem(item);
  return metadata?.effectType === 9 ? metadata.effectValue : 0;
}

function getDebtCharmConfig(item: ContractItem) {
  const metadata = getCharmMetadataFromItem(item);
  if (metadata?.effectType !== CharmEffectType.DebtPledge) {
    return null;
  }

  return {
    charmId: metadata.charmId,
    collectAmount: metadata.effectValue,
    multiplier: metadata.effectValue2,
    conditionType: metadata.conditionType,
  };
}

function getPracticeLuckContext(state: PracticeRunState, items = state.inventoryItems): CharmLuckContext {
  return {
    level: state.level,
    score: state.score,
    spinsRemaining: state.spinsRemaining,
    lastSpinPatternCount: state.lastSpinPatternCount,
    inventoryCount: items.filter((item) => item.item_id < 1000 && item.effect_type !== ItemEffectType.SpinBonus).length,
    blocked666: state.blocked666,
  };
}

export function getPracticeEffectiveLuck(state: PracticeRunState, items = state.inventoryItems) {
  const context = getPracticeLuckContext(state, items);
  return items.reduce((sum, item) => {
    const entries = getCharmLuckEntries(getCharmMetadataFromItem(item), context);
    return sum + entries.reduce((entrySum, entry) => entrySum + entry.value, 0);
  }, 0);
}

export function getPracticeSpinLuck(state: PracticeRunState, items = state.inventoryItems) {
  return convertFortuneToSpinLuck(getPracticeEffectiveLuck(state, items));
}

function getItemPurchasePrice(item: ContractItem, bibliaPurchaseCount: number) {
  if (item.item_id === BIBLIA_ITEM_ID) {
    return item.price + bibliaPurchaseCount;
  }

  return item.price;
}

export function getPracticeLevelThreshold(level: number) {
  if (level <= 1) return 66;
  if (level === 2) return 220;
  if (level === 3) return 450;
  if (level === 4) return 1000;
  if (level === 5) return 2200;
  if (level === 6) return 5000;
  if (level === 7) return 9500;
  if (level === 8) return 17000;
  if (level === 9) return 24500;
  if (level === 10) return 42000;
  if (level === 11) return 70000;
  return 70000 + ((level - 11) * 50000);
}

export function getPractice666Probability(level: number) {
  if (level <= 2) {
    return 0;
  }
  if (level <= 5) {
    return (level - 2) * 20;
  }
  if (level <= 8) {
    return 60 + ((level - 5) * 30);
  }
  if (level <= 10) {
    return 160 + ((level - 8) * 50);
  }
  return 260 + ((level - 10) * 70);
}

export function getPracticeRefreshCost(refreshCount: number) {
  return 2 + Math.floor((refreshCount * (refreshCount + 3)) / 2);
}

function getDirectScoreBonuses(items: ContractItem[]) {
  return items.reduce(
    (bonuses, item) => {
      if (item.effect_type !== ItemEffectType.DirectScoreBonus) {
        return bonuses;
      }

      if (item.target_symbol === "seven") bonuses[0] += item.effect_value;
      else if (item.target_symbol === "diamond") bonuses[1] += item.effect_value;
      else if (item.target_symbol === "cherry") bonuses[2] += item.effect_value;
      else if (item.target_symbol === "coin") bonuses[3] += item.effect_value;
      else if (item.target_symbol === "lemon") bonuses[4] += item.effect_value;

      return bonuses;
    },
    [0, 0, 0, 0, 0],
  );
}

function getProbabilityBonuses(items: ContractItem[]) {
  return items.reduce(
    (bonuses, item) => {
      if (item.effect_type !== ItemEffectType.SymbolProbabilityBoost) {
        return bonuses;
      }

      if (item.target_symbol === "seven") bonuses[0] += item.effect_value;
      else if (item.target_symbol === "diamond") bonuses[1] += item.effect_value;
      else if (item.target_symbol === "cherry") bonuses[2] += item.effect_value;
      else if (item.target_symbol === "coin") bonuses[3] += item.effect_value;
      else if (item.target_symbol === "lemon") bonuses[4] += item.effect_value;
      else if (item.target_symbol === "anti-coin") {
        bonuses[3] -= item.effect_value;
      }

      return bonuses;
    },
    [0, 0, 0, 0, 0],
  );
}

function buildWeightedSymbols(items: ContractItem[]) {
  const bonuses = getProbabilityBonuses(items);
  return [
    10 + bonuses[0],
    15 + bonuses[1],
    20 + bonuses[2],
    Math.max(0, 25 + bonuses[3]),
    24 + bonuses[4],
  ];
}

function generateMarketItems(
  rngState: number,
  previousItems: ContractItem[] = [],
  loadoutCharmIds: number[] = [],
  activeCharmIds: number[] = [],
  guaranteeLoadoutCharms = false,
) {
  let nextState = rngState;
  const pickedIds = new Set<number>();
  const excludedIds = new Set<number>(previousItems.map((item) => item.item_id));
  const availableCharmIds = normalizePracticeLoadout(loadoutCharmIds)
    .filter((charmId) => !activeCharmIds.includes(charmId));
  let attempts = 0;

  if (guaranteeLoadoutCharms) {
    for (const charmId of availableCharmIds) {
      if (pickedIds.size >= MARKET_SLOT_COUNT) {
        break;
      }
      pickedIds.add(CHARM_ITEM_OFFSET + charmId);
    }
  }

  while (pickedIds.size < MARKET_SLOT_COUNT && attempts < 200) {
    let itemId = 0;
    const charmRoll = takeRandomInt(nextState, 100);
    nextState = charmRoll.nextState;

    if (availableCharmIds.length > 0 && charmRoll.value < MARKET_CHARM_APPEAR_CHANCE) {
      const charmPick = takeRandomInt(nextState, availableCharmIds.length);
      nextState = charmPick.nextState;
      itemId = CHARM_ITEM_OFFSET + availableCharmIds[charmPick.value];
    } else {
      const next = takeRandomInt(nextState, MAX_ITEM_ID);
      nextState = next.nextState;
      itemId = next.value + 1;
    }

    if (!RETIRED_MARKET_ITEM_IDS.has(itemId) && !excludedIds.has(itemId) && !pickedIds.has(itemId)) {
      pickedIds.add(itemId);
    }
    attempts += 1;
  }

  if (pickedIds.size < MARKET_SLOT_COUNT) {
    for (let itemId = 1; itemId <= MAX_ITEM_ID && pickedIds.size < MARKET_SLOT_COUNT; itemId += 1) {
      if (!RETIRED_MARKET_ITEM_IDS.has(itemId) && !excludedIds.has(itemId) && !pickedIds.has(itemId)) {
        pickedIds.add(itemId);
      }
    }
  }

  return {
    nextState,
    items: Array.from(pickedIds)
      .map((itemId) => itemId >= CHARM_ITEM_OFFSET
        ? buildPracticeCharmItem(itemId - CHARM_ITEM_OFFSET)
        : buildPracticeItem(itemId))
      .filter((item): item is ContractItem => Boolean(item)),
  };
}

function generateSpinGrid(
  rngState: number,
  items: ContractItem[],
  level: number,
  luck: number,
  forceJackpot = false,
) {
  if (forceJackpot) {
    const roll = takeRandomInt(rngState, 5);
    const symbol = roll.value + 1;
    return {
      nextState: roll.nextState,
      grid: Array.from({ length: 15 }, () => symbol),
      is666: false,
      isJackpot: true,
    };
  }

  const weights = buildWeightedSymbols(items);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let nextState = rngState;
  const grid: number[] = [];
  let isJackpot = true;
  let firstSymbol = 0;
  const luckBiasThreshold = convertFortuneToSpinLuck(luck) * 1000;

  for (let index = 0; index < 15; index += 1) {
    let symbol = 0;

    if (luckBiasThreshold > 0 && index > 0) {
      const luckRoll = takeRandomInt(nextState, 100000);
      nextState = luckRoll.nextState;
      if (luckRoll.value < luckBiasThreshold) {
        const neighborIndex = index === 5 || index === 10 ? index - 5 : index - 1;
        symbol = grid[Math.max(0, neighborIndex)] ?? 0;
      }
    }

    const roll = takeRandomInt(nextState, totalWeight);
    nextState = roll.nextState;
    const symbolRoll = roll.value;

    if (symbol === 0) {
      let threshold = weights[0];
      symbol = 1;
      while (symbol < 5 && symbolRoll >= threshold) {
        symbol += 1;
        threshold += weights[symbol - 1];
      }
    }

    grid.push(symbol);

    if (index === 0) {
      firstSymbol = symbol;
    } else if (symbol !== firstSymbol) {
      isJackpot = false;
    }
  }

  const sixRoll = takeRandomInt(nextState, 1000);
  nextState = sixRoll.nextState;
  const is666 = sixRoll.value < getPractice666Probability(level);

  if (is666) {
    grid[6] = 6;
    grid[7] = 6;
    grid[8] = 6;
  }

  return {
    nextState,
    grid,
    is666,
    isJackpot,
  };
}

function withDerivedState(state: PracticeRunState): PracticeRunState {
  return {
    ...state,
    threshold: getPracticeLevelThreshold(state.level),
    risk: getPractice666Probability(state.level) / 10,
  };
}

function getPatternsForGrid(
  grid: number[],
  items: ContractItem[],
  symbolScores: number[],
  snowballAdds: SnowballAdds = EMPTY_SNOWBALL_ADDS,
) {
  const basePatterns = detectPatterns(grid, DEFAULT_GAME_CONFIG, undefined, symbolScores);
  const modifiedPatterns = applyPatternModifiers(basePatterns, items, snowballAdds);
  return modifiedPatterns.filter((pattern) => pattern.score > 0);
}

function hasAllPatternFamilies(patterns: Pattern[]) {
  let hasHorizontal = false;
  let hasVertical = false;
  let hasDiagonal = false;

  for (const pattern of patterns) {
    if (pattern.type.startsWith("horizontal")) hasHorizontal = true;
    else if (pattern.type.startsWith("vertical")) hasVertical = true;
    else if (pattern.type.startsWith("diagonal")) hasDiagonal = true;
  }

  return hasHorizontal && hasVertical && hasDiagonal;
}

function getAwardedTickets(previousLevel: number, nextLevel: number) {
  if (nextLevel <= previousLevel) {
    return 0;
  }

  return nextLevel - previousLevel;
}

function cloneItems(items: ContractItem[]) {
  return items.map((item) => ({ ...item }));
}

function getDiamondChipBonusUnits(items: ContractItem[]) {
  return items.reduce((sum, item) => {
    if (item.item_id === 2 || item.item_id === 8) return sum + 1;
    if (item.item_id === 26 || item.item_id === 27) return sum + 2;
    if (item.item_id === 35 || item.item_id === 36) return sum + 3;
    return sum;
  }, 0);
}

export function createPracticeRun(runId: number, seed: number, charmLoadout: number[] = []): PracticeRunState {
  const normalizedSeed = toNonZeroSeed(seed);
  const loadoutCharmIds = normalizePracticeLoadout(charmLoadout);
  const market = generateMarketItems(normalizedSeed, [], loadoutCharmIds, [], true);

  return withDerivedState({
    id: runId,
    seed: normalizedSeed,
    rngState: market.nextState,
    level: 1,
    score: 0,
    totalScore: 0,
    threshold: getPracticeLevelThreshold(1),
    risk: getPractice666Probability(1) / 10,
    tickets: DEFAULT_TICKETS,
    spinsRemaining: DEFAULT_SPINS,
    isActive: true,
    grid: [],
    inventoryItems: [],
    marketItems: market.items,
    loadoutCharmIds,
    refreshCount: 0,
    purchasedSlots: [],
    symbolScores: [...DEFAULT_SYMBOL_SCORES],
    diamondChipBonusUnits: 0,
    blocked666: false,
    marketRevision: 0,
    inventoryRevision: 0,
    sessionRevision: 0,
    equippedRelicId: 0,
    relicCooldownRemaining: 0,
    relicUsedThisSession: false,
    pendingRelicEffect: null,
    bibliaPurchaseCount: 0,
    lastSpinPatternCount: 0,
    charmDebtScores: {},
    consecutive666Count: 0,
    snowballHAdd: 0,
    snowballVAdd: 0,
    snowballDAdd: 0,
  });
}

export function spinPracticeRun(state: PracticeRunState): PracticeSpinOutcome {
  if (!state.isActive || state.spinsRemaining <= 0) {
    return {
      nextState: state,
      patterns: [],
      scoreGained: 0,
      is666: false,
      isJackpot: false,
      bibliaUsed: false,
      bibliaDiscarded: false,
      cashOutSucceeded: false,
      cashOutFailed: false,
      previousScore: state.score,
      previousLevel: state.level,
      awardedTickets: 0,
      endedRun: !state.isActive,
      debtCollected: [],
      debtPaid: [],
      debtDefaulted: [],
    };
  }

  const luckyWasActive = state.pendingRelicEffect === RELIC_EFFECT_DOUBLE_NEXT_SPIN;
  const effectiveLuck = getPracticeEffectiveLuck(state);
  const spin = generateSpinGrid(
    state.rngState,
    state.inventoryItems,
    state.level,
    effectiveLuck,
    state.pendingRelicEffect === RELIC_EFFECT_RANDOM_JACKPOT,
  );
  const previousScore = state.score;
  const previousLevel = state.level;
  const inventoryItems = cloneItems(state.inventoryItems);
  let debtScores = { ...state.charmDebtScores };
  const debtCollected: PracticeSpinOutcome["debtCollected"] = [];
  const debtPaid: PracticeSpinOutcome["debtPaid"] = [];
  const debtDefaulted: PracticeSpinOutcome["debtDefaulted"] = [];
  let bibliaUsed = false;
  let bibliaDiscarded = false;
  let is666 = spin.is666;
  const rolled666 = is666;
  let cashOutSucceeded = false;
  let cashOutFailed = false;

  if (is666) {
    const cashOutIndex = inventoryItems.findIndex((item) => item.item_id === CASH_OUT_ITEM_ID);
    if (cashOutIndex >= 0) {
      inventoryItems.splice(cashOutIndex, 1);
      const cashOutRoll = takeRandomInt(spin.nextState, 100);
      cashOutSucceeded = cashOutRoll.value < 50;
      cashOutFailed = !cashOutSucceeded;
      if (cashOutSucceeded) {
        is666 = false;
      }
    } else {
      const bibliaIndex = inventoryItems.findIndex((item) => item.item_id === BIBLIA_ITEM_ID);
      if (bibliaIndex >= 0) {
        bibliaUsed = true;
        const discardRoll = takeRandomInt(spin.nextState, 100);
        bibliaDiscarded = discardRoll.value < 50;
        if (bibliaDiscarded) {
          inventoryItems.splice(bibliaIndex, 1);
        }
        is666 = false;
      }
    }
  }

  const symbolScores = [...state.symbolScores];
  const currentSnowball: SnowballAdds = {
    horizontal: state.snowballHAdd,
    vertical: state.snowballVAdd,
    diagonal: state.snowballDAdd,
  };
  const patterns = getPatternsForGrid(spin.grid, inventoryItems, symbolScores, currentSnowball);
  const baseScoreGained = is666 ? 0 : patterns.reduce((sum, pattern) => sum + pattern.score, 0);
  const scoreGained = luckyWasActive && !is666 ? baseScoreGained * 5 : baseScoreGained;
  const matchCounts = [0, 0, 0, 0, 0];
  const symbolTypeMap: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };
  patterns.forEach((p) => {
    const idx = symbolTypeMap[p.symbolId];
    if (idx !== undefined) matchCounts[idx] += 1;
  });

  // Grow snowball accumulators from this spin's matches (skip on a busted 666 spin),
  // mirroring the on-chain growth via the shared helper.
  let nextSnowballH = state.snowballHAdd;
  let nextSnowballV = state.snowballVAdd;
  let nextSnowballD = state.snowballDAdd;
  if (!is666) {
    const grown = growSnowballAdds(currentSnowball, patterns, inventoryItems);
    nextSnowballH = grown.horizontal;
    nextSnowballV = grown.vertical;
    nextSnowballD = grown.diagonal;
  }

  // Accumulate DirectScoreBonus per pattern hit (only if not 666)
  let updatedScores = symbolScores;
  if (!is666) {
    const bonuses = getDirectScoreBonuses(inventoryItems);
    updatedScores = symbolScores.map((score, i) => score + matchCounts[i] * bonuses[i]);
  }

  let nextState: PracticeRunState = withDerivedState({
    ...state,
    rngState: spin.nextState,
    grid: spin.grid,
    inventoryItems,
    symbolScores: updatedScores,
    spinsRemaining: state.spinsRemaining - 1,
    relicCooldownRemaining: Math.max(0, state.relicCooldownRemaining - 1),
    pendingRelicEffect: luckyWasActive || state.pendingRelicEffect === RELIC_EFFECT_RANDOM_JACKPOT
      ? null
      : state.pendingRelicEffect,
    diamondChipBonusUnits:
      state.diamondChipBonusUnits +
      (is666 ? 0 : matchCounts[1] * getDiamondChipBonusUnits(inventoryItems)),
    lastSpinPatternCount: is666 ? 0 : patterns.length,
    consecutive666Count: is666 ? state.consecutive666Count + 1 : 0,
    snowballHAdd: nextSnowballH,
    snowballVAdd: nextSnowballV,
    snowballDAdd: nextSnowballD,
    charmDebtScores: debtScores,
    sessionRevision: state.sessionRevision + 1,
    inventoryRevision:
      state.inventoryRevision + ((bibliaDiscarded || cashOutSucceeded || cashOutFailed) ? 1 : 0),
  });

  if (is666) {
    nextState = withDerivedState({
      ...nextState,
      score: 0,
      totalScore: 0,
      blocked666: true,
    });
  } else if (rolled666 && bibliaUsed) {
    nextState = withDerivedState({
      ...nextState,
      score: nextState.score + scoreGained,
      totalScore: nextState.totalScore + scoreGained,
      blocked666: true,
    });
  } else {
    nextState = withDerivedState({
      ...nextState,
      score: nextState.score + scoreGained,
      totalScore: nextState.totalScore + scoreGained,
    });
  }

  const allPatternFamiliesHit = !is666 && hasAllPatternFamilies(patterns);
  for (const item of inventoryItems) {
    const config = getDebtCharmConfig(item);
    if (!config) {
      continue;
    }

    const previousStored = debtScores[config.charmId] ?? 0;
    const collectedScore = Math.min(config.collectAmount, nextState.score);
    let storedScore = previousStored;

    if (collectedScore > 0) {
      storedScore += collectedScore;
      nextState = withDerivedState({
        ...nextState,
        score: nextState.score - collectedScore,
      });
      debtScores = {
        ...debtScores,
        [config.charmId]: storedScore,
      };
      debtCollected.push({
        charmId: config.charmId,
        collectedScore,
        storedScore,
        newScore: nextState.score,
        newTotalScore: nextState.totalScore,
      });
    }

    const shouldPay =
      storedScore > 0 &&
      ((config.conditionType === CharmConditionType.Consecutive666 && nextState.consecutive666Count >= 2) ||
        (config.conditionType === CharmConditionType.AllPatternTypesSameSpin && allPatternFamiliesHit));

    if (shouldPay) {
      const payoutScore = storedScore * config.multiplier;
      nextState = withDerivedState({
        ...nextState,
        score: nextState.score + payoutScore,
        totalScore: nextState.totalScore + payoutScore,
      });
      debtScores = {
        ...debtScores,
        [config.charmId]: 0,
      };
      debtPaid.push({
        charmId: config.charmId,
        storedScore,
        multiplier: config.multiplier,
        payoutScore,
        newScore: nextState.score,
        newTotalScore: nextState.totalScore,
      });
    }
  }

  nextState = {
    ...nextState,
    charmDebtScores: debtScores,
  };

  if (cashOutSucceeded) {
    nextState = withDerivedState({
      ...nextState,
      spinsRemaining: 0,
      isActive: false,
    });
  } else if (cashOutFailed) {
    nextState = withDerivedState({
      ...nextState,
      spinsRemaining: Math.ceil(nextState.spinsRemaining / 2),
    });
  }

  while (nextState.score >= getPracticeLevelThreshold(nextState.level)) {
    const leveledState = {
      ...nextState,
      level: nextState.level + 1,
      tickets: nextState.tickets + 1,
      spinsRemaining: DEFAULT_SPINS,
    };
    nextState = withDerivedState(leveledState);
  }

  if (nextState.spinsRemaining <= 0) {
    for (const item of inventoryItems) {
      const config = getDebtCharmConfig(item);
      const storedScore = config ? debtScores[config.charmId] ?? 0 : 0;
      if (config && storedScore > 0) {
        debtDefaulted.push({ charmId: config.charmId, storedScore });
        debtScores = {
          ...debtScores,
          [config.charmId]: 0,
        };
      }
    }
    nextState = {
      ...nextState,
      isActive: false,
      charmDebtScores: debtScores,
    };
  }

  return {
    nextState,
    patterns,
    scoreGained,
    is666,
    isJackpot: spin.isJackpot,
    bibliaUsed,
    bibliaDiscarded,
    cashOutSucceeded,
    cashOutFailed,
    previousScore,
    previousLevel,
    awardedTickets: getAwardedTickets(previousLevel, nextState.level),
    endedRun: !nextState.isActive,
    debtCollected,
    debtPaid,
    debtDefaulted,
  };
}

export function buyPracticeItem(state: PracticeRunState, slotIndex: number): PracticeBuyOutcome | null {
  const item = state.marketItems[slotIndex];
  const purchasePrice = item ? getItemPurchasePrice(item, state.bibliaPurchaseCount) : 0;
  const alreadyPurchased = state.purchasedSlots.includes(slotIndex);
  const alreadyOwned = state.inventoryItems.some((inventoryItem) => inventoryItem.item_id === item?.item_id);
  const isCharm = item ? item.item_id >= CHARM_ITEM_OFFSET : false;
  const inventoryFull = !isCharm && state.inventoryItems.filter((inventoryItem) => inventoryItem.item_id < 1000).length >= INVENTORY_LIMIT;

  if (
    !item ||
    !state.isActive ||
    alreadyPurchased ||
    alreadyOwned ||
    inventoryFull ||
    state.tickets < purchasePrice
  ) {
    return null;
  }

  const purchasedSlots = [...state.purchasedSlots, slotIndex];
  const isSpinConsumable = item.effect_type === ItemEffectType.SpinBonus;
  const charmExtraSpins = getCharmExtraSpinValue(item);
  const inventoryItems = isSpinConsumable ? state.inventoryItems : [...state.inventoryItems, { ...item }];
  let nextState = withDerivedState({
    ...state,
    tickets: state.tickets - purchasePrice,
    inventoryItems,
    purchasedSlots,
    inventoryRevision: state.inventoryRevision + (isSpinConsumable ? 0 : 1),
    marketRevision: state.marketRevision + 1,
    sessionRevision: state.sessionRevision + 1,
    bibliaPurchaseCount:
      state.bibliaPurchaseCount + (item.item_id === BIBLIA_ITEM_ID ? 1 : 0),
  });

  if (isSpinConsumable) {
    nextState = {
      ...nextState,
      spinsRemaining: Math.min(MAX_CURRENT_SPINS, nextState.spinsRemaining + item.effect_value),
    };
  } else if (charmExtraSpins > 0) {
    nextState = {
      ...nextState,
      spinsRemaining: nextState.spinsRemaining + charmExtraSpins,
    };
  }

  return {
    nextState: withDerivedState(nextState),
    purchasedItem: { ...item, price: purchasePrice },
  };
}

export function sellPracticeItem(state: PracticeRunState, itemId: number): PracticeSellOutcome | null {
  const sellIndex = state.inventoryItems.findIndex((item) => item.item_id === itemId);

  if (sellIndex < 0 || !state.isActive) {
    return null;
  }

  const soldItem = state.inventoryItems[sellIndex];
  if (soldItem.effect_type === ItemEffectType.SpinBonus) {
    return null;
  }
  const charmExtraSpins = getCharmExtraSpinValue(soldItem);
  if (charmExtraSpins > 0 && state.spinsRemaining < charmExtraSpins) {
    return null;
  }
  const inventoryItems = state.inventoryItems.filter((_, index) => index !== sellIndex);
  const nextState = withDerivedState({
    ...state,
    tickets: state.tickets + soldItem.sell_price,
    spinsRemaining:
      charmExtraSpins > 0 ? state.spinsRemaining - charmExtraSpins : state.spinsRemaining,
    inventoryItems,
    inventoryRevision: state.inventoryRevision + 1,
    sessionRevision: state.sessionRevision + 1,
  });

  return {
    nextState,
    soldItem: { ...soldItem },
  };
}

export function refreshPracticeMarket(state: PracticeRunState): PracticeRefreshOutcome | null {
  const refreshCost = getPracticeRefreshCost(state.refreshCount);

  if (!state.isActive || state.score < refreshCost) {
    return null;
  }

  const activeCharmIds = state.inventoryItems
    .filter((item) => item.item_id >= CHARM_ITEM_OFFSET)
    .map((item) => item.item_id - CHARM_ITEM_OFFSET);
  const market = generateMarketItems(state.rngState, state.marketItems, state.loadoutCharmIds, activeCharmIds);
  const nextState = withDerivedState({
    ...state,
    rngState: market.nextState,
    score: state.score - refreshCost,
    marketItems: market.items,
    refreshCount: state.refreshCount + 1,
    purchasedSlots: [],
    marketRevision: state.marketRevision + 1,
    sessionRevision: state.sessionRevision + 1,
  });

  return {
    nextState,
  };
}

export function equipPracticeRelic(state: PracticeRunState, relicId: number): PracticeRunState | null {
  if (!state.isActive || state.equippedRelicId !== 0 || !PRACTICE_RELIC_COOLDOWNS[relicId]) {
    return null;
  }

  return withDerivedState({
    ...state,
    equippedRelicId: relicId,
    relicUsedThisSession: false,
    sessionRevision: state.sessionRevision + 1,
  });
}

export function activatePracticeRelic(state: PracticeRunState): PracticeRelicActivationOutcome | null {
  const relicId = state.equippedRelicId;
  const cooldown = PRACTICE_RELIC_COOLDOWNS[relicId];

  if (!state.isActive || relicId === 0 || !cooldown || state.relicCooldownRemaining > 0) {
    return null;
  }
  if (relicId === 1 && state.relicUsedThisSession) {
    return null;
  }

  if (relicId === 1) {
    const nextState = withDerivedState({
      ...state,
      pendingRelicEffect: RELIC_EFFECT_RANDOM_JACKPOT,
      relicCooldownRemaining: cooldown,
      relicUsedThisSession: true,
      sessionRevision: state.sessionRevision + 1,
    });
    return { nextState, relicId, effectType: RELIC_EFFECT_RANDOM_JACKPOT, endedRun: false, refreshedMarket: false };
  }

  if (relicId === 2) {
    const phantomRoll = rollPracticePhantomBonusSpins(state.rngState);
    const nextSpins = Math.min(MAX_CURRENT_SPINS, state.spinsRemaining + phantomRoll.bonusSpins);
    const nextState = withDerivedState({
      ...state,
      rngState: phantomRoll.nextState,
      spinsRemaining: nextSpins,
      relicCooldownRemaining: cooldown,
      pendingRelicEffect: null,
      sessionRevision: state.sessionRevision + 1,
    });
    return {
      nextState,
      relicId,
      effectType: RELIC_EFFECT_RESET_SPINS,
      endedRun: false,
      refreshedMarket: false,
    };
  }

  if (relicId === 3) {
    const nextState = withDerivedState({
      ...state,
      pendingRelicEffect: RELIC_EFFECT_DOUBLE_NEXT_SPIN,
      relicCooldownRemaining: cooldown,
      sessionRevision: state.sessionRevision + 1,
    });
    return { nextState, relicId, effectType: RELIC_EFFECT_DOUBLE_NEXT_SPIN, endedRun: false, refreshedMarket: false };
  }

  if (relicId === 4) {
    const nextState = withDerivedState({
      ...state,
      isActive: false,
      spinsRemaining: 0,
      relicCooldownRemaining: cooldown,
      pendingRelicEffect: null,
      sessionRevision: state.sessionRevision + 1,
    });
    return { nextState, relicId, effectType: 1, endedRun: true, refreshedMarket: false };
  }

  if (relicId === 5) {
    const activeCharmIds = state.inventoryItems
      .filter((item) => item.item_id >= CHARM_ITEM_OFFSET)
      .map((item) => item.item_id - CHARM_ITEM_OFFSET);
    const market = generateMarketItems(state.rngState, state.marketItems, state.loadoutCharmIds, activeCharmIds);
    const nextState = withDerivedState({
      ...state,
      rngState: market.nextState,
      marketItems: market.items,
      purchasedSlots: [],
      refreshCount: state.refreshCount + 1,
      marketRevision: state.marketRevision + 1,
      relicCooldownRemaining: cooldown,
      pendingRelicEffect: null,
      sessionRevision: state.sessionRevision + 1,
    });
    return { nextState, relicId, effectType: RELIC_EFFECT_FREE_MARKET_REFRESH, endedRun: false, refreshedMarket: true };
  }

  return null;
}
