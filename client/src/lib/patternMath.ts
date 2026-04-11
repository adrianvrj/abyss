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

export function applyPatternModifiers(patterns: Pattern[], items: ContractItem[]): Pattern[] {
  const bonuses = getPatternBonusMap(items);
  const retriggers = getPatternRetriggerMap(items);

  return patterns.map((pattern) => {
    const bonus = bonuses[pattern.type] ?? 0;
    const retriggerMultiplier = retriggers[pattern.type] ?? 1;
    const displayScore = Math.floor((pattern.score * (100 + bonus)) / 100);
    const totalScore = displayScore * retriggerMultiplier;

    return {
      ...pattern,
      displayScore,
      score: totalScore,
      retriggerMultiplier: retriggerMultiplier > 1 ? retriggerMultiplier : undefined,
    };
  });
}
