/**
 * Post-quantum signatures — TIP-899 (FN-DSA-512 / Falcon-512).
 *
 * Wire formats here follow TIP-899 exactly, so the artifacts this module
 * produces are verifiable by java-tron (which verifies with BouncyCastle):
 *
 * - `public_key`  fixed 896 B — Falcon's `h`, with no encoding tag.
 * - `signature`   variable 617–667 B — the *headed* compressed encoding
 *                 (`0x39 ‖ salt(40) ‖ s2_compressed`). java-tron caps the
 *                 upper bound at 667 B and rejects anything outside the range,
 *                 so {@link signDigestFalcon} resamples until it fits.
 * - `pq_address`  `0x41 ‖ Keccak-256(public_key)[12..32]` — same 160-bit
 *                 address space as ECDSA, so PQ accounts are ordinary "T..."
 *                 addresses.
 *
 * The underlying Falcon implementation is `@noble/post-quantum`, which tags its
 * keys with a leading byte (pk 897 = `0x09 ‖ h`, sk 1281 = `0x59 ‖ f,g,F`).
 * TRON carries the untagged forms, so the tag is stripped on the way out and
 * restored on the way in.
 */
import { falcon512 } from '@noble/post-quantum/falcon.js';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3.js';
import { bytesToHex, hexToBytesSafe, stripHexPrefix } from './hex';
import { bytesToBase58Address, TRON_ADDRESS_PREFIX } from './address';
import { hashMessage, verifyMessage } from './crypto';

/** TIP-899 post-quantum signature schemes. */
export const PQScheme = {
    UNKNOWN_PQ_SCHEME: 0,
    FN_DSA_512: 1,
    ML_DSA_44: 2,
} as const;

export type PQSchemeValue = (typeof PQScheme)[keyof typeof PQScheme];

/** Fixed length of an FN-DSA-512 public key, as carried on-chain. */
export const FALCON_PUBLIC_KEY_BYTES = 896;
/** Fixed length of an FN-DSA-512 private key, as carried by this library. */
export const FALCON_PRIVATE_KEY_BYTES = 1280;
/** Falcon-512 compressed-signature header byte (`0x30 | logn`, logn = 9). */
export const FALCON_SIGNATURE_HEADER = 0x39;
/** Inclusive signature-length bounds java-tron enforces (headed encoding). */
export const FALCON_SIGNATURE_MIN_BYTES = 617;
export const FALCON_SIGNATURE_MAX_BYTES = 667;
/** Width of the headerless, zero-padded signature slot used by the TVM precompiles. */
export const FALCON_PRECOMPILE_SIGNATURE_BYTES = 666;
/** TVM precompile that verifies one FN-DSA-512 signature. */
export const VERIFY_FN_DSA_512_PRECOMPILE = '0x02000016';

/** Seed length accepted by {@link generateFalconKey}. */
export const FALCON_SEED_BYTES = 48;

/**
 * java-tron resamples an over-long signature rather than emitting one the chain
 * would reject; it gives up after 16 tries. We mirror that bound.
 */
const MAX_SIGN_ATTEMPTS = 16;

/** Encoding tags `@noble/post-quantum` prepends to Falcon-512 keys. */
const NOBLE_PUBLIC_KEY_TAG = 0x09;
const NOBLE_SECRET_KEY_TAG = 0x59;

const prefixByte = (tag: number, body: Uint8Array): Uint8Array => {
    const out = new Uint8Array(body.length + 1);
    out[0] = tag;
    out.set(body, 1);
    return out;
};

/** An FN-DSA-512 keypair. Both halves are hex, without the `0x` prefix. */
export interface FalconKeyPair {
    /** 1280-byte private key (hex). */
    privateKey: string;
    /** 896-byte public key (hex). */
    publicKey: string;
    /** Base58 "T..." address derived from `publicKey`. */
    address: string;
}

const toKeyBytes = (key: string | Uint8Array, expected: number, what: string): Uint8Array => {
    const bytes = typeof key === 'string' ? hexToBytesSafe(stripHexPrefix(key)) : key;
    if (bytes.length !== expected) {
        throw new Error(`Invalid FN-DSA-512 ${what} length: expected ${expected} bytes, got ${bytes.length}`);
    }
    return bytes;
};

/** Normalize a TRON 896-byte public key (hex or bytes) to raw bytes. */
export const falconPublicKeyToBytes = (publicKey: string | Uint8Array): Uint8Array =>
    toKeyBytes(publicKey, FALCON_PUBLIC_KEY_BYTES, 'public key');

