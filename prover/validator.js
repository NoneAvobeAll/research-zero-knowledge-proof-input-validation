
#!/usr/bin/env node
/**
 * PVE Validation Service
 * POST /validate  { formData: { name, dob, role, token, filePath } }
 *
 * Runs all 5 policy checks, generates proofs, returns combined result.
 * The receiving system calls GET /proof/:id to fetch and verify.
 */

"use strict";
const express  = require("express");
const snarkjs  = require("snarkjs");
const fs       = require("fs");
const path     = require("path");
const crypto   = require("crypto");

const app      = express();
app.use(express.json());

const CIRCUITS_DIR = path.resolve(__dirname, "../circuits");
const KEYS_DIR     = path.resolve(__dirname, "../keys");
const STORE        = {};   // in-memory proof store (use Redis in production)

// ── Helpers ────────────────────────────────────────────────

function strToAscii(s, len) {
    const arr = Array.from(s.slice(0, len)).map(c => c.charCodeAt(0));
    while (arr.length < len) arr.push(0);
    return arr;
}

function ageFromDOB(dobStr) {
    const dob  = new Date(dobStr);
    const now  = new Date();
    let age    = now.getFullYear() - dob.getFullYear();
    const m    = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    return age;
}

async function prove(circuit, input) {
    const wasmFile = path.join(CIRCUITS_DIR, `${circuit}_js/${circuit}.wasm`);
    const zkeyFile = path.join(KEYS_DIR,     `${circuit}_final.zkey`);
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input, wasmFile, zkeyFile
    );
    return { proof, publicSignals };
}

// ── Validation endpoint ────────────────────────────────────

app.post("/validate", async (req, res) => {
    const { name, dob, role, token, filePath } = req.body?.formData ?? {};

    if (!name || !dob || !role || !token || !filePath) {
        return res.status(400).json({ valid: false, error: "Missing required fields" });
    }

    try {
        const results = {};

        // 1. Format check — name treated as 7-char padded alphanumeric
        const nameChars = strToAscii(name.toUpperCase().replace(/[^A-Z0-9]/g, "X"), 7);
        results.format = await prove("format_check", { chars: nameChars });

        // 2. Threshold check — age >= 18
        const age = ageFromDOB(dob);
        results.threshold = await prove("threshold_check", { age, minAge: 18 });

        // 3. Membership check — role in approved set [1..8]
        const roleId = parseInt(role, 10);
        results.membership = await prove("membership_check", {
            value:    roleId,
            approved: [1, 2, 3, 4, 5, 6, 7, 8]
        });

        // 4. Integrity check — hidden token
        // NOTE: server_secret and session_id must match values used at form issue time
        const serverSecret = parseInt(process.env.SERVER_SECRET ?? "42");
        const sessionId    = parseInt(process.env.SESSION_ID    ?? "7");
        results.integrity  = await prove("integrity_check", {
            token:         parseInt(token),
            server_secret: serverSecret,
            session_id:    sessionId,
            commitment:    parseInt(token)   // placeholder — use real Poseidon hash
        });

        // 5. Boundary check — filePath starts with /uploads
        results.boundary = await prove("boundary_check", {
            path:   strToAscii(filePath, 32),
            prefix: strToAscii("/uploads", 8)
        });

        // Store proofs under a random ID
        const proofId = crypto.randomUUID();
        STORE[proofId] = { results, ts: Date.now() };

        return res.json({
            valid:   true,
            proofId,
            message: "All validation checks passed. ZKP generated."
        });

    } catch (err) {
        console.error("[VALIDATOR] Error:", err.message);
        return res.status(500).json({ valid: false, error: err.message });
    }
});

// ── Proof retrieval (for receiver) ────────────────────────

app.get("/proof/:id", (req, res) => {
    const entry = STORE[req.params.id];
    if (!entry) return res.status(404).json({ error: "Proof not found or expired" });
    // Return only proofs + public signals — no raw input data
    const safe = {};
    for (const [k, v] of Object.entries(entry.results)) {
        safe[k] = { proof: v.proof, publicSignals: v.publicSignals };
    }
    return res.json(safe);
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`[VALIDATOR] Service listening on :${PORT}`));
