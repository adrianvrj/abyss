#!/bin/bash
# Remove set -e to see all output for debugging
# set -e

# Configuration
ACCOUNT="my_account"
PROFILE="dev"
CHARM_ADDRESS="0x001cef3c4e30b3a55fb152933c5e7179b4b2cc5c0d4cc1510061af5f2d297976"
RELIC_ADDRESS="0x01713e09918f890f0d634e99a7d8ec1ee4c4bdc65f67584f4170d9e3fe2a91f1"

CHARM_URI="https://play.abyssgame.fun/api/metadata/charm"
RELIC_URI="https://play.abyssgame.fun/api/metadata/relic"

echo "---------------------------------------------------"
echo "Declaring Charm contract..."
CHARM_OUTPUT=$(sncast --profile $PROFILE --account $ACCOUNT declare --contract-name Charm 2>&1)
echo "Raw Output:"
echo "$CHARM_OUTPUT"

# Attempt to extract class hash (handle both 'class_hash:' and JSON 'class_hash"')
CHARM_CLASS_HASH=$(echo "$CHARM_OUTPUT" | grep -oE "class_hash: 0x[0-9a-fA-F]+" | cut -d' ' -f2)

if [ -z "$CHARM_CLASS_HASH" ]; then
    # Try alternate format
    CHARM_CLASS_HASH=$(echo "$CHARM_OUTPUT" | grep -oE "0x[0-9a-fA-F]{60,}" | head -n 1)
fi

echo "Parsed Class Hash: '$CHARM_CLASS_HASH'"

if [ -n "$CHARM_CLASS_HASH" ]; then
    echo "Upgrading Charm contract..."
    sncast --profile $PROFILE --account $ACCOUNT invoke \
        --contract-address $CHARM_ADDRESS \
        --function upgrade \
        --calldata $CHARM_CLASS_HASH

    echo "Setting Charm Base URI..."
    sncast --profile $PROFILE --account $ACCOUNT invoke \
        --contract-address $CHARM_ADDRESS \
        --function set_base_uri \
        --calldata "'$CHARM_URI'"
else
    echo "Skipping Charm upgrade due to missing class hash."
fi

echo "---------------------------------------------------"
echo "Declaring Relic contract..."
RELIC_OUTPUT=$(sncast --profile $PROFILE --account $ACCOUNT declare --contract-name Relic 2>&1)
echo "Raw Output:"
echo "$RELIC_OUTPUT"

RELIC_CLASS_HASH=$(echo "$RELIC_OUTPUT" | grep -oE "class_hash: 0x[0-9a-fA-F]+" | cut -d' ' -f2)

if [ -z "$RELIC_CLASS_HASH" ]; then
     RELIC_CLASS_HASH=$(echo "$RELIC_OUTPUT" | grep -oE "0x[0-9a-fA-F]{60,}" | head -n 1)
fi

echo "Parsed Relic Class Hash: '$RELIC_CLASS_HASH'"

if [ -n "$RELIC_CLASS_HASH" ]; then
    echo "Upgrading Relic contract..."
    sncast --profile $PROFILE --account $ACCOUNT invoke \
        --contract-address $RELIC_ADDRESS \
        --function upgrade \
        --calldata $RELIC_CLASS_HASH

    echo "Setting Relic Base URI..."
    sncast --profile $PROFILE --account $ACCOUNT invoke \
        --contract-address $RELIC_ADDRESS \
        --function set_base_uri \
        --calldata "'$RELIC_URI'"
else
    echo "Skipping Relic upgrade due to missing class hash."
fi

echo "Upgrade Script Finished."
