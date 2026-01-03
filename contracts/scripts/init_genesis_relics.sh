# Relic Genesis Drop - Individual Commands
# Copy and paste each command one at a time

CONTRACT="0x049f105c90403777e4aac3f9c57256a06cbe81576f76de02cc7642fde662fbda"

# 1. Mortis - Force Random Jackpot
# Luck=1, Vitality=1, 8000 CHIP, 5 supply, Mythic (rarity=0)
sncast -p dev --account my_account invoke \
  --contract-address 0x049f105c90403777e4aac3f9c57256a06cbe81576f76de02cc7642fde662fbda \
  --function create_relic_drop \
  --arguments \
    '1,' \
    "('Mortis')," \
    "('Gentleman of Death')," \
    '0,' \
    '5,' \
    '0,' \
    "('ipfs://mortis')," \
    '0,' '0,' '0,' '1,' '0,' '0,' '1,' \
    '8000000000000000000000,' '0,' \
    '5'

# 2. Phantom - Reset to 5 Spins
# Wisdom=1, 5000 CHIP, 7 supply, Mythic
sncast -p dev --account my_account invoke \
  --contract-address $CONTRACT \
  --function create_relic_drop \
  --arguments \
    '2,' \
    "('Phantom')," \
    "('The Timeless Specter')," \
    '3,' \
    '5,' \
    '0,' \
    "('ipfs://phantom')," \
    '0,' '0,' '0,' '0,' '1,' '0,' '0,' \
    '5000000000000000000000,' '0,' \
    '7'

# 3. Lucky the Dealer - 2x Next Spin Score
# Charisma=1, 3500 CHIP, 10 supply, Legendary (rarity=1)
sncast -p dev --account my_account invoke \
  --contract-address $CONTRACT \
  --function create_relic_drop \
  --arguments \
    '3,' \
    "('Lucky the Dealer')," \
    "('Doubles down on every bet')," \
    '2,' \
    '3,' \
    '1,' \
    "('ipfs://lucky')," \
    '0,' '0,' '0,' '0,' '0,' '1,' '0,' \
    '3500000000000000000000,' '0,' \
    '10'

# 4. Scorcher - Trigger 666
# Intelligence=1, 3200 CHIP, 10 supply, Legendary
sncast -p dev --account my_account invoke \
  --contract-address $CONTRACT \
  --function create_relic_drop \
  --arguments \
    '4,' \
    "('Scorcher')," \
    "('Master of the cursed 666')," \
    '1,' \
    '5,' \
    '1,' \
    "('ipfs://scorcher')," \
    '0,' '0,' '1,' '0,' '0,' '0,' '0,' \
    '3200000000000000000000,' '0,' \
    '10'

# 5. Inferno - Free Market Refresh
# Dexterity=1, 3000 CHIP, 10 supply, Legendary
sncast -p dev --account my_account invoke \
  --contract-address $CONTRACT \
  --function create_relic_drop \
  --arguments \
    '5,' \
    "('Inferno')," \
    "('Hells marketplace demon')," \
    '4,' \
    '3,' \
    '1,' \
    "('ipfs://inferno')," \
    '0,' '1,' '0,' '0,' '0,' '0,' '0,' \
    '3000000000000000000000,' '0,' \
    '10'
