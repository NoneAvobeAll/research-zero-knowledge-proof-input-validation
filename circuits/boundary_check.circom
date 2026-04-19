
pragma circom 2.0.0;

// Proves that a submitted path starts with an allowed prefix.
// Encodes path and prefix as arrays of ASCII codes.
// path[N], prefix[M] where M <= N
// valid = 1 iff path[0..M-1] == prefix[0..M-1]

template BoundaryCheck(N, M) {
    signal input path[N];
    signal input prefix[M];
    signal output valid;

    signal match[M];
    signal acc[M+1];
    acc[0] <== 1;
    for (var i = 0; i < M; i++) {
        match[i] <-- (path[i] == prefix[i]) ? 1 : 0;
        match[i] * (1 - match[i]) === 0;
        match[i] * (path[i] - prefix[i]) === 0;
        acc[i+1] <== acc[i] * match[i];
    }
    valid <== acc[M];
}

component main = BoundaryCheck(32, 8);
