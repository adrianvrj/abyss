// Soul Charms Initialization Script
// Run these calls to create_charm_type after deploying the Charm contract
//
// Effect Types:
//   7 = LuckBoost
//   8 = PatternRetrigger  
//   9 = ExtraSpinWithLuck
//   10 = ConditionalLuckBoost
//
// Condition Types (for effect_type 10):
//   0 = None
//   1 = NoPatternLastSpin (+luck if last spin had no patterns)
//   2 = LowSpinsRemaining (+luck if ≤2 spins remaining)
//   3 = PerItemInInventory (+luck per item owned)
//   4 = LowScore (+luck if score < 100)
//   5 = HighLevel (+luck if level ≥ 5)
//   6 = Blocked666 (+luck if 666 was blocked this session)
//
// Rarity: 0=Common, 1=Rare, 2=Epic, 3=Legendary

// ═══════════════════════════════════════════════════════════════════════════
// COMMON CHARMS (8 types, 800 supply each)
// ═══════════════════════════════════════════════════════════════════════════

// Charm 1: Whisper Stone - LuckBoost +3
create_charm_type(1, 'Whisper Stone', '+3 luck', 7, 3, 0, 0, 0, 50, 800);

// Charm 2: Faded Coin - LuckBoost +4
create_charm_type(2, 'Faded Coin', '+4 luck', 7, 4, 0, 0, 0, 65, 800);

// Charm 3: Broken Mirror - Conditional: +5 luck if last spin had no patterns
create_charm_type(3, 'Broken Mirror', '+5 luck no ptrn', 10, 5, 0, 1, 0, 70, 800);

// Charm 4: Dusty Hourglass - Conditional: +4 luck if ≤2 spins remaining
create_charm_type(4, 'Dusty Hourglass', '+4 luck low spin', 10, 4, 0, 2, 0, 75, 800);

// Charm 5: Cracked Skull - LuckBoost +5
create_charm_type(5, 'Cracked Skull', '+5 luck', 7, 5, 0, 0, 0, 80, 800);

// Charm 6: Rusty Key - Conditional: +3 luck per item in inventory
create_charm_type(6, 'Rusty Key', '+3 luck/item', 10, 3, 0, 3, 0, 85, 800);

// Charm 7: Moth Wing - LuckBoost +6
create_charm_type(7, 'Moth Wing', '+6 luck', 7, 6, 0, 0, 0, 90, 800);

// Charm 8: Bone Dice - Conditional: +8 luck if score < 100
create_charm_type(8, 'Bone Dice', '+8 luck lowscore', 10, 8, 0, 4, 0, 100, 800);

// ═══════════════════════════════════════════════════════════════════════════
// RARE CHARMS (6 types, 400 supply each)
// ═══════════════════════════════════════════════════════════════════════════

// Charm 9: Soul Fragment - LuckBoost +10
create_charm_type(9, 'Soul Fragment', '+10 luck', 7, 10, 0, 0, 1, 150, 400);

// Charm 10: Cursed Pendant - PatternRetrigger: H3 patterns trigger twice
// effect_value = 2 (2x trigger), effect_value_2 = 1 (H3 pattern type)
create_charm_type(10, 'Cursed Pendant', 'H3 x2', 8, 2, 1, 0, 1, 200, 400);

// Charm 11: Shadow Lantern - LuckBoost +8 base, +4 if level ≥ 5
// effect_value = 8 (base), effect_value_2 = 4 (conditional bonus)
create_charm_type(11, 'Shadow Lantern', '+8/+4 hi lvl', 7, 8, 4, 5, 1, 220, 400);

// Charm 12: Ethereal Chain - Conditional: +6 luck per pattern in last spin
// effect_value = 6 (luck per pattern), condition = special (handled in game)
create_charm_type(12, 'Ethereal Chain', '+6 luck/ptrn', 10, 6, 0, 7, 1, 250, 400);

// Charm 13: Void Compass - ExtraSpinWithLuck: +1 spin with +15 luck
// effect_value = 1 (spins), effect_value_2 = 15 (luck)
create_charm_type(13, 'Void Compass', '+1 spin +15lck', 9, 1, 15, 0, 1, 280, 400);

// Charm 14: Demon's Tooth - PatternRetrigger: Diagonal patterns trigger twice
// effect_value = 2 (2x trigger), effect_value_2 = 3 (Diagonal pattern type)
create_charm_type(14, 'Demons Tooth', 'Diag x2', 8, 2, 3, 0, 1, 300, 400);

// ═══════════════════════════════════════════════════════════════════════════
// EPIC CHARMS (4 types, 200 supply each)
// ═══════════════════════════════════════════════════════════════════════════

// Charm 15: Abyssal Eye - LuckBoost +20
create_charm_type(15, 'Abyssal Eye', '+20 luck', 7, 20, 0, 0, 2, 400, 200);

// Charm 16: Phoenix Feather - ExtraSpinWithLuck: +2 spins with +10 luck each
// effect_value = 2 (spins), effect_value_2 = 10 (luck)
create_charm_type(16, 'Phoenix Feather', '+2 spin +10lck', 9, 2, 10, 0, 2, 500, 200);

// Charm 17: Reaper's Mark - PatternRetrigger: ALL patterns trigger twice
// effect_value = 2 (2x trigger), effect_value_2 = 0 (all patterns)
create_charm_type(17, 'Reapers Mark', 'All x2', 8, 2, 0, 0, 2, 550, 200);

// Charm 18: Chaos Orb - Conditional: +15 luck if 666 was blocked this session
create_charm_type(18, 'Chaos Orb', '+15 lck 666 blk', 10, 15, 0, 6, 2, 600, 200);

// ═══════════════════════════════════════════════════════════════════════════
// LEGENDARY CHARMS (2 types, 200 supply each)
// ═══════════════════════════════════════════════════════════════════════════

// Charm 19: Soul of the Abyss - LuckBoost +30, Jackpot patterns trigger twice
// This is a combo charm: primary = luck, secondary = jackpot retrigger
// effect_type = 7 (LuckBoost), effect_value = 30, effect_value_2 = 2 (jackpot x2)
create_charm_type(19, 'Soul of Abyss', '+30 lck JP x2', 7, 30, 2, 0, 3, 1000, 200);

// Charm 20: Void Heart - +25 luck, +1 spin with +50 luck, patterns 1.5x
// This is the ultimate combo charm
// effect_type = 9 (ExtraSpinWithLuck as primary), effect_value = 1 (spin), effect_value_2 = 50 (luck bonus)
// The +25 base luck is handled as a special case for legendary charms
create_charm_type(20, 'Void Heart', 'Ultimate', 9, 1, 50, 0, 3, 1200, 200);

// ═══════════════════════════════════════════════════════════════════════════
// TOTAL SUPPLY CHECK
// ═══════════════════════════════════════════════════════════════════════════
// Common:    8 × 800 = 6,400
// Rare:      6 × 400 = 2,400  
// Epic:      4 × 200 =   800
// Legendary: 2 × 200 =   400
// TOTAL:              10,000 ✓
