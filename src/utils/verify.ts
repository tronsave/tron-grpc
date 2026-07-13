/**
 * Local transaction verification — ECDSA and post-quantum, one entry point.
 *
 * A `Transaction` is self-describing: ECDSA signatures sit in `signature[]` and
 * PQ signatures in `pq_auth_sig[]` (TIP-899). {@link verifyTransaction} looks at
 * which fields are populated and verifies each one with the matching algorithm,
 * so callers don't branch on key type.
 *
 * The two lists are **not** mutually exclusive: a multi-sig account may be
 * authorized by a mix of ECDSA and PQ signers, so both are verified and every
 * recovered signer is reported.
 *
 * Scope: this checks that each signature is *cryptographically valid for this
 * transaction's txid*. It does not check authorization — whether those signers
 * are in the account's `Permission` and meet its threshold is a separate,
 * account-state question that only a node can answer. See {@link verifyTransaction}.
 */
import { sha256 } from '@noble/hashes/sha2.js';
import * as protobuf from 'protobufjs';
import { TransactionRawType } from '../protoLoader';
import { bytesToHex, stripHexPrefix, hexToBytesSafe } from './hex';
import { recoverAddress } from './crypto';
import { PQScheme, pqPublicKeyToAddress, verifyDigestFalcon, FALCON_PUBLIC_KEY_BYTES } from './pq';
import type { KeyType } from '../types';

/** A loose proto-loader `Transaction` object. */
type TransactionLike = Record<string, unknown>;

/** One signature found on a transaction, and whether it checks out. */
export interface TransactionSigner {
    /** Base58 address of the signer: recovered (ECDSA) or derived from the public key (PQ). */
    address: string;
    keyType: KeyType;
    /** PQ scheme name, e.g. `FN_DSA_512`. Absent for ECDSA. */
    scheme?: string;
    /** Whether this signature is cryptographically valid for the transaction's txid. */
    valid: boolean;
    /** Why the signature was rejected, when `valid` is false. */
    error?: string;
}

/** Result of {@link verifyTransaction}. */
export interface TransactionVerification {
    /** The transaction id the signatures were checked against (hex). */
    txid: string;
    /** True when the transaction carries at least one signature and all of them are valid. */
    valid: boolean;
    /** Every signature found, in order: ECDSA first, then PQ. */
    signers: TransactionSigner[];
}

/** True when `value` is what proto3 treats as the field's default (never on the wire). */
const isDefaultScalar = (field: protobuf.Field, value: unknown): boolean => {
    if (field.resolvedType instanceof protobuf.Enum) {
        // proto-loader stringifies enums; the zero value is the default either way.
        const num = typeof value === 'string' ? field.resolvedType.values[value] : Number(value);
        return num === 0;
    }
    switch (field.type) {
        case 'bytes':
            return (value as Uint8Array).length === 0;
        case 'string':
            return value === '';
        case 'bool':
            return value === false;
        default:
            return Number(value) === 0;
    }
};

/**
 * Strip the fields proto-loader materialized from `defaults: true`.
 *
 * proto3 never puts a default-valued field on the wire, so java-tron's `raw_data`
 * bytes contain none of them — but a decoded object has every field present, and
 * re-encoding it would emit empty `data`, `scripts`, `provider`… entries that were
 * never there. That changes the serialization, and therefore the txid.
 */
const pruneDefaults = (type: protobuf.Type, obj: Record<string, unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const field of type.fieldsArray) {
        field.resolve();
        const value = obj[field.name];
        if (value == null) continue;

        if (field.repeated) {
            const items = value as unknown[];
            if (!Array.isArray(items) || items.length === 0) continue;
            out[field.name] =
                field.resolvedType instanceof protobuf.Type
                    ? items.map(item => pruneDefaults(field.resolvedType as protobuf.Type, item as Record<string, unknown>))
                    : items;
            continue;
        }
        // A message that is present — even if empty — was on the wire; keep it.
        if (field.resolvedType instanceof protobuf.Type) {
            out[field.name] = pruneDefaults(field.resolvedType, value as Record<string, unknown>);
            continue;
        }
        if (isDefaultScalar(field, value)) continue;
        out[field.name] = value;
    }
    return out;
};

