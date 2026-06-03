import { base58 } from '@scure/base';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytesSafe, stripHexPrefix } from './hex';

/** TRON mainnet address prefix byte (0x41) prepended to the 20-byte body. */
export const TRON_ADDRESS_PREFIX = 0x41;

/** Matches a well-formed base58 TRON address: `T` + 33 base58 chars. */
const BASE58_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

/**
 * Decode a base58 TRON address ("T...") into its raw 21-byte form (the 0x41
 * prefix + 20-byte body), stripping the trailing 4-byte checksum.
 */
export const base58ToBytes = (address: string): Uint8Array =>
    base58.decode(address).slice(0, -4);

/**
 * Encode a raw 21-byte TRON address (0x41-prefixed) into its base58 string,
 * appending the standard double-SHA256 4-byte checksum.
 */
export const bytesToBase58Address = (bytes: Uint8Array): string => {
    const checksum = sha256(sha256(bytes)).slice(0, 4);
    const buf = new Uint8Array(bytes.length + 4);
    buf.set(bytes, 0);
    buf.set(checksum, bytes.length);
    return base58.encode(buf);
};

/**
 * Validate a base58 TRON address: correct shape, 25 decoded bytes, and a
 * matching double-SHA256 checksum.
 */
export const isAddress = (address: unknown): address is string => {
    if (typeof address !== 'string' || !BASE58_RE.test(address)) return false;
    let decoded: Uint8Array;
    try {
        decoded = base58.decode(address);
    } catch {
        return false;
    }
    if (decoded.length !== 25) return false;
    const body = decoded.subarray(0, 21);
    const checksum = decoded.subarray(21);
    const expected = sha256(sha256(body)).slice(0, 4);
    return (
        expected[0] === checksum[0] &&
        expected[1] === checksum[1] &&
        expected[2] === checksum[2] &&
        expected[3] === checksum[3]
    );
};

/**
 * Coerce any accepted "human" address representation into raw 21-byte form.
 * Accepts:
 *   - base58 ("T..." 34 chars)
 *   - hex, with or without `0x`, with or without the `41` prefix
 *   - already-decoded raw bytes
 *
 * This is the single funnel the client uses so callers never deal with bytes.
 */
export const toAddressBytes = (address: string | Uint8Array): Uint8Array => {
    if (address instanceof Uint8Array) return address;
    if (BASE58_RE.test(address)) return base58ToBytes(address);

    const hex = stripHexPrefix(address).toLowerCase();
    if (!/^[0-9a-f]+$/.test(hex)) {
        throw new Error(`Invalid address: ${address}`);
    }
    // A 40-char hex (Ethereum-style, no prefix) gets the 0x41 prefix added.
    if (hex.length === 40) return hexToBytesSafe('41' + hex);
    if (hex.length === 42 && hex.startsWith('41')) return hexToBytesSafe(hex);
    throw new Error(`Invalid hex address length for: ${address}`);
};

/** Convert any accepted address representation to base58 ("T..."). */
export const toBase58Address = (address: string | Uint8Array): string => {
    if (typeof address === 'string' && BASE58_RE.test(address)) return address;
    return bytesToBase58Address(toAddressBytes(address));
};

/** Convert any accepted address representation to `41...` hex (no `0x`). */
export const toHexAddress = (address: string | Uint8Array): string =>
    bytesToHex(toAddressBytes(address));

/** Decode a raw address value from a gRPC response (bytes) to base58, if present. */
export const decodeAddress = (value: Uint8Array | string | null | undefined): string | undefined => {
    if (value == null) return undefined;
    const bytes = typeof value === 'string' ? hexToBytesSafe(value) : value;
    if (bytes.length === 0) return undefined;
    return bytesToBase58Address(bytes);
};
