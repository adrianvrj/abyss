/**
 * Calculate 666 probability based on level
 * Matches contract logic: starts at 0%, then doubles every 3 levels, capped at 9.6%
 */
export function calculate666Probability(level: number): number {
    if (level <= 3) {
        return 0;
    }

    const baseProbability = 2.4;
    const tier = Math.floor((level - 4) / 3);
    const multiplier = Math.pow(2, tier);

    const probability = baseProbability * multiplier;
    return Math.min(probability, 9.6);
}

/**
 * Check if player has Biblia protection item (ID 40)
 */
export function hasBibliaProtection(ownedItems: { item_id: number, quantity: number }[]): boolean {
    return ownedItems.some(item => item.item_id === 40 && item.quantity > 0);
}
