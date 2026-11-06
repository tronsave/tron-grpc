/**
 * End-to-end tests that sign and broadcast real transactions on a TESTNET.
 * Refuses to run against mainnet. Runs against the built package (`dist/`).
 *
 *   npm run build && npm run test:nile
 *
 * Env (read from `.env`): TRON_PRIVATE_KEY — a funded Nile/Shasta ECDSA key;
 * TRON_NETWORK — `nile` (default) or `shasta`; TRON_PRO_API_KEY optional.
 *
 * Every PQ account is generated fresh per run; leftover testnet TRX stays there.
 */
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const lib = require('../dist/index.js');
const { TronGrpcClient } = lib;

const network = process.env.TRON_NETWORK ?? 'nile';
const privateKey = process.env.TRON_PRIVATE_KEY;
const apiKey = process.env.TRON_PRO_API_KEY;
if (network === 'mainnet') throw new Error('test:nile signs and broadcasts — it never runs on mainnet');

const skip = privateKey ? false : 'TRON_PRIVATE_KEY not set (see .env.example)';
const client = TronGrpcClient.fromNetwork(network, apiKey ? { headers: { 'TRON-PRO-API-KEY': apiKey } } : {});
after(() => client.close());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const me = privateKey ? lib.privateKeyToAddress(privateKey) : '';

/** Poll until the transaction is in a block; returns its receipt. */
const confirm = async (txid) => {
    for (let i = 0; i < 40; i++) {
        await sleep(3000);
        const info = await client.getTransactionInfoById(txid).catch(() => null);
        if (info?.blockNumber > 0) return info;
    }
    throw new Error(`transaction ${txid} not confirmed within 120s`);
};

/** Assert a confirmed transaction verifies locally and its txid recomputes exactly. */
const assertOnChain = async (txid, expectedSigners) => {
    const tx = await client.request('GetTransactionById', { value: lib.hexToBytesSafe(txid) });
    assert.equal(lib.computeTxid(tx.raw_data), txid, 'computeTxid reproduces the on-chain txid');
    const res = await client.verifyTransactionById(txid);
    assert.equal(res.valid, true, `signatures verify: ${JSON.stringify(res.signers)}`);
    assert.deepEqual(
        res.signers.map((s) => [s.keyType, s.address]),
        expectedSigners,
        'reported signers'
    );
    const scan = network === 'nile' ? 'https://nile.tronscan.org' : 'https://shasta.tronscan.org';
    console.log(`# ${expectedSigners.map(([k]) => k).join('+')}: ${scan}/#/transaction/${txid}`);
};

let balanceSun = 0n;
/** The Falcon account funded by the ECDSA test and spent from by the FN-DSA test. */
let falcon;

/** Skip with a clear instruction when the test account cannot cover `trx`. */
const needs = (t, trx) => {
    if (balanceSun >= lib.trxToSun(trx)) return false;
    t.skip(`fund ${me} from the ${network} faucet (needs >= ${trx} TRX)`);
    return true;
};
before(async () => {
    if (skip) return;
    balanceSun = BigInt((await client.getAccount(me)).balanceSun);
    console.log(`# ${network} test account ${me}: ${lib.sunToTrx(balanceSun)} TRX`);
});

/** Fund a fresh address from the test account and wait for it to land. */
const fund = async (to, trx) => {
    const res = await client.sendTrx({ privateKey, to, amount: trx });
    assert.equal(res.success, true, `funding failed: ${res.code} ${res.message}`);
    const info = await confirm(res.txid);
    assert.equal(info.result === 'FAILED', false);
    await assertOnChain(res.txid, [['ECDSA', me]]);
    return res.txid;
};

test('ECDSA: transfer is accepted, confirmed, and verifies on-chain', { skip }, async (t) => {
    if (needs(t, 15)) return;
    const key = lib.generateFalconKey();
    await fund(key.address, '6');
    const account = await client.getAccount(key.address);
    assert.equal(account.exists, true);
    assert.equal(account.balanceSun, '6000000');
    falcon = key;
});

test('local edits: memo, expiration and a fee limit set after the node built the tx are accepted', { skip }, async (t) => {
    if (needs(t, 60)) return;
    // Memo + expiry on a transfer: raw_data is edited locally and the txid re-derived.
    const expiration = Date.now() + 10 * 60_000;
    const sent = await client.sendTrx({ privateKey, to: lib.privateKeyToAddress('33'.repeat(32)), amount: '0.000001', memo: 'tron-grpc nile', expiration });
    assert.equal(sent.success, true, `transfer with memo rejected: ${sent.code} ${sent.message}`);
    await confirm(sent.txid);
    await assertOnChain(sent.txid, [['ECDSA', me]]);
    const tx = await client.request('GetTransactionById', { value: lib.hexToBytesSafe(sent.txid) });
    assert.equal(Buffer.from(tx.raw_data.data).toString(), 'tron-grpc nile');
    assert.equal(String(tx.raw_data.expiration), String(expiration));

    // A contract call with a fee limit: approve(spender, 0) on Nile USDT moves nothing.
    const USDT_NILE = 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf';
    const ext = await client.triggerContract({
        ownerAddress: me,
        contractAddress: USDT_NILE,
        functionSelector: 'approve(address,uint256)',
        params: lib.encodeAddressParam(me) + lib.encodeUint256(0),
        feeLimit: 50_000_000,
    });
    const called = await client.signAndBroadcast(ext, privateKey);
    assert.equal(called.success, true, `contract call rejected: ${called.code} ${called.message}`);
    const info = await confirm(called.txid);
    assert.notEqual(info.result, 'FAILED', `contract call failed: ${info.resMessage}`);
    await assertOnChain(called.txid, [['ECDSA', me]]);
    const callTx = await client.request('GetTransactionById', { value: lib.hexToBytesSafe(called.txid) });
    assert.equal(String(callTx.raw_data.fee_limit), '50000000');
});

