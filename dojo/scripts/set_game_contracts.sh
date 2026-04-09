#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROFILE="${PROFILE:-sepolia}"
MANIFEST_PATH="${MANIFEST_PATH:-${ROOT_DIR}/manifest_${PROFILE}.json}"
ACCOUNT_NAME="${ACCOUNT_NAME:-abyss_admin}"
ACCOUNTS_FILE="${ACCOUNTS_FILE:-/Users/adran/.starknet_accounts/starknet_open_zeppelin_accounts.json}"
RPC_URL="${RPC_URL:-https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/dql5pMT88iueZWl7L0yzT56uVk0EBU4L}"

ABI_SOURCE="${ROOT_DIR}/target/${PROFILE}/abyss_game_Setup.contract_class.json"
if [[ ! -f "${ABI_SOURCE}" ]]; then
  ABI_SOURCE="${ROOT_DIR}/target/dev/abyss_game_Setup.contract_class.json"
fi

if [[ ! -f "${ABI_SOURCE}" ]]; then
  echo "Missing ABI at ${ABI_SOURCE}. Run 'sozo build' first." >&2
  exit 1
fi

if [[ -z "${SETUP_ADDRESS:-}" && -f "${MANIFEST_PATH}" ]]; then
  SETUP_ADDRESS="$(jq -r '.contracts[] | select(.tag=="ABYSS-Setup") | .address' "${MANIFEST_PATH}")"
fi

: "${SETUP_ADDRESS:?SETUP_ADDRESS is required or must be discoverable from MANIFEST_PATH}"

if [[ -z "${CHIP_TOKEN:-}" && -z "${CHARM_NFT:-}" && -z "${RELIC_NFT:-}" && -z "${BEAST_NFT:-}" && -z "${QUOTE_TOKEN:-}" && -z "${ENTRY_PRICE_USD:-}" && -z "${CHARM_BASE_URI:-}" && -z "${RELIC_BASE_URI:-}" ]]; then
  echo "Provide at least one of CHIP_TOKEN, CHARM_NFT, RELIC_NFT, BEAST_NFT, QUOTE_TOKEN, ENTRY_PRICE_USD, CHARM_BASE_URI, or RELIC_BASE_URI." >&2
  exit 1
fi

ABI_FILE="$(mktemp /tmp/abyss-setup-abi.XXXXXX.json)"
trap 'rm -f "${ABI_FILE}"' EXIT

jq '.abi' "${ABI_SOURCE}" > "${ABI_FILE}"

invoke_setup() {
  local function_name="$1"
  local argument="$2"

  local serialized
  serialized="$(sncast utils serialize --abi-file "${ABI_FILE}" --function "${function_name}" --arguments "${argument}")"
  local calldata
  calldata="$(printf '%s\n' "${serialized}" | sed -n 's/^Calldata: \[//; s/\]$//; p' | tr ',' ' ')"

  if [[ -z "${calldata// }" ]]; then
    echo "Failed to serialize calldata for ${function_name}." >&2
    exit 1
  fi

  echo "Invoking ${function_name} on ${SETUP_ADDRESS}"
  if [[ "${DRY_RUN:-0}" == "1" ]]; then
    echo "Calldata: ${calldata}"
    return
  fi

  sncast --wait \
    --account "${ACCOUNT_NAME}" \
    --accounts-file "${ACCOUNTS_FILE}" \
    invoke \
    --url "${RPC_URL}" \
    --contract-address "${SETUP_ADDRESS}" \
    --function "${function_name}" \
    --calldata ${calldata}
}

if [[ -n "${CHIP_TOKEN:-}" ]]; then
  invoke_setup "set_chip_token" "${CHIP_TOKEN}"
fi

if [[ -n "${CHARM_NFT:-}" ]]; then
  invoke_setup "set_charm_nft" "${CHARM_NFT}"
fi

if [[ -n "${RELIC_NFT:-}" ]]; then
  invoke_setup "set_relic_nft" "${RELIC_NFT}"
fi

if [[ -n "${BEAST_NFT:-}" ]]; then
  invoke_setup "set_beast_nft" "${BEAST_NFT}"
fi

if [[ -n "${QUOTE_TOKEN:-}" ]]; then
  invoke_setup "set_quote_token" "${QUOTE_TOKEN}"
fi

if [[ -n "${ENTRY_PRICE_USD:-}" ]]; then
  invoke_setup "set_entry_price_usd" "${ENTRY_PRICE_USD}"
fi

if [[ -n "${CHARM_BASE_URI:-}" ]]; then
  invoke_setup "set_charm_base_uri" "${CHARM_BASE_URI}"
fi

if [[ -n "${RELIC_BASE_URI:-}" ]]; then
  invoke_setup "set_relic_base_uri" "${RELIC_BASE_URI}"
fi
