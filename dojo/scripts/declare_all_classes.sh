#!/usr/bin/env bash

[ -n "${BASH_VERSION:-}" ] || exec bash "$0" "$@"

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROFILE="${PROFILE:-mainnet}"
SCARB_VERSION="${SCARB_VERSION:-2.15.1}"
RPC_URL="${RPC_URL:-https://api.cartridge.gg/x/starknet/${PROFILE}}"
ACCOUNT_NAME="${ACCOUNT_NAME:-abyss_admin}"
ACCOUNTS_FILE="${ACCOUNTS_FILE:-/Users/adran/.starknet_accounts/starknet_open_zeppelin_accounts.json}"
ARTIFACTS_FILE="${ARTIFACTS_FILE:-$ROOT/target/$PROFILE/abyss_game.starknet_artifacts.json}"

if [[ ! -f "$ARTIFACTS_FILE" ]]; then
  echo "Artifacts file not found: $ARTIFACTS_FILE" >&2
  exit 1
fi

CONTRACT_NAMES=()
while IFS= read -r contract_name; do
  CONTRACT_NAMES+=("$contract_name")
done < <(jq -r '.contracts[].contract_name' "$ARTIFACTS_FILE")

if [[ "${#CONTRACT_NAMES[@]}" -eq 0 ]]; then
  echo "No contract names found in $ARTIFACTS_FILE" >&2
  exit 1
fi

failures=0

for contract_name in "${CONTRACT_NAMES[@]}"; do
  echo "Declaring $contract_name..."
  output="$(ASDF_SCARB_VERSION="$SCARB_VERSION" sncast --wait \
    --account "$ACCOUNT_NAME" \
    --accounts-file "$ACCOUNTS_FILE" \
    declare \
    --url "$RPC_URL" \
    --contract-name "$contract_name" \
    --package abyss_game 2>&1)"
  status=$?
  echo "$output"

  if (( status != 0 )); then
    if grep -qi "already declared" <<<"$output"; then
      echo "Skipping $contract_name because it is already declared."
      continue
    fi

    echo "Failed to declare $contract_name" >&2
    failures=$((failures + 1))
  fi
done

if (( failures > 0 )); then
  echo "Finished with $failures failed declarations." >&2
  exit 1
fi

echo "All declarations completed."
