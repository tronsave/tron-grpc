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

/** A client whose `method` RPC is answered by `impl` — no network involved. */
const stubClient = (method, impl, options = {}) => {
    const client = new lib.TronGrpcClient('127.0.0.1:1', options);
    let calls = 0;
    client.pool.clients[0][method] = (req, opts, cb) => {
        calls++;
        impl(calls, cb, req, opts);
        return { cancel() {} };
    };
    return { client, calls: () => calls };
};
const grpcError = (code, details) => Object.assign(new Error(`${code} ${details}`), { code, details });

test('client: rate-limited calls retry; an over-size response fails fast', async () => {
    const fast = { rateLimitRetry: { baseDelayMs: 1, maxDelayMs: 2 } };
    const limited = stubClient(
        'GetNowBlock2',
        (n, cb) => (n < 3 ? cb(grpcError(8, 'Too Many Requests')) : cb(null, { ok: true })),
        fast
    );
    assert.deepEqual(await limited.client.request('GetNowBlock2', {}), { ok: true });
    assert.equal(limited.calls(), 3);
    limited.client.close();

    // grpc-js reports this as RESOURCE_EXHAUSTED too, but retrying can't help.
    const big = stubClient(
        'GetNowBlock2',
        (_, cb) => cb(grpcError(8, 'Received message larger than max (8019684 vs 4194304)')),
        fast
    );
    await assert.rejects(big.client.request('GetNowBlock2', {}), /larger than max/);
    assert.equal(big.calls(), 1);
    big.client.close();
});

test('client: concurrent PQ capability checks share one GetChainParameters call', async () => {
    const params = { chainParameter: [{ key: 'getAllowFnDsa512', value: '1' }] };
    const stub = stubClient('GetChainParameters', (_, cb) => setImmediate(() => cb(null, params)));
    const check = (k) => stub.client.assertPqSchemeEnabled(k);
    await Promise.all([check('FALCON'), check('FALCON'), check('FALCON')]);
    assert.equal(stub.calls(), 1);
    await check('FALCON'); // latched once enabled
    assert.equal(stub.calls(), 1);
    await assert.rejects(Promise.all([check('ML_DSA_44'), check('ML_DSA_44')]), /ML-DSA-44 \(TIP-899\) is not active/);
    assert.equal(stub.calls(), 2);
    stub.client.close();
});

test('client: headers do not replace interceptors passed in grpcOptions', async () => {
    let userInterceptorRan = false;
    const client = new lib.TronGrpcClient('127.0.0.1:1', {
        headers: { 'TRON-PRO-API-KEY': 'test' },
        rateLimitRetry: false,
        grpcOptions: {
            'grpc.enable_retries': 0,
            interceptors: [
                (opts, next) => {
                    userInterceptorRan = true;
                    return next(opts);
                },
            ],
        },
    });
    await assert.rejects(client.request('GetNowBlock2', {}));
    assert.equal(userInterceptorRan, true);
    client.close();
});

test('decode: a block is normalized once and shared, with identical content', () => {
    const owner = lib.toAddressBytes(USDT);
    const ext = {
        txid: Buffer.alloc(32, 1),
        transaction: {
            raw_data: { contract: [{ type: 'TransferContract', parameter: { value: { owner_address: owner } } }] },
            signature: [Buffer.alloc(65, 2)],
            ret: [{ contractRet: 'SUCCESS' }],
        },
        internal_transactions: [{ caller_address: owner }],
        logs: [],
    };
    const { decodeBlock } = require('../dist/src/codecs/decode.js');
    const block = decodeBlock({ blockid: Buffer.alloc(32, 3), block_header: { raw_data: { number: '7' } }, transactions: [ext] });
    const [tx] = block.transactions;
    assert.equal(block.number, 7);
    assert.equal(tx.txid, '01'.repeat(32));
    assert.equal(tx.signatures[0], '02'.repeat(65));
    assert.equal(tx.rawData.contract[0].parameter.value.owner_address, USDT);
    assert.deepEqual(tx.internalTransactions, [{ caller_address: USDT }]);
    assert.equal(tx.raw, block.raw.transactions[0]);
    assert.equal(tx.rawData, block.raw.transactions[0].transaction.raw_data);
});

/* -------------------------------------------------------------------------- */
/* Transaction guards, local edits, transport options                          */
/* -------------------------------------------------------------------------- */