/** Normalize a TRON 1280-byte private key (hex or bytes) to raw bytes. */
export const falconPrivateKeyToBytes = (privateKey: string | Uint8Array): Uint8Array =>
    toKeyBytes(privateKey, FALCON_PRIVATE_KEY_BYTES, 'private key');

/**
 * Derive the raw 21-byte (`0x41`-prefixed) TRON address of any PQ public key.
 * TIP-899: `0x41 ‖ Keccak-256(public_key)[12..32]` — the same rule for every
 * scheme, so PQ and ECDSA accounts share one 160-bit address space.
 *
 * Confirmed against a Nile node, which derives the identical address from the
 * `public_key` carried in `pq_auth_sig`.
 */
export const pqPublicKeyToAddressBytes = (publicKey: string | Uint8Array): Uint8Array => {
    const pk = typeof publicKey === 'string' ? hexToBytesSafe(stripHexPrefix(publicKey)) : publicKey;
    const hash = keccak256(pk);
    const addr = new Uint8Array(21);
    addr[0] = TRON_ADDRESS_PREFIX;
    addr.set(hash.subarray(-20), 1);
    return addr;
};

/** Derive the base58 TRON address ("T...") of any PQ public key. */
export const pqPublicKeyToAddress = (publicKey: string | Uint8Array): string =>
    bytesToBase58Address(pqPublicKeyToAddressBytes(publicKey));

/** Derive the raw 21-byte TRON address of an FN-DSA-512 public key (length-checked). */
export const falconPublicKeyToAddressBytes = (publicKey: string | Uint8Array): Uint8Array =>
    pqPublicKeyToAddressBytes(falconPublicKeyToBytes(publicKey));

/** Derive the base58 TRON address ("T...") of an FN-DSA-512 public key. */
export const falconPublicKeyToAddress = (publicKey: string | Uint8Array): string =>
    bytesToBase58Address(falconPublicKeyToAddressBytes(publicKey));

/** Recover the public key of an FN-DSA-512 private key. */
export const falconPrivateKeyToPublicKey = (privateKey: string | Uint8Array): string => {
    const sk = prefixByte(NOBLE_SECRET_KEY_TAG, falconPrivateKeyToBytes(privateKey));
    return bytesToHex(falcon512.getPublicKey(sk).subarray(1));
};

/**
 * Generate an FN-DSA-512 keypair.
 *
 * @param seed Optional 48-byte seed (hex or bytes) for deterministic keygen.
 *
 * A seed is only reproducible *within this implementation*. Falcon key
 * generation is FFT-based and not bit-stable across implementations, so the
 * same seed yields a different keypair — and a different address — under
 * java-tron/BouncyCastle (TIP-899 §8 makes the same warning). Back up
 * `privateKey`, not the seed.
 */
export const generateFalconKey = (seed?: string | Uint8Array): FalconKeyPair => {
    const seedBytes = seed === undefined ? undefined : toKeyBytes(seed, FALCON_SEED_BYTES, 'seed');
    const { publicKey, secretKey } = falcon512.keygen(seedBytes);
    const pk = publicKey.subarray(1);
    return {
        privateKey: bytesToHex(secretKey.subarray(1)),
        publicKey: bytesToHex(pk),
        address: falconPublicKeyToAddress(pk),
    };
};

/**
 * Sign a 32-byte digest with FN-DSA-512, returning the headed compressed
 * signature that goes straight into `PQAuthSig.signature`.
 *
 * Falcon's compressed encoding is variable-length and java-tron rejects
 * anything outside 617–667 B, so an out-of-range sample is discarded and
 * re-signed (fresh salt each attempt).
 */
export const signDigestFalcon = (digest: Uint8Array, privateKey: string | Uint8Array): Uint8Array => {
    const sk = prefixByte(NOBLE_SECRET_KEY_TAG, falconPrivateKeyToBytes(privateKey));
    for (let attempt = 0; attempt < MAX_SIGN_ATTEMPTS; attempt++) {
        const signature = falcon512.sign(digest, sk);
        if (
            signature.length >= FALCON_SIGNATURE_MIN_BYTES &&
            signature.length <= FALCON_SIGNATURE_MAX_BYTES
        ) {
            return signature;
        }
    }
    throw new Error(
        `FN-DSA-512 signing failed: no signature within ${FALCON_SIGNATURE_MIN_BYTES}-${FALCON_SIGNATURE_MAX_BYTES} bytes after ${MAX_SIGN_ATTEMPTS} attempts`
    );
};

