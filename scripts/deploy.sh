#!/usr/bin/env bash
#
# Deploy Halka's contract system to a Stellar network.
#
#   Reputation  — shared trust score
#   Factory     — deploys Circle instances and authorizes them in Reputation
#   Circle wasm — uploaded so the Factory can deploy instances from it
#
# Usage:
#   IDENTITY=halka-deployer ./scripts/deploy.sh                    # testnet
#   IDENTITY=halka-mainnet NETWORK=mainnet ./scripts/deploy.sh     # mainnet
#
# The network must already be known to the CLI. Mainnet has no public Soroban
# RPC, so it has to be registered with your own provider endpoint first:
#
#   stellar network add mainnet \
#     --rpc-url https://your-provider.example/soroban/rpc \
#     --network-passphrase "Public Global Stellar Network ; September 2015"
set -euo pipefail

IDENTITY="${IDENTITY:-halka-deployer}"
NETWORK="${NETWORK:-testnet}"

# Ceiling on the inclusion fee, in stroops. The CLI's default of 100 is fine on
# testnet but loses the bid on mainnet, where Soroban traffic keeps the going
# rate around 200 — the symptom is TxInsufficientFee. Only the going rate is
# actually charged, so a generous ceiling costs nothing.
INCLUSION_FEE="${INCLUSION_FEE:-100000}"

ADMIN=$(stellar keys address "$IDENTITY")

# The contribution token is native XLM wrapped as a Stellar Asset Contract. Its
# address differs per network, so derive it rather than hardcoding one.
TOKEN="${TOKEN:-$(stellar contract id asset --asset native --network "$NETWORK")}"

echo "Network:          $NETWORK"
echo "Deployer / admin: $ADMIN"
echo "Token (XLM SAC):  $TOKEN"
echo ""

# Deploying to mainnet spends real XLM and makes the deployer the permanent
# admin of Factory and Reputation, so make it a deliberate act.
if [ "$NETWORK" = "mainnet" ]; then
  echo "⚠️  This deploys to MAINNET with real funds."
  echo "    The deployer key becomes the admin that can upgrade Factory and"
  echo "    Reputation. Losing it means losing the upgrade path."
  echo ""
  read -r -p "Type MAINNET to continue: " confirm
  [ "$confirm" = "MAINNET" ] || { echo "Aborted."; exit 1; }
  echo ""
fi

echo "Building contracts..."
stellar contract build >/dev/null

# Network propagation between upload and deploy (and occasional submission
# timeouts) can need a brief retry, so wrap these in a small retry loop.
#
# stderr is captured rather than discarded: these commands print the contract
# address on stdout, so the noise has to go somewhere, but swallowing it makes
# a real failure look like a silent exit. On the final attempt it is replayed.
ERR_LOG=$(mktemp)
trap 'rm -f "$ERR_LOG"' EXIT

retry() {
  local n=0
  until "$@" 2>"$ERR_LOG"; do
    n=$((n + 1))
    if [ "$n" -ge 4 ]; then
      echo "" >&2
      echo "✗ Failed after $n attempts:" >&2
      cat "$ERR_LOG" >&2
      return 1
    fi
    echo "  ...retrying ($n)" >&2
    sleep 4
  done
}
upload() {
  retry stellar contract upload --wasm "target/wasm32v1-none/release/$1.wasm" \
    --source "$IDENTITY" --network "$NETWORK" --inclusion-fee "$INCLUSION_FEE"
}
deploy() {
  retry stellar contract deploy --wasm-hash "$1" \
    --source "$IDENTITY" --network "$NETWORK" --inclusion-fee "$INCLUSION_FEE"
}
invoke() {
  retry stellar contract invoke --id "$1" --source "$IDENTITY" \
    --network "$NETWORK" --inclusion-fee "$INCLUSION_FEE" -- "${@:2}"
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
echo "=== Deployment complete ($NETWORK) ==="
echo "REPUTATION  = $REP_ID"
echo "FACTORY     = $FACTORY_ID"
echo "CIRCLE_WASM = $CIRCLE_WASM_HASH"
echo "TOKEN       = $TOKEN"

if [ "$NETWORK" = "mainnet" ]; then
  echo ""
  echo "Add these to web/.env.local (and to your Vercel project):"
  echo ""
  echo "NEXT_PUBLIC_MAINNET_FACTORY=$FACTORY_ID"
  echo "NEXT_PUBLIC_MAINNET_REPUTATION=$REP_ID"
  echo ""
  echo "NEXT_PUBLIC_* values are baked in at build time, so redeploy the site"
  echo "after setting them or Mainnet stays locked in the network switcher."
fi
