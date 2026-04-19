#!/usr/bin/env bash
# build_circuits.sh
# Compiles each Circom circuit, runs trusted setup (Powers of Tau),
# and exports the verification key for each circuit.
#
# Prerequisites:
#   npm install -g circom
#   npm install          (snarkjs, circomlib)
#
# Usage: bash scripts/build_circuits.sh

set -euo pipefail

CIRCUITS=("format_check" "threshold_check" "membership_check" "integrity_check" "boundary_check")
KEYS_DIR="./keys"
PTAU="./keys/pot14_final.ptau"

mkdir -p "$KEYS_DIR"

# ── Download Powers of Tau (14 constraints) if not present ────
if [ ! -f "$PTAU" ]; then
  echo "[BUILD] Downloading pot14_final.ptau..."
  curl -L https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau \
       -o "$PTAU"
fi

for CIRCUIT in "${CIRCUITS[@]}"; do
  echo ""
  echo "[BUILD] ══════════════════════════════════════"
  echo "[BUILD] Processing: $CIRCUIT"

  CIRCOM_SRC="./circuits/${CIRCUIT}.circom"
  R1CS_FILE="./keys/${CIRCUIT}.r1cs"
  ZKEY_0="./keys/${CIRCUIT}_0.zkey"
  ZKEY_FINAL="./keys/${CIRCUIT}_final.zkey"
  VKEY="./keys/${CIRCUIT}_verification_key.json"

  # 1. Compile
  circom "$CIRCOM_SRC" --r1cs --wasm --sym \
    -o "./circuits" -l node_modules

  mv "./circuits/${CIRCUIT}.r1cs" "$R1CS_FILE"

  # 2. Groth16 setup
  npx snarkjs groth16 setup "$R1CS_FILE" "$PTAU" "$ZKEY_0"

  # 3. Contribute randomness (use /dev/urandom for non-prod)
  echo "random entropy $(head -c 32 /dev/urandom | base64)" | \
    npx snarkjs zkey contribute "$ZKEY_0" "$ZKEY_FINAL" \
    --name="pve-build" -v

  # 4. Export verification key
  npx snarkjs zkey export verificationkey "$ZKEY_FINAL" "$VKEY"

  echo "[BUILD] ✅ $CIRCUIT done — vkey at $VKEY"
done

echo ""
echo "[BUILD] ✅ ALL CIRCUITS BUILT SUCCESSFULLY"
