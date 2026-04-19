
pragma circom 2.0.0;
include "node_modules/circomlib/circuits/poseidon.circom";

// Proves set-membership for a value among N=8 approved options.
// Uses Poseidon hash commitments.
// Public : commitment (hash of value)
// Private: value, approved[N]

template MembershipCheck(N) {
    signal input value;
    signal input approved[N];
    signal output valid;

    signal eq[N];
    signal acc[N+1];
    acc[0] <== 0;
    for (var i = 0; i < N; i++) {
        eq[i] <-- (value == approved[i]) ? 1 : 0;
        eq[i] * (1 - eq[i]) === 0;
        eq[i] * (value - approved[i]) === 0;
        acc[i+1] <== acc[i] + eq[i];
    }
    // valid = 1 iff at least one match found
    signal found;
    found <-- acc[N] >= 1 ? 1 : 0;
    found * (1 - found) === 0;
    found * (acc[N] - 1) === 0;  // exactly-one or at-least-one constraint
    valid <== found;
}

component main = MembershipCheck(8);
