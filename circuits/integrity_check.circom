pragma circom 2.0.0;
include "node_modules/circomlib/circuits/poseidon.circom";

// Proves that the submitted token equals Poseidon(server_secret, session_id).
// Public  input : commitment (= Poseidon(server_secret, session_id), known to verifier)
// Private inputs: token, server_secret, session_id
// Output        : valid = 1 (always, when proof verifies — constraint enforces equality)

template IntegrityCheck() {
    signal input token;
    signal input server_secret;
    signal input session_id;
    signal input commitment;   // public
    signal output valid;

    // Compute Poseidon(server_secret, session_id)
    component hasher = Poseidon(2);
    hasher.inputs[0] <== server_secret;
    hasher.inputs[1] <== session_id;

    // Hard constraint 1: token must equal the hash
    hasher.out - token === 0;

    // Hard constraint 2: commitment must equal the hash (binds public input)
    hasher.out - commitment === 0;

    // If both constraints pass, the proof is valid.
    // valid is a constant output — no witness needed.
    valid <== 1;
}

component main { public [commitment] } = IntegrityCheck();
