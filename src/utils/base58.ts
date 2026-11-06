/**
 * Base58 (Bitcoin alphabet) — the only text encoding TRON addresses need.
 *
 * Small and fixed enough to own rather than depend on: it is the classic
 * base-256 <-> base-58 long division over a digit buffer, with leading zero
 * bytes mapped to leading `1`s.
 */
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/** ASCII code -> digit value, or 255 for characters outside the alphabet. */
const DIGIT = /* @__PURE__ */ (() => {
    const table = new Uint8Array(128).fill(255);
    for (let i = 0; i < ALPHABET.length; i++) table[ALPHABET.charCodeAt(i)] = i;
    return table;
})();

/** Encode bytes as a base58 string. */
export const base58Encode = (bytes: Uint8Array): string => {
    let zeros = 0;
    while (zeros < bytes.length && bytes[zeros] === 0) zeros++;

    // log(256) / log(58) ≈ 1.366: an upper bound on the digits needed.
    const size = (((bytes.length - zeros) * 138) / 100 + 1) >>> 0;
    const digits = new Uint8Array(size);
    let length = 0;
    for (let i = zeros; i < bytes.length; i++) {
        let carry = bytes[i];
        let used = 0;
        for (let k = size - 1; (carry !== 0 || used < length) && k >= 0; k--, used++) {
            carry += 256 * digits[k];
            digits[k] = carry % 58;
            carry = (carry / 58) | 0;
        }
        length = used;
    }

    let out = '1'.repeat(zeros);
    for (let k = size - length; k < size; k++) out += ALPHABET[digits[k]];
    return out;
};

/** Decode a base58 string to bytes. Throws on any character outside the alphabet. */
export const base58Decode = (text: string): Uint8Array => {
    let zeros = 0;
    while (zeros < text.length && text[zeros] === '1') zeros++;

    // log(58) / log(256) ≈ 0.733: an upper bound on the bytes needed.
    const size = (((text.length - zeros) * 733) / 1000 + 1) >>> 0;
    const bytes = new Uint8Array(size);
    let length = 0;
    for (let i = zeros; i < text.length; i++) {
        const code = text.charCodeAt(i);
        let carry = code < 128 ? DIGIT[code] : 255;
        if (carry === 255) throw new Error(`Invalid base58 character "${text[i]}"`);
        let used = 0;
        for (let k = size - 1; (carry !== 0 || used < length) && k >= 0; k--, used++) {
            carry += 58 * bytes[k];
            bytes[k] = carry & 0xff;
            carry >>= 8;
        }
        length = used;
    }

    const out = new Uint8Array(zeros + length);
    out.set(bytes.subarray(size - length), zeros);
    return out;
};
