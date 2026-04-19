pragma circom 2.0.0;
include "node_modules/circomlib/circuits/comparators.circom";

// Proves set-membership: value is one of N approved options.
// Does NOT require unique values in approved[].
// Output: valid = 1 iff value matches at least one approved[i].

template MembershipCheck(N) {
    signal input value;
    signal input approved[N];
    signal output valid;

    signal eq[N];
    signal acc[N+1];
    acc[0] <== 0;

    component isz[N];
    for (var i = 0; i < N; i++) {
        // isz[i].out = 1 iff (value - approved[i]) == 0
        isz[i] = IsZero();
        isz[i].in <== value - approved[i];
        eq[i] <== isz[i].out;
        acc[i+1] <== acc[i] + eq[i];
    }

    // found = 1 iff acc[N] >= 1
    // Use IsZero on acc[N]: if acc[N]==0 then notFound=1
    component notFoundCheck = IsZero();
    notFoundCheck.in <== acc[N];
    // valid = 1 - notFound
    valid <== 1 - notFoundCheck.out;
}

component main = MembershipCheck(8);
