import type { PatternMultiplier, PatternType } from "@/utils/GameConfig";
import type { Pattern } from "@/utils/patternDetector";
import type { ContractItem } from "@/utils/abyssContract";
import { ItemEffectType } from "@/utils/abyssContract";
import {
  getCharmPatternRetriggerBonuses,
  getSnowballConfig,
  SnowballPatternType,
} from "@/lib/charmRules";

type PatternBonusMap = Record<PatternType, number>;
type PatternRetriggerMap = Record<PatternType, number>;

const EMPTY_PATTERN_BONUSES: PatternBonusMap = {
  "horizontal-3": 0,
  "horizontal-4": 0,
  "horizontal-5": 0,
  "vertical-3": 0,
  "diagonal-3": 0,
  jackpot: 0,
};

export function normalizePatternTarget(value: string | undefined | null) {
  if (!value) {
    return "";
  }

  const normalized = value
    .replace(/\u0000/g, "")
    .trim()
    .toLowerCase();

  if (
    normalized.length === 0 ||
    normalized === "0" ||
    normalized === "all" ||
    normalized === "any"
  ) {
    return "";
  }

  return normalized;
}

export function getPatternBonusMap(items: ContractItem[]): PatternBonusMap {
  const bonuses: PatternBonusMap = { ...EMPTY_PATTERN_BONUSES };

  items.forEach((item) => {
    if (item.effect_type !== ItemEffectType.PatternMultiplierBoost) {
      return;
    }

    const target = normalizePatternTarget(item.target_symbol);

    if (!target) {
      bonuses["horizontal-3"] += item.effect_value;
      bonuses["horizontal-4"] += item.effect_value;
      bonuses["horizontal-5"] += item.effect_value;
      bonuses["vertical-3"] += item.effect_value;
      bonuses["diagonal-3"] += item.effect_value;
      bonuses.jackpot += item.effect_value;
      return;
    }

    if (target === "horizontal-3") {
      bonuses["horizontal-3"] += item.effect_value;
    } else if (target === "horizontal-4") {
      bonuses["horizontal-4"] += item.effect_value;
    } else if (target === "horizontal-5") {
      bonuses["horizontal-5"] += item.effect_value;
    } else if (target === "vertical" || target === "vertical-3") {
      bonuses["vertical-3"] += item.effect_value;
    } else if (target === "diagonal" || target === "diagonal-3") {
      bonuses["diagonal-3"] += item.effect_value;
    } else if (target === "jackpot") {
      bonuses.jackpot += item.effect_value;
    }
  });

  return bonuses;
}

export function getPatternRetriggerMap(items: ContractItem[]): PatternRetriggerMap {
  const retriggers = getCharmPatternRetriggerBonuses(
    items.map((item) => item.charmInfo?.metadata),
  );

  return {
    "horizontal-3": retriggers.horizontal,
    "horizontal-4": retriggers.horizontal,
    "horizontal-5": retriggers.horizontal,
    "vertical-3": retriggers.vertical,
    "diagonal-3": retriggers.diagonal,
    jackpot: retriggers.jackpot,
  };
}

export function getBoostedPatternMultiplier(
  pattern: PatternMultiplier,
  bonuses: PatternBonusMap,
  retriggers: PatternRetriggerMap,
) {
  return pattern.multiplier * (1 + bonuses[pattern.type] / 100) * retriggers[pattern.type];
}

/** Snowball flat multiplier adds, in hundredths (matches on-chain Session fields). */
export interface SnowballAdds {
  horizontal: number;
  vertical: number;
  diagonal: number;
}

export const EMPTY_SNOWBALL_ADDS: SnowballAdds = {
  horizontal: 0,
  vertical: 0,
  diagonal: 0,
};

// Pure pattern multiplier per type, in hundredths (config multiplier * 100).
// The snowball add is literal on this base, so a +8 accumulator raises the
// effective multiplier by exactly +0.08x. Snowball only affects the 3-in-a-row
// patterns (matches on-chain, which leaves 4/5-in-a-row and jackpot untouched).
export const SNOWBALL_BASE_MULT_HUNDREDTHS: Partial<Record<PatternType, number>> = {
  "horizontal-3": 150,
  "vertical-3": 200,
  "diagonal-3": 250,
};

export function snowballAddForType(type: PatternType, adds: SnowballAdds): number {
  if (type === "horizontal-3") return adds.horizontal;
  if (type === "vertical-3") return adds.vertical;
  if (type === "diagonal-3") return adds.diagonal;
  return 0;
}

// Maps grid symbol id (1=seven..5=lemon) to the snowball match-count index.
const SNOWBALL_SYMBOL_INDEX: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };

/**
 * Advance snowball accumulators from a spin's matched patterns, mirroring the
 * on-chain `grow_snowball_stacks` logic: each snowball charm adds
 * `increment * (matched patterns of its trigger symbol)` to its target pattern
 * type. `patterns` must be this spin's scored patterns (skip on a busted 666).
 */
export function growSnowballAdds(
  current: SnowballAdds,
  patterns: Pattern[],
  items: ContractItem[],
): SnowballAdds {
  const matchCounts = [0, 0, 0, 0, 0];
  patterns.forEach((p) => {
    const idx = SNOWBALL_SYMBOL_INDEX[p.symbolId];
    if (idx !== undefined) matchCounts[idx] += 1;
  });

  let { horizontal, vertical, diagonal } = current;
  for (const item of items) {
    const config = getSnowballConfig(item.charmInfo?.metadata);
    if (!config) continue;
    const symbolIndex = SNOWBALL_SYMBOL_INDEX[config.symbol];
    if (symbolIndex === undefined) continue;
    const growth = config.increment * matchCounts[symbolIndex];
    if (growth === 0) continue;
    if (config.target === SnowballPatternType.Horizontal) horizontal += growth;
    else if (config.target === SnowballPatternType.Vertical) vertical += growth;
    else if (config.target === SnowballPatternType.Diagonal) diagonal += growth;
  }

  return { horizontal, vertical, diagonal };
}

export function applyPatternModifiers(
  patterns: Pattern[],
  items: ContractItem[],
  snowballAdds: SnowballAdds = EMPTY_SNOWBALL_ADDS,
): Pattern[] {
  const bonuses = getPatternBonusMap(items);
  const retriggers = getPatternRetriggerMap(items);

  return patterns.map((pattern) => {
    const bonus = bonuses[pattern.type] ?? 0;
    const retriggerMultiplier = retriggers[pattern.type] ?? 1;

    // Snowball: raise the base multiplier by a flat amount before the % bonus.
    const add = snowballAddForType(pattern.type, snowballAdds);
    const baseMult = SNOWBALL_BASE_MULT_HUNDREDTHS[pattern.type];
    const snowballScore =
      add > 0 && baseMult
        ? Math.floor((pattern.score * (baseMult + add)) / baseMult)
        : pattern.score;

    const displayScore = Math.floor((snowballScore * (100 + bonus)) / 100);
    const totalScore = displayScore * retriggerMultiplier;

    return {
      ...pattern,
      displayScore,
      score: totalScore,
      retriggerMultiplier: retriggerMultiplier > 1 ? retriggerMultiplier : undefined,
    };
  });
}
