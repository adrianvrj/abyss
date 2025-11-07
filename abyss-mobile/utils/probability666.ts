/**
 * Calculate 666 probability based on level
 * Matches contract logic: starts at 0%, then doubles every 4 levels, capped at 9.6%
 *
 * Level 1-5: 0%
 * Level 6-9: 1.2%
 * Level 10-13: 2.4%
 * Level 14-17: 4.8%
 * Level 18-21: 9.6%
 * Level 22+: 9.6% (CAPPED)
 */
export function calculate666Probability(level: number): number {
  if (level <= 5) {
    // First 5 levels: no risk
    return 0;
  }

  const baseProbability = 1.2; // 1.2%
  const tier = Math.floor((level - 6) / 4); // 0-based tier starting from level 6, increases every 4 levels
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
