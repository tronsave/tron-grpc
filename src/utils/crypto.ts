import { secp256k1 } from '@noble/curves/secp256k1.js';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3.js';
import * as bip39 from '@scure/bip39';
import { HDKey } from '@scure/bip32';
import { bytesToHex, hexToBytesSafe, stripHexPrefix } from './hex';
import { bytesToBase58Address, TRON_ADDRESS_PREFIX } from './address';

/** Standard prefix prepended to messages before hashing for personal signing. */
export const TRON_MESSAGE_PREFIX = '\x19TRON Signed Message:\n';

const TEXT_ENCODER = new TextEncoder();
const utf8 = (s: string): Uint8Array => TEXT_ENCODER.encode(s);

/** Normalize a private key hex (with/without `0x`) to 32 raw bytes. */
export const privateKeyToBytes = (privateKey: string): Uint8Array => {
    const hex = stripHexPrefix(privateKey);
    if (hex.length !== 64) throw new Error('Invalid private key length (expected 32 bytes)');
    return hexToBytesSafe(hex);
};

/** Derive the raw 21-byte (0x41-prefixed) TRON address for a private key. */
export const privateKeyToAddressBytes = (privateKey: string): Uint8Array => {
    const publicKey = secp256k1.getPublicKey(privateKeyToBytes(privateKey), false);
    // keccak256 over the 64-byte public key (drop the 0x04 prefix); the address
    // is the trailing 20 bytes, prefixed with TRON's 0x41.
    const hash = keccak256(publicKey.subarray(1));
    const body = hash.subarray(-20);
    const addr = new Uint8Array(21);
    addr[0] = TRON_ADDRESS_PREFIX;
    addr.set(body, 1);
    return addr;
};

/** Derive the base58 TRON address ("T...") for a private key. */
export const privateKeyToAddress = (privateKey: string): string =>
    bytesToBase58Address(privateKeyToAddressBytes(privateKey));

/**
 * Sign a 32-byte digest with secp256k1 and return the TRON/Ethereum-style hex
 * signature `0x{r}{s}{v}`, where v is `1b` (27) or `1c` (28) — exactly what
 * java-tron stores in `Transaction.signature`.
 */
export const signDigest = (digest: Uint8Array, privateKey: string): string => {
    const signature = secp256k1.sign(digest, privateKeyToBytes(privateKey), {
        prehash: false,
        format: 'recovered',
    });
    // `recovered` format is [recovery(1), r(32), s(32)].
    const recovery = signature[0];
    const compact = signature.slice(1, 65);
    return `0x${bytesToHex(compact)}${recovery ? '1c' : '1b'}`;
};

/**
 * Sign a plain-text message using the TRON personal-message scheme:
 * keccak256(prefix || len(message) || message). Matches tronweb `signMessageV2`.
 */
export const signMessage = (message: string, privateKey: string): string => {
    const messageBytes = utf8(message);
    const prefixBytes = utf8(TRON_MESSAGE_PREFIX);
    const lengthBytes = utf8(String(messageBytes.length));

    const combined = new Uint8Array(prefixBytes.length + lengthBytes.length + messageBytes.length);
    combined.set(prefixBytes, 0);
    combined.set(lengthBytes, prefixBytes.length);
    combined.set(messageBytes, prefixBytes.length + lengthBytes.length);

    return signDigest(keccak256(combined), privateKey);
};

/** Sign a transaction id (the SHA256 digest of raw_data, given as hex). */
export const signTransactionId = (txid: string, privateKey: string): string =>
    signDigest(hexToBytesSafe(txid), privateKey);

/**
 * Derive a TRON private key + base58 address from a BIP-39 mnemonic.
 *
 * @param mnemonic BIP-39 mnemonic phrase.
 * @param path     BIP-32 derivation path, e.g. `m/44'/195'/0'/0/0`.
 * @param password Optional BIP-39 passphrase.
 */
export const fromMnemonic = (
    mnemonic: string,
    path: string = "m/44'/195'/0'/0/0",
    password?: string
): { privateKey: string; address: string } => {
    const seed = bip39.mnemonicToSeedSync(mnemonic, password);
    const hdkey = HDKey.fromMasterSeed(seed).derive(path);
    if (!hdkey.privateKey) throw new Error('Could not derive private key from mnemonic/path');
    const privateKey = bytesToHex(hdkey.privateKey);
    return { privateKey, address: privateKeyToAddress(privateKey) };
};
