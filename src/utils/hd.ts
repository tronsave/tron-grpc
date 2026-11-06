/**
 * Mnemonic -> seed (BIP-39) and seed -> private key (BIP-32), secp256k1 only.
 *
 * This is the small slice of the two standards that deriving a TRON key needs —
 * private derivation along a path — built on the hash and curve primitives the
 * library already depends on. It matches the standards' published test vectors
 * (see `test/unit.test.mjs`).
 *
 * Out of scope, deliberately: wordlists and mnemonic checksum validation
 * (a mnemonic is accepted as given, as before), extended-key (xprv/xpub)
 * serialization, and public-only derivation.
 */
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { hmac } from '@noble/hashes/hmac.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha512 } from '@noble/hashes/sha2.js';

const TEXT_ENCODER = new TextEncoder();
const HARDENED_OFFSET = 0x80000000;
const MASTER_SECRET = /* @__PURE__ */ TEXT_ENCODER.encode('Bitcoin seed');

/** Scalar field of secp256k1: arithmetic modulo the curve order `n`. */
const Fn = secp256k1.Point.Fn;

const nfkd = (text: string, what: string): string => {
    if (typeof text !== 'string') throw new TypeError(`invalid ${what} type: ${typeof text}`);
    return text.normalize('NFKD');
};

/**
 * BIP-39: derive the 64-byte seed from a mnemonic sentence and optional passphrase
 * (PBKDF2-HMAC-SHA512, 2048 rounds, salt `"mnemonic" + passphrase`, both NFKD).
 *
 * Only the word count is checked (12/15/18/21/24): the words are not validated
 * against a wordlist or checksum.
 */
export const mnemonicToSeed = (mnemonic: string, passphrase: string = ''): Uint8Array => {
    const sentence = nfkd(mnemonic, 'mnemonic');
    if (![12, 15, 18, 21, 24].includes(sentence.split(' ').length)) throw new Error('Invalid mnemonic');
    const salt = nfkd(`mnemonic${nfkd(passphrase, 'passphrase')}`, 'passphrase');
    return pbkdf2(sha512, TEXT_ENCODER.encode(sentence), TEXT_ENCODER.encode(salt), { c: 2048, dkLen: 64 });
};

/** Parse `m/44'/195'/0'/0/0` into child indexes (hardened ones offset by 2^31). */
const parsePath = (path: string): number[] => {
    if (!/^[mM]'?/.test(path)) throw new Error('Path must start with "m" or "M"');
    if (/^[mM]'?$/.test(path)) return [];
    return path
        .replace(/^[mM]'?\//, '')
        .split('/')
        .map(part => {
            const match = /^(\d+)('?)$/.exec(part);
            if (!match) throw new Error(`invalid child index: ${part}`);
            const index = Number(match[1]);
            if (!Number.isSafeInteger(index) || index >= HARDENED_OFFSET) throw new Error('Invalid index');
            return match[2] ? index + HARDENED_OFFSET : index;
        });
};

/**
 * BIP-32: derive the private key at `path` from a seed (CKDpriv along the path).
 * Returns the 32-byte secp256k1 private key.
 */
export const derivePrivateKey = (seed: Uint8Array, path: string): Uint8Array => {
    if (seed.length < 16 || seed.length > 64) {
        throw new RangeError(`seed length must be between 128 and 512 bits, got ${seed.length * 8}`);
    }
    const indexes = parsePath(path);

    const master = hmac(sha512, MASTER_SECRET, seed);
    let key: Uint8Array = master.slice(0, 32);
    let chainCode: Uint8Array = master.slice(32);
    master.fill(0);
    if (!secp256k1.utils.isValidSecretKey(key)) throw new Error('Invalid master key derived from seed');

    for (let index of indexes) {
        for (;;) {
            // Hardened: 0x00 || ser256(k_par) || ser32(i).  Normal: serP(K_par) || ser32(i).
            const data = new Uint8Array(37);
            if (index >= HARDENED_OFFSET) data.set(key, 1);
            else data.set(secp256k1.getPublicKey(key, true), 0);
            new DataView(data.buffer).setUint32(33, index, false);

            const I = hmac(sha512, chainCode, data);
            data.fill(0);
            // Decode without reducing: BIP-32 says to move to the next index when
            // parse256(I_L) >= n or the child key is zero (probability < 2^-127).
            const tweak = Fn.fromBytes(I.subarray(0, 32), true);
            const child = Fn.isValid(tweak) ? Fn.create(Fn.fromBytes(key) + tweak) : 0n;
            if (Fn.isValidNot0(child)) {
                key.fill(0);
                key = Fn.toBytes(child);
                chainCode = I.slice(32);
                I.fill(0);
                break;
            }
            I.fill(0);
            if (index === HARDENED_OFFSET - 1 || index === 2 ** 32 - 1) {
                throw new Error(`cannot retry child derivation at index ${index}`);
            }
            index++;
        }
    }
    chainCode.fill(0);
    return key;
};
