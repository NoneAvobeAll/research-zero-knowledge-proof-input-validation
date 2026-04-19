
#!/usr/bin/env node
/**
 * PVE Receiving System
 * POST /receive { proofId }
 *
 * Fetches proofs from the validator, verifies each one using snarkjs,
 * and accepts or rejects the submission.
 * NEVER sees raw form inputs.
 */

"use strict";
const express  = require("express");
const snarkjs  = require("snarkjs");
const fs       = require("fs");
const path     = require("path");
const https    = require("http");   // use http for local dev

const app      = express();
app.use(express.json());

const KEYS_DIR       = path.resolve(__dirname, "../keys");
const VALIDATOR_HOST = process.env.VALIDATOR_HOST ?? "localhost";
const VALIDATOR_PORT = process.env.VALIDATOR_PORT ?? 3001;

const CIRCUITS = ["format_check","threshold_check","membership_check",
                  "integrity_check","boundary_check"];

function fetchProofs(proofId) {
    return new Promise((resolve, reject) => {
        const req = https.get(
            { host: VALIDATOR_HOST, port: VALIDATOR_PORT,
              path: `/proof/${proofId}`, method: "GET" },
            res => {
                let data = "";
                res.on("data", d => data += d);
                res.on("end", () => {
                    try { resolve(JSON.parse(data)); }
                    catch (e) { reject(e); }
                });
            }
        );
        req.on("error", reject);
    });
}

app.post("/receive", async (req, res) => {
    const { proofId } = req.body ?? {};
    if (!proofId) return res.status(400).json({ accepted: false, reason: "No proofId" });

    try {
        const proofs = await fetchProofs(proofId);

        for (const circuit of CIRCUITS) {
            const entry = proofs[circuit];
            if (!entry) {
                return res.json({ accepted: false, reason: `Missing proof for ${circuit}` });
            }
            const vkeyFile = path.join(KEYS_DIR, `${circuit}_verification_key.json`);
            if (!fs.existsSync(vkeyFile)) {
                return res.json({ accepted: false, reason: `Missing vkey for ${circuit}` });
            }
            const vKey = JSON.parse(fs.readFileSync(vkeyFile, "utf8"));
            const ok   = await snarkjs.groth16.verify(vKey, entry.publicSignals, entry.proof);
            if (!ok) {
                console.warn(`[RECEIVER] ❌ Proof FAILED for ${circuit}`);
                return res.json({ accepted: false, reason: `Proof invalid: ${circuit}` });
            }
            console.log(`[RECEIVER] ✅ ${circuit} proof verified`);
        }

        console.log("[RECEIVER] ✅ ALL proofs valid — submission ACCEPTED");
        return res.json({ accepted: true });

    } catch (err) {
        console.error("[RECEIVER] Error:", err.message);
        return res.status(500).json({ accepted: false, reason: err.message });
    }
});

const PORT = process.env.PORT ?? 3002;
app.listen(PORT, () => console.log(`[RECEIVER] Listening on :${PORT}`));
