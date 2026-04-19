
pragma circom 2.0.0;

// Validates that each character in a fixed-length postcode (7 chars)
// is an ASCII digit (48-57) or uppercase letter (65-90).
// Input: postcode[7] — array of ASCII character codes
// Output: valid (1 if all chars pass, 0 otherwise)

template FormatCheck(n) {
    signal input chars[n];
    signal output valid;

    signal digitOk[n];
    signal letterOk[n];
    signal charOk[n];

    for (var i = 0; i < n; i++) {
        // digit: 48 <= c <= 57  =>  (c-48) in [0,9]
        digitOk[i] <-- (chars[i] >= 48 && chars[i] <= 57) ? 1 : 0;
        // uppercase letter: 65 <= c <= 90  =>  (c-65) in [0,25]
        letterOk[i] <-- (chars[i] >= 65 && chars[i] <= 90) ? 1 : 0;
        charOk[i]   <-- digitOk[i] + letterOk[i] >= 1 ? 1 : 0;
        charOk[i] * (1 - charOk[i]) === 0;   // charOk is boolean
    }

    // All must be valid
    signal acc[n+1];
    acc[0] <== 1;
    for (var i = 0; i < n; i++) {
        acc[i+1] <== acc[i] * charOk[i];
    }
    valid <== acc[n];
}

component main = FormatCheck(7);
