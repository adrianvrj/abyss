#!/bin/bash

# Soul Charms Initialization Script
# Run this after deploying the Charm contract to create all 20 charm types

# Configuration - UPDATE THESE VALUES
CHARM_CONTRACT="0x076dc33ef7e8efbbd6f513f35a47bb94df3a57ab3c66e5985d316d435b70d745"
ABYSS_GAME_CONTRACT="0x05b38052dcad094f11f71c78b0c1b84a001616f7f04619502b73a359d8b7e4ae"  # UPDATE THIS!
PROFILE="dev"
ACCOUNT="abyss_admin"

echo "========================================="
echo "Soul Charms Initialization Script"
echo "========================================="
echo ""

# Effect Types:
# 7 = LuckBoost
# 8 = PatternRetrigger  
# 9 = ExtraSpinWithLuck
# 10 = ConditionalLuckBoost

# Condition Types (for ConditionalLuckBoost):
# 0 = None
# 1 = NoPatternLastSpin
# 2 = LowSpinsRemaining
# 3 = PerItemInInventory
# 4 = LowScore
# 5 = HighLevel
# 6 = Blocked666

# Rarity:
# 0 = Common
# 1 = Rare
# 2 = Epic
# 3 = Legendary

# Pattern types for PatternRetrigger (effect_value_2):
# 0 = All patterns
# 1 = H3 (horizontal)
# 3 = Diagonal
# 5 = Jackpot

echo "Creating Charm Types..."
echo ""

# ===============================
# COMMON CHARMS (Rarity 0)
# ===============================

echo "[1/20] Creating Whisper Stone..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $CHARM_CONTRACT \
  --function create_charm_type \
  --arguments '1, 0x576869737065722053746f6e65, 0x426173652b33206c75636b, 7, 3, 0, 0, 0, 1, 1000'
# charm_id=1, name="Whisper Stone", desc="Base+3 luck", effect_type=7(LuckBoost), effect_value=3, effect_value_2=0, condition=0, rarity=0(Common), cost=50, max_supply=1000
sleep 5

echo "[2/20] Creating Faded Coin..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $CHARM_CONTRACT \
  --function create_charm_type \
  --arguments '2, 0x466164656420436f696e, 0x426173652b34206c75636b, 7, 4, 0, 0, 0, 1, 1000'
sleep 5

echo "[3/20] Creating Broken Mirror..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $CHARM_CONTRACT \
  --function create_charm_type \
  --arguments '3, 0x42726f6b656e204d6972726f72, 0x2b35206c75636b206966206e6f207061747465726e, 10, 5, 0, 1, 0, 1, 1000'
# Conditional luck: +5 if no pattern last spin
sleep 5

echo "[4/20] Creating Dusty Hourglass..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $CHARM_CONTRACT \
  --function create_charm_type \
  --arguments '4, 0x447573747920486f7572676c617373, 0x2b36206c75636b206966206c6f77207370696e73, 10, 6, 0, 2, 0, 1, 1000'
# Conditional luck: +6 if ≤2 spins remaining
sleep 5

echo "[5/20] Creating Cracked Skull..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $CHARM_CONTRACT \
  --function create_charm_type \
  --arguments '5, 0x437261636b656420536b756c6c, 8, 7, 5, 0, 0, 0, 1, 1000'
sleep 5

echo "[6/20] Creating Rusty Key..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $CHARM_CONTRACT \
  --function create_charm_type \
  --arguments '6, 0x5275737479204b6579, 0x2b32206c75636b20706572206974656d, 10, 2, 0, 3, 0, 1, 1000'
# Conditional: +2 luck per item in inventory
sleep 5

echo "[7/20] Creating Moth Wing..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $CHARM_CONTRACT \
  --function create_charm_type \
  --arguments '7, 0x4d6f746820576696e67, 0x426173652b36206c75636b, 7, 6, 0, 0, 0, 1, 1000'
sleep 5

echo "[8/20] Creating Bone Dice..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $CHARM_CONTRACT \
  --function create_charm_type \
  --arguments '8, 0x426f6e652044696365, 0x2b38206c75636b206966206c6f772073636f7265, 10, 8, 0, 4, 0, 1, 1000'
# Conditional: +8 luck if score < 100
sleep 5

# ===============================
# RARE CHARMS (Rarity 1)
# ===============================

echo "[9/20] Creating Soul Fragment..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $CHARM_CONTRACT \
  --function create_charm_type \
  --arguments '9, 0x536f756c20467261676d656e74, 0x426173652b3130206c75636b, 7, 10, 0, 0, 1, 2, 500'
sleep 5

echo "[10/20] Creating Cursed Pendant..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $CHARM_CONTRACT \
  --function create_charm_type \
  --arguments '10, 0x43757273656420506e64616e74, 0x483320726574726967676572207832, 8, 2, 1, 0, 1, 2, 500'
