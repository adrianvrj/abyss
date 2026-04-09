#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROFILE="${PROFILE:-sepolia}"
WORLD_ADDRESS="${WORLD_ADDRESS:-$(jq -r '.world.address' "${ROOT_DIR}/manifest_${PROFILE}.json")}"
WORLD_CONTRACT_CLASS="${WORLD_CONTRACT_CLASS:-${ROOT_DIR}/target/${PROFILE}/abyss_game_world.contract_class.json}"
ACCOUNT_NAME="${ACCOUNT_NAME:-abyss_admin}"
ACCOUNTS_FILE="${ACCOUNTS_FILE:-/Users/adran/.starknet_accounts/starknet_open_zeppelin_accounts.json}"
RPC_URL="${RPC_URL:-https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/dql5pMT88iueZWl7L0yzT56uVk0EBU4L}"
SCARB_VERSION="${SCARB_VERSION:-2.15.1}"
ARCADE_ROOT="${ARCADE_ROOT:-/Users/adran/Library/Caches/com.swmansion.scarb/registry/git/checkouts/arcade-ros7v81nma56g/fc2e81c8}"
NAMESPACE="${NAMESPACE:-ABYSS}"

if [[ ! -f "${WORLD_CONTRACT_CLASS}" ]]; then
  echo "Missing world contract class: ${WORLD_CONTRACT_CLASS}" >&2
  exit 1
fi

WORLD_ABI_FILE="$(mktemp /tmp/abyss-world-abi.XXXXXX.json)"
trap 'rm -f "${WORLD_ABI_FILE}"' EXIT
jq '.abi' "${WORLD_CONTRACT_CLASS}" > "${WORLD_ABI_FILE}"

declare -a MODEL_NAMES=(
  "m_Bundle"
  "m_BundleGroup"
  "m_BundleIssuance"
  "m_BundleReferral"
  "m_BundleVoucher"
)

declare -a EVENT_NAMES=(
  "e_BundleIssued"
  "e_BundleRegistered"
  "e_BundleUpdated"
)

declare_bundle_class() {
  local contract_name="$1"
  local output

  echo "Declaring ${contract_name}..."
  output="$(cd "${ARCADE_ROOT}" && ASDF_SCARB_VERSION="${SCARB_VERSION}" sncast --wait \
    --account "${ACCOUNT_NAME}" \
    --accounts-file "${ACCOUNTS_FILE}" \
    declare \
    --url "${RPC_URL}" \
    --contract-name "${contract_name}" \
    --package bundle 2>&1 || true)"
  echo "${output}"

  if grep -qi "already declared" <<<"${output}"; then
    return 0
  fi

  if ! grep -qi "Success: Declaration completed" <<<"${output}"; then
    echo "Failed to declare ${contract_name}" >&2
    return 1
  fi
}

class_hash_for() {
  local contract_name="$1"

  (
    cd "${ARCADE_ROOT}"
    ASDF_SCARB_VERSION="${SCARB_VERSION}" sncast utils class-hash \
      --contract-name "${contract_name}" \
      --package bundle | awk 'END{print $NF}'
  )
}

invoke_world() {
  local fn="$1"
  local class_hash="$2"
  local serialized calldata

  serialized="$(sncast utils serialize \
    --abi-file "${WORLD_ABI_FILE}" \
    --function "${fn}" \
    --arguments "\"${NAMESPACE}\", ${class_hash}")"
  calldata="$(printf '%s\n' "${serialized}" | sed -n 's/^Calldata: \[//; s/\]$//; p' | tr ',' ' ')"

  if [[ -z "${calldata// }" ]]; then
    echo "Failed to serialize calldata for ${fn} ${class_hash}" >&2
    return 1
  fi

  sncast --wait \
    --account "${ACCOUNT_NAME}" \
    --accounts-file "${ACCOUNTS_FILE}" \
    invoke \
    --url "${RPC_URL}" \
    --contract-address "${WORLD_ADDRESS}" \
    --function "${fn}" \
    --calldata ${calldata}
}

for name in "${MODEL_NAMES[@]}" "${EVENT_NAMES[@]}"; do
  declare_bundle_class "${name}"
done

for name in "${MODEL_NAMES[@]}"; do
  class_hash="$(class_hash_for "${name}")"
  echo "Registering model ${name} with class hash ${class_hash}..."
  invoke_world register_model "${class_hash}"
done

for name in "${EVENT_NAMES[@]}"; do
  class_hash="$(class_hash_for "${name}")"
  echo "Registering event ${name} with class hash ${class_hash}..."
  invoke_world register_event "${class_hash}"
done

echo "Bundle resources registered on ${WORLD_ADDRESS}."
