/**
 * Item metadata (names and descriptions)
 * The contract only stores numeric data to save gas.
 * This mapping provides the display information for the client.
 */

export interface ItemMetadata {
  name: string;
  description: string;
}

export const itemMetadata: Record<number, ItemMetadata> = {
  // SEVEN RUN ITEMS
  1: { name: 'Chilly Pepper', description: '+5 points to seven' },
  7: { name: 'Nerd Glasses', description: '+15% seven probability' },
  11: { name: 'Ghost Mask', description: '+25% seven probability' },
  33: { name: 'Lucky Seven Charm', description: '+8 points to seven' },
  34: { name: 'Seven Star Amulet', description: '+35% seven probability' },

  // DIAMOND RUN ITEMS
  2: { name: 'Milk', description: '+3 points to diamond' },
  8: { name: 'Ace of Spades', description: '+12% diamond probability' },
  35: { name: 'Diamond Ring', description: '+6 points to diamond' },
  36: { name: 'Crystal Ball', description: '+20% diamond probability' },

  // CHERRY RUN ITEMS
  3: { name: 'Chocolate Bar', description: '+8 points to cherry' },
  12: { name: 'Cherry Blossom', description: '+10% cherry probability' },
  13: { name: 'Red Velvet Cake', description: '+12 points to cherry' },
  16: { name: 'Ruby Pendant', description: '+18% cherry probability' },
  20: { name: 'Cherry Bomb', description: '+20 points to cherry' },
  37: { name: 'Cherry Crown', description: '+15 points to cherry' },
  38: { name: 'Sakura Branch', description: '+25% cherry probability' },

  // LEMON RUN ITEMS
  4: { name: 'Lemonade', description: '+2 points to lemon' },
  9: { name: 'Lemon Tree', description: '+8% lemon probability' },
  14: { name: 'Citrus Juice', description: '+4 points to lemon' },
  17: { name: 'Yellow Sunflower', description: '+15% lemon probability' },
  21: { name: 'Golden Lemon', description: '+6 points to lemon' },

  // COIN RUN ITEMS
  5: { name: 'Piggy Bank', description: '+2 points to coin' },
  10: { name: 'Gold Coin', description: '+10% coin probability' },
  15: { name: 'Treasure Chest', description: '+5 points to coin' },
  18: { name: 'Money Bag', description: '+12% coin probability' },
  22: { name: 'Ancient Coin', description: '+8 points to coin' },
  39: { name: 'Royal Treasury', description: '+10 points to coin' },
  40: { name: 'Midas Touch', description: '+18% coin probability' },

  // PATTERN MULTIPLIER ITEMS
  6: { name: 'Magnifying Glass', description: '+10% to all patterns' },
  19: { name: 'Crystal Lens', description: '+15% to all patterns' },
  23: { name: 'Rainbow Prism', description: '+20% to all patterns' },
  27: { name: 'Starlight Scope', description: '+25% to all patterns' },
  31: { name: 'Cosmic Amplifier', description: '+30% to all patterns' },
  41: { name: 'Divine Mirror', description: '+35% to all patterns' },

  // SCORE MULTIPLIER ITEMS
  24: { name: 'Lucky Clover', description: '+5% to all scores' },
  28: { name: 'Horseshoe', description: '+10% to all scores' },
  32: { name: 'Golden Rabbit Foot', description: '+15% to all scores' },

  // SPIN BONUS ITEMS
  25: { name: 'Hourglass', description: '+1 extra spin' },
  29: { name: 'Time Crystal', description: '+2 extra spins' },
  42: { name: 'Eternal Clock', description: '+3 extra spins' },
  43: { name: 'Infinity Loop', description: '+5 extra spins' },

  // LEVEL PROGRESSION ITEMS
  26: { name: 'Experience Book', description: '-5% level requirements' },
  30: { name: 'Wisdom Scroll', description: '-10% level requirements' },

  // SPECIAL PROTECTION
  40: { name: 'Biblia', description: 'Protects from 666 once' },
};

/**
 * Get metadata for an item
 */
export function getItemMetadata(itemId: number): ItemMetadata {
  return itemMetadata[itemId] || { name: 'Unknown Item', description: 'No description available' };
}
