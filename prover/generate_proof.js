
#!/usr/bin/env node
/**
 * PVE Proof Generator
 * Usage: node generate_proof.js <circuit> <input_json>
 *   circuit : format | threshold | membership | integrity | boundary
 *   input   : path to JSON input file (see inputs/ for examples)
 *
 * Outputs: proof.json + public.json in ./outputs/<circuit>/
 */

"use strict";
const snarkjs  = require("snarkjs");
const fs       = require("fs");
const path     = require("path");

const CIRCUIT  = process.argv[2];
const INPUT_F  = process.argv[3];

if (!CIRCUIT || !INPUT_F) {
    console.error("Usage: node generate_proof.js <circuit> <input.json>");
    process.exit(1);
}

const CIRCUITS_DIR = path.resolve(__dirname, "../circuits");
const KEYS_DIR     = path.resolve(__dirname, "../keys");
const OUT_DIR      = path.resolve(__dirname, `../outputs/${CIRCUIT}`);
fs.mkdirSync(OUT_DIR, { recursive: true });

async function main() {
    const input    = JSON.parse(fs.readFileSync(INPUT_F, "utf8"));
    const wasmFile = path.join(CIRCUITS_DIR, `${CIRCUIT}_js/${CIRCUIT}.wasm`);
    const zkeyFile = path.join(KEYS_DIR,    `${CIRCUIT}_final.zkey`);

    console.log(`[PVE] Generating witness for circuit: ${CIRCUIT}`);
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        wasmFile,
        zkeyFile
    );

    const proofOut  = path.join(OUT_DIR, "proof.json");
    const publicOut = path.join(OUT_DIR, "public.json");
    fs.writeFileSync(proofOut,  JSON.stringify(proof,         null, 2));
    fs.writeFileSync(publicOut, JSON.stringify(publicSignals, null, 2));

    console.log(`[PVE] ✅ Proof written to ${proofOut}`);
    console.log(`[PVE] ✅ Public signals  : ${publicOut}`);

    // Quick sanity — verify locally before sending to receiver
    const vkeyFile = path.join(KEYS_DIR, `${CIRCUIT}_verification_key.json`);
    if (fs.existsSync(vkeyFile)) {
        const vKey    = JSON.parse(fs.readFileSync(vkeyFile, "utf8"));
        const ok      = await snarkjs.groth16.verify(vKey, publicSignals, proof);
        console.log(`[PVE] Local verification: ${ok ? "PASS ✅" : "FAIL ❌"}`);
        if (!ok) process.exit(2);
    } else {
        console.warn("[PVE] ⚠️  Verification key not found — skipping local verify");
    }
}

main().catch(err => { console.error("[PVE] ERROR:", err.message); process.exit(1); });