/** Sign a transaction id (SHA-256 of `raw_data`, given as hex) with FN-DSA-512. */
export const signTransactionIdFalcon = (txid: string, privateKey: string | Uint8Array): Uint8Array =>
    signDigestFalcon(hexToBytesSafe(stripHexPrefix(txid)), privateKey);

/**
 * Verify an FN-DSA-512 signature over a digest. Returns false — rather than
 * throwing — on malformed input, mirroring the node's reject-on-bad-length rule.
 */
export const verifyDigestFalcon = (
    digest: Uint8Array,
    signature: string | Uint8Array,
    publicKey: string | Uint8Array
): boolean => {
    try {
        const sig = typeof signature === 'string' ? hexToBytesSafe(stripHexPrefix(signature)) : signature;
        if (
            sig.length < FALCON_SIGNATURE_MIN_BYTES ||
            sig.length > FALCON_SIGNATURE_MAX_BYTES ||
            sig[0] !== FALCON_SIGNATURE_HEADER
        ) {
            return false;
        }
        const pk = prefixByte(NOBLE_PUBLIC_KEY_TAG, falconPublicKeyToBytes(publicKey));
        return falcon512.verify(sig, digest, pk);
    } catch {
        return false;
    }
};

/* -------------------------------------------------------------------------- */
/* Off-chain message envelope                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Envelope magic: ASCII "TPQ1".
 *
 * An ECDSA message signature is self-describing — `ecrecover` pulls the signer
 * out of the signature alone. Falcon has no recover primitive, so a verifier
 * needs the public key too, and the signature has to say which scheme it is.
 * TIP-899 only standardizes the *on-chain* fields, so this envelope is a
 * library convention: it keeps `signMessage` returning a plain hex string, so
 * call-sites that already handle `signMessageV2` output don't change.
 *
 * Layout: `magic(4) ‖ scheme(1) ‖ pkLen(2 BE) ‖ pk ‖ sigLen(2 BE) ‖ sig`
 */
export const PQ_ENVELOPE_MAGIC = Uint8Array.from([0x54, 0x50, 0x51, 0x31]);
const PQ_ENVELOPE_HEADER_BYTES = PQ_ENVELOPE_MAGIC.length + 1 + 2;

const writeUint16 = (out: Uint8Array, offset: number, value: number): void => {
    out[offset] = (value >>> 8) & 0xff;
    out[offset + 1] = value & 0xff;
};

/** True when `signature` is a PQ envelope rather than an ECDSA hex signature. */
export const isPqEnvelope = (signature: string): boolean => {
    const hex = stripHexPrefix(signature).toLowerCase();
    return hex.startsWith(bytesToHex(PQ_ENVELOPE_MAGIC));
};

/** Pack a scheme + public key + signature into a `0x`-prefixed envelope. */
export const encodePqEnvelope = (
    scheme: PQSchemeValue,
    publicKey: Uint8Array,
    signature: Uint8Array
): string => {
    const out = new Uint8Array(PQ_ENVELOPE_HEADER_BYTES + publicKey.length + 2 + signature.length);
    out.set(PQ_ENVELOPE_MAGIC, 0);
    out[4] = scheme;
    writeUint16(out, 5, publicKey.length);
    out.set(publicKey, 7);
    writeUint16(out, 7 + publicKey.length, signature.length);
    out.set(signature, 9 + publicKey.length);
    return `0x${bytesToHex(out)}`;
};

/** The decoded contents of a PQ message envelope. */
export interface PqEnvelope {
    scheme: PQSchemeValue;
    publicKey: Uint8Array;
    signature: Uint8Array;
}

/** Unpack a PQ envelope. Throws if it is malformed or truncated. */
export const decodePqEnvelope = (envelope: string): PqEnvelope => {
    const bytes = hexToBytesSafe(stripHexPrefix(envelope));
    if (bytes.length < PQ_ENVELOPE_HEADER_BYTES + 2) throw new Error('Malformed PQ envelope: too short');
    for (let i = 0; i < PQ_ENVELOPE_MAGIC.length; i++) {
        if (bytes[i] !== PQ_ENVELOPE_MAGIC[i]) throw new Error('Malformed PQ envelope: bad magic');
    }
    const scheme = bytes[4] as PQSchemeValue;
    const pkLen = (bytes[5] << 8) | bytes[6];
    const sigStart = 7 + pkLen;
    if (bytes.length < sigStart + 2) throw new Error('Malformed PQ envelope: truncated public key');
    const sigLen = (bytes[sigStart] << 8) | bytes[sigStart + 1];
    if (bytes.length !== sigStart + 2 + sigLen) throw new Error('Malformed PQ envelope: length mismatch');
    return {
        scheme,
        publicKey: bytes.subarray(7, sigStart),
        signature: bytes.subarray(sigStart + 2, sigStart + 2 + sigLen),
    };
};

