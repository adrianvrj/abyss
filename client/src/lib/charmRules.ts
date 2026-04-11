import type { StaticCharmDefinition } from "@/lib/charmCatalog";

export enum CharmEffectType {
  LuckBoost = 7,
  PatternRetrigger = 8,
  ExtraSpinWithLuck = 9,
  ConditionalLuckBoost = 10,
}

export enum CharmConditionType {
  None = 0,
  NoPatternLastSpin = 1,
  LowSpinsRemaining = 2,
  PerItemInInventory = 3,
  LowScore = 4,
  HighLevel = 5,
  Blocked666 = 6,
}

export interface CharmContractMetadata {
  charmId: number;
  name: string;
  description: string;
  effectType: number;
  effectValue: number;
  effectValue2: number;
  conditionType: number;
  rarity: number;
  shopCost: number;
}

export interface CharmApiMetadata {
  name?: string;
  description?: string;
  image?: string;
  background_color?: string;
  effect?: string;
  luck?: number;
  shopCost?: number;
  rarity?: string;
}

export interface ResolvedCharmData {
  charm_id: number;
  name: string;
  description: string;
  rarity: string;
  effect: string;
  luck: number;
  shop_cost: number;
  image: string;
  background_color: string;
  metadata: CharmContractMetadata | null;
}

export interface CharmLuckContext {
  level: number;
  score: number;
  spinsRemaining: number;
  lastSpinPatternCount: number;
  inventoryCount: number;
  blocked666: boolean;
}

export interface CharmLuckEntry {
  label: string;
  value: number;
}

export interface CharmPatternRetriggerBonuses {
  horizontal: number;
  vertical: number;
  diagonal: number;
  jackpot: number;
}

function pluralize(value: number, singular: string, plural = `${singular}s`) {
  return value === 1 ? singular : plural;
}

function formatPositiveLuck(value: number) {
  return `+${value} Luck`;
}

export function getCharmRarityLabel(rarity: number) {
  switch (rarity) {
    case 0:
      return "Common";
    case 1:
      return "Rare";
    case 2:
      return "Epic";
    case 3:
      return "Legendary";
    default:
      return "Unknown";
  }
}

export function getDisplayedCharmLuck(metadata: CharmContractMetadata | null) {
  if (!metadata) {
    return 0;
  }

  if (metadata.effectType === CharmEffectType.LuckBoost) {
    return metadata.effectValue;
  }

  if (metadata.effectType === CharmEffectType.ExtraSpinWithLuck) {
    return metadata.effectValue2;
  }

  if (metadata.effectType === CharmEffectType.ConditionalLuckBoost) {
    return metadata.effectValue;
  }

  return 0;
}

export function describeCharmEffect(metadata: CharmContractMetadata | null) {
  if (!metadata) {
    return "";
  }

  if (metadata.charmId === 19) {
    return `${formatPositiveLuck(metadata.effectValue)}, jackpot patterns trigger twice`;
  }

  if (metadata.effectType === CharmEffectType.LuckBoost) {
    if (
      metadata.conditionType === CharmConditionType.HighLevel &&
      metadata.effectValue2 > 0
    ) {
      return `${formatPositiveLuck(metadata.effectValue)}, +${metadata.effectValue2} more at level 5+`;
    }

    return formatPositiveLuck(metadata.effectValue);
  }

  if (metadata.effectType === CharmEffectType.PatternRetrigger) {
    if (metadata.effectValue2 === 0) {
      return `All patterns trigger x${metadata.effectValue}`;
    }

    if (metadata.effectValue2 === 1) {
      return `Horizontal patterns trigger x${metadata.effectValue}`;
    }

    if (metadata.effectValue2 === 3) {
      return `Diagonal patterns trigger x${metadata.effectValue}`;
    }

    if (metadata.effectValue2 === 5) {
      return `Jackpot patterns trigger x${metadata.effectValue}`;
    }
  }

  if (metadata.effectType === CharmEffectType.ExtraSpinWithLuck) {
    return `+${metadata.effectValue} ${pluralize(metadata.effectValue, "spin")} and ${formatPositiveLuck(metadata.effectValue2)}`;
  }

  if (metadata.charmId === 12) {
    return `${formatPositiveLuck(metadata.effectValue)} per pattern in last spin`;
  }

  switch (metadata.conditionType) {
    case CharmConditionType.NoPatternLastSpin:
      return `${formatPositiveLuck(metadata.effectValue)} if last spin had no patterns`;
    case CharmConditionType.LowSpinsRemaining:
      return `${formatPositiveLuck(metadata.effectValue)} if spins remaining <= 2`;
    case CharmConditionType.PerItemInInventory:
      return `${formatPositiveLuck(metadata.effectValue)} per item in inventory`;
    case CharmConditionType.LowScore:
      return `${formatPositiveLuck(metadata.effectValue)} if score < 100`;
    case CharmConditionType.HighLevel:
      return metadata.effectValue2 > 0
        ? `${formatPositiveLuck(metadata.effectValue)}, +${metadata.effectValue2} more at level 5+`
        : `${formatPositiveLuck(metadata.effectValue)} at level 5+`;
    case CharmConditionType.Blocked666:
      return `${formatPositiveLuck(metadata.effectValue)} if 666 was blocked this session`;
    default:
      return formatPositiveLuck(metadata.effectValue);
  }
}

