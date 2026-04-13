#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROFILE="${PROFILE:-sepolia}"
MANIFEST_PATH="${MANIFEST_PATH:-${ROOT_DIR}/manifest_${PROFILE}.json}"
ACCOUNT_NAME="${ACCOUNT_NAME:-abyss_admin}"
ACCOUNTS_FILE="${ACCOUNTS_FILE:-/Users/adran/.starknet_accounts/starknet_open_zeppelin_accounts.json}"
DEFAULT_RPC_URL="https://api.cartridge.gg/x/starknet/${PROFILE}"
RPC_URL="${RPC_URL:-${DEFAULT_RPC_URL}}"

ABI_SOURCE="${ROOT_DIR}/target/${PROFILE}/abyss_game_Setup.contract_class.json"
if [[ ! -f "${ABI_SOURCE}" ]]; then
  ABI_SOURCE="${ROOT_DIR}/target/dev/abyss_game_Setup.contract_class.json"
fi

if [[ ! -f "${ABI_SOURCE}" ]]; then
  echo "Missing ABI at ${ABI_SOURCE}. Run 'sozo build' first." >&2
  exit 1
fi

: "${PAYMENT_TOKEN:?PAYMENT_TOKEN is required}"
: "${PRICE:-0}"
: "${IMAGE_URI:?IMAGE_URI is required}"

if [[ -z "${SETUP_ADDRESS:-}" && -f "${MANIFEST_PATH}" ]]; then
  SETUP_ADDRESS="$(jq -r '.contracts[] | select(.tag=="ABYSS-Setup") | .address' "${MANIFEST_PATH}")"
fi

: "${SETUP_ADDRESS:?SETUP_ADDRESS is required or must be discoverable from MANIFEST_PATH}"

REFERRAL_PERCENTAGE="${REFERRAL_PERCENTAGE:-0}"
PAYMENT_RECEIVER="${PAYMENT_RECEIVER:-0}"
ALLOWER="${ALLOWER:-0}"

ABI_FILE="$(mktemp /tmp/abyss-setup-abi.XXXXXX.json)"
trap 'rm -f "${ABI_FILE}"' EXIT

jq '.abi' "${ABI_SOURCE}" > "${ABI_FILE}"

# Arguments for register_free_social_bundle:
# referral_percentage, price, payment_token, payment_receiver, image_uri, allower
ARGUMENTS="${REFERRAL_PERCENTAGE}, ${PRICE}, ${PAYMENT_TOKEN}, ${PAYMENT_RECEIVER}, \"${IMAGE_URI}\", ${ALLOWER}"
SERIALIZED="$(sncast utils serialize --abi-file "${ABI_FILE}" --function register_free_social_bundle --arguments "${ARGUMENTS}")"
CALLDATA="$(printf '%s\n' "${SERIALIZED}" | sed -n 's/^Calldata: \[//; s/\]$//; p' | tr ',' ' ')"

if [[ -z "${CALLDATA// }" ]]; then
  echo "Failed to serialize calldata for register_free_social_bundle." >&2
  exit 1
fi

echo "Invoking register_free_social_bundle on ${SETUP_ADDRESS}"
if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo "Calldata: ${CALLDATA}"
  exit 0
fi

sncast --wait \
  --account "${ACCOUNT_NAME}" \
  --accounts-file "${ACCOUNTS_FILE}" \
  invoke \
  --url "${RPC_URL}" \
  --contract-address "${SETUP_ADDRESS}" \
  --function register_free_social_bundle \
  --calldata ${CALLDATA}
