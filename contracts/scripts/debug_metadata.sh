#!/bin/bash

# Configuration
ACCOUNT="my_account"
PROFILE="dev"
RELIC_ADDRESS="0x0629007964504df95d64b88806e43ac5d9aa5e2e7583b5c360f4b603a565e0b5"
TOKEN_ID="0x1"

echo "---------------------------------------------------"
echo "Debugging Relic Token ID: $TOKEN_ID"

echo "1. Checking token_uri..."
sncast --profile $PROFILE --account $ACCOUNT call \
    --contract-address $RELIC_ADDRESS \
    --function token_uri \
    --calldata 0x1 0x0

echo "---------------------------------------------------"
echo "2. Checking Owner..."
sncast --profile $PROFILE --account $ACCOUNT call \
    --contract-address $RELIC_ADDRESS \
    --function owner_of \
    --calldata 0x1 0x0



echo "---------------------------------------------------"
echo "3. Checking Name..."
sncast --profile $PROFILE --account $ACCOUNT call \
    --contract-address $RELIC_ADDRESS \
    --function name

echo "---------------------------------------------------"
echo "4. Checking Symbol..."
sncast --profile $PROFILE --account $ACCOUNT call \
    --contract-address $RELIC_ADDRESS \
    --function symbol


echo "---------------------------------------------------"
echo "6. Checking Upgrade..."
# upgrade takes a ClassHash (felt252), so calldata 0x1 is safe dummy
sncast --profile $PROFILE --account $ACCOUNT call \
    --contract-address $RELIC_ADDRESS \
    --function upgrade \
    --calldata 0x1
