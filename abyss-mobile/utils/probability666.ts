/**
 * Calculate 666 probability based on level
 * Matches contract logic: starts at 0%, then doubles every 3 levels, capped at 9.6%
 *
 * Level 1-3: 0%
 * Level 4-6: 2.4%
 * Level 7-9: 4.8%
 * Level 10-12: 9.6%
 * Level 13+: 9.6% (CAPPED)
 */
export function calculate666Probability(level: number): number {
  if (level <= 3) {
    // First 3 levels: no risk
    return 0;
  }

  const baseProbability = 2.4; // 2.4%
  const tier = Math.floor((level - 4) / 3); // 0-based tier starting from level 4, increases every 3 levels
  const multiplier = Math.pow(2, tier); // 2^tier

  const probability = baseProbability * multiplier;

  // Cap at 9.6%
  return Math.min(probability, 9.6);
}

/**
 * Check if player has Biblia protection item
 * @param ownedItems - Array of owned items
 * @returns true if player has at least one Biblia
 */
export function hasBibliaProtection(ownedItems: any[]): boolean {
  return ownedItems.some(item => item.item_id === 40); // Item 40 is Biblia
}
