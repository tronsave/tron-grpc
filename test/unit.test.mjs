/**
 * Offline unit tests — no network, no keys.
 *
 * Runs against the *built* package (`dist/`), i.e. exactly what npm ships, so
 * it also catches build problems: missing .proto copies, broken minification,
 * proto path resolution after compilation.
 *
 *   npm run build && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const lib = require('../dist/index.js');
const vector = JSON.parse(readFileSync(new URL('../tip-pq-message-vector.json', import.meta.url), 'utf8'));

// BIP-39 test mnemonic; its TRON (m/44'/195'/0'/0/0) address is widely published.
const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const MNEMONIC_ADDRESS = 'TUEZSdKsoDHQMeZwihtdoBiN46zxhGWYdH';
const USDT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const USDT_HEX = '41a614f803b6fd780986a42c78ec9c7f77e6ded13c';

test('address: base58 <-> hex round-trip and validation', () => {
    assert.equal(lib.toHexAddress(USDT).toLowerCase(), USDT_HEX);
    assert.equal(lib.toBase58Address(USDT_HEX), USDT);
    assert.equal(lib.toBase58Address(`0x${USDT_HEX}`), USDT);
    assert.equal(lib.isAddress(USDT), true);
    assert.equal(lib.isAddress('not-an-address'), false);
});

test('address: a mistyped base58 address is rejected, never silently decoded', () => {
    const typo = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6u'; // last char changed
    assert.equal(lib.isAddress(typo), false);
    assert.throws(() => lib.toAddressBytes(typo), /checksum/);
    assert.throws(() => lib.toHexAddress(typo), /checksum/);
    assert.throws(() => lib.toBase58Address(typo), /checksum/);
    assert.throws(() => lib.base58ToBytes(typo), /checksum/);
});

test('units: exact TRX <-> sun conversion', () => {
    assert.equal(lib.SUN_PER_TRX.toString(), '1000000');
    assert.equal(lib.trxToSun('1.5').toString(), '1500000');
    assert.equal(lib.sunToTrx(1n).toString(), '0.000001');
    assert.equal(lib.toBaseUnits('123.456789', 6).toString(), '123456789');
    assert.equal(lib.fromBaseUnits(123456789n, 6).toString(), '123.456789');
});

test('ecdsa: mnemonic derivation matches the published address', () => {
    const { privateKey, address } = lib.fromMnemonic(MNEMONIC);
    assert.equal(address, MNEMONIC_ADDRESS);
    assert.equal(lib.privateKeyToAddress(privateKey), MNEMONIC_ADDRESS);
});

test('ecdsa: sign/verify message and transaction id round-trip', () => {
    const { privateKey, address } = lib.fromMnemonic(MNEMONIC);
    const sig = lib.signMessage('hello tron', privateKey);
    assert.equal(lib.verifyMessage('hello tron', sig), address);
    assert.notEqual(lib.verifyMessage('tampered', sig), address);
    assert.equal(lib.verifySignedMessage('hello tron', sig), address);

    const txid = 'aa'.repeat(32);
    assert.equal(lib.verifyTransactionId(txid, lib.signTransactionId(txid, privateKey)), address);
});

test('abi: selector and parameter encoding', () => {
    assert.equal(lib.functionSelector('transfer(address,uint256)'), 'a9059cbb');
    assert.equal(lib.encodeUint256(1n), `${'0'.repeat(63)}1`);
    assert.equal(lib.decodeUint256(`${'0'.repeat(62)}ff`), 255n);
    assert.equal(lib.encodeAddressParam(USDT), `${'0'.repeat(24)}${USDT_HEX.slice(2)}`);
});

test('pq: published TIP test vector still verifies (key + envelope stable)', () => {
    assert.equal(lib.falconPrivateKeyToPublicKey(vector.privateKey), vector.publicKey);
    assert.equal(lib.falconPublicKeyToAddress(vector.publicKey), vector.address);
    assert.equal(lib.bytesToHex(lib.hashMessage(vector.message)), vector.digest);
    assert.equal(lib.isPqEnvelope(vector.envelope), true);
    assert.equal(lib.verifyMessagePQ(vector.message, vector.envelope), vector.address);
    assert.equal(lib.verifySignedMessage(vector.message, vector.envelope), vector.address);
    assert.throws(() => lib.verifyMessagePQ('different message', vector.envelope));
});

test('pq: seeded keygen is deterministic and sign/verify round-trips', () => {
    const seed = 'ab'.repeat(lib.FALCON_SEED_BYTES);
    const a = lib.generateFalconKey(seed);
    const b = lib.generateFalconKey(seed);
    assert.deepEqual(a, b);
    assert.equal(a.publicKey.length, lib.FALCON_PUBLIC_KEY_BYTES * 2);
    assert.equal(a.privateKey.length, lib.FALCON_PRIVATE_KEY_BYTES * 2);

    const digest = new Uint8Array(32).fill(7);
    const sig = lib.signDigestFalcon(digest, a.privateKey);
    assert.equal(sig[0], lib.FALCON_SIGNATURE_HEADER);
    assert.ok(sig.length >= lib.FALCON_SIGNATURE_MIN_BYTES && sig.length <= lib.FALCON_SIGNATURE_MAX_BYTES);
    assert.equal(lib.verifyDigestFalcon(digest, sig, a.publicKey), true);
    assert.equal(lib.verifyDigestFalcon(new Uint8Array(32), sig, a.publicKey), false);

    const input = lib.encodeVerifyFnDsa512Input(digest, sig, a.publicKey);
    assert.equal(input.length, 32 + lib.FALCON_PRECOMPILE_SIGNATURE_BYTES + lib.FALCON_PUBLIC_KEY_BYTES);
});

test('signer: key type selects the strategy', () => {
    const { privateKey, address } = lib.fromMnemonic(MNEMONIC);
    const pq = lib.generateFalconKey('cd'.repeat(lib.FALCON_SEED_BYTES));
    const pqKey = { keyType: 'FALCON', privateKey: pq.privateKey, publicKey: pq.publicKey };
    assert.equal(lib.isPqKey(privateKey), false);
    assert.equal(lib.addressOf(privateKey), address);
    assert.equal(lib.isPqKey(pqKey), true);
    assert.equal(lib.addressOf(pqKey), pq.address);
});

test('verify: txid recomputation and mixed ECDSA + PQ signatures', () => {
    const { privateKey, address } = lib.fromMnemonic(MNEMONIC);
    const pq = lib.generateFalconKey('ef'.repeat(lib.FALCON_SEED_BYTES));
    const rawData = {
        ref_block_bytes: Buffer.from('1234', 'hex'),
        ref_block_hash: Buffer.from('0011223344556677', 'hex'),
        expiration: '1700000060000',
        timestamp: '1700000000000',
        contract: [
            {
                type: 'TransferContract',
                parameter: {
                    type_url: 'type.googleapis.com/protocol.TransferContract',
                    value: Buffer.from(`0a15${lib.toHexAddress(address)}1215${USDT_HEX}1801`, 'hex'),
                },
            },
        ],
    };
    const txid = lib.computeTxid(rawData);
    assert.match(txid, /^[0-9a-f]{64}$/);

    const tx = {
        raw_data: rawData,
        signature: [Buffer.from(lib.stripHexPrefix(lib.signTransactionId(txid, privateKey)), 'hex')],
        pq_auth_sig: [
            {
                scheme: 'FN_DSA_512',
                public_key: Buffer.from(pq.publicKey, 'hex'),
                signature: Buffer.from(lib.signTransactionIdFalcon(txid, pq.privateKey)),
            },
        ],
    };
    const res = lib.verifyTransaction(tx);
    assert.equal(res.txid, txid);
    assert.equal(res.valid, true);
    assert.deepEqual(res.signers.map((s) => [s.address, s.keyType, s.valid]), [
        [address, 'ECDSA', true],
        [pq.address, 'FALCON', true],
    ]);

    // Changing any signed byte must break both: Falcon rejects outright, and ECDSA
    // recovery no longer yields the signer's address.
    const tampered = lib.verifyTransaction({ ...tx, raw_data: { ...rawData, expiration: '1700000060001' } });
    assert.notEqual(tampered.txid, txid);
    assert.equal(tampered.valid, false);
    assert.notEqual(tampered.signers[0].address, address);
    assert.equal(tampered.signers[1].valid, false);
});

// java-tron's MLDSA44KatTest (BouncyCastle 1.84): seed -> SHA-256(pk), SHA-256(sk).
// Matching these proves keys — and therefore addresses — are interchangeable
// with java-tron's Toolkit.
const ML_DSA_44_KAT = [
    ['incrementing', (i) => i, '9f107644c1084526af3bc8098680b05499a2325a644e388fb4f970e058d19d46', '04bf6b9f579166a627961dfc5c3bf9717df868db88863856356c4668c8b56b0b'],
    ['all_zero', () => 0x00, 'eb4e7302842153b0fa19e8620739ad258af4929c26dd89079a7ec7d4282208e1', '0f9086044d77b6d610c7e92418d9f70a398c69febc7e99f8254aaea98dcfbe77'],
    ['all_ff', () => 0xff, '62c4f1b3164db7fa896a3343e900eb3e13c9f76de122020feba37ee063d49ef0', '6433074c5ffc9e0f2b1d68bb3fda84e439da0a2d93f508a101e9b44835f0b22c'],
    ['all_aa', () => 0xaa, 'ad4aff7ef5aa8895fb4f59c2c211afe55419d0d8709bfa0ee4d8f496e92600a7', 'd976fecd6cda24ca928a43e2bcd3eb53e6dfb24a759333f818f6496abc27feb5'],
    ['descending', (i) => 31 - i, '4b002454d4516328cb1bf3667959879140dc9e6b3f405e985f707dd49918c818', '1d144d5f05beb34beb1b909ecd469e0484f485a3c68db6e27da464418f7d69ea'],
];
const { createHash } = require('node:crypto');
const sha256Hex = (hex) => createHash('sha256').update(Buffer.from(hex, 'hex')).digest('hex');

test('ml-dsa-44: seeded keygen matches java-tron BouncyCastle KAT vectors', () => {
    for (const [label, fill, pkHash, skHash] of ML_DSA_44_KAT) {
        const seed = Uint8Array.from({ length: lib.ML_DSA_44_SEED_BYTES }, (_, i) => fill(i));
        const key = lib.generateMlDsa44Key(seed);
        assert.equal(sha256Hex(key.publicKey), pkHash, `${label}: public key`);
        assert.equal(sha256Hex(key.privateKey), skHash, `${label}: private key`);
        assert.equal(key.address, lib.pqPublicKeyToAddress(key.publicKey));
        assert.equal(lib.mlDsa44PrivateKeyToPublicKey(key.privateKey), key.publicKey);
    }
});

test('ml-dsa-44: sign/verify, message envelope, precompile input', () => {
    const key = lib.generateMlDsa44Key('11'.repeat(lib.ML_DSA_44_SEED_BYTES));
    const digest = new Uint8Array(32).fill(3);
    const sig = lib.signDigestMlDsa44(digest, key.privateKey);
    assert.equal(sig.length, lib.ML_DSA_44_SIGNATURE_BYTES);
    assert.equal(lib.verifyDigestMlDsa44(digest, sig, key.publicKey), true);
    assert.equal(lib.verifyDigestMlDsa44(new Uint8Array(32), sig, key.publicKey), false);
    assert.equal(lib.verifyDigestMlDsa44(digest, sig.subarray(1), key.publicKey), false, 'wrong length');
    assert.equal(lib.verifyDigestPQ(lib.PQScheme.ML_DSA_44, digest, sig, key.publicKey), true);
    assert.equal(lib.verifyDigestPQ(lib.PQScheme.FN_DSA_512, digest, sig, key.publicKey), false, 'cross-scheme');
    assert.equal(lib.verifyDigestPQ(lib.PQScheme.UNKNOWN_PQ_SCHEME, digest, sig, key.publicKey), false);

    const envelope = lib.signMessageMlDsa44('hello pq', key.privateKey);
    assert.equal(lib.decodePqEnvelope(envelope).scheme, lib.PQScheme.ML_DSA_44);
    assert.equal(lib.verifyMessagePQ('hello pq', envelope), key.address);
    assert.equal(lib.verifySignedMessage('hello pq', envelope), key.address);
    assert.throws(() => lib.verifyMessagePQ('other', envelope), /ML-DSA-44/);

    const input = lib.encodeVerifyMlDsa44Input(digest, sig, key.publicKey);
    assert.equal(input.length, 32 + 2420 + 1312);
    assert.deepEqual(input.subarray(32, 32 + 2420), sig);
});

test('signer: PQ scheme is taken from keyType or inferred from key length', () => {
    const falcon = lib.generateFalconKey('01'.repeat(lib.FALCON_SEED_BYTES));
    const ml = lib.generateMlDsa44Key('02'.repeat(lib.ML_DSA_44_SEED_BYTES));
    assert.equal(lib.pqKeyType({ privateKey: falcon.privateKey }), 'FALCON');
    assert.equal(lib.pqKeyType({ privateKey: ml.privateKey }), 'ML_DSA_44');
    assert.equal(lib.pqKeyType({ keyType: 'ML_DSA_44', privateKey: ml.privateKey }), 'ML_DSA_44');
    assert.throws(() => lib.pqKeyType({ privateKey: 'ab'.repeat(100) }), /Cannot infer/);
    const signer = lib.getSigner({ privateKey: ml.privateKey });
    assert.equal(signer.keyType, 'ML_DSA_44');
    assert.equal(signer.address, ml.address);
    assert.equal(lib.addressOf({ privateKey: falcon.privateKey, publicKey: falcon.publicKey }), falcon.address);
});

test('verify: one transaction signed by ECDSA + FN-DSA-512 + ML-DSA-44 signers', () => {
    const { privateKey } = lib.fromMnemonic(MNEMONIC);
    const falcon = lib.generateFalconKey('03'.repeat(lib.FALCON_SEED_BYTES));
    const ml = lib.generateMlDsa44Key('04'.repeat(lib.ML_DSA_44_SEED_BYTES));
    const rawData = { ref_block_bytes: Buffer.from('abcd', 'hex'), expiration: '1700000060000', timestamp: '1700000000000' };
    const txid = lib.computeTxid(rawData);

    const tx = { raw_data: rawData };
    for (const key of [privateKey, { privateKey: falcon.privateKey, publicKey: falcon.publicKey }, { privateKey: ml.privateKey }]) {
        lib.getSigner(key).signTransaction(tx, txid);
    }
    const res = lib.verifyTransaction(tx);
    assert.equal(res.valid, true);
    assert.deepEqual(res.signers.map((s) => s.keyType), ['ECDSA', 'FALCON', 'ML_DSA_44']);
    assert.equal(res.signers[2].address, ml.address);

    // An ML-DSA key smuggled in under the Falcon scheme tag must not verify.
    const mislabeled = { ...tx, pq_auth_sig: [{ ...tx.pq_auth_sig[1], scheme: 'FN_DSA_512' }] };
    const bad = lib.verifyTransaction(mislabeled);
    assert.equal(bad.valid, false);
    assert.match(bad.signers[1].error, /public key length/);

    // Unknown schemes are rejected, never assumed valid.
    const unknown = lib.verifyTransaction({ ...tx, pq_auth_sig: [{ ...tx.pq_auth_sig[1], scheme: 'constructor' }] });
    assert.equal(unknown.valid, false);
    assert.match(unknown.signers[1].error, /Unsupported PQ scheme/);
});
