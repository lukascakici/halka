#!/usr/bin/env bash
#
# Deploy Halka's Level 3 contract system to the Stellar Testnet.
#
#   Reputation  — shared trust score
#   Factory     — deploys Circle instances and authorizes them in Reputation
#   Circle wasm — uploaded so the Factory can deploy instances from it
#
# Usage: IDENTITY=halka-deployer ./scripts/deploy-testnet.sh
set -euo pipefail

IDENTITY="${IDENTITY:-halka-deployer}"
NETWORK="${NETWORK:-testnet}"
# Native XLM wrapped as a Stellar Asset Contract (the contribution token).
TOKEN="${TOKEN:-CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC}"

ADMIN=$(stellar keys address "$IDENTITY")
echo "Deployer / admin: $ADMIN"

echo "Building contracts..."
stellar contract build >/dev/null

# Network propagation between upload and deploy (and occasional submission
# timeouts) can need a brief retry, so wrap these in a small retry loop.
retry() {
  local n=0
  until "$@"; do
    n=$((n + 1))
    [ "$n" -ge 4 ] && return 1
    echo "  ...retrying ($n)" >&2
    sleep 4
  done
}
upload() {
  retry stellar contract upload --wasm "target/wasm32v1-none/release/$1.wasm" \
    --source "$IDENTITY" --network "$NETWORK" 2>/dev/null
}
deploy() {
  retry stellar contract deploy --wasm-hash "$1" \
    --source "$IDENTITY" --network "$NETWORK" 2>/dev/null
}
invoke() {
  retry stellar contract invoke --id "$1" --source "$IDENTITY" \
    --network "$NETWORK" -- "${@:2}"
}

echo "Uploading wasm..."
CIRCLE_WASM_HASH=$(upload circle)
REP_HASH=$(upload reputation)
FACTORY_HASH=$(upload factory)

echo "Deploying Reputation..."
REP_ID=$(deploy "$REP_HASH")
echo "Deploying Factory..."
FACTORY_ID=$(deploy "$FACTORY_HASH")

echo "Initializing Reputation (admin=$ADMIN)..."
invoke "$REP_ID" initialize --admin "$ADMIN"

echo "Pointing Reputation at the Factory..."
invoke "$REP_ID" set_factory --factory "$FACTORY_ID"

echo "Initializing Factory..."
invoke "$FACTORY_ID" initialize --admin "$ADMIN" --reputation "$REP_ID" \
  --token "$TOKEN" --circle_wasm "$CIRCLE_WASM_HASH"

echo ""
echo "=== Deployment complete (Testnet) ==="
echo "REPUTATION  = $REP_ID"
echo "FACTORY     = $FACTORY_ID"
echo "CIRCLE_WASM = $CIRCLE_WASM_HASH"
echo "TOKEN       = $TOKEN"