/**
 * Sign a plain-text message with FN-DSA-512, using the same TRON
 * personal-message digest as ECDSA (`\x19TRON Signed Message:\n` + keccak256).
 * Returns a hex envelope — a string, exactly like `signMessage`.
 */
export const signMessagePQ = (
    message: string,
    privateKey: string | Uint8Array,
    publicKey?: string | Uint8Array
): string => {
    const pk = falconPublicKeyToBytes(publicKey ?? falconPrivateKeyToPublicKey(privateKey));
    const signature = signDigestFalcon(hashMessage(message), privateKey);
    return encodePqEnvelope(PQScheme.FN_DSA_512, pk, signature);
};

/**
 * Verify a PQ message envelope and return the base58 address of the signer.
 * Throws if the envelope is malformed or the signature does not verify.
 *
 * Falcon cannot recover a key from a signature, so the address is *derived from
 * the envelope's public key*: an attacker can always re-sign a message with
 * their own key. Compare the returned address against the one you expect —
 * the same pattern as checking `verifyMessageV2`'s result.
 */
export const verifyMessagePQ = (message: string, envelope: string): string => {
    const { scheme, publicKey, signature } = decodePqEnvelope(envelope);
    if (scheme !== PQScheme.FN_DSA_512) {
        throw new Error(`Unsupported PQ scheme in envelope: ${scheme}`);
    }
    if (!verifyDigestFalcon(hashMessage(message), signature, publicKey)) {
        throw new Error('Invalid FN-DSA-512 message signature');
    }
    return falconPublicKeyToAddress(publicKey);
};

/**
 * Verify a signed message from either key type and return the signer's address.
 *
 * A PQ envelope is self-identifying (`isPqEnvelope`), so a dApp login flow can
 * accept ECDSA and post-quantum signers through one path. As always, compare the
 * returned address against the one you expect.
 */
export const verifySignedMessage = (message: string, signature: string): string =>
    isPqEnvelope(signature) ? verifyMessagePQ(message, signature) : verifyMessage(message, signature);

/* -------------------------------------------------------------------------- */
/* TVM precompile input                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Convert a headed signature into the headerless, zero-padded 666-byte slot the
 * TVM precompiles expect (`salt ‖ s2_compressed`, no `0x39` header).
 *
 * The node recovers the true length by scanning back to the last non-zero byte,
 * which is sound because Falcon's compressed encoding never ends in `0x00`.
 */
export const toPrecompileSignature = (signature: Uint8Array): Uint8Array => {
    if (
        signature.length < FALCON_SIGNATURE_MIN_BYTES ||
        signature.length > FALCON_SIGNATURE_MAX_BYTES ||
        signature[0] !== FALCON_SIGNATURE_HEADER
    ) {
        throw new Error('Invalid FN-DSA-512 signature: expected a headed 617-667 byte encoding');
    }
    const slot = new Uint8Array(FALCON_PRECOMPILE_SIGNATURE_BYTES);
    slot.set(signature.subarray(1), 0);
    return slot;
};

/**
 * Build the 1594-byte input for the `VerifyFnDsa512` precompile (`0x02000016`):
 * `msg(32) ‖ sig(666, zero-padded) ‖ pk(896)`.
 */
export const encodeVerifyFnDsa512Input = (
    digest: Uint8Array,
    signature: Uint8Array,
    publicKey: string | Uint8Array
): Uint8Array => {
    if (digest.length !== 32) throw new Error('VerifyFnDsa512 expects a 32-byte message digest');
    const pk = falconPublicKeyToBytes(publicKey);
    const out = new Uint8Array(32 + FALCON_PRECOMPILE_SIGNATURE_BYTES + FALCON_PUBLIC_KEY_BYTES);
    out.set(digest, 0);
    out.set(toPrecompileSignature(signature), 32);
    out.set(pk, 32 + FALCON_PRECOMPILE_SIGNATURE_BYTES);
    return out;
};
