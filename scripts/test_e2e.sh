#!/usr/bin/env bash
# test_e2e.sh — run all 5 proof-generate + verify cycles
set -euo pipefail

CIRCUITS=("format_check" "threshold_check" "membership_check" "integrity_check" "boundary_check")
INPUTS=("format_input" "threshold_input" "membership_input" "integrity_input" "boundary_input")

PASS=0; FAIL=0

for i in "${!CIRCUITS[@]}"; do
  C="${CIRCUITS[$i]}"
  IN="./prover/inputs/${INPUTS[$i]}.json"
  echo ""
  echo "── $C ─────────────────────────────────"
  if node prover/generate_proof.js "$C" "$IN"; then
    if node verifier/verify_proof.js "$C" \
         "outputs/$C/proof.json" "outputs/$C/public.json"; then
      echo "RESULT: PASS ✅"
      PASS=$((PASS+1))
    else
      echo "RESULT: FAIL ❌ (verification)"
      FAIL=$((FAIL+1))
    fi
  else
    echo "RESULT: FAIL ❌ (proof generation)"
    FAIL=$((FAIL+1))
  fi
done

echo ""
echo "════════════════════════════════════"
echo "E2E Results: $PASS passed / $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
