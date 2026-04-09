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

: "${VRF_ADDRESS:?VRF_ADDRESS is required}"

if [[ -z "${SETUP_ADDRESS:-}" && -f "${MANIFEST_PATH}" ]]; then
  SETUP_ADDRESS="$(jq -r '.contracts[] | select(.tag=="ABYSS-Setup") | .address' "${MANIFEST_PATH}")"
fi

: "${SETUP_ADDRESS:?SETUP_ADDRESS is required or must be discoverable from MANIFEST_PATH}"

ABI_FILE="$(mktemp /tmp/abyss-setup-abi.XXXXXX.json)"
trap 'rm -f "${ABI_FILE}"' EXIT

jq '.abi' "${ABI_SOURCE}" > "${ABI_FILE}"

SERIALIZED="$(sncast utils serialize --abi-file "${ABI_FILE}" --function set_vrf --arguments "${VRF_ADDRESS}")"
CALLDATA="$(printf '%s\n' "${SERIALIZED}" | sed -n 's/^Calldata: \[//; s/\]$//; p' | tr ',' ' ')"

if [[ -z "${CALLDATA// }" ]]; then
  echo "Failed to serialize calldata for set_vrf." >&2
  exit 1
fi

echo "Invoking set_vrf on ${SETUP_ADDRESS}"
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
  --function set_vrf \
  --calldata ${CALLDATA}