const WalletServiceClient = require('../dist/src/protoLoader.js').getServiceClient('Wallet');
const KEY = '11'.repeat(32);
const ME = lib.privateKeyToAddress(KEY);
const OTHER = lib.privateKeyToAddress('33'.repeat(32));
const ATTACKER = lib.privateKeyToAddress('22'.repeat(32));

/** What an honest node answers a builder RPC with: the request packed as the contract. */
const honestExtention = (method, request, typeName) => {
    const raw_data = {
        contract: [
            {
                type: typeName,
                parameter: {
                    type_url: `type.googleapis.com/protocol.${typeName}`,
                    value: WalletServiceClient.service[method].requestSerialize(request),
                },
            },
        ],
        ref_block_bytes: Buffer.from('0001', 'hex'),
        ref_block_hash: Buffer.alloc(8, 1),
        expiration: '1790000060000',
        timestamp: '1790000000000',
    };
    return {
        transaction: { raw_data },
        txid: Buffer.from(lib.computeTxid(raw_data), 'hex'),
        result: { result: true },
    };
};

/** A client whose RPCs are answered by `handlers[method](request, callOptions)`. */
const fakeNode = (handlers, options = {}) => {
    const client = new lib.TronGrpcClient('127.0.0.1:1', { rateLimitRetry: false, ...options });
    const seen = [];
    for (const [method, handler] of Object.entries(handlers)) {
        for (const channel of client.pool.clients) {
            channel[method] = (req, opts, cb) => {
                seen.push({ method, req, opts, channel });
                Promise.resolve()
                    .then(() => handler(req, opts))
                    .then((res) => cb(null, res), (err) => cb(err));
                return { cancel() {} };
            };
        }
    }
    return { client, seen };
};

const transferRequest = (to, sun = '1000000') => ({
    owner_address: Buffer.from(lib.toAddressBytes(ME)),
    to_address: Buffer.from(lib.toAddressBytes(to)),
    amount: sun,
});

test('units: a float with more precision than the token is rejected, not rounded', () => {
    assert.throws(() => lib.trxToSun(0.1234567), /more than 6 decimal places/);
    assert.throws(() => lib.trxToSun(1e-7), /more than 6 decimal places/);
    assert.throws(() => lib.trxToSun(1.0000005), /more than 6 decimal places/);
    assert.equal(lib.trxToSun(0.29), 290000n);
    assert.equal(lib.trxToSun(1.5), 1500000n);
    assert.equal(lib.trxToSun(123456789), 123456789000000n);
    assert.equal(lib.trxToSun(0.000001), 1n);
    assert.equal(lib.toBaseUnits(0.1, 18), 100000000000000000n);
});

test('address: raw bytes must be a 21-byte 0x41 address', () => {
    const bytes = lib.toAddressBytes(USDT);
    assert.equal(lib.toBase58Address(bytes), USDT);
    assert.throws(() => lib.toAddressBytes(bytes.subarray(1)), /Invalid raw address/);
    assert.throws(() => lib.toAddressBytes(new Uint8Array(21)), /Invalid raw address/);
});

test('crypto: hashMessage accepts bytes, matching the same text as a string', () => {
    const text = 'hello TRON ✓';
    assert.deepEqual(lib.hashMessage(new TextEncoder().encode(text)), lib.hashMessage(text));
    const sig = lib.signMessage(new Uint8Array([0, 255, 1]), KEY);
    assert.equal(lib.verifyMessage(new Uint8Array([0, 255, 1]), sig), ME);
});

test('guard: an honest build is signed over the locally computed txid', async () => {
    let broadcast;
    const { client } = fakeNode({
        CreateTransaction2: (req) => honestExtention('CreateTransaction2', req, 'TransferContract'),
        BroadcastTransaction: (tx) => ((broadcast = tx), { result: true }),
    });
    const res = await client.sendTrx({ to: OTHER, amount: '1', privateKey: KEY });
    assert.equal(res.success, true);
    assert.equal(res.txid, lib.computeTxid(broadcast.raw_data));
    const verified = lib.verifyTransaction(broadcast);
    assert.equal(verified.valid, true);
    assert.equal(verified.signers[0].address, ME);
    client.close();
});

