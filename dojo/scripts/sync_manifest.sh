#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROFILE="${1:-mainnet}"
SOURCE_MANIFEST="${ROOT_DIR}/manifest_${PROFILE}.json"

if [[ ! -f "${SOURCE_MANIFEST}" ]]; then
  echo "Manifest not found: ${SOURCE_MANIFEST}" >&2
  echo "Run 'sozo migrate -P ${PROFILE}' first so Dojo generates it." >&2
  exit 1
fi

cp "${SOURCE_MANIFEST}" "${ROOT_DIR}/client/src/lib/manifest.json"
cp "${SOURCE_MANIFEST}" "${ROOT_DIR}/web-app/src/lib/manifest.json"

echo "Synced ${SOURCE_MANIFEST} to client and web-app manifests."
