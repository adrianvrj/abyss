export interface StaticCharmDefinition {
  charm_id: number;
  name: string;
  description: string;
  rarity: string;
  effect: string;
  luck: number;
  shop_cost: number;
  image: string;
  background_color: string;
}

const charmImage = (id: number) => `/images/charms/${id}.png`;

export const STATIC_CHARM_DEFINITIONS: Record<number, StaticCharmDefinition> = {
  1: { charm_id: 1, name: "Whisper Stone", description: "A stone that whispers secrets of fortune.", rarity: "Common", effect: "+10 Luck", luck: 10, shop_cost: 1, image: charmImage(1), background_color: "#4B5563" },
  2: { charm_id: 2, name: "Faded Coin", description: "An ancient coin worn smooth by time.", rarity: "Common", effect: "+12 Luck", luck: 12, shop_cost: 1, image: charmImage(2), background_color: "#6B7280" },
  3: { charm_id: 3, name: "Broken Mirror", description: "See the future in its fragments.", rarity: "Common", effect: "+18 Luck if last spin had no patterns", luck: 18, shop_cost: 1, image: charmImage(3), background_color: "#6B7280" },
  4: { charm_id: 4, name: "Dusty Hourglass", description: "Time bends for the desperate.", rarity: "Common", effect: "+20 Luck if spins remaining <= 3", luck: 20, shop_cost: 1, image: charmImage(4), background_color: "#6B7280" },
  5: { charm_id: 5, name: "Cracked Skull", description: "Memento of a lucky gambler.", rarity: "Common", effect: "+14 Luck", luck: 14, shop_cost: 1, image: charmImage(5), background_color: "#6B7280" },
  6: { charm_id: 6, name: "Rusty Key", description: "Unlocks hidden potential.", rarity: "Common", effect: "+8 Luck per item in inventory", luck: 8, shop_cost: 1, image: charmImage(6), background_color: "#6B7280" },
  7: { charm_id: 7, name: "Moth Wing", description: "Drawn to the light of fortune.", rarity: "Common", effect: "+16 Luck", luck: 16, shop_cost: 1, image: charmImage(7), background_color: "#6B7280" },
  8: { charm_id: 8, name: "Bone Dice", description: "Roll with the ancestors.", rarity: "Common", effect: "+22 Luck if score < 180", luck: 22, shop_cost: 1, image: charmImage(8), background_color: "#6B7280" },
  9: { charm_id: 9, name: "Soul Fragment", description: "A piece of pure fortune.", rarity: "Rare", effect: "+24 Luck", luck: 24, shop_cost: 1, image: charmImage(9), background_color: "#2563EB" },
  10: { charm_id: 10, name: "Cursed Pendant", description: "Patterns repeat in the darkness.", rarity: "Rare", effect: "Horizontal-3 patterns trigger twice", luck: 0, shop_cost: 2, image: charmImage(10), background_color: "#2563EB" },
  11: { charm_id: 11, name: "Shadow Lantern", description: "Its light grows brighter as you descend deeper.", rarity: "Rare", effect: "+14 Luck, +18 more at level 4+", luck: 14, shop_cost: 1, image: charmImage(11), background_color: "#2563EB" },
  12: { charm_id: 12, name: "Ethereal Chain", description: "Each pattern strengthens the links of fate.", rarity: "Rare", effect: "+12 Luck per pattern in last spin", luck: 12, shop_cost: 1, image: charmImage(12), background_color: "#2563EB" },
  13: { charm_id: 13, name: "Void Compass", description: "Points toward one more chance at destiny.", rarity: "Rare", effect: "+2 spins and +25 Luck", luck: 25, shop_cost: 2, image: charmImage(13), background_color: "#2563EB" },
  14: { charm_id: 14, name: "Demon's Tooth", description: "Diagonal patterns tremble.", rarity: "Rare", effect: "Diagonal patterns trigger twice", luck: 0, shop_cost: 3, image: charmImage(14), background_color: "#2563EB" },
  15: { charm_id: 15, name: "Abyssal Eye", description: "The eye of the abyss sees all patterns before they form.", rarity: "Epic", effect: "+38 Luck", luck: 38, shop_cost: 3, image: charmImage(15), background_color: "#7C3AED" },
  16: { charm_id: 16, name: "Phoenix Feather", description: "From the ashes, more chances arise.", rarity: "Epic", effect: "+3 spins and +20 Luck", luck: 20, shop_cost: 3, image: charmImage(16), background_color: "#7C3AED" },
  17: { charm_id: 17, name: "Reaper's Mark", description: "Death marks every pattern except jackpot for a second harvest.", rarity: "Epic", effect: "All non-jackpot patterns trigger twice", luck: 0, shop_cost: 4, image: charmImage(17), background_color: "#7C3AED" },
  18: { charm_id: 18, name: "Chaos Orb", description: "Chaos rewards survival.", rarity: "Epic", effect: "+12 Luck, +140 more if 666 was blocked this session", luck: 12, shop_cost: 4, image: charmImage(18), background_color: "#7C3AED" },
  19: { charm_id: 19, name: "Soul of the Abyss", description: "Jackpots bow to its power.", rarity: "Legendary", effect: "+45 Luck, jackpot patterns trigger twice", luck: 45, shop_cost: 5, image: charmImage(19), background_color: "#D97706" },
  20: { charm_id: 20, name: "Void Heart", description: "The ultimate abyssal charm.", rarity: "Legendary", effect: "+2 spins and +80 Luck", luck: 80, shop_cost: 5, image: charmImage(20), background_color: "#D97706" },
};

export function getStaticCharmDefinition(charmId: number): StaticCharmDefinition | null {
  return STATIC_CHARM_DEFINITIONS[charmId] ?? null;
}