/**
 * Compute a transaction's id: `SHA-256(Transaction.raw)` — the digest that both
 * ECDSA and PQ signatures are made over.
 *
 * `rawData` is the `raw_data` object as proto-loader decodes it. Verified to
 * reproduce the id of real mainnet and Nile transactions byte-for-byte.
 */
export const computeTxid = (rawData: Record<string, unknown>): string => {
    const pruned = pruneDefaults(TransactionRawType, rawData);
    const bytes = TransactionRawType.encode(TransactionRawType.fromObject(pruned)).finish();
    return bytesToHex(sha256(bytes));
};

/** proto-loader may hand back an enum as its name (`'FN_DSA_512'`) or its number (`1`). */
const schemeName = (scheme: unknown): string => {
    if (typeof scheme === 'string') return scheme;
    const entry = Object.entries(PQScheme).find(([, v]) => v === scheme);
    return entry ? entry[0] : String(scheme);
};

const toBytes = (value: unknown): Uint8Array =>
    typeof value === 'string' ? hexToBytesSafe(stripHexPrefix(value)) : (value as Uint8Array);

/**
 * Verify every signature on a transaction against its txid.
 *
 * @param transaction A `Transaction` as proto-loader decodes it (bytes as Buffers).
 * @param txid Optional transaction id (hex). Computed from `raw_data` when omitted.
 *
 * Returns each signer and whether its signature is valid. A transaction with no
 * signatures at all is reported as invalid.
 *
 * **This is not an authorization check.** A valid signature proves only that the
 * holder of that key signed this exact transaction; it does not prove that key is
 * permitted to move the account's funds. To authorize, compare the reported
 * signers against the account's `Permission` keys and threshold.
 */
export const verifyTransaction = (
    transaction: TransactionLike,
    txid?: string
): TransactionVerification => {
    const rawData = (transaction.raw_data ?? {}) as Record<string, unknown>;
    const id = stripHexPrefix(txid ?? computeTxid(rawData)).toLowerCase();
    const digest = hexToBytesSafe(id);

    const ecdsaSigs = Array.isArray(transaction.signature) ? transaction.signature : [];
    const pqSigs = Array.isArray(transaction.pq_auth_sig) ? (transaction.pq_auth_sig as TransactionLike[]) : [];
    const signers: TransactionSigner[] = [];

    // ECDSA — unchanged semantics: the key is recovered from the signature itself.
    for (const sig of ecdsaSigs) {
        const hex = typeof sig === 'string' ? sig : `0x${bytesToHex(sig as Uint8Array)}`;
        try {
            signers.push({ address: recoverAddress(digest, hex), keyType: 'ECDSA', valid: true });
        } catch (e) {
            signers.push({ address: '', keyType: 'ECDSA', valid: false, error: (e as Error).message });
        }
    }

    // Post-quantum — no recovery primitive, so the public key rides along and the
    // address is derived from it.
    for (const auth of pqSigs) {
        const scheme = schemeName(auth.scheme);
        const publicKey = toBytes(auth.public_key);
        const signature = toBytes(auth.signature);
        const address = publicKey?.length ? pqPublicKeyToAddress(publicKey) : '';

        if (scheme !== 'FN_DSA_512') {
            // Unknown or not-yet-supported scheme (e.g. ML_DSA_44): reject rather
            // than silently treating an unverified signature as valid.
            signers.push({
                address,
                keyType: 'FALCON',
                scheme,
                valid: false,
                error: `Unsupported PQ scheme: ${scheme}`,
            });
            continue;
        }
        if (publicKey.length !== FALCON_PUBLIC_KEY_BYTES) {
            signers.push({
                address,
                keyType: 'FALCON',
                scheme,
                valid: false,
                error: `Invalid FN-DSA-512 public key length: ${publicKey.length}`,
            });
            continue;
        }
        const valid = verifyDigestFalcon(digest, signature, publicKey);
        signers.push({
            address,
            keyType: 'FALCON',
            scheme,
            valid,
            ...(valid ? {} : { error: 'Invalid FN-DSA-512 signature' }),
        });
    }

    return {
        txid: id,
        valid: signers.length > 0 && signers.every(s => s.valid),
        signers,
    };
};
