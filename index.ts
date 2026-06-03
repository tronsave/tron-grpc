/**
 * tron-grpc — package root.
 *
 * Re-exports the entire public API from `./src`. A few backward-compatible
 * aliases are kept for names used by earlier releases.
 */
export * from './src/index';

import {
    privateKeyToAddress,
    base58ToBytes,
    signTransactionId,
} from './src/index';

/** @deprecated Use {@link privateKeyToAddress}. */
export const privateKeyToBase58Address = privateKeyToAddress;

/** @deprecated Use {@link base58ToBytes}. */
export const base58ToHex = base58ToBytes;

/** @deprecated Use {@link signTransactionId}. */
export const signTransaction = signTransactionId;