test('guard: a node that swaps the recipient, amount, txid or fee limit is refused before signing', async () => {
    const tampered = {
        recipient: () => honestExtention('CreateTransaction2', transferRequest(ATTACKER), 'TransferContract'),
        amount: () => honestExtention('CreateTransaction2', transferRequest(OTHER, '999000000'), 'TransferContract'),
        txid: () => ({ ...honestExtention('CreateTransaction2', transferRequest(OTHER), 'TransferContract'), txid: Buffer.alloc(32, 0xab) }),
        'contract type': () => honestExtention('CreateTransaction2', transferRequest(OTHER), 'FreezeBalanceV2Contract'),
        'fee limit': () => {
            const ext = honestExtention('CreateTransaction2', transferRequest(OTHER), 'TransferContract');
            ext.transaction.raw_data.fee_limit = '15000000000';
            ext.txid = Buffer.from(lib.computeTxid(ext.transaction.raw_data), 'hex');
            return ext;
        },
        'second contract': () => {
            const ext = honestExtention('CreateTransaction2', transferRequest(OTHER), 'TransferContract');
            ext.transaction.raw_data.contract.push(ext.transaction.raw_data.contract[0]);
            ext.txid = Buffer.from(lib.computeTxid(ext.transaction.raw_data), 'hex');
            return ext;
        },
    };
    for (const [what, build] of Object.entries(tampered)) {
        let broadcasts = 0;
        const { client } = fakeNode({
            CreateTransaction2: build,
            BroadcastTransaction: () => (broadcasts++, { result: true }),
        });
        await assert.rejects(
            client.sendTrx({ to: OTHER, amount: '1', privateKey: KEY }),
            /refusing the transaction the node built/,
            `tampered ${what}`
        );
        assert.equal(broadcasts, 0, `tampered ${what} must never be broadcast`);
        client.close();
    }
});

test('guard: signAndBroadcast never signs a txid that is not the hash of raw_data', async () => {
    let broadcasts = 0;
    const { client } = fakeNode({ BroadcastTransaction: () => (broadcasts++, { result: true }) });
    const ext = honestExtention('CreateTransaction2', transferRequest(OTHER), 'TransferContract');
    ext.txid = Buffer.alloc(32, 0xab);
    await assert.rejects(client.signAndBroadcast(ext, KEY), /Refusing to sign/);
    assert.equal(broadcasts, 0);
    assert.equal(ext.transaction.signature, undefined);

    // verifyBuiltTransactions:false skips the contract comparison, never the txid check.
    const lax = fakeNode(
        { CreateTransaction2: () => ext, BroadcastTransaction: () => (broadcasts++, { result: true }) },
        { verifyBuiltTransactions: false }
    );
    await assert.rejects(lax.client.sendTrx({ to: OTHER, amount: '1', privateKey: KEY }), /Refusing to sign/);
    assert.equal(broadcasts, 0);
    client.close();
    lax.client.close();
});

test('options: fee limit, memo, expiration and permission id are applied and the txid re-derived', () => {
    const ext = honestExtention('CreateTransaction2', transferRequest(OTHER), 'TransferContract');
    const before = lib.bytesToHex(ext.txid);
    lib.applyTransactionOptions(ext, { feeLimit: 100_000_000, memo: 'invoice 42', expiration: 1790003600000, permissionId: 2 });
    const raw = ext.transaction.raw_data;
    assert.equal(raw.fee_limit, '100000000');
    assert.equal(Buffer.from(raw.data).toString(), 'invoice 42');
    assert.equal(raw.expiration, '1790003600000');
    assert.equal(raw.contract[0].Permission_id, 2);
    assert.notEqual(lib.bytesToHex(ext.txid), before);
    assert.equal(lib.bytesToHex(ext.txid), lib.computeTxid(raw));
    assert.equal(lib.checkedTxid(ext), lib.computeTxid(raw));

    assert.throws(() => lib.applyTransactionOptions(ext, { feeLimit: 1.5 }), /integer number of sun/);
    assert.throws(() => lib.applyTransactionOptions(ext, { feeLimit: -1 }), /negative/);
    assert.throws(() => lib.applyTransactionOptions(ext, { expiration: 1 }), /expiration/);
    lib.getSigner(KEY).signTransaction(ext.transaction, lib.bytesToHex(ext.txid));
    assert.throws(() => lib.applyTransactionOptions(ext, { feeLimit: 1 }), /already signed/);
});

