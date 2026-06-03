import { keccak_256 as keccak256 } from '@noble/hashes/sha3.js';
import { bytesToHex, hexToBytesSafe, stripHexPrefix } from '../utils/hex';
import { toHexAddress } from '../utils/address';

const TEXT_ENCODER = new TextEncoder();

/** keccak256 4-byte selector for a Solidity function signature, as hex. */
export const functionSelector = (signature: string): string =>
    bytesToHex(keccak256(TEXT_ENCODER.encode(signature)).slice(0, 4));

/**
 * Build smart-contract call data: 4-byte selector for `signature` followed by
 * the already-ABI-encoded `params` hex. Returns raw bytes ready for the proto
 * `data` field.
 */
export const encodeFunctionData = (signature: string, params: string = ''): Uint8Array => {
    const selector = functionSelector(signature);
    return hexToBytesSafe(selector + stripHexPrefix(params));
};

/** ABI-encode a single TRON address as a left-padded 32-byte word (hex). */
export const encodeAddressParam = (address: string | Uint8Array): string => {
    // ABI addresses are the 20-byte EVM body (drop TRON's 0x41 prefix), padded.
    const body = toHexAddress(address).slice(2);
    return body.padStart(64, '0');
};

/** ABI-encode a uint256 value as a 32-byte word (hex). */
export const encodeUint256 = (value: bigint | number | string): string => {
    const v = typeof value === 'bigint' ? value : BigInt(value);
    if (v < 0n) throw new Error('uint256 cannot be negative');
    return v.toString(16).padStart(64, '0');
};

/** Decode the first 32-byte word of an ABI-encoded result as an unsigned int. */
export const decodeUint256 = (resultHex: string): bigint => {
    const hex = stripHexPrefix(resultHex);
    if (hex.length === 0) return 0n;
    // Use only the first 32-byte word; single-value returns are exactly that.
    return BigInt('0x' + hex.slice(0, 64));
};
