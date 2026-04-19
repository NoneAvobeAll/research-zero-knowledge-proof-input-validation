
/**
 * PVE Client-side Submission Handler
 * Sends form data to the validation service.
 * On success, forwards proofId to the receiving system.
 */

"use strict";

const VALIDATOR_URL = "http://localhost:3001/validate";
const RECEIVER_URL  = "http://localhost:3002/receive";

document.getElementById("regForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("status");
    status.className = "inf";
    status.style.display = "block";
    status.textContent = "⏳ Generating zero-knowledge proof — please wait...";

    const formData = {
        name:     document.getElementById("name").value.trim(),
        dob:      document.getElementById("dob").value,
        role:     document.getElementById("role").value,
        filePath: document.getElementById("filePath").value.trim(),
        token:    document.getElementById("token").value,
    };

    // Basic client-side pre-check (UX only — not a security boundary)
    if (!formData.name || !formData.dob || !formData.role) {
        status.className = "err";
        status.textContent = "❌ Please fill in all required fields.";
        return;
    }

    try {
        // Step 1: Send to validation service
        const valResp = await fetch(VALIDATOR_URL, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ formData }),
        });
        const valResult = await valResp.json();

        if (!valResult.valid) {
            status.className = "err";
            status.textContent = `❌ Validation failed: ${valResult.error}`;
            return;
        }

        status.textContent = "✅ ZKP generated. Forwarding to receiving system...";

        // Step 2: Forward ONLY the proofId to the receiver (no raw data)
        const recResp = await fetch(RECEIVER_URL, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ proofId: valResult.proofId }),
        });
        const recResult = await recResp.json();

        if (recResult.accepted) {
            status.className = "ok";
            status.textContent = "✅ Submission accepted by the healthcare provider.";
        } else {
            status.className = "err";
            status.textContent = `❌ Receiving system rejected the proof: ${recResult.reason}`;
        }

    } catch (err) {
        status.className = "err";
        status.textContent = `❌ Network error: ${err.message}`;
    }
});