test('sendTrc20: builds transfer(address,uint256), applies the fee limit, signs the local txid', async () => {
    let built, broadcast;
    const { client } = fakeNode({
        TriggerContract: (req) => ((built = req), honestExtention('TriggerContract', req, 'TriggerSmartContract')),
        BroadcastTransaction: (tx) => ((broadcast = tx), { result: true }),
    });
    const res = await client.sendTrc20({
        contractAddress: USDT,
        to: OTHER,
        amount: '12.5',
        decimals: 6,
        feeLimit: 30_000_000n,
        privateKey: KEY,
    });
    assert.equal(res.success, true);
    const data = Buffer.from(built.data).toString('hex');
    assert.equal(data.slice(0, 8), 'a9059cbb');
    assert.equal(data.slice(8, 72), lib.encodeAddressParam(OTHER));
    assert.equal(BigInt('0x' + data.slice(72)), 12500000n);
    assert.equal(broadcast.raw_data.fee_limit, '30000000');
    assert.equal(res.txid, lib.computeTxid(broadcast.raw_data));
    assert.equal(lib.verifyTransaction(broadcast).signers[0].address, ME);

    // Without decimals the amount is base units, and must be an integer.
    await assert.rejects(client.sendTrc20({ contractAddress: USDT, to: OTHER, amount: '1.5', privateKey: KEY }), /decimal places/);
    client.close();
});

test('multi-sig: signTransaction accumulates signatures, broadcastTransaction sends them', async () => {
    let broadcast;
    const { client } = fakeNode({ BroadcastTransaction: (tx) => ((broadcast = tx), { result: true }) });
    const ext = honestExtention('CreateTransaction2', transferRequest(OTHER), 'TransferContract');
    lib.applyTransactionOptions(ext, { permissionId: 2 });
    await client.signTransaction(ext, KEY);
    await client.signTransaction(ext, '33'.repeat(32));
    const res = await client.broadcastTransaction(ext);
    assert.equal(res.txid, lib.computeTxid(ext.transaction.raw_data));
    assert.deepEqual(lib.verifyTransaction(broadcast).signers.map((s) => s.address), [ME, OTHER]);
    client.close();
});

test('external signer: an async signer is awaited and its signature checked before broadcast', async () => {
    let broadcasts = 0;
    const { client } = fakeNode({
        CreateTransaction2: (req) => honestExtention('CreateTransaction2', req, 'TransferContract'),
        BroadcastTransaction: () => (broadcasts++, { result: true }),
    });
    const kms = (signingKey) => ({
        keyType: 'ECDSA',
        address: ME,
        async signTransaction(tx, txid) {
            await new Promise((r) => setImmediate(r));
            tx.signature = [...(tx.signature ?? []), lib.hexToBytesSafe(lib.signTransactionId(txid, signingKey))];
            return tx;
        },
    });
    const ok = await client.sendTrx({ to: OTHER, amount: '1', privateKey: kms(KEY) });
    assert.equal(ok.success, true);
    assert.equal(broadcasts, 1);
    // A signer that signs with a different key than the address it claims.
    await assert.rejects(client.sendTrx({ to: OTHER, amount: '1', privateKey: kms('44'.repeat(32)) }), /did not produce a valid signature/);
    assert.equal(broadcasts, 1);
    client.close();
});

test('verifyTransactionById: a node answering with a different transaction is rejected', async () => {
    const ext = honestExtention('CreateTransaction2', transferRequest(OTHER), 'TransferContract');
    const txid = lib.bytesToHex(ext.txid);
    lib.getSigner(KEY).signTransaction(ext.transaction, txid);
    const { client } = fakeNode({ GetTransactionById: () => ext.transaction });
    assert.equal((await client.verifyTransactionById(txid)).valid, true);
    await assert.rejects(client.verifyTransactionById('ab'.repeat(32)), /different transaction/);
    client.close();
});

