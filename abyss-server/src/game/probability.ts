/**
 * Calculate 666 probability based on level
 * NO CAP - scales indefinitely for late-game difficulty
 * L1-2: 0%, L3: 1.5%, then +1.5% per level
 */
export function calculate666Probability(level: number): number {
    if (level <= 2) {
        return 0;
    }
    // +1.5% per level starting from level 3
    return (level - 2) * 1.5;
}

/**
 * Check if player has Biblia protection item (ID 40)
 */
export function hasBibliaProtection(ownedItems: { item_id: number, quantity: number }[]): boolean {
    return ownedItems.some(item => item.item_id === 40 && item.quantity > 0);
}