test('FN-DSA-512: a post-quantum signed transfer is accepted and verifies on-chain', { skip }, async (t) => {
    if (needs(t, 15)) return;
    const caps = await client.getPqCapabilities();
    if (!caps.fnDsa512) return assert.fail(`FN-DSA-512 is not active on ${network}`);
    if (!falcon) {
        falcon = lib.generateFalconKey();
        await fund(falcon.address, '6');
    }

    const res = await client.sendTrx({
        privateKey: { keyType: 'FALCON', privateKey: falcon.privateKey, publicKey: falcon.publicKey },
        to: me,
        amount: '0.000001',
    });
    assert.equal(res.success, true, `PQ broadcast rejected: ${res.code} ${res.message}`);
    const info = await confirm(res.txid);
    assert.notEqual(info.result, 'FAILED');
    await assertOnChain(res.txid, [['FALCON', falcon.address]]);

    const decoded = await client.getTransactionById(res.txid);
    assert.equal(decoded.signatures.length, 0);
    assert.equal(decoded.pqSignatures[0].scheme, 'FN_DSA_512');
    assert.equal(decoded.pqSignatures[0].address, falcon.address);
});

test('ML-DSA-44: signed end-to-end when active, refused before broadcast when not', { skip }, async (t) => {
    const caps = await client.getPqCapabilities();
    const ml = lib.generateMlDsa44Key();
    const key = { privateKey: ml.privateKey };
    if (!caps.mlDsa44) {
        await assert.rejects(
            client.sendTrx({ privateKey: key, to: me, amount: '0.000001' }),
            /ML-DSA-44 \(TIP-899\) is not active/
        );
        return;
    }
    if (needs(t, 15)) return;
    await fund(ml.address, '10'); // 2420 B signature: bandwidth is burned from balance
    const res = await client.sendTrx({ privateKey: key, to: me, amount: '0.000001' });
    assert.equal(res.success, true, `ML-DSA-44 broadcast rejected: ${res.code} ${res.message}`);
    await confirm(res.txid);
    await assertOnChain(res.txid, [['ML_DSA_44', ml.address]]);
});

test('mixed multi-sig: owner permission satisfied by one ECDSA + one FN-DSA-512 signer', { skip }, async (t) => {
    // AccountPermissionUpdate burns 100 TRX on Nile; keep a margin for bandwidth.
    if (needs(t, 130)) return;

    // A fresh ECDSA account whose owner permission needs BOTH keys (threshold 2).
    const ecdsaKey = lib.bytesToHex(globalThis.crypto.getRandomValues(new Uint8Array(32)));
    const owner = lib.privateKeyToAddress(ecdsaKey);
    const cosigner = lib.generateFalconKey();
    await fund(owner, '115');

    const update = await client.accountPermissionUpdate(
        owner,
        {
            permissionName: 'owner',
            threshold: 2,
            keys: [
                { address: owner, weight: 1 },
                { address: cosigner.address, weight: 1 },
            ],
        },
        [
            {
                permissionName: 'active',
                threshold: 1,
                operations: '7fff1fc0033e0000000000000000000000000000000000000000000000000000',
                keys: [{ address: owner, weight: 1 }],
            },
        ]
    );
    const updated = await client.signAndBroadcast(update, ecdsaKey);
    assert.equal(updated.success, true, `permission update rejected: ${updated.code} ${updated.message}`);
    await confirm(updated.txid);

    // Build one transfer and sign it with both keys before broadcasting.
    const ext = await client.createTransaction(owner, me, '0.000001');
    const tx = ext.transaction;
    const txid = lib.bytesToHex(ext.txid);
    lib.getSigner(ecdsaKey).signTransaction(tx, txid);

    const half = await client.getTransactionSignWeight(tx);
    assert.equal(String(half.current_weight ?? half.currentWeight ?? 1), '1', 'one of two signatures present');

    lib.getSigner({ privateKey: cosigner.privateKey, publicKey: cosigner.publicKey }).signTransaction(tx, txid);
    const ret = await client.request('BroadcastTransaction', tx);
    assert.equal(ret.result, true, `mixed multi-sig broadcast rejected: ${ret.code}`);
    await confirm(txid);
    await assertOnChain(txid, [
        ['ECDSA', owner],
        ['FALCON', cosigner.address],
    ]);
});
