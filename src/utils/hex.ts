import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

/** Strip an optional `0x` / `0X` prefix from a hex string. */
export const stripHexPrefix = (hex: string): string =>
    hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex;

/** Hex string -> bytes, tolerating an optional `0x` prefix and odd length. */
export const hexToBytesSafe = (hex: string): Uint8Array => {
    let clean = stripHexPrefix(hex);
    if (clean.length % 2 !== 0) clean = '0' + clean;
    return hexToBytes(clean);
};

/** Coerce a hex string or raw bytes into bytes (`0x` tolerant). */
export const toBytes = (value: string | Uint8Array): Uint8Array =>
    value instanceof Uint8Array ? value : hexToBytesSafe(value);

/** Bytes -> lowercase hex with no `0x` prefix. */
export const toHex = (value: Uint8Array): string => bytesToHex(value);

/**
 * Encode an unsigned integer as a big-endian 8-byte array — matching java-tron's
 * `ByteArray.fromLong`, used for `BytesMessage` ids (proposals, exchanges).
 */
export const longToBytesBE = (value: number | bigint): Uint8Array => {
    let v = BigInt(value);
    if (v < 0n) throw new Error('longToBytesBE expects a non-negative value');
    const out = new Uint8Array(8);
    for (let i = 7; i >= 0; i--) {
        out[i] = Number(v & 0xffn);
        v >>= 8n;
    }
    return out;
};

export { bytesToHex, hexToBytes };
