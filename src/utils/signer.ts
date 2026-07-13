/**
 * Signing strategies, chosen by key type.
 *
 * The point of this layer is that call-sites don't change: `signAndBroadcast`
 * and `sendTrx` take a key, ask {@link getSigner} for the matching strategy, and
 * hand it the transaction. Whether that key is a secp256k1 private key or an
 * FN-DSA-512 keypair is the signer's problem, not the caller's.
 *
 * ECDSA keeps its existing behaviour verbatim — {@link EcdsaSigner} is a wrapper
 * around the functions in `./crypto`, not a reimplementation.
 */
import { privateKeyToAddress, signMessage, signTransactionId } from './crypto';
import {
    PQScheme,
    falconPrivateKeyToPublicKey,
    falconPublicKeyToAddress,
    falconPublicKeyToBytes,
    signMessagePQ,
    signTransactionIdFalcon,
} from './pq';
import { hexToBytesSafe } from './hex';
import type { SigningKey, TronPqKey } from '../types';

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
    readonly keyType: 'ECDSA' | 'FALCON';
    /** Base58 "T..." address of the signing key. */
    readonly address: string;
    /**
     * Sign a plain-text message.
     * ECDSA returns a hex signature; FN-DSA-512 returns a hex PQ envelope.
     */
    signMessage(message: string): string;
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

    signMessage(message: string): string {
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

    signMessage(message: string): string {
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

/** True when `key` is a post-quantum keypair rather than an ECDSA private key. */
export const isPqKey = (key: SigningKey): key is TronPqKey =>
    typeof key === 'object' && key !== null && 'privateKey' in key;

/**
 * Pick the signing strategy for a key: a hex string is an ECDSA private key (as
 * it has always been); an object is a PQ keypair.
 */
export const getSigner = (key: SigningKey): Signer =>
    isPqKey(key) ? new FalconSigner(key) : new EcdsaSigner(key);

/** Base58 address of whichever key type was passed. */
export const addressOf = (key: SigningKey): string => getSigner(key).address;
