
pragma circom 2.0.0;
include "node_modules/circomlib/circuits/poseidon.circom";

// Proves that the submitted hidden token matches the server commitment.
// Public : commitment = Poseidon(server_secret, session_id)
// Private: token (the raw hidden field value), server_secret, session_id

template IntegrityCheck() {
    signal input token;
    signal input server_secret;
    signal input session_id;
    signal input commitment;  // public
    signal output valid;

    component hasher = Poseidon(2);
    hasher.inputs[0] <== server_secret;
    hasher.inputs[1] <== session_id;

    // token must equal the hash output
    signal diff;
    diff <== hasher.out - token;
    // commitment must also equal the hash
    signal cdiff;
    cdiff <== hasher.out - commitment;
    cdiff === 0;
    // valid = 1 if token matches
    signal tokenMatch;
    tokenMatch <-- diff == 0 ? 1 : 0;
    tokenMatch * (1 - tokenMatch) === 0;
    tokenMatch * diff === 0;
    valid <== tokenMatch;
}

component main { public [commitment] } = IntegrityCheck();
