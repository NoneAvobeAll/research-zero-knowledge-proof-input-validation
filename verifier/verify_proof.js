
#!/usr/bin/env node
/**
 * PVE Proof Verifier  (Receiving System)
 * Usage: node verify_proof.js <circuit> <proof.json> <public.json>
 *
 * Returns exit code 0 on valid proof, 1 on invalid.
 * The receiver NEVER sees raw input — only the proof + public signals.
 */

"use strict";
const snarkjs = require("snarkjs");
const fs      = require("fs");
const path    = require("path");

const CIRCUIT = process.argv[2];
const PROOF_F = process.argv[3];
const PUBLIC_F= process.argv[4];

if (!CIRCUIT || !PROOF_F || !PUBLIC_F) {
    console.error("Usage: node verify_proof.js <circuit> <proof.json> <public.json>");
    process.exit(1);
}

const KEYS_DIR = path.resolve(__dirname, "../keys");

async function main() {
    const vkeyFile = path.join(KEYS_DIR, `${CIRCUIT}_verification_key.json`);
    if (!fs.existsSync(vkeyFile)) {
        console.error(`[VERIFIER] ❌ Verification key not found: ${vkeyFile}`);
        process.exit(1);
    }

    const vKey          = JSON.parse(fs.readFileSync(vkeyFile,  "utf8"));
    const proof         = JSON.parse(fs.readFileSync(PROOF_F,   "utf8"));
    const publicSignals = JSON.parse(fs.readFileSync(PUBLIC_F,  "utf8"));

    console.log(`[VERIFIER] Verifying proof for circuit: ${CIRCUIT}`);
    const start = Date.now();
    const ok    = await snarkjs.groth16.verify(vKey, publicSignals, proof);
    const ms    = Date.now() - start;

    if (ok) {
        console.log(`[VERIFIER] ✅ PROOF VALID — submission ACCEPTED (${ms}ms)`);
        process.exit(0);
    } else {
        console.log(`[VERIFIER] ❌ PROOF INVALID — submission REJECTED (${ms}ms)`);
        process.exit(1);
    }
}

main().catch(err => { console.error("[VERIFIER] ERROR:", err.message); process.exit(1); });
