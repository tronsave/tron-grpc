/**
 * Signing strategies, chosen by key type.
 *
 * The point of this layer is that call-sites don't change: `signAndBroadcast`
 * and `sendTrx` take a key, ask {@link getSigner} for the matching strategy, and
 * hand it the transaction. Whether that key is a secp256k1 private key, an
 * FN-DSA-512 keypair or an ML-DSA-44 keypair is the signer's problem, not the
 * caller's.
 *
 * ECDSA keeps its existing behaviour verbatim — {@link EcdsaSigner} is a wrapper
 * around the functions in `./crypto`, not a reimplementation.
 */
import { privateKeyToAddress, signMessage, signTransactionId } from './crypto';
import {
    PQScheme,
    FALCON_PRIVATE_KEY_BYTES,
    ML_DSA_44_PRIVATE_KEY_BYTES,
    falconPrivateKeyToPublicKey,
    falconPublicKeyToAddress,
    falconPublicKeyToBytes,
    mlDsa44PrivateKeyToPublicKey,
    mlDsa44PublicKeyToAddress,
    mlDsa44PublicKeyToBytes,
    signMessageMlDsa44,
    signMessagePQ,
    signTransactionIdFalcon,
    signTransactionIdMlDsa44,
} from './pq';
import { hexToBytesSafe, stripHexPrefix } from './hex';
import type { KeyType, SigningKey, TronPqKey } from '../types';

/** A loose proto-loader transaction object (`Transaction`). */
type TransactionLike = Record<string, unknown>;

/** Append to a repeated proto field without clobbering signatures already on the tx. */
const append = (transaction: TransactionLike, field: string, value: unknown): void => {
    const existing = transaction[field];
    transaction[field] = Array.isArray(existing) ? [...existing, value] : [value];
};

/** Signs messages and transactions with one account's key. */
export interface Signer {
    /** Which algorithm this signer implements. */
    readonly keyType: KeyType;
    /** Base58 "T..." address of the signing key. */
    readonly address: string;
    /**
     * Sign a plain-text message.
     * ECDSA returns a hex signature; PQ schemes return a hex PQ envelope.
     */
    signMessage(message: string | Uint8Array): string;
    /**
     * Attach a signature for `txid` (SHA-256 of `raw_data`, hex) to `transaction`,
     * writing whichever signature field the algorithm uses. Returns the same object.
     */
    signTransaction<T extends TransactionLike>(transaction: T, txid: string): T;
}

/** secp256k1 — the existing signing path, wrapped in the {@link Signer} interface. */
export class EcdsaSigner implements Signer {
    readonly keyType = 'ECDSA' as const;
    readonly address: string;

    constructor(private readonly privateKey: string) {
        this.address = privateKeyToAddress(privateKey);
    }

    signMessage(message: string | Uint8Array): string {
        return signMessage(message, this.privateKey);
    }

    signTransaction<T extends TransactionLike>(transaction: T, txid: string): T {
        append(transaction, 'signature', hexToBytesSafe(signTransactionId(txid, this.privateKey)));
        return transaction;
    }
}

/** FN-DSA-512 (Falcon-512) — TIP-899 post-quantum signing. */
export class FalconSigner implements Signer {
    readonly keyType = 'FALCON' as const;
    readonly address: string;
    private readonly privateKey: string;
    private readonly publicKey: Uint8Array;

    constructor(key: TronPqKey) {
        this.privateKey = key.privateKey;
        this.publicKey = falconPublicKeyToBytes(key.publicKey ?? falconPrivateKeyToPublicKey(key.privateKey));
        this.address = falconPublicKeyToAddress(this.publicKey);
    }

    signMessage(message: string | Uint8Array): string {
        return signMessagePQ(message, this.privateKey, this.publicKey);
    }

    signTransaction<T extends TransactionLike>(transaction: T, txid: string): T {
        // TIP-899: PQ signatures live in `pq_auth_sig`, alongside (never inside)
        // the ECDSA `signature` list, and carry the public key — Falcon has no
        // `ecrecover`, so the node cannot reconstruct it.
        append(transaction, 'pq_auth_sig', {
            scheme: PQScheme.FN_DSA_512,
            public_key: this.publicKey,
            signature: signTransactionIdFalcon(txid, this.privateKey),
        });
        return transaction;
    }
}

/** ML-DSA-44 (FIPS 204) — TIP-899 post-quantum signing. */
export class MlDsa44Signer implements Signer {
    readonly keyType = 'ML_DSA_44' as const;
    readonly address: string;
    private readonly privateKey: string;
    private readonly publicKey: Uint8Array;

    constructor(key: TronPqKey) {
        this.privateKey = key.privateKey;
        this.publicKey = mlDsa44PublicKeyToBytes(key.publicKey ?? mlDsa44PrivateKeyToPublicKey(key.privateKey));
        this.address = mlDsa44PublicKeyToAddress(this.publicKey);
    }

    signMessage(message: string | Uint8Array): string {
        return signMessageMlDsa44(message, this.privateKey, this.publicKey);
    }

    signTransaction<T extends TransactionLike>(transaction: T, txid: string): T {
        append(transaction, 'pq_auth_sig', {
            scheme: PQScheme.ML_DSA_44,
            public_key: this.publicKey,
            signature: signTransactionIdMlDsa44(txid, this.privateKey),
        });
        return transaction;
    }
}

/** True when `key` is a post-quantum keypair rather than an ECDSA private key. */
export const isPqKey = (key: SigningKey): key is TronPqKey =>
    typeof key === 'object' && key !== null && 'privateKey' in key;

/**
 * Which PQ scheme a keypair belongs to: its explicit `keyType`, else inferred
 * from the private key's length — the two schemes' keys never collide.
 */
export const pqKeyType = (key: TronPqKey): 'FALCON' | 'ML_DSA_44' => {
    if (key.keyType) return key.keyType;
    const bytes = stripHexPrefix(key.privateKey).length / 2;
    if (bytes === FALCON_PRIVATE_KEY_BYTES) return 'FALCON';
    if (bytes === ML_DSA_44_PRIVATE_KEY_BYTES) return 'ML_DSA_44';
    throw new Error(
        `Cannot infer PQ scheme from a ${bytes}-byte private key: expected ` +
            `${FALCON_PRIVATE_KEY_BYTES} (FN-DSA-512) or ${ML_DSA_44_PRIVATE_KEY_BYTES} (ML-DSA-44)`
    );
};

/**
 * Pick the signing strategy for a key: a hex string is an ECDSA private key (as
 * it has always been); an object is a PQ keypair of either scheme.
 */
export const getSigner = (key: SigningKey): Signer => {
    if (!isPqKey(key)) return new EcdsaSigner(key);
    return pqKeyType(key) === 'ML_DSA_44' ? new MlDsa44Signer(key) : new FalconSigner(key);
};

/** Base58 address of whichever key type was passed. */
export const addressOf = (key: SigningKey): string => getSigner(key).address;
