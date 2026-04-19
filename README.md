# PVE-ZKP — Proof-of-Validated-Execution Prototype

Zero-knowledge proof-backed input validation for browser-based healthcare forms.
Implements the architecture from the paper:
**"Verifiable Input Validation for Browser-Based Forms Using Zero-Knowledge Proofs"**

---

## Architecture

```
Browser (client)
    │  POST formData
    ▼
Validation Service :3001   ← validator.js
    │  runs 5 ZK policy checks
    │  generates Groth16 proofs
    │  stores under proofId
    │
    │  POST { proofId }        (no raw data forwarded)
    ▼
Receiving System   :3002   ← receiving_system.js
    │  fetches proofs via GET /proof/:id
    │  verifies each proof with snarkjs
    ▼
Accept / Reject
```

---

## Prerequisites

| Tool        | Version  | Install                        |
|-------------|----------|-------------------------------|
| Node.js     | ≥ 18     | https://nodejs.org             |
| Circom      | ≥ 2.1    | `npm install -g circom`        |
| snarkjs     | ≥ 0.7    | included in package.json       |
| circomlib   | ≥ 2.0.5  | included in package.json       |

```bash
npm install
```

---

## Quick Start

### 1. Build all circuits (compile + trusted setup + export keys)
```bash
bash scripts/build_circuits.sh
```
This will:
- Download `pot14_final.ptau` (~288 MB, one time)
- Compile all 5 Circom circuits
- Run Groth16 trusted setup for each
- Export verification keys to `keys/`

### 2. Run end-to-end test (all 5 circuits)
```bash
bash scripts/test_e2e.sh
```

### 3. Start the validation service
```bash
npm run start:validator
# Listening on :3001
```

### 4. Start the receiving system
```bash
npm run start:receiver
# Listening on :3002
```

### 5. Open the browser form
Open `webapp/index.html` in a browser (serve via any static server):
```bash
npx serve webapp/
```

---

## Policy Circuits

| Circuit            | Policy Class     | Private Inputs         | Public Inputs |
|--------------------|------------------|------------------------|---------------|
| format_check       | Format/Structure | chars[7] (ASCII)       | none          |
| threshold_check    | Semantic Range   | age                    | minAge        |
| membership_check   | Approved Set     | value, approved[8]     | none          |
| integrity_check    | Hidden Field     | token, secret, session | commitment    |
| boundary_check     | Path Boundary    | path[32], prefix[8]    | none          |

---

## ⚠️ Security Notes

1. **integrity_check**: The `commitment` value in `integrity_input.json` is a
   placeholder (0). In production, compute `Poseidon(server_secret, session_id)`
   off-circuit using `circomlibjs` and use that value for both `token` and `commitment`.

2. **SERVER_SECRET**: Set via environment variable `SERVER_SECRET` — never hardcode.

3. **Trusted setup**: `build_circuits.sh` uses single-party entropy. For production,
   run a multi-party computation (MPC) ceremony.

4. **Proof storage**: `validator.js` uses in-memory store. Replace with Redis +
   TTL in production.

5. **CORS**: Add CORS middleware to both services before deploying.

---

## Project Structure

```
pve-zkp/
├── circuits/           Circom constraint files (5 circuits)
├── prover/
│   ├── generate_proof.js   CLI proof generator
│   ├── validator.js        Express validation service (:3001)
│   └── inputs/             Sample JSON inputs for each circuit
├── verifier/
│   ├── verify_proof.js         CLI proof verifier
│   └── receiving_system.js     Express receiving system (:3002)
├── webapp/
│   ├── index.html          Healthcare registration form
│   └── submit.js           Client-side ZKP submission handler
├── keys/               Generated keys (after build)
├── outputs/            Generated proofs (after prove)
├── scripts/
│   ├── build_circuits.sh   Full build pipeline
│   └── test_e2e.sh         End-to-end test runner
└── package.json
```
# research-zero-knowledge-proof-input-validation
# research-zero-knowledge-proof-input-validation
