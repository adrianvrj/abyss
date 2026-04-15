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
  1: { name: "Chilly Pepper", description: "+1 to seven score on pattern", price: 1, sell_price: 1, effect_type: 3, effect_value: 1, target_symbol: "seven" },
  2: { name: "Milk", description: "+1 to diamond score on pattern", price: 1, sell_price: 1, effect_type: 3, effect_value: 1, target_symbol: "diamond" },
  3: { name: "Magic Dice", description: "+1 to cherry score on pattern", price: 1, sell_price: 1, effect_type: 3, effect_value: 1, target_symbol: "cherry" },
  4: { name: "Old Cassette", description: "+1 to lemon score on pattern", price: 1, sell_price: 1, effect_type: 3, effect_value: 1, target_symbol: "lemon" },
  5: { name: "Bat Boomerang", description: "+15% pattern multiplier", price: 2, sell_price: 1, effect_type: 1, effect_value: 15, target_symbol: "" },
  6: { name: "Holy Eye", description: "+30% pattern multiplier", price: 3, sell_price: 1, effect_type: 1, effect_value: 30, target_symbol: "" },
  7: { name: "Nerd Glasses", description: "+15% seven probability", price: 2, sell_price: 1, effect_type: 2, effect_value: 15, target_symbol: "seven" },
  8: { name: "Ace of Spades", description: "+12% diamond probability", price: 1, sell_price: 1, effect_type: 2, effect_value: 12, target_symbol: "diamond" },
  9: { name: "Devil Onion", description: "+1 extra spin", price: 2, sell_price: 1, effect_type: 4, effect_value: 1, target_symbol: "" },
  10: { name: "Red Button", description: "+3 extra spins", price: 4, sell_price: 2, effect_type: 4, effect_value: 3, target_symbol: "" },
  11: { name: "Ghost Mask", description: "+25% seven probability", price: 3, sell_price: 1, effect_type: 2, effect_value: 25, target_symbol: "seven" },
  12: { name: "Skull", description: "+10% cherry probability", price: 1, sell_price: 1, effect_type: 2, effect_value: 10, target_symbol: "cherry" },
  13: { name: "Pig Bank", description: "+2 to cherry score on pattern", price: 2, sell_price: 1, effect_type: 3, effect_value: 2, target_symbol: "cherry" },
  14: { name: "Old Wig", description: "+2 to lemon score on pattern", price: 1, sell_price: 1, effect_type: 3, effect_value: 2, target_symbol: "lemon" },
  15: { name: "Amulet", description: "+50% pattern multiplier", price: 4, sell_price: 2, effect_type: 1, effect_value: 50, target_symbol: "" },
  16: { name: "Weird Hand", description: "+18% cherry probability", price: 2, sell_price: 1, effect_type: 2, effect_value: 18, target_symbol: "cherry" },
  17: { name: "Golden Globe", description: "+14% coin probability", price: 1, sell_price: 1, effect_type: 2, effect_value: 14, target_symbol: "coin" },
  18: { name: "Pyramid", description: "+5 extra spins", price: 6, sell_price: 3, effect_type: 4, effect_value: 5, target_symbol: "" },
  19: { name: "Old Phone", description: "+2 to coin score on pattern", price: 2, sell_price: 1, effect_type: 3, effect_value: 2, target_symbol: "coin" },
  20: { name: "Smelly Boots", description: "+3 to cherry score on pattern", price: 3, sell_price: 1, effect_type: 3, effect_value: 3, target_symbol: "cherry" },
  21: { name: "Bloody Wrench", description: "+80% pattern multiplier", price: 5, sell_price: 2, effect_type: 1, effect_value: 80, target_symbol: "" },
  22: { name: "Car Keys", description: "+100% pattern multiplier", price: 6, sell_price: 3, effect_type: 1, effect_value: 100, target_symbol: "" },
  23: { name: "Devil Seal", description: "+10 extra spins", price: 7, sell_price: 3, effect_type: 4, effect_value: 10, target_symbol: "" },
  24: { name: "Holy Grail", description: "+150% pattern multiplier", price: 7, sell_price: 3, effect_type: 1, effect_value: 150, target_symbol: "" },
  25: { name: "Hockey Mask", description: "+2 to seven score on pattern", price: 3, sell_price: 1, effect_type: 3, effect_value: 2, target_symbol: "seven" },
  26: { name: "Rune", description: "+2 to diamond score on pattern", price: 3, sell_price: 1, effect_type: 3, effect_value: 2, target_symbol: "diamond" },
  27: { name: "Bloody knife", description: "+22% diamond probability", price: 2, sell_price: 1, effect_type: 2, effect_value: 22, target_symbol: "diamond" },
  28: { name: "Devil Head", description: "+28% cherry probability", price: 4, sell_price: 2, effect_type: 2, effect_value: 28, target_symbol: "cherry" },
  29: { name: "Cigarettes", description: "+16% lemon probability", price: 2, sell_price: 1, effect_type: 2, effect_value: 16, target_symbol: "lemon" },
  30: { name: "Soul Contract", description: "+3 to lemon score on pattern", price: 3, sell_price: 1, effect_type: 3, effect_value: 3, target_symbol: "lemon" },
  31: { name: "Beer Can", description: "+25% coin probability", price: 3, sell_price: 1, effect_type: 2, effect_value: 25, target_symbol: "coin" },
  32: { name: "Memory Card", description: "+3 to coin score on pattern", price: 4, sell_price: 2, effect_type: 3, effect_value: 3, target_symbol: "coin" },
  33: { name: "Ticket", description: "+3 to seven score on pattern", price: 4, sell_price: 2, effect_type: 3, effect_value: 3, target_symbol: "seven" },
  34: { name: "Devil Train", description: "+35% seven probability", price: 5, sell_price: 2, effect_type: 2, effect_value: 35, target_symbol: "seven" },
  35: { name: "Fake Dollar", description: "+3 to diamond score on pattern", price: 4, sell_price: 1, effect_type: 3, effect_value: 3, target_symbol: "diamond" },
  36: { name: "Bull Skull", description: "+30% diamond probability", price: 4, sell_price: 2, effect_type: 2, effect_value: 30, target_symbol: "diamond" },
  37: { name: "Fake Coin", description: "+24% lemon probability", price: 2, sell_price: 1, effect_type: 2, effect_value: 24, target_symbol: "lemon" },
  38: { name: "Pocket Watch", description: "+4 to lemon score on pattern", price: 4, sell_price: 2, effect_type: 3, effect_value: 4, target_symbol: "lemon" },
  39: { name: "Knight Helmet", description: "+1 to coin score on pattern", price: 1, sell_price: 1, effect_type: 3, effect_value: 1, target_symbol: "coin" },
  40: { name: "La Biblia", description: "Protects from 666 pattern", price: 2, sell_price: 1, effect_type: 6, effect_value: 1, target_symbol: "six" },
};
