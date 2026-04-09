export const itemImages: Record<number, string> = {};

// Generate 44 items
for (let i = 1; i <= 44; i++) {
    itemImages[i] = `/images/item${i}.png`;
}

export function getItemImage(itemId: number) {
    return itemImages[itemId] || itemImages[1]; // Fallback to item 1
}
