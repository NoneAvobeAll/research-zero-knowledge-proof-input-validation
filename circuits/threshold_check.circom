
pragma circom 2.0.0;
include "node_modules/circomlib/circuits/comparators.circom";

// Proves that a supplied age (computed off-circuit from DOB) is >= minAge
// without revealing the exact age value to the verifier.
// Public input : minAge
// Private input: age (the actual value)

template ThresholdCheck() {
    signal input age;       // private witness
    signal input minAge;    // public: minimum required age
    signal output valid;

    component gte = GreaterEqThan(8);   // 8 bits covers 0-255
    gte.in[0] <== age;
    gte.in[1] <== minAge;
    valid <== gte.out;
}

component main { public [minAge] } = ThresholdCheck();
