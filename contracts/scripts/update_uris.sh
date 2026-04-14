#!/bin/bash

# Configuration
ACCOUNT="my_account"
PROFILE="dev"

CHARM_ADDRESS="0x076dc33ef7e8efbbd6f513f35a47bb94df3a57ab3c66e5985d316d435b70d745"
RELIC_ADDRESS="0x0629007964504df95d64b88806e43ac5d9aa5e2e7583b5c360f4b603a565e0b5"

CHARM_URI="https://play.abyssgame.fun/api/metadata/charm"
RELIC_URI="https://play.abyssgame.fun/api/metadata/relic"

echo "---------------------------------------------------"
echo "Setting Charm Base URI..."
echo "Address: $CHARM_ADDRESS"
echo "URI: $CHARM_URI"

sncast --profile $PROFILE --account $ACCOUNT invoke \
    --contract-address $CHARM_ADDRESS \
    --function set_base_uri \
    --calldata "'$CHARM_URI'"

echo "---------------------------------------------------"
echo "Setting Relic Base URI..."
echo "Address: $RELIC_ADDRESS"
echo "URI: $RELIC_URI"

sncast --profile $PROFILE --account $ACCOUNT invoke \
    --contract-address $RELIC_ADDRESS \
    --function set_base_uri \
    --calldata "'$RELIC_URI'"

echo "---------------------------------------------------"
echo "URI Update Complete!"