test('transport: deadlines, abort signals and scoped call options', async () => {
    const { client, seen } = fakeNode({ GetNowBlock2: () => ({}) }, { timeoutMs: 5000 });
    await client.request('GetNowBlock2', {});
    await client.withCallOptions({ timeoutMs: 100 }).request('GetNowBlock2', {});
    await client.request('GetNowBlock2', {}, { timeoutMs: 0 });
    const left = seen.map((s) => (s.opts.deadline === undefined ? undefined : s.opts.deadline - Date.now()));
    assert.ok(left[0] > 4000 && left[0] <= 5000, `default deadline ${left[0]}`);
    assert.ok(left[1] <= 100, `scoped deadline ${left[1]}`);
    assert.equal(left[2], undefined, 'timeoutMs 0 disables the deadline');

    const aborted = AbortSignal.abort(new Error('caller gave up'));
    await assert.rejects(client.request('GetNowBlock2', {}, { signal: aborted }), /caller gave up/);
    assert.equal(seen.length, 3, 'an already-aborted call never reaches the wire');
    client.close();
});

test('transport: channels spread calls round-robin; TLS follows the port', async () => {
    const { client, seen } = fakeNode({ GetNowBlock2: () => ({}) }, { channels: 3 });
    for (let i = 0; i < 6; i++) await client.request('GetNowBlock2', {});
    assert.equal(new Set(seen.map((s) => s.channel)).size, 3);
    assert.equal(client.withCallOptions({}).pool, client.pool, 'a scoped view shares the pool');
    client.close();
    assert.throws(() => new lib.TronGrpcClient('127.0.0.1:1', { channels: 0 }), /positive integer/);

    const lines = [];
    const logger = { debug() {}, info: (m) => lines.push(m), warn: (m) => lines.push(m), error() {} };
    const connect = (host, options = {}) => new lib.TronGrpcClient(host, { logLevel: 'info', logger, ...options }).close();
    connect('example.invalid:443');
    connect('example.invalid:50051');
    connect('example.invalid:50051', { tls: true });
    connect('example.invalid:50051', { headers: { 'TRON-PRO-API-KEY': 'k' } });
    connect('127.0.0.1:50051', { headers: { 'TRON-PRO-API-KEY': 'k' } });
    const connecting = lines.filter((l) => l.includes('connecting to'));
    assert.match(connecting[0], /:443 \(Wallet, TLS\)/);
    assert.match(connecting[1], /:50051 \(Wallet, plaintext\)/);
    assert.match(connecting[2], /:50051 \(Wallet, TLS\)/);
    assert.equal(lines.filter((l) => l.includes('sent unencrypted')).length, 1, 'warn once: remote plaintext only');
    assert.equal(lib.TRON_NETWORKS.mainnet.grpcHost.endsWith(':443'), true);
});

test('solidity: the WalletSolidity client exposes reads and rejects builders/broadcast', async () => {
    const solidity = lib.TronGrpcClient.solidity('nile', { rateLimitRetry: false });
    await assert.rejects(solidity.request('BroadcastTransaction', {}), /Unknown WalletSolidity RPC method/);
    await assert.rejects(solidity.request('CreateTransaction2', {}), /Unknown WalletSolidity RPC method/);
    assert.equal(typeof solidity.getTransactionInfoById, 'function');
    solidity.close();
});

test('decode: post-quantum signatures on a block transaction are surfaced', () => {
    const pq = lib.generateFalconKey();
    const { decodeBlock } = require('../dist/src/codecs/decode.js');
    const tx = { raw_data: { contract: [{ type: 'TransferContract' }] } };
    lib.getSigner({ privateKey: pq.privateKey, publicKey: pq.publicKey }).signTransaction(tx, '07'.repeat(32));
    const block = decodeBlock({ block_header: { raw_data: { number: '1' } }, transactions: [{ txid: Buffer.alloc(32, 7), transaction: tx }] });
    assert.equal(block.transactions[0].signatures.length, 0);
    assert.equal(block.transactions[0].pqSignatures[0].scheme, '1');
    assert.equal(block.transactions[0].pqSignatures[0].address, pq.address);
});

/* -------------------------------------------------------------------------- */
/* In-house base58 + BIP-39 / BIP-32 (published test vectors)                  */
/* -------------------------------------------------------------------------- */

