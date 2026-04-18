import { STATIC_ITEM_DEFINITIONS } from "@/lib/itemCatalog";
import { getStaticCharmDefinition } from "@/lib/charmCatalog";
import {
  getCharmLuckEntries,
  mergeCharmDisplayData,
  type CharmContractMetadata,
  type CharmLuckContext,
} from "@/lib/charmRules";
import { applyPatternModifiers } from "@/lib/patternMath";
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
const MAX_CHARM_ID = 20;
const PRACTICE_CHARM_APPEAR_CHANCE = 10;
const RELIC_EFFECT_RANDOM_JACKPOT = 0;
const RELIC_EFFECT_DOUBLE_NEXT_SPIN = 2;
const RELIC_EFFECT_RESET_SPINS = 3;
const RELIC_EFFECT_FREE_MARKET_REFRESH = 4;

const PRACTICE_RELIC_COOLDOWNS: Record<number, number> = {
  1: 13,
  2: 10,
  3: 9,
  4: 9,
  5: 9,
};

const PRACTICE_CHARM_METADATA: Record<number, CharmContractMetadata> = {
  1: { charmId: 1, name: "Whisper Stone", description: "Luck +3", effectType: 7, effectValue: 3, effectValue2: 0, conditionType: 0, rarity: 0, shopCost: 1 },
  2: { charmId: 2, name: "Faded Coin", description: "Luck +4", effectType: 7, effectValue: 4, effectValue2: 0, conditionType: 0, rarity: 0, shopCost: 1 },
  3: { charmId: 3, name: "Broken Mirror", description: "No pat +5", effectType: 10, effectValue: 5, effectValue2: 0, conditionType: 1, rarity: 0, shopCost: 1 },
  4: { charmId: 4, name: "Dusty Hourglass", description: "Low spins +8", effectType: 10, effectValue: 8, effectValue2: 0, conditionType: 2, rarity: 0, shopCost: 1 },
  5: { charmId: 5, name: "Cracked Skull", description: "Luck +5", effectType: 7, effectValue: 5, effectValue2: 0, conditionType: 0, rarity: 0, shopCost: 1 },
  6: { charmId: 6, name: "Rusty Key", description: "Per item +3", effectType: 10, effectValue: 3, effectValue2: 0, conditionType: 3, rarity: 0, shopCost: 1 },
  7: { charmId: 7, name: "Moth Wing", description: "Luck +6", effectType: 7, effectValue: 6, effectValue2: 0, conditionType: 0, rarity: 0, shopCost: 1 },
  8: { charmId: 8, name: "Bone Dice", description: "Low score +8", effectType: 10, effectValue: 8, effectValue2: 0, conditionType: 4, rarity: 0, shopCost: 1 },
  9: { charmId: 9, name: "Soul Fragment", description: "Luck +10", effectType: 7, effectValue: 10, effectValue2: 0, conditionType: 0, rarity: 1, shopCost: 2 },
  10: { charmId: 10, name: "Cursed Pendant", description: "H3 x2", effectType: 8, effectValue: 2, effectValue2: 1, conditionType: 0, rarity: 1, shopCost: 2 },
  11: { charmId: 11, name: "Shadow Lantern", description: "+8 base, lvl5 +8", effectType: 7, effectValue: 8, effectValue2: 8, conditionType: 5, rarity: 1, shopCost: 2 },
  12: { charmId: 12, name: "Ethereal Chain", description: "Pattern +6", effectType: 10, effectValue: 6, effectValue2: 0, conditionType: 0, rarity: 1, shopCost: 2 },
  13: { charmId: 13, name: "Void Compass", description: "+1 spin +15", effectType: 9, effectValue: 1, effectValue2: 15, conditionType: 0, rarity: 1, shopCost: 3 },
  14: { charmId: 14, name: "Demon's Tooth", description: "Diag x2", effectType: 8, effectValue: 2, effectValue2: 3, conditionType: 0, rarity: 1, shopCost: 3 },
  15: { charmId: 15, name: "Abyssal Eye", description: "Luck +20", effectType: 7, effectValue: 20, effectValue2: 0, conditionType: 0, rarity: 2, shopCost: 4 },
  16: { charmId: 16, name: "Phoenix Feather", description: "+2 spin +10", effectType: 9, effectValue: 2, effectValue2: 10, conditionType: 0, rarity: 2, shopCost: 4 },
  17: { charmId: 17, name: "Reaper's Mark", description: "NoJP x2", effectType: 8, effectValue: 2, effectValue2: 0, conditionType: 0, rarity: 2, shopCost: 5 },
  18: { charmId: 18, name: "Chaos Orb", description: "Block666 +80", effectType: 10, effectValue: 80, effectValue2: 0, conditionType: 6, rarity: 2, shopCost: 5 },
  19: { charmId: 19, name: "Soul Abyss", description: "Luck +30", effectType: 7, effectValue: 30, effectValue2: 0, conditionType: 0, rarity: 2, shopCost: 6 },
  20: { charmId: 20, name: "Void Heart", description: "+1 spin +50", effectType: 9, effectValue: 1, effectValue2: 50, conditionType: 0, rarity: 2, shopCost: 7 },
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
  pendingRelicEffect: number | null;
  bibliaPurchaseCount: number;
  lastSpinPatternCount: number;
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

function buildPracticeCharmItem(charmId: number): ContractItem {
  const metadata = PRACTICE_CHARM_METADATA[charmId];
  const staticDefinition = getStaticCharmDefinition(charmId);
  const charmInfo = mergeCharmDisplayData({
    charmId,
    staticDefinition,
    apiMetadata: null,
    metadata,
  });

  if (!charmInfo) {
    return {
      item_id: 1000 + charmId,
      name: `Charm #${charmId}`,
      description: "",
      price: 0,
      sell_price: 0,
      effect_type: ItemEffectType.CharmEffect,
      effect_value: 0,
      target_symbol: "",
    };
  }

  return {
    item_id: 1000 + charmId,
    name: charmInfo.name,
    description: charmInfo.description,
    price: charmInfo.shop_cost,
    sell_price: Math.floor(charmInfo.shop_cost / 2),
    effect_type: ItemEffectType.CharmEffect,
    effect_value: charmInfo.luck,
    target_symbol: `${charmInfo.rarity}|||${charmInfo.effect}`,
    image: charmInfo.image,
    charmInfo,
  };
}

function getCharmMetadataFromItem(item: ContractItem) {
  return item.charmInfo?.metadata ?? null;
}

function getCharmExtraSpinValue(item: ContractItem) {
  const metadata = getCharmMetadataFromItem(item);
  return metadata?.effectType === 9 ? metadata.effectValue : 0;
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

function getItemPurchasePrice(item: ContractItem, bibliaPurchaseCount: number) {
  if (item.item_id === BIBLIA_ITEM_ID) {
    return item.price + bibliaPurchaseCount;
  }

  return item.price;
}

export function getPracticeLevelThreshold(level: number) {
  if (level <= 1) return 66;
  if (level === 2) return 222;
  if (level === 3) return 333;
  if (level === 4) return 666;
  if (level === 5) return 1500;
  if (level === 6) return 3500;
  if (level === 7) return 7000;
  if (level === 8) return 12000;
  if (level === 9) return 20000;
  if (level === 10) return 30000;
  return 40000 + ((level - 10) * 20000);
}

export function getPractice666Probability(level: number) {
  if (level <= 2) {
    return 0;
  }
  return (level - 2) * 20;
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
  inventoryItems: ContractItem[] = [],
) {
  let nextState = rngState;
  const pickedIds = new Set<number>();
  const excludedIds = new Set<number>(previousItems.map((item) => item.item_id));
  const ownedCharmIds = new Set(
    inventoryItems
      .filter((item) => item.item_id >= 1000)
      .map((item) => item.item_id - 1000),
  );
  let attempts = 0;

  while (pickedIds.size < MARKET_SLOT_COUNT && attempts < 200) {
    let itemId = 0;
    const charmRoll = takeRandomInt(nextState, 100);
    nextState = charmRoll.nextState;

    if (charmRoll.value < PRACTICE_CHARM_APPEAR_CHANCE) {
      const availableCharmIds = Array.from(
        { length: MAX_CHARM_ID },
        (_, index) => index + 1,
      ).filter(
        (charmId) =>
          !ownedCharmIds.has(charmId) &&
          !excludedIds.has(1000 + charmId) &&
          !pickedIds.has(1000 + charmId),
      );

      if (availableCharmIds.length > 0) {
        const charmPick = takeRandomInt(nextState, availableCharmIds.length);
        nextState = charmPick.nextState;
        itemId = 1000 + availableCharmIds[charmPick.value];
      }
    }

    if (itemId === 0) {
      const next = takeRandomInt(nextState, MAX_ITEM_ID);
      nextState = next.nextState;
      itemId = next.value + 1;
    }

    if (!excludedIds.has(itemId) && !pickedIds.has(itemId)) {
      pickedIds.add(itemId);
    }
    attempts += 1;
  }

  if (pickedIds.size < MARKET_SLOT_COUNT) {
    for (
      let charmId = 1;
      charmId <= MAX_CHARM_ID && pickedIds.size < MARKET_SLOT_COUNT;
      charmId += 1
    ) {
      const charmItemId = 1000 + charmId;
      if (
        !ownedCharmIds.has(charmId) &&
        !excludedIds.has(charmItemId) &&
        !pickedIds.has(charmItemId)
      ) {
        pickedIds.add(charmItemId);
      }
    }

    for (let itemId = 1; itemId <= MAX_ITEM_ID && pickedIds.size < MARKET_SLOT_COUNT; itemId += 1) {
      if (!excludedIds.has(itemId) && !pickedIds.has(itemId)) {
        pickedIds.add(itemId);
      }
    }
  }

  return {
    nextState,
    items: Array.from(pickedIds).map((itemId) =>
      itemId >= 1000 ? buildPracticeCharmItem(itemId - 1000) : buildPracticeItem(itemId),
    ),
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
  const luckBiasThreshold = Math.min(luck, 50) * 100;

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

function getPatternsForGrid(grid: number[], items: ContractItem[], symbolScores: number[]) {
  const basePatterns = detectPatterns(grid, DEFAULT_GAME_CONFIG, undefined, symbolScores);
  const modifiedPatterns = applyPatternModifiers(basePatterns, items);
  return modifiedPatterns.filter((pattern) => pattern.score > 0);
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

export function createPracticeRun(runId: number, seed: number): PracticeRunState {
  const normalizedSeed = toNonZeroSeed(seed);
  const market = generateMarketItems(normalizedSeed, [], []);

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
    pendingRelicEffect: null,
    bibliaPurchaseCount: 0,
    lastSpinPatternCount: 0,
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
  let bibliaUsed = false;
  let bibliaDiscarded = false;
  let is666 = spin.is666;
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
  const patterns = getPatternsForGrid(spin.grid, inventoryItems, symbolScores);
  const baseScoreGained = is666 ? 0 : patterns.reduce((sum, pattern) => sum + pattern.score, 0);
  const scoreGained = luckyWasActive && !is666 ? baseScoreGained * 5 : baseScoreGained;
  const matchCounts = [0, 0, 0, 0, 0];
  const symbolTypeMap: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };
  patterns.forEach((p) => {
    const idx = symbolTypeMap[p.symbolId];
    if (idx !== undefined) matchCounts[idx] += 1;
  });

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
  } else {
    nextState = withDerivedState({
      ...nextState,
      score: nextState.score + scoreGained,
      totalScore: nextState.totalScore + scoreGained,
    });
  }

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
    nextState = {
      ...nextState,
      isActive: false,
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
  };
}

export function buyPracticeItem(state: PracticeRunState, slotIndex: number): PracticeBuyOutcome | null {
  const item = state.marketItems[slotIndex];
  const purchasePrice = item ? getItemPurchasePrice(item, state.bibliaPurchaseCount) : 0;
  const alreadyPurchased = state.purchasedSlots.includes(slotIndex);
  const alreadyOwned = state.inventoryItems.some((inventoryItem) => inventoryItem.item_id === item?.item_id);
  const inventoryFull = state.inventoryItems.filter((inventoryItem) => inventoryItem.item_id < 1000).length >= INVENTORY_LIMIT;

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

  const market = generateMarketItems(state.rngState, state.marketItems, state.inventoryItems);
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
    sessionRevision: state.sessionRevision + 1,
  });
}

export function activatePracticeRelic(state: PracticeRunState): PracticeRelicActivationOutcome | null {
  const relicId = state.equippedRelicId;
  const cooldown = PRACTICE_RELIC_COOLDOWNS[relicId];

  if (!state.isActive || relicId === 0 || !cooldown || state.relicCooldownRemaining > 0) {
    return null;
  }

  if (relicId === 1) {
    const nextState = withDerivedState({
      ...state,
      pendingRelicEffect: RELIC_EFFECT_RANDOM_JACKPOT,
      relicCooldownRemaining: cooldown,
      sessionRevision: state.sessionRevision + 1,
    });
    return { nextState, relicId, effectType: RELIC_EFFECT_RANDOM_JACKPOT, endedRun: false, refreshedMarket: false };
  }

  if (relicId === 2) {
    const nextState = withDerivedState({
      ...state,
      spinsRemaining: DEFAULT_SPINS,
      relicCooldownRemaining: cooldown,
      pendingRelicEffect: null,
      sessionRevision: state.sessionRevision + 1,
    });
    return { nextState, relicId, effectType: RELIC_EFFECT_RESET_SPINS, endedRun: false, refreshedMarket: false };
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
    const market = generateMarketItems(state.rngState, state.marketItems, state.inventoryItems);
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
