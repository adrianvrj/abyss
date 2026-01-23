#!/bin/bash

# Configuration
ACCOUNT="abyss_admin"
PROFILE="dev"

CHARM_ADDRESS="0x076dc33ef7e8efbbd6f513f35a47bb94df3a57ab3c66e5985d316d435b70d745"
RELIC_ADDRESS="0x0629007964504df95d64b88806e43ac5d9aa5e2e7583b5c360f4b603a565e0b5"

CHARM_URI="https://play.abyssgame.fun/api/metadata/charm"
RELIC_URI="https://play.abyssgame.fun/api/metadata/relic"

echo "---------------------------------------------------"
echo "---------------------------------------------------"
echo "---------------------------------------------------"
echo "---------------------------------------------------"
echo "Declaring new Charm Class..."
# Capture stderr too
# output=$(sncast --profile $PROFILE --account $ACCOUNT declare --contract-name Charm 2>&1)
# echo "$output"

# CHARM_CLASS_HASH=$(echo "$output" | grep -o 'class_hash: 0x[0-9a-fA-F]\+' | head -1 | cut -d' ' -f2)
# if [ -z "$CHARM_CLASS_HASH" ]; then
#     # Try finding any hex string that looks like a class hash if "Already declared"
#     # Usually "Class hash already declared: 0x..."
#     CHARM_CLASS_HASH=$(echo "$output" | grep -o '0x[0-9a-fA-F]\{63,64\}' | head -1) 
# fi


# Hardcoded from previous success to avoid "already declared" errors or regex failures
CHARM_CLASS_HASH="0x37712bb6aeaa33471bc08f08f2ffb6f14772210ad83e9d3653f97bfc38de3ce"

if [ -z "$CHARM_CLASS_HASH" ]; then
    echo "ERROR: Could not capture Charm Class Hash. Exiting."
    exit 1
fi
echo "USING KNOWN CHARM HASH: $CHARM_CLASS_HASH"

echo "---------------------------------------------------"
echo "Declaring new Relic Class..."
# output=$(sncast --profile $PROFILE --account $ACCOUNT declare --contract-name Relic 2>&1)
# echo "$output"
# RELIC_CLASS_HASH=$(echo "$output" | grep -o 'class_hash: 0x[0-9a-fA-F]\+' | head -1 | cut -d' ' -f2)
# if [ -z "$RELIC_CLASS_HASH" ]; then
#     RELIC_CLASS_HASH=$(echo "$output" | grep -o '0x[0-9a-fA-F]\{63,64\}' | head -1) 
# fi

CHARM_CLASS_HASH="0x37712bb6aeaa33471bc08f08f2ffb6f14772210ad83e9d3653f97bfc38de3ce"
RELIC_CLASS_HASH="0x5270ef8e7bb4bd4113dd74014baa4b636e61c4597b8ca6fa33368d23c7ecbb1"

if [ -z "$RELIC_CLASS_HASH" ]; then
    echo "ERROR: Could not capture Relic Class Hash. Exiting."
    exit 1
fi
echo "USING KNOWN RELIC HASH: $RELIC_CLASS_HASH"

echo "---------------------------------------------------"
echo "Upgrading Charm Contract ($CHARM_ADDRESS)..."
sncast --profile $PROFILE --account $ACCOUNT invoke \
    --contract-address $CHARM_ADDRESS \
    --function upgrade \
    --arguments "$CHARM_CLASS_HASH"

echo "Waiting for propagation..."
sleep 15

echo "---------------------------------------------------"
echo "Upgrading Relic Contract ($RELIC_ADDRESS)..."
sncast --profile $PROFILE --account $ACCOUNT invoke \
    --contract-address $RELIC_ADDRESS \
    --function upgrade \
    --arguments "$RELIC_CLASS_HASH"

echo "Waiting for propagation..."
sleep 15

echo "---------------------------------------------------"
echo "Setting Base URIs (using --arguments for ByteArray support)..."
sncast --profile $PROFILE --account $ACCOUNT invoke \
    --contract-address $CHARM_ADDRESS \
    --function set_base_uri \
    --arguments "$CHARM_URI"

echo "Waiting before final step..."
sleep 10

sncast --profile $PROFILE --account $ACCOUNT invoke \
    --contract-address $RELIC_ADDRESS \
    --function set_base_uri \
    --arguments "$RELIC_URI"
sncast --profile $PROFILE --account $ACCOUNT invoke \
    --contract-address $CHARM_ADDRESS \
    --function upgrade \
    --arguments "$CHARM_CLASS_HASH"

echo "---------------------------------------------------"
echo "Upgrading Relic Contract ($RELIC_ADDRESS)..."
sncast --profile $PROFILE --account $ACCOUNT invoke \
    --contract-address $RELIC_ADDRESS \
    --function upgrade \
    --arguments "$RELIC_CLASS_HASH"

echo "---------------------------------------------------"
echo "Setting Base URIs (using --arguments for ByteArray support)..."
sncast --profile $PROFILE --account $ACCOUNT invoke \
    --contract-address $CHARM_ADDRESS \
    --function set_base_uri \
    --arguments "$CHARM_URI"

sncast --profile $PROFILE --account $ACCOUNT invoke \
    --contract-address $RELIC_ADDRESS \
    --function set_base_uri \
    --arguments "$RELIC_URI"

echo "---------------------------------------------------"
echo "Fix Applied!"