export function getCharmLuckEntries(
  metadata: CharmContractMetadata | null,
  context: CharmLuckContext,
) {
  if (!metadata) {
    return [] as CharmLuckEntry[];
  }

  const entries: CharmLuckEntry[] = [];

  if (metadata.effectType === CharmEffectType.LuckBoost && metadata.effectValue > 0) {
    entries.push({ label: "Base", value: metadata.effectValue });
  } else if (
    metadata.effectType === CharmEffectType.ExtraSpinWithLuck &&
    metadata.effectValue2 > 0
  ) {
    entries.push({ label: "Base", value: metadata.effectValue2 });
  }

  if (metadata.charmId === 12 && context.lastSpinPatternCount > 0) {
    entries.push({
      label: "Last Spin Patterns",
      value: context.lastSpinPatternCount * metadata.effectValue,
    });
  }

  switch (metadata.conditionType) {
    case CharmConditionType.NoPatternLastSpin:
      if (context.lastSpinPatternCount === 0 && metadata.effectValue > 0) {
        entries.push({ label: "No Pattern Last Spin", value: metadata.effectValue });
      }
      break;
    case CharmConditionType.LowSpinsRemaining:
      if (context.spinsRemaining <= 2 && metadata.effectValue > 0) {
        entries.push({ label: "Low Spins Remaining", value: metadata.effectValue });
      }
      break;
    case CharmConditionType.PerItemInInventory:
      if (context.inventoryCount > 0 && metadata.effectValue > 0) {
        entries.push({
          label: "Items in Inventory",
          value: context.inventoryCount * metadata.effectValue,
        });
      }
      break;
    case CharmConditionType.LowScore:
      if (context.score < 100 && metadata.effectValue > 0) {
        entries.push({ label: "Low Score", value: metadata.effectValue });
      }
      break;
    case CharmConditionType.HighLevel: {
      const conditionalValue =
        metadata.effectValue2 > 0 ? metadata.effectValue2 : metadata.effectValue;
      if (context.level >= 5 && conditionalValue > 0) {
        entries.push({ label: "Level 5+", value: conditionalValue });
      }
      break;
    }
    case CharmConditionType.Blocked666:
      if (context.blocked666 && metadata.effectValue > 0) {
        entries.push({ label: "Blocked 666", value: metadata.effectValue });
      }
      break;
    default:
      break;
  }

  return entries;
}

export function getCharmPatternRetriggerBonuses(
  metadataList: Array<CharmContractMetadata | null | undefined>,
): CharmPatternRetriggerBonuses {
  let horizontal = 1;
  let diagonal = 1;
  let all = 1;
  let jackpot = 1;

  for (const metadata of metadataList) {
    if (!metadata) {
      continue;
    }

    if (metadata.charmId === 19) {
      jackpot = 2;
    }

    if (metadata.effectType !== CharmEffectType.PatternRetrigger) {
      continue;
    }

    if (metadata.effectValue2 === 0) {
      all = metadata.effectValue;
    } else if (metadata.effectValue2 === 1) {
      horizontal = metadata.effectValue;
    } else if (metadata.effectValue2 === 3) {
      diagonal = metadata.effectValue;
    } else if (metadata.effectValue2 === 5) {
      jackpot = metadata.effectValue;
    }
  }

  if (all > 1) {
    horizontal = Math.max(horizontal, all);
    diagonal = Math.max(diagonal, all);
    jackpot = Math.max(jackpot, all);
  }

  return {
    horizontal,
    vertical: all,
    diagonal,
    jackpot,
  };
}

export function mergeCharmDisplayData({
  charmId,
  staticDefinition,
  apiMetadata,
  metadata,
}: {
  charmId: number;
  staticDefinition: StaticCharmDefinition | null;
  apiMetadata: CharmApiMetadata | null;
  metadata: CharmContractMetadata | null;
}) {
  if (!staticDefinition && !apiMetadata && !metadata) {
    return null;
  }

  return {
    charm_id: metadata?.charmId ?? staticDefinition?.charm_id ?? charmId,
    name: metadata?.name || apiMetadata?.name || staticDefinition?.name || `Charm #${charmId}`,
    description:
      apiMetadata?.description ||
      staticDefinition?.description ||
      metadata?.description ||
      "",
    rarity:
      staticDefinition?.rarity ||
      apiMetadata?.rarity ||
      (metadata ? getCharmRarityLabel(metadata.rarity) : "Common"),
    effect:
      describeCharmEffect(metadata) ||
      apiMetadata?.effect ||
      staticDefinition?.effect ||
      "",
    luck:
      (metadata ? getDisplayedCharmLuck(metadata) : null) ??
      apiMetadata?.luck ??
      staticDefinition?.luck ??
      0,
    shop_cost:
      metadata?.shopCost ??
      apiMetadata?.shopCost ??
      staticDefinition?.shop_cost ??
      0,
    image: apiMetadata?.image || staticDefinition?.image || "",
    background_color:
      staticDefinition?.background_color ||
      apiMetadata?.background_color ||
      "",
    metadata,
  } satisfies ResolvedCharmData;
}
