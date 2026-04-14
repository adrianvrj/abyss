#!/bin/bash

# Relics Initialization Script
# Run this after deploying the Relic contract

# Configuration - UPDATE THESE VALUES
RELIC_CONTRACT="0x0629007964504df95d64b88806e43ac5d9aa5e2e7583b5c360f4b603a565e0b5"
ABYSS_GAME_CONTRACT="0x05b38052dcad094f11f71c78b0c1b84a001616f7f04619502b73a359d8b7e4ae" # UPDATE THIS!
PROFILE="dev"
ACCOUNT="abyss_admin"

echo "========================================="
echo "Relics Initialization Script"
echo "========================================="
echo ""

# Effect Types:
# 0 = RandomJackpot
# 1 = Trigger666 (Scorcher)
# 2 = DoubleNextSpin (Lucky)
# 3 = ResetSpins (Phantom)
# 4 = FreeMarketRefresh (Inferno)

echo "Creating Relic Drops..."
echo ""

# 1. Mortis (Force Random Jackpot)
# Price 44444 CHIP
echo "[1/5] Creating Mortis..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $RELIC_CONTRACT \
  --function create_relic_drop \
  --arguments '1, 0x4d6f72746973, 0x466f7263652052616e646f6d204a61636b706f74, 0, 5, 0, 0x697066733a2f2f6d6f72746973, 0, 0, 0, 1, 0, 0, 1, 44444000000000000000000, 5'
sleep 5

# 2. Phantom (Reset to Max Spins)
# Price 33333 CHIP
echo "[2/5] Creating Phantom..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $RELIC_CONTRACT \
  --function create_relic_drop \
  --arguments '2, 0x5068616e746f6d, 0x496d6d65646961746520526573657420746f204d6178205370696e73, 3, 5, 0, 0x697066733a2f2f7068616e746f6d, 0, 0, 0, 0, 1, 0, 0, 33333000000000000000000, 7'
sleep 5

# 3. Lucky the Dealer (5x Next Spin)
# Price 22222 CHIP
echo "[3/5] Creating Lucky the Dealer..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $RELIC_CONTRACT \
  --function create_relic_drop \
  --arguments '3, 0x4c75636b7920746865204465616c6572, 0x3578204e657874205370696e2053636f7265, 2, 3, 1, 0x697066733a2f2f6c75636b79, 0, 0, 0, 0, 0, 1, 0, 22222000000000000000000, 10'
sleep 5

# 4. Scorcher (End Session)
# Price 15555 CHIP
echo "[4/5] Creating Scorcher..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $RELIC_CONTRACT \
  --function create_relic_drop \
  --arguments '4, 0x53636f7263686572, 0x496d6d6564696174656c7920456e642053657373696f6e, 1, 5, 1, 0x697066733a2f2f73636f7263686572, 0, 0, 1, 0, 0, 0, 0, 15555000000000000000000, 10'
sleep 5

# 5. Inferno (Free Market Refresh)
# Price 11111 CHIP
echo "[5/5] Creating Inferno..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $RELIC_CONTRACT \
  --function create_relic_drop \
  --arguments '5, 0x496e6665726e6f, 0x496d6d6564696174652046726565204d61726b65742052656672657368, 4, 3, 1, 0x697066733a2f2f696e6665726e6f, 0, 1, 0, 0, 0, 0, 0, 11111000000000000000000, 10'
sleep 5

echo ""
echo "========================================="
echo "Relic Drops Created!"
echo "========================================="
echo ""
echo "Now configuring contracts..."
echo ""

# Configure AbyssGame to know about Relic contract
echo "Setting Relic NFT address in AbyssGame..."
sncast -p $PROFILE --account $ACCOUNT invoke \
  --contract-address $ABYSS_GAME_CONTRACT \
  --function set_relic_nft_address \
  --arguments "$RELIC_CONTRACT"
sleep 5

echo ""
echo "========================================="
echo "DONE! Relic system is ready!"
echo "========================================="
echo ""
echo "Relic Contract: $RELIC_CONTRACT"
echo "Game Contract:  $ABYSS_GAME_CONTRACT"
