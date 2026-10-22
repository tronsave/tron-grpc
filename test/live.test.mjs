/**
 * Live, read-only tests against a public TRON node — no keys, nothing signed
 * or broadcast. Runs against the built package (`dist/`).
 *
 *   npm run build && npm run test:live
 *
 * Env: TRON_NETWORK (default `mainnet`), TRON_PRO_API_KEY (optional; raises
 * TronGrid rate limits).
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { TronGrpcClient, computeTxid, verifyTransaction, hexToBytesSafe, isAddress, generateMlDsa44Key } = require('../dist/index.js');

const network = process.env.TRON_NETWORK ?? 'mainnet';
const apiKey = process.env.TRON_PRO_API_KEY;
const client = TronGrpcClient.fromNetwork(network, apiKey ? { headers: { 'TRON-PRO-API-KEY': apiKey } } : {});
after(() => client.close());

// Mainnet USDT, and the Tron Foundation's well-known (always-funded) account.
const USDT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const RICH = 'TT2T17KZhoDu47i2E4FWxfG79zdkEWkU9N';

/**
 * TronGrid answers HTTP 429 quickly without an API key. Pace calls and back off
 * on rate limiting so the suite reports real failures, not throttling.
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (fn) => {
    for (let attempt = 0; ; attempt++) {
        await sleep(apiKey ? 0 : 400);
        try {
            return await fn();
        } catch (e) {
            if (attempt >= 6 || !/429|RESOURCE_EXHAUSTED/.test(String(e?.details ?? e?.message))) throw e;
            await sleep(1000 * 2 ** attempt);
        }
    }
};

let head;

test('getNowBlock: decodes the latest block', async () => {
    head = await call(() => client.getNowBlock());
    assert.ok(head.number > 0);
    assert.match(head.hash, /^[0-9a-f]{64}$/);
    assert.ok(isAddress(head.witnessAddress));
    assert.ok(Math.abs(Date.now() - head.timestamp) < 10 * 60_000, 'head block is recent');
    assert.equal(head.transactions.length, head.txCount);
});

test('getBlockByNum: parent of head links to it', async () => {
    const parent = await call(() => client.getBlockByNum(head.number - 1));
    assert.equal(parent.number, head.number - 1);
    assert.equal(parent.hash, head.parentHash);
});

test('computeTxid + verifyTransaction match real on-chain transactions', async () => {
    const block = head.transactions.length ? head : await call(() => client.getBlockByNum(head.number - 1));
    const sample = block.transactions.slice(0, 5);
    assert.ok(sample.length > 0, 'block has transactions');
    for (const { txid } of sample) {
        const tx = await call(() => client.request('GetTransactionById', { value: hexToBytesSafe(txid) }));
        // Re-serializing raw_data with the vendored protos must reproduce the node's txid.
        assert.equal(computeTxid(tx.raw_data), txid, `txid mismatch for ${txid}`);
        const res = verifyTransaction(tx);
        assert.equal(res.valid, true, `signature check failed for ${txid}`);
        assert.ok(res.signers.every((s) => isAddress(s.address)));
    }
    const viaClient = await call(() => client.verifyTransactionById(sample[0].txid));
    assert.equal(viaClient.valid, true);
});

test('getAccount: decodes balance as exact strings', async () => {
    const account = await call(() => client.getAccount(RICH));
    assert.equal(account.address, RICH);
    assert.equal(account.exists, true);
    assert.match(account.balanceSun, /^\d+$/);
    assert.match(account.balanceTrx, /^\d+(\.\d+)?$/);
});

test('getTrc20Balance: USDT balanceOf via triggerConstantContract', async () => {
    const bal = await call(() => client.getTrc20Balance(USDT, RICH));
    assert.match(bal.raw, /^\d+$/);
    assert.equal(bal.decimals, 6);
});

test('chain parameters + PQ capability detection', async () => {
    const params = await call(() => client.getChainParameters());
    assert.ok(Array.isArray(params.chainParameter) && params.chainParameter.length > 10);
    const caps = await call(() => client.getPqCapabilities());
    assert.equal(typeof caps.fnDsa512, 'boolean');
});

test('listWitnesses: returns super representatives', async () => {
    const res = await call(() => client.listWitnesses());
    const witnesses = res.witnesses ?? res;
    assert.ok(Array.isArray(witnesses) && witnesses.length >= 27);
});

test('PQ guard: signing with an inactive scheme is refused before any broadcast', async () => {
    const caps = await call(() => client.getPqCapabilities());
    if (caps.mlDsa44) return; // nothing to refuse on a network where ML-DSA-44 is live
    // A fresh, unfunded key: even if the guard regressed, nothing could be spent.
    const key = { privateKey: generateMlDsa44Key().privateKey };
    await assert.rejects(
        call(() => client.sendTrx({ privateKey: key, to: RICH, amount: '0.000001' })),
        /ML-DSA-44 \(TIP-899\) is not active/
    );
});