# PatternRetrigger: H3 x2
sleep 5

echo "[11/20] Creating Shadow Lantern..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $CHARM_CONTRACT \
  --function create_charm_type \
  --arguments '11, 0x536861646f77204c616e7465726e, 0x2b38206c75636b2c202b34206966206869676820c6576656c, 10, 8, 4, 5, 1, 2, 500'
# Base +8 luck, +4 conditional if level ≥ 5
sleep 5

echo "[12/20] Creating Ethereal Chain..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $CHARM_CONTRACT \
  --function create_charm_type \
  --arguments '12, 0x457468657265616c20436861696e, 0x2b3132206c75636b2069662036363620626c6f636b6564, 10, 12, 0, 6, 1, 2, 500'
# Conditional: +12 luck if 666 was blocked this session
sleep 5

# ===============================
# EPIC CHARMS (Rarity 2)
# ===============================

echo "[13/20] Creating Void Compass..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $CHARM_CONTRACT \
  --function create_charm_type \
  --arguments '13, 0x566f696420436f6d70617373, 0x2b31207370696e2c202b35206c75636b, 9, 5, 1, 0, 2, 3, 250'
# ExtraSpinWithLuck: +1 spin, +5 luck
sleep 5

echo "[14/20] Creating Demon Tooth..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $CHARM_CONTRACT \
  --function create_charm_type \
  --arguments '14, 0x44656d6f6e277320546f6f7468, 0x446961676f6e616c20726574726967676572207832, 8, 2, 3, 0, 2, 3, 250'
# PatternRetrigger: Diagonal x2
sleep 5

echo "[15/20] Creating Abyssal Eye..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $CHARM_CONTRACT \
  --function create_charm_type \
  --arguments '15, 0x4162797373616c20457965, 0x426173652b3230206c75636b, 7, 20, 0, 0, 2, 4, 250'
sleep 5

echo "[16/20] Creating Phoenix Feather..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $CHARM_CONTRACT \
  --function create_charm_type \
  --arguments '16, 0x50686f656e69782046656174686572, 0x2b32207370696e732c202b3130206c75636b, 9, 10, 2, 0, 2, 4, 250'
# ExtraSpinWithLuck: +2 spins, +10 luck
sleep 5

# ===============================
# LEGENDARY CHARMS (Rarity 3)
# ===============================

echo "[17/20] Creating Reaper's Mark..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $CHARM_CONTRACT \
  --function create_charm_type \
  --arguments '17, 0x5265617065722773204d61726b, 0x416c6c207061747465726e7320726967676572207832, 8, 2, 0, 0, 2, 5, 100'
# PatternRetrigger: All patterns x2
sleep 5

echo "[18/20] Creating Chaos Orb..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $CHARM_CONTRACT \
  --function create_charm_type \
  --arguments '18, 0x4368616f73204f7262, 0x2b3330206c75636b2069662036363620626c6f636b6564, 10, 30, 0, 6, 2, 5, 100'
# Conditional: +30 luck if 666 blocked
sleep 5

echo "[19/20] Creating Soul of the Abyss..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $CHARM_CONTRACT \
  --function create_charm_type \
  --arguments '19, 0x536f756c206f6620746865204162797373, 0x2b3330206c75636b2c204a61636b706f74207832, 7, 30, 0, 0, 3, 6, 50'
# +30 luck base (jackpot retrigger handled in game contract)
sleep 5

echo "[20/20] Creating Void Heart..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $CHARM_CONTRACT \
  --function create_charm_type \
  --arguments '20, 0x566f6964204865617274, 0x2b3235206c75636b2c202b31207370696e, 9, 25, 1, 0, 3, 7, 50'
# ExtraSpinWithLuck: +25 luck, +1 spin
sleep 5

echo ""
echo "========================================="
echo "Charm Types Created!"
echo "========================================="
echo ""
echo "Now configuring contracts..."
echo ""

# Configure AbyssGame to know about Charm contract
echo "Setting Charm NFT address in AbyssGame..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $ABYSS_GAME_CONTRACT \
  --function set_charm_nft_address \
  --arguments "$CHARM_CONTRACT"
sleep 5

# Authorize AbyssGame to mint charms
echo "Authorizing AbyssGame to mint charms..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $CHARM_CONTRACT \
  --function set_game_contract \
  --arguments "$ABYSS_GAME_CONTRACT"
sleep 5

echo ""
echo "========================================="
echo "DONE! Soul Charms system is ready!"
echo "========================================="
echo ""
echo "Charm Contract: $CHARM_CONTRACT"
echo "Game Contract:  $ABYSS_GAME_CONTRACT"
