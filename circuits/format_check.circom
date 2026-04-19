pragma circom 2.0.0;
include "node_modules/circomlib/circuits/bitify.circom";

// Validates that each character in a fixed-length string (n chars)
// is an ASCII digit (48-57) or uppercase letter (65-90).
//
// Security properties:
//   1. Range: each chars[i] is proven to be in [0,127] via Num2Bits(7).
//   2. Classification: digitOk, letterOk, charOk are boolean-constrained.
//   3. Soundness: charOk=1 requires at least one of digitOk/letterOk = 1.
//   4. Completeness: valid=1 iff ALL n chars are alphanumeric.
//
// Input : chars[n] — ASCII codes (proven 7-bit)
// Output: valid    — 1 iff all chars are alphanumeric, else 0

template FormatCheck(n) {
    signal input chars[n];
    signal output valid;

    // -- 1. Range constraint: each char must be 7-bit (0-127) --------------
    component rangeCheck[n];
    for (var i = 0; i < n; i++) {
        rangeCheck[i] = Num2Bits(7);
        rangeCheck[i].in <== chars[i];
    }

    signal digitOk[n];
    signal letterOk[n];
    signal charOk[n];

    for (var i = 0; i < n; i++) {
        // -- 2. Hint: classify as digit or uppercase letter ----------------
        digitOk[i]  <-- (chars[i] >= 48 && chars[i] <= 57) ? 1 : 0;
        letterOk[i] <-- (chars[i] >= 65 && chars[i] <= 90) ? 1 : 0;
        charOk[i]   <-- (digitOk[i] + letterOk[i] >= 1)    ? 1 : 0;

        // -- 3. Boolean constraints ----------------------------------------
        digitOk[i]  * (1 - digitOk[i])  === 0;
        letterOk[i] * (1 - letterOk[i]) === 0;
        charOk[i]   * (1 - charOk[i])   === 0;

        // -- 4. Soundness: charOk=1 requires digit OR letter ---------------
        // charOk=1 AND both=0 is impossible
        charOk[i] * (1 - digitOk[i]) * (1 - letterOk[i]) === 0;
    }

    // -- 5. All chars must be valid: product accumulator -------------------
    signal acc[n+1];
    acc[0] <== 1;
    for (var i = 0; i < n; i++) {
        acc[i+1] <== acc[i] * charOk[i];
    }
    valid <== acc[n];
}

component main = FormatCheck(7);
