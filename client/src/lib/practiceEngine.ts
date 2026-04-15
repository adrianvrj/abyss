import { STATIC_ITEM_DEFINITIONS } from "@/lib/itemCatalog";
import { applyPatternModifiers } from "@/lib/patternMath";
import { ContractItem, ItemEffectType } from "@/utils/abyssContract";
import { DEFAULT_GAME_CONFIG } from "@/utils/GameConfig";
import { getItemImage } from "@/utils/itemImages";
import { Pattern, detectPatterns } from "@/utils/patternDetector";

const DEFAULT_SYMBOL_SCORES = [7, 5, 4, 3, 2];
const DEFAULT_SPINS = 5;
const DEFAULT_TICKETS = 6;
const BIBLIA_ITEM_ID = 40;
const MARKET_SLOT_COUNT = 6;
const INVENTORY_LIMIT = 7;
const MAX_ITEM_ID = 40;

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
  blocked666: boolean;
  marketRevision: number;
  inventoryRevision: number;
  sessionRevision: number;
}

export interface PracticeSpinOutcome {
  nextState: PracticeRunState;
  patterns: Pattern[];
  scoreGained: number;
  is666: boolean;
  isJackpot: boolean;
  bibliaUsed: boolean;
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

      return bonuses;
    },
    [0, 0, 0, 0, 0],
  );
}

function getSpinBonus(items: ContractItem[]) {
  return items.reduce((total, item) => {
    if (item.effect_type !== ItemEffectType.SpinBonus) {
      return total;
    }
    return total + item.effect_value;
  }, 0);
}

function buildWeightedSymbols(items: ContractItem[]) {
  const bonuses = getProbabilityBonuses(items);
  return [
    10 + bonuses[0],
    15 + bonuses[1],
    20 + bonuses[2],
    25 + bonuses[3],
    30 + bonuses[4],
  ];
}

function generateMarketItems(rngState: number) {
  let nextState = rngState;
  const pickedIds = new Set<number>();

  while (pickedIds.size < MARKET_SLOT_COUNT) {
    const next = takeRandomInt(nextState, MAX_ITEM_ID);
    nextState = next.nextState;
    pickedIds.add(next.value + 1);
  }

  return {
    nextState,
    items: Array.from(pickedIds).map((itemId) => buildPracticeItem(itemId)),
  };
}

function generateSpinGrid(
  rngState: number,
  items: ContractItem[],
  level: number,
) {
  const weights = buildWeightedSymbols(items);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let nextState = rngState;
  const grid: number[] = [];
  let isJackpot = true;
  let firstSymbol = 0;

  for (let index = 0; index < 15; index += 1) {
    const roll = takeRandomInt(nextState, totalWeight);
    nextState = roll.nextState;
    const symbolRoll = roll.value;

    let threshold = weights[0];
    let symbol = 1;
    while (symbol < 5 && symbolRoll >= threshold) {
      symbol += 1;
      threshold += weights[symbol - 1];
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

export function createPracticeRun(runId: number, seed: number): PracticeRunState {
  const normalizedSeed = toNonZeroSeed(seed);
  const market = generateMarketItems(normalizedSeed);

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
    blocked666: false,
    marketRevision: 0,
    inventoryRevision: 0,
    sessionRevision: 0,
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
      previousScore: state.score,
      previousLevel: state.level,
      awardedTickets: 0,
      endedRun: !state.isActive,
    };
  }

  const spin = generateSpinGrid(state.rngState, state.inventoryItems, state.level);
  const previousScore = state.score;
  const previousLevel = state.level;
  const inventoryItems = cloneItems(state.inventoryItems);
  let bibliaUsed = false;
  let is666 = spin.is666;

  if (is666) {
    const bibliaIndex = inventoryItems.findIndex((item) => item.item_id === BIBLIA_ITEM_ID);
    if (bibliaIndex >= 0) {
      inventoryItems.splice(bibliaIndex, 1);
      bibliaUsed = true;
      is666 = false;
    }
  }

  const symbolScores = [...state.symbolScores];
  const patterns = getPatternsForGrid(spin.grid, inventoryItems, symbolScores);
  const scoreGained = is666 ? 0 : patterns.reduce((sum, pattern) => sum + pattern.score, 0);

  // Accumulate DirectScoreBonus per pattern hit (only if not 666)
  let updatedScores = symbolScores;
  if (!is666) {
    const matchCounts = [0, 0, 0, 0, 0]; // seven, diamond, cherry, coin, lemon
    const symbolTypeMap: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };
    patterns.forEach((p) => {
      const idx = symbolTypeMap[p.symbolId];
      if (idx !== undefined) matchCounts[idx] += 1;
    });
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
    sessionRevision: state.sessionRevision + 1,
    inventoryRevision: state.inventoryRevision + (bibliaUsed ? 1 : 0),
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

  while (nextState.score >= getPracticeLevelThreshold(nextState.level)) {
    const leveledState = {
      ...nextState,
      level: nextState.level + 1,
      tickets: nextState.tickets + 1,
      spinsRemaining: DEFAULT_SPINS + getSpinBonus(nextState.inventoryItems),
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
    previousScore,
    previousLevel,
    awardedTickets: getAwardedTickets(previousLevel, nextState.level),
    endedRun: !nextState.isActive,
  };
}

export function buyPracticeItem(state: PracticeRunState, slotIndex: number): PracticeBuyOutcome | null {
  const item = state.marketItems[slotIndex];
  const alreadyPurchased = state.purchasedSlots.includes(slotIndex);
  const alreadyOwned = state.inventoryItems.some((inventoryItem) => inventoryItem.item_id === item?.item_id);
  const inventoryFull = state.inventoryItems.length >= INVENTORY_LIMIT;

  if (
    !item ||
    !state.isActive ||
    alreadyPurchased ||
    alreadyOwned ||
    inventoryFull ||
    state.tickets < item.price
  ) {
    return null;
  }

  const inventoryItems = [...state.inventoryItems, { ...item }];
  const purchasedSlots = [...state.purchasedSlots, slotIndex];
  let nextState = withDerivedState({
    ...state,
    tickets: state.tickets - item.price,
    inventoryItems,
    purchasedSlots,
    inventoryRevision: state.inventoryRevision + 1,
    marketRevision: state.marketRevision + 1,
    sessionRevision: state.sessionRevision + 1,
  });

  if (item.effect_type === ItemEffectType.SpinBonus) {
    nextState = {
      ...nextState,
      spinsRemaining: nextState.spinsRemaining + item.effect_value,
    };
  }

  return {
    nextState: withDerivedState(nextState),
    purchasedItem: { ...item },
  };
}

export function sellPracticeItem(state: PracticeRunState, itemId: number): PracticeSellOutcome | null {
  const sellIndex = state.inventoryItems.findIndex((item) => item.item_id === itemId);

  if (sellIndex < 0 || !state.isActive) {
    return null;
  }

  const soldItem = state.inventoryItems[sellIndex];
  const inventoryItems = state.inventoryItems.filter((_, index) => index !== sellIndex);
  const nextState = withDerivedState({
    ...state,
    tickets: state.tickets + soldItem.sell_price,
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

  const market = generateMarketItems(state.rngState);
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
