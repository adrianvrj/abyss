export interface StaticItemDefinition {
  name: string;
  description: string;
  price: number;
  sell_price: number;
  effect_type: number;
  effect_value: number;
  target_symbol: string;
}

export const STATIC_ITEM_DEFINITIONS: Record<number, StaticItemDefinition> = {
  1: { name: "Chilly Pepper", description: "+4 to seven score on pattern", price: 1, sell_price: 0, effect_type: 3, effect_value: 4, target_symbol: "seven" },
  2: { name: "Milk", description: "+2 diamond score, +1 CHIP on diamond hit", price: 1, sell_price: 0, effect_type: 3, effect_value: 2, target_symbol: "diamond" },
  3: { name: "Magic Dice", description: "+1 to cherry score on pattern", price: 1, sell_price: 0, effect_type: 3, effect_value: 1, target_symbol: "cherry" },
  4: { name: "Old Cassette", description: "+1 to lemon score on pattern", price: 1, sell_price: 1, effect_type: 3, effect_value: 1, target_symbol: "lemon" },
  5: { name: "Bat Boomerang", description: "+15% pattern multiplier", price: 2, sell_price: 1, effect_type: 1, effect_value: 15, target_symbol: "" },
  6: { name: "Holy Eye", description: "+30% pattern multiplier", price: 3, sell_price: 1, effect_type: 1, effect_value: 30, target_symbol: "" },
  7: { name: "Nerd Glasses", description: "+6% seven probability", price: 1, sell_price: 0, effect_type: 2, effect_value: 6, target_symbol: "seven" },
  8: { name: "Ace of Spades", description: "+8% diamond probability, +1 CHIP on diamond hit", price: 1, sell_price: 0, effect_type: 2, effect_value: 8, target_symbol: "diamond" },
  9: { name: "Devil Onion", description: "+1 extra spin", price: 2, sell_price: 1, effect_type: 4, effect_value: 1, target_symbol: "" },
  10: { name: "Red Button", description: "+2 instant spins", price: 4, sell_price: 2, effect_type: 4, effect_value: 2, target_symbol: "" },
  11: { name: "Ghost Mask", description: "+12% seven probability", price: 3, sell_price: 1, effect_type: 2, effect_value: 12, target_symbol: "seven" },
  12: { name: "Skull", description: "+8% cherry probability", price: 1, sell_price: 0, effect_type: 2, effect_value: 8, target_symbol: "cherry" },
  13: { name: "Pig Bank", description: "+1 to cherry score on pattern", price: 2, sell_price: 1, effect_type: 3, effect_value: 1, target_symbol: "cherry" },
  14: { name: "Old Wig", description: "+1 to lemon score on pattern", price: 1, sell_price: 1, effect_type: 3, effect_value: 1, target_symbol: "lemon" },
  15: { name: "Amulet", description: "+50% pattern multiplier", price: 4, sell_price: 2, effect_type: 1, effect_value: 50, target_symbol: "" },
  16: { name: "Weird Hand", description: "+14% cherry probability", price: 2, sell_price: 1, effect_type: 2, effect_value: 14, target_symbol: "cherry" },
  17: { name: "Golden Globe", description: "-4 coin weight", price: 1, sell_price: 0, effect_type: 2, effect_value: 4, target_symbol: "anti-coin" },
  18: { name: "Pyramid", description: "+3 instant spins", price: 5, sell_price: 2, effect_type: 4, effect_value: 3, target_symbol: "" },
  19: { name: "Old Phone", description: "-3 coin weight", price: 1, sell_price: 0, effect_type: 2, effect_value: 3, target_symbol: "anti-coin" },
  20: { name: "Smelly Boots", description: "+2 to cherry score on pattern", price: 2, sell_price: 1, effect_type: 3, effect_value: 2, target_symbol: "cherry" },
  21: { name: "Bloody Wrench", description: "+80% pattern multiplier", price: 5, sell_price: 2, effect_type: 1, effect_value: 80, target_symbol: "" },
  22: { name: "Car Keys", description: "+100% pattern multiplier", price: 6, sell_price: 3, effect_type: 1, effect_value: 100, target_symbol: "" },
  23: { name: "Devil Seal", description: "+4 instant spins", price: 7, sell_price: 3, effect_type: 4, effect_value: 4, target_symbol: "" },
  24: { name: "Holy Grail", description: "+150% pattern multiplier", price: 7, sell_price: 3, effect_type: 1, effect_value: 150, target_symbol: "" },
  25: { name: "Hockey Mask", description: "+9 to seven score on pattern", price: 2, sell_price: 1, effect_type: 3, effect_value: 9, target_symbol: "seven" },
  26: { name: "Rune", description: "+3 diamond score, +2 CHIP on diamond hit", price: 3, sell_price: 1, effect_type: 3, effect_value: 3, target_symbol: "diamond" },
  27: { name: "Bloody knife", description: "+14% diamond probability, +2 CHIP on diamond hit", price: 2, sell_price: 1, effect_type: 2, effect_value: 14, target_symbol: "diamond" },
  28: { name: "Devil Head", description: "+20% cherry probability", price: 4, sell_price: 2, effect_type: 2, effect_value: 20, target_symbol: "cherry" },
  29: { name: "Cigarettes", description: "+6% lemon probability", price: 2, sell_price: 1, effect_type: 2, effect_value: 6, target_symbol: "lemon" },
  30: { name: "Soul Contract", description: "+1 to lemon score on pattern", price: 3, sell_price: 2, effect_type: 3, effect_value: 1, target_symbol: "lemon" },
  31: { name: "Beer Can", description: "-7 coin weight", price: 2, sell_price: 1, effect_type: 2, effect_value: 7, target_symbol: "anti-coin" },
  32: { name: "Memory Card", description: "-9 coin weight", price: 3, sell_price: 1, effect_type: 2, effect_value: 9, target_symbol: "anti-coin" },
  33: { name: "Ticket", description: "+13 to seven score on pattern", price: 3, sell_price: 2, effect_type: 3, effect_value: 13, target_symbol: "seven" },
  34: { name: "Devil Train", description: "+16% seven probability", price: 4, sell_price: 2, effect_type: 2, effect_value: 16, target_symbol: "seven" },
  35: { name: "Fake Dollar", description: "+4 diamond score, +3 CHIP on diamond hit", price: 4, sell_price: 1, effect_type: 3, effect_value: 4, target_symbol: "diamond" },
  36: { name: "Bull Skull", description: "+20% diamond probability, +3 CHIP on diamond hit", price: 4, sell_price: 2, effect_type: 2, effect_value: 20, target_symbol: "diamond" },
  37: { name: "Fake Coin", description: "+5% lemon probability", price: 3, sell_price: 2, effect_type: 2, effect_value: 5, target_symbol: "lemon" },
  38: { name: "Pocket Watch", description: "+2 to lemon score on pattern", price: 4, sell_price: 2, effect_type: 3, effect_value: 2, target_symbol: "lemon" },
  39: { name: "Knight Helmet", description: "-5 coin weight", price: 2, sell_price: 1, effect_type: 2, effect_value: 5, target_symbol: "anti-coin" },
  40: { name: "La Biblia", description: "Protects from 666 pattern", price: 1, sell_price: 1, effect_type: 6, effect_value: 1, target_symbol: "six" },
  41: { name: "Tricky Dice", description: "Next 666: 50/50 cash out or wipe + half spins", price: 4, sell_price: 2, effect_type: 11, effect_value: 1, target_symbol: "six" },
};
