import type { PatternMultiplier, PatternType } from "@/utils/GameConfig";
import type { Pattern } from "@/utils/patternDetector";
import type { ContractItem } from "@/utils/abyssContract";
import { ItemEffectType } from "@/utils/abyssContract";
import { getCharmPatternRetriggerBonuses } from "@/lib/charmRules";

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