test('base58: published vectors, leading zeros, and rejection of foreign characters', () => {
    const vectors = [
        ['', ''],
        ['61', '2g'],
        ['626262', 'a3gV'],
        ['636363', 'aPEr'],
        ['73696d706c792061206c6f6e6720737472696e67', '2cFupjhnEsSn59qHXstmK2ffpLv2'],
        ['00eb15231dfceb60925886b67d065299925915aeb172c06647', '1NS17iag9jJgTHD1VXjvLCEnZuQ3rJDE9L'],
        ['516b6fcd0f', 'ABnLTmg'],
        ['bf4f89001e670274dd', '3SEo3LWLoPntC'],
        ['572e4794', '3EFU7m'],
        ['ecac89cad93923c02321', 'EJDM8drfXA6uyA'],
        ['10c8511e', 'Rt5zm'],
        ['00000000000000000000', '1111111111'],
    ];
    for (const [hex, text] of vectors) {
        assert.equal(lib.base58Encode(Buffer.from(hex, 'hex')), text);
        assert.equal(Buffer.from(lib.base58Decode(text)).toString('hex'), hex);
    }
    for (const bad of ['0', 'O', 'I', 'l', 'T+', 'é']) assert.throws(() => lib.base58Decode(bad), /Invalid base58 character/);
    assert.equal(lib.toHexAddress(USDT), '41a614f803b6fd780986a42c78ec9c7f77e6ded13c');
    assert.equal(lib.toBase58Address('41a614f803b6fd780986a42c78ec9c7f77e6ded13c'), USDT);
});

test('bip39: mnemonic -> seed matches the reference vectors', () => {
    const abandon = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    assert.equal(
        lib.bytesToHex(lib.mnemonicToSeed(abandon, 'TREZOR')),
        'c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04'
    );
    assert.equal(
        lib.bytesToHex(lib.mnemonicToSeed('legal winner thank year wave sausage worth useful legal winner thank yellow', 'TREZOR')),
        '2e8905819b8723fe2c1d161860e5ee1830318dbf49a83bd451cfb8440c28bd6fa457fe1296106559a3c80937a1c1069be3a3a5bd381ee6260e8d9739fce1f607'
    );
    assert.throws(() => lib.mnemonicToSeed('abandon about'), /Invalid mnemonic/);
});

test('bip32: private derivation matches BIP-32 test vectors 1 and 2', () => {
    const derive = (seedHex, path) => lib.bytesToHex(lib.derivePrivateKey(Buffer.from(seedHex, 'hex'), path));
    const seed1 = '000102030405060708090a0b0c0d0e0f';
    assert.equal(derive(seed1, 'm'), 'e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35');
    assert.equal(derive(seed1, "m/0'"), 'edb2e14f9ee77d26dd93b4ecede8d16ed408ce149b6cd80b0715a2d911a0afea');
    assert.equal(derive(seed1, "m/0'/1"), '3c6cb8d0f6a264c91ea8b5030fadaa8e538b020f0a387421a12de9319dc93368');
    assert.equal(derive(seed1, "m/0'/1/2'"), 'cbce0d719ecf7431d88e6a89fa1483e02e35092af60c042b1df2ff59fa424dca');
    assert.equal(derive(seed1, "m/0'/1/2'/2"), '0f479245fb19a38a1954c5c7c0ebab2f9bdfd96a17563ef28a6a4b1a2a764ef4');
    assert.equal(derive(seed1, "m/0'/1/2'/2/1000000000"), '471b76e389e528d6de6d816857e012c5455051cad6660850e58372a6c3e6e7c8');

    const seed2 =
        'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a29f9c999693908d8a8784817e7b7875726f6c696663605d5a5754514e4b484542';
    assert.equal(derive(seed2, 'm'), '4b03d6fc340455b363f51020ad3ecca4f0850280cf436c70c727923f6db46c3e');
    assert.equal(derive(seed2, 'm/0'), 'abe74a98f6c7eabee0428f53798f0ab8aa1bd37873999041703c742f15ac7e1e');
    assert.equal(derive(seed2, "m/0/2147483647'"), '877c779ad9687164e9c2f4f0f4ff0340814392330693ce95a58fe18fd52e6e93');
    assert.equal(derive(seed2, "m/0/2147483647'/1/2147483646'/2"), 'bb7d39bdb83ecf58f2fd82b6d918341cbef428661ef01ab97c28a4842125ac23');

    assert.throws(() => derive(seed1, "44'/195'"), /must start with/);
    assert.throws(() => derive(seed1, 'm/2147483648'), /Invalid index/);
    assert.throws(() => derive(seed1, 'm/x'), /invalid child index/);
    assert.throws(() => derive('00', 'm'), /seed length/);
});
