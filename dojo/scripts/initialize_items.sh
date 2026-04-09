#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROFILE="${PROFILE:-sepolia}"
RPC_URL="${RPC_URL:-https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/dql5pMT88iueZWl7L0yzT56uVk0EBU4L}"
MANIFEST_PATH="${MANIFEST_PATH:-${ROOT_DIR}/manifest_${PROFILE}.json}"
ACCOUNT_NAME="${ACCOUNT_NAME:-abyss_admin}"
ACCOUNTS_FILE="${ACCOUNTS_FILE:-/Users/adran/.starknet_accounts/starknet_open_zeppelin_accounts.json}"
ABI_SOURCE="${ROOT_DIR}/target/${PROFILE}/abyss_game_Setup.contract_class.json"

if [[ ! -f "${ABI_SOURCE}" ]]; then
  ABI_SOURCE="${ROOT_DIR}/target/dev/abyss_game_Setup.contract_class.json"
fi

if [[ ! -f "${ABI_SOURCE}" ]]; then
  echo "Could not find Setup contract artifact. Run 'sozo build -P ${PROFILE}' first." >&2
  exit 1
fi

if [[ -z "${SETUP_ADDRESS:-}" && -f "${MANIFEST_PATH}" ]]; then
  SETUP_ADDRESS="$(jq -r '.contracts[] | select(.tag=="ABYSS-Setup") | .address' "${MANIFEST_PATH}")"
fi

: "${SETUP_ADDRESS:?SETUP_ADDRESS is required or must be discoverable from MANIFEST_PATH}"

echo "Invoking initialize_items on ${SETUP_ADDRESS}"

sncast --wait \
  --account "${ACCOUNT_NAME}" \
  --accounts-file "${ACCOUNTS_FILE}" \
  invoke \
  --url "${RPC_URL}" \
  --contract-address "${SETUP_ADDRESS}" \
  --function initialize_items
