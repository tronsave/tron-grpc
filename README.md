# tron-grpc

A fully-typed TypeScript client for the [TRON](https://tron.network) blockchain
that talks to a `java-tron` full node over **gRPC**.

Developed by [TronSave](https://tronsave.io) and [SaveWallet](https://savewallet.io).

The public API takes ordinary, human inputs and returns decoded, readable
values — you never touch a `Buffer`, a base58 codec, or a sun encoding:

- **Addresses** in, as base58 (`T…`) or hex (`41…` / `0x41…`).
- **Amounts** in, as decimal **TRX** (`number | string | bigint`).
- **Out**, base58 addresses and exact numeric strings — never raw bytes.

All base58 ⇄ 21-byte conversion, amount ⇄ sun encoding, transaction signing, and
protobuf packing happen **inside** the library.

---

## HomePage

- **[TronSave](https://tronsave.io)**
- **[SaveWallet](https://savewallet.io)**
- **[TronTools](https://tools.tronsave.io/)**

Questions or feedback are welcome
[here](https://github.com/tronsave/tron-grpc/issues/new).

---

## Contents

- [HomePage](#homepage)
- [Install](#install)
- [Quick start](#quick-start)
- [API](#api)
  - [Client](#client)
  - [Utilities](#utilities)
- [Sending TRX](#sending-trx)
- [Post-quantum signatures (TIP-899)](#post-quantum-signatures-tip-899)
- [TRC20 balances](#trc20-balances)
- [Environment variables](#environment-variables)
- [Running the tests](#running-the-tests)
- [Updating the protos](#updating-the-protos)
- [Security](#security)
- [Project structure](#project-structure)
- [Design: why gRPC + proto-loader](#design-why-grpc--proto-loader)
- [Implemented methods](#implemented-methods)
- [Assumptions](#assumptions)
- [Changelog](CHANGELOG.md)

---

## Install

```bash
npm install tron-grpc
```

Requires Node.js 20+ (uses the built-in `fetch` and global `TextEncoder`).

---

## Quick start

```ts
import { TronGrpcClient } from 'tron-grpc';

const client = TronGrpcClient.fromNetwork('mainnet', {
  headers: { 'TRON-PRO-API-KEY': process.env.TRON_PRO_API_KEY ?? '' },
});

// Latest block
const head = await client.getNowBlock();
console.log(head.number, head.hash); // 83259967  0000000004f6...

// Full account — balances, TRC10 assets, staking, resources, permissions, votes
const account = await client.getAccount('TWd4WrZ9wn84f5x1hZhL4DHvk738ns5jwb');
console.log(account.balanceSun);   // "11223430628613"
console.log(account.balanceTrx);   // "11223430.628613"
console.log(account.frozenV2);     // [{ type: 'ENERGY', amount: '5000000' }, ...]
console.log(account.assets);       // { '1002000': '1500000', ... }  (TRC10 by id)
console.log(account.activePermission); // [{ id: 2, keys: [...], ... }]
console.log(account.raw);          // complete normalized message (every field)

// USDT (TRC20) balance
const usdt = await client.getTrc20Balance(
  'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // USDT contract
  'TWd4WrZ9wn84f5x1hZhL4DHvk738ns5jwb',
);
console.log(usdt.raw, usdt.value); // "1500000000000000" "1500000000"

client.close();
```

---

## API

### Client

Create a client by network or by explicit host:

```ts
const client = TronGrpcClient.fromNetwork('mainnet'); // 'mainnet' | 'nile' | 'shasta'
// or
const client = new TronGrpcClient('grpc.trongrid.io:50051', {
  headers: { 'TRON-PRO-API-KEY': '…' },              // added to every call's metadata
  grpcOptions: { 'grpc.keepalive_time_ms': 30000 },  // merged over tuned defaults
  rateLimitRetry: { maxRetries: 5, baseDelayMs: 500 }, // default; `false` disables
});
```

Calls rejected by rate limiting (TronGrid's HTTP 429 without an API key, or
`RESOURCE_EXHAUSTED`) are retried with exponential backoff and jitter. gRPC's own
retry policy cannot do this: a 429 arrives with response headers, which commits the
call. Retrying is safe for every method — a rate-limited request never reached a node,
and re-broadcasting the same signed transaction cannot double-spend.

#### Logging

The client can emit lightweight diagnostic logs for connection state and RPC
traffic. Set `logLevel` in options or `TRON_GRPC_LOG_LEVEL` in the environment
(case-insensitive). Defaults to `silent` (no output).

```ts
const client = TronGrpcClient.fromNetwork('mainnet', {
  logLevel: 'debug',
  headers: { 'TRON-PRO-API-KEY': process.env.TRON_PRO_API_KEY ?? '' },
});
```

Pass a custom `logger` sink (e.g. pino or winston) to receive filtered messages
instead of `console`. Logs never include header values, request/response
payloads, or secrets — only method names, timing, gRPC status codes, and
connectivity state transitions.

| Level | Emits |
| --- | --- |
| `silent` | Nothing (default). |
| `error` | RPC failures and unknown method names. |
| `warn` | Everything at `error`, plus `TRANSIENT_FAILURE` connectivity warnings. |
| `info` | Everything at `warn`, plus target host on connect and connectivity state changes. |
| `debug` | Everything at `info`, plus per-RPC start/success timing and `close()`. |

> **Note:** This is separate from gRPC transport internals (`GRPC_VERBOSITY`,
> `GRPC_TRACE`). Those env vars control the underlying `@grpc/grpc-js` channel,
> not this library's `[tron-grpc]`-prefixed logs.

| Method | Returns | Notes |
| --- | --- | --- |
| `getNowBlock()` | `BlockSummary` | Head block + every transaction fully decoded, + `raw`. |
| `getBlockByNum(num)` | `BlockSummary` | Block by height + full `transactions[]`, + `raw`. |
| `getAccount(address)` | `TronAccount` | Full account: balances, TRC10 assets, staking (v1/v2), resources, permissions, votes, `exists` flag, + `raw` (every field). |
| `getBalance(address)` | `string` | TRX balance as a decimal string. |
| `getAccountResources(address)` | `AccountResources` | Bandwidth + energy + per-asset net, TRON-power weight, storage, + `raw`. |
| `getTransactionById(txid)` | `TransactionResult` | Decoded tx (`found` flag), + `raw` (full `ret`). |
| `getTransactionInfoById(txid)` | `TransactionInfoResult` | Receipt: block, fee, result, **event `logs`**, `internalTransactions`, `resMessage`, + `raw`. |
| `getTrc20Balance(contract, owner, decimals?)` | `Trc20Balance` | `balanceOf` via constant call. |
| `triggerConstantContract(input)` | `ConstantCallResult` | Read-only call + `logs`, `energyPenalty`, `internalTransactions`, + `raw`. |
| `triggerContract(input)` | `object` | Unsigned state-changing call (`TransactionExtention`). |
| `estimateEnergy(input)` | `EstimateEnergyResult` | Energy estimate + `result`, + `raw`. |
| `createTransaction(from, to, amountTrx)` | `object` | Unsigned TRX transfer. |
| `signAndBroadcast(extention, privateKey)` | `BroadcastResult` | Sign + broadcast. |
| `sendTrx({ from?, to, amount, privateKey })` | `BroadcastResult` | Create → sign → broadcast. |
| `getChainParameters()` | `object` | Chain parameters (normalized). |
| `request<T>(method, message)` | `Promise<T>` | Escape hatch for any Wallet RPC. |
| `isReady` / `close()` | `boolean` / `void` | Connectivity flag / shutdown. |

All addresses passed to any method may be base58 or hex; all addresses returned
are base58. All `*Sun` / `balance` / `fee` fields are exact integer strings.

### Utilities

```ts
import {
  // addresses
  isAddress, toBase58Address, toHexAddress, base58ToBytes, bytesToBase58Address,
  // units (bigint-safe, no float)
  trxToSun, sunToTrx, toBaseUnits, fromBaseUnits, SUN_PER_TRX,
  // crypto
  privateKeyToAddress, fromMnemonic, signMessage, signTransactionId,
  // ABI / hex
  encodeFunctionData, encodeAddressParam, decodeUint256, functionSelector,
  stripHexPrefix, hexToBytesSafe,
} from 'tron-grpc';

trxToSun('1.5');              // 1500000n
sunToTrx('11223430628613');   // "11223430.628613"
trxToSun('1.1234567');        // throws — exceeds TRX's 6 decimals

isAddress('TWd4WrZ9wn84f5x1hZhL4DHvk738ns5jwb');    // true (checksum-validated)
toHexAddress('TWd4WrZ9wn84f5x1hZhL4DHvk738ns5jwb'); // "41e3...."

privateKeyToAddress('a5a5…57e3'); // "TN3EwEhs2fHaCu55srzPNanWxJjEtQUPBC"
const { privateKey, address } = fromMnemonic(mnemonic, "m/44'/195'/0'/0/0");
```

---

## Sending TRX

`sendTrx` performs `CreateTransaction2` → local secp256k1 signing → `BroadcastTransaction`:

```ts
const result = await client.sendTrx({
  to: 'TBBjHvgPQ9q4SNs9rXoakYkYRjgJZPaZcu',
  amount: '1.5',                              // TRX (number | string | bigint)
  privateKey: process.env.TRON_PRIVATE_KEY!,  // hex, with or without 0x
  // from is optional — derived from the private key when omitted
});

console.log(result.success, result.txid, result.code);
```

For full control you can split the steps:

```ts
const ext = await client.createTransaction(from, to, '1.5'); // unsigned
const res = await client.signAndBroadcast(ext, privateKey);  // sign + broadcast
```

`privateKey` also accepts a post-quantum keypair — see
[Post-quantum signatures](#post-quantum-signatures-tip-899).

> The node-built `raw_data` is re-broadcast verbatim and the node-computed
> `txid` is what gets signed, so the signature matches `java-tron`'s exact
> serialization (verified by a successful testnet broadcast in the test suite).

---

## Post-quantum signatures (TIP-899)

TRON's [TIP-899](https://github.com/tronprotocol/tips/issues/899) adds post-quantum
signatures alongside ECDSA. This library implements both of its schemes:

| Scheme | Key type | Public key | Signature | Activation | Status |
| --- | --- | --- | --- | --- | --- |
| **FN-DSA-512** (Falcon-512, FIPS 206 draft) | `'FALCON'` | 896 B | 617–667 B | `ALLOW_FN_DSA_512` (1000) | live on Nile |
| **ML-DSA-44** (FIPS 204, final) | `'ML_DSA_44'` | 1312 B | 2420 B | `ALLOW_ML_DSA_44` (1001) | in the Nile build, not yet activated |

**ECDSA is unaffected.** A hex private key behaves exactly as before — same functions, same
signatures, same call-sites. PQ is an additional key type, not a replacement.

```ts
import { generateFalconKey, generateMlDsa44Key } from 'tron-grpc';

const key = generateFalconKey();
// { privateKey: '…', publicKey: '…', address: 'T…' }  ← an ordinary T-address
const mlKey = generateMlDsa44Key(); // same shape
```

The scheme is read from `keyType` when present, otherwise inferred from the private
key's length (1280 B for FN-DSA-512, 2560 B for ML-DSA-44), so a bare
`{ privateKey }` works for either.

Pass the keypair anywhere a private key goes; the signer is chosen by key type:

```ts
// ECDSA — unchanged
await client.sendTrx({ to, amount: '1.5', privateKey: '0xabc…' });

// Post-quantum — same call, same shape
await client.sendTrx({ to, amount: '1.5', privateKey: key });
```

A PQ transaction is an ordinary `Transaction`: `raw_data` and `txid` are computed
identically, and the signature goes into the new `pq_auth_sig` field instead of
`signature[]`. Broadcasting is unchanged.

### Networks: Nile only, for now

FN-DSA-512 is live on **Nile**; ML-DSA-44 is in the Nile build but not yet activated.
Neither is enabled on mainnet — a mainnet node would reject a PQ signature. The client
enforces this for you: signing with a PQ key checks that scheme's own activation flag
first and throws rather than broadcasting a transaction that cannot succeed.

```ts
await client.sendTrx({ to, amount: '1.5', privateKey: falconKey }); // on mainnet:
// Error: Refusing to sign: FN-DSA-512 (TIP-899) is not active on this network…
```

The check only runs on the PQ path — ECDSA signing issues no extra call and is completely
unaffected. Query it directly with:

```ts
const { fnDsa512, mlDsa44 } = await client.getPqCapabilities();
```

Once mainnet activates the proposal, PQ keys start working there with no code change.

### Signing messages

`signMessage` on a PQ signer returns a hex string, exactly like `signMessageV2` — so
call-sites don't change. Because Falcon has no `ecrecover`, the public key has to travel
with the signature, so the string is an *envelope* (magic `TPQ1` + scheme + public key +
signature) rather than a bare signature:

```ts
import { getSigner, signMessagePQ, signMessageMlDsa44, verifyMessagePQ, isPqEnvelope } from 'tron-grpc';

const envelope = getSigner(key).signMessage('login nonce 42');   // or signMessagePQ / signMessageMlDsa44
const signer = verifyMessagePQ('login nonce 42', envelope);      // either scheme → 'T…', throws if invalid

if (signer !== expectedAddress) throw new Error('wrong signer');
```

`verifyMessagePQ` derives the address *from the envelope's own public key*, so — as with
`verifyMessageV2` — a valid signature only tells you the envelope is self-consistent.
Always compare the returned address against the one you expect. The envelope format is a
convention of this library: TIP-899 standardizes the on-chain fields only, and
`isPqEnvelope` tells a PQ envelope apart from an ECDSA signature.

### Verifying transactions

`verifyTransaction` is a single entry point for both algorithms: it looks at which signature
fields a transaction carries (`signature[]` for ECDSA, `pq_auth_sig[]` for PQ) and verifies
each with the matching one. They are not mutually exclusive — a TIP-899 multi-sig account can
be authorized by a mix, and every signer is reported.

```ts
import { verifyTransaction, computeTxid } from 'tron-grpc';

const { txid, valid, signers } = verifyTransaction(tx);
// signers: [{ address: 'T…', keyType: 'ECDSA', valid: true },
//           { address: 'T…', keyType: 'FALCON', scheme: 'FN_DSA_512', valid: true },
//           { address: 'T…', keyType: 'ML_DSA_44', scheme: 'ML_DSA_44', valid: true }]

// or fetch and verify in one step
const result = await client.verifyTransactionById(txid);
```

The txid is recomputed from `raw_data` (`SHA-256`) unless you pass one, so a signature that
doesn't match the transaction it's attached to is caught.

> **This is a cryptographic check, not an authorization check.** A valid signature proves
> the key holder signed *this exact transaction* — not that the key may move the account's
> funds. To authorize, compare the reported signers against the account's `Permission` keys
> and threshold. Only a node can settle that, since it depends on account state.

For messages, `verifyMessage` (ECDSA) and `verifyMessagePQ` (PQ) each return the signer's
address, and `verifySignedMessage` accepts either and dispatches on the envelope.

### On-chain verification from a contract

`encodeVerifyFnDsa512Input` builds the 1594-byte input for the `VerifyFnDsa512` precompile
at `0x02000016` (`msg(32) ‖ sig(666, zero-padded) ‖ pk(896)`), and
`encodeVerifyMlDsa44Input` the 3764-byte input for `VerifyMlDsa44` at `0x02000018`
(`msg(32) ‖ sig(2420) ‖ pk(1312)`).

### Notes and limits

- **Sizes.** An FN-DSA-512 public key is 896 B and a signature 617–667 B (ML-DSA-44:
  1312 B / 2420 B), versus 33 B / 65 B for ECDSA. PQ transactions are ~1.5 KB (FN-DSA) or
  ~3.7 KB (ML-DSA) larger and consume correspondingly more bandwidth. Pass the scheme to
  `getCanDelegatedMaxSize(address, 0, PQScheme.FN_DSA_512)` so the bandwidth estimate
  reserves room for it.
- **Fund a PQ address before its first send.** A PQ-derived address is an ordinary TRON
  account and needs no special activation step, but — like any address — it must receive TRX
  before it can send: an unfunded one passes signature verification and then fails contract
  validation with `account does not exist`.
- **FN-DSA-512: back up `privateKey`, not the seed.** Falcon key generation is FFT-based
  and not bit-stable across implementations, so the same seed yields a different keypair —
  and a different address — under java-tron/BouncyCastle. TIP-899 §8 gives the same warning.
  **ML-DSA-44 seeds are portable**: keygen is integer-only, and a 32-byte seed yields the
  same key here as in java-tron's Toolkit (checked against its BouncyCastle KAT vectors).
- **Interoperability is verified**, not assumed: this library's signatures are checked
  against the 100 official Falcon-512 KAT vectors that BouncyCastle (which java-tron uses)
  is tested against, and a Nile node derives the identical address from the public key we
  put in `pq_auth_sig`.
- **Mainnet is unaffected.** An ECDSA transaction serializes to byte-identical wire output
  under the pre-TIP-899 protobuf and the new one (`pq_auth_sig` is a repeated field: when
  empty, it emits nothing), so mainnet nodes see exactly what they saw before.
- **ML-DSA-44 signing mode** matches java-tron's `MLDSA44` exactly: pure ML-DSA (no
  HashML-DSA pre-hash) over the 32-byte txid, empty context, hedged randomness.

---

## TRC20 balances

`getTrc20Balance` ABI-encodes `balanceOf(address)`, calls
`TriggerConstantContract`, and decodes the `uint256`:

```ts
const { raw, value, decimals } = await client.getTrc20Balance(usdtContract, holder, 6);
```

For arbitrary calls, use `triggerConstantContract` with either a
`functionSelector` + ABI-encoded `params`, or pre-encoded `data`:

```ts
const res = await client.triggerConstantContract({
  ownerAddress: holder,
  contractAddress: usdtContract,
  functionSelector: 'balanceOf(address)',
  params: encodeAddressParam(holder),
});
res.constantResult[0]; // hex word
```

---

## Environment variables

Copy [`.env.example`](.env.example) to `.env` and fill it in. The recommended way
to supply secrets is via the environment, never in code:

| Var | Used by | Purpose |
| --- | --- | --- |
| `TRON_PRO_API_KEY` | client + tests | TronGrid API key (raises rate limits), sent as the `TRON-PRO-API-KEY` gRPC metadata header. |
| `TRON_GRPC_LOG_LEVEL` | client | Diagnostic log level: `silent`, `error`, `warn`, `info`, or `debug` (default `silent`). |
| `TRON_PRIVATE_KEY` | `test:nile`, private `test.ts` | Funded **testnet** private key (hex, 64 chars). |
| `TRON_TO` | private `test.ts` | Recipient address for the test transfer (`test:nile` generates its own). |
| `TRON_NETWORK` | `test:nile`, `test:live`, private `test.ts` | `nile` or `shasta` for signing tests (they refuse `mainnet`); `test:live` defaults to `mainnet`. |

---

## Running the tests

```bash
npm run typecheck   # tsc --noEmit (sources + test.ts), full strict mode
npm run lint        # eslint (no `any` in public API)
npm run test:unit   # offline known-answer tests against the built dist/ (no network, no keys)
npm run test:live   # read-only checks against a public node (no keys; TRON_PRO_API_KEY optional)
npm run test:nile   # signs + broadcasts on Nile: ECDSA, FN-DSA-512, ML-DSA-44, mixed multi-sig
                    # (needs a funded testnet TRON_PRIVATE_KEY in .env; refuses mainnet)
npm run verify      # typecheck + lint + build + test:unit
npm test            # tsx test.ts — private broadcast suite (gitignored, see below)
```

`test/` is committed and needs no secrets. `test:live` re-serializes real
mainnet transactions and asserts `computeTxid` reproduces the node's txid, so a
proto sync that breaks encoding fails loudly.

The private `test.ts` suite (not in the repo) makes **real** calls (nothing is
hardcoded to pass) and includes four Tronscan cross-checks — for the same data, it reads via this library (gRPC) and
via Tronscan's public REST API and asserts the **values** are equal:

1. **TRX balance** of an example address — gRPC `getAccount` vs `/api/account`.
2. **TRC20 (USDT) balance** — gRPC `triggerConstantContract` vs `/api/account`.
3. **Block by number** (hash, witness, timestamp) — gRPC `getBlockByNum` vs `/api/block`.
4. **Transaction by txid** (block, result) — gRPC `getTransactionInfoById` vs `/api/transaction-info`.

Cross-checks run on **mainnet** (Tronscan's public API is mainnet). Signing +
broadcast runs on the **Nile testnet** only — it signs a 1-sun transfer, asserts
the node accepts it, and confirms it on-chain. It never spends mainnet TRX.

`test:nile` is the committed equivalent for signing: every transaction it sends is
confirmed on-chain, then fetched back and checked — `computeTxid` must reproduce the
node's txid and every signature must verify. Get testnet TRX for the key in `.env`
from the [Nile faucet](https://nileex.io/join/getJoinPage); one run spends ~120 TRX
(the multi-sig case pays Nile's 100 TRX permission-update fee, and is skipped below
130 TRX).

---

## Updating the protos

The `.proto` files are vendored from
[tronprotocol/protocol](https://github.com/tronprotocol/protocol) and the TypeScript
bindings are generated with `protoc` (`brew install protobuf`):

```bash
npm run update-proto       # sync-proto (fetch master) + gen-proto (regenerate .ts)
npm run sync-proto v4.8.2  # or pin a tag / branch / commit
```

The sync rewrites imports, vendors `google.protobuf.Any`, and strips HTTP-gateway and
codegen options so the files compile without googleapis. Until TIP-899 is merged
upstream it also re-injects the post-quantum definitions (`PQScheme`, `PQAuthSig`,
`pq_auth_sig`, `pq_scheme`) from the reference implementation, and fails loudly if
upstream changed shape around them. Run `npm run test:live` afterwards: it re-encodes
real mainnet transactions and catches any proto change that breaks txid computation.

---

## Security

- **Never commit secrets.** `test.ts` (which holds a key + endpoint) and `.env`
  are listed in [`.gitignore`](.gitignore). Only `.env.example` is committed.
- Supply the private key and API key via environment variables (see above); the
  committed fallbacks exist only for the original throwaway test account.
- The broadcast test is hard-coded to **refuse `mainnet`** and only runs against
  Nile/Shasta, so a misconfigured key can never spend real TRX.

---

## Project structure

```
src/
  client/                 the gRPC client, split by feature for easy maintenance
    core.ts               transport: connection, request<T>(), buildExtention/query helpers
    helpers.ts            pure helpers (sun/int, assert, decode, trigger builder)
    blocks.ts             block reads
    accounts.ts           account reads + account-management builders
    transactions.ts       tx reads + create → sign → broadcast
    contracts.ts          smart-contract calls, deploy, TRC20
    resources.ts          staking / delegation (Stake 2.0)
    witnesses.ts          witness management + voting
    assets.ts             TRC10 issuance / transfer / queries
    governance.ts         proposals, exchanges, storage, market
    chain.ts              node / chain info
    shielded.ts           zk-SNARK (shielded) RPCs
    index.ts              composes the chain → `TronGrpcClient` + `fromNetwork`
  codecs/                 abi.ts (encode/decode), decode.ts (response → readable)
  utils/
    address.ts            base58 / hex addresses (checksum-validated)
    units.ts, hex.ts      TRX <-> sun, hex helpers
    crypto.ts             secp256k1 (ECDSA) keys, signing, recovery
    pq.ts                 TIP-899 post-quantum: FN-DSA-512 + ML-DSA-44, envelopes, precompiles
    signer.ts             Signer strategies chosen by key type (ECDSA / Falcon / ML-DSA)
    verify.ts             computeTxid + verifyTransaction (ECDSA + PQ)
  proto/                  vendored TRON .proto + generated .ts
  logger.ts               opt-in diagnostic logging
  network.ts              TRON_NETWORKS
  protoLoader.ts          single proto-loader package definition
  types.ts                public typed shapes
  index.ts                public barrel
index.ts                  package root barrel (re-exports src + compat aliases)
scripts/sync-proto.ts     vendors upstream protos (see Updating the protos)
test/                     unit (offline), live (read-only mainnet), nile (signed testnet)
```

The client is one flat class (`client.getAccount(...)`, `client.freezeBalanceV2(...)`)
assembled from the feature files through a single inheritance chain
(core → blocks → accounts → … → shielded → `TronGrpcClient`), so each area lives in
its own small file while the public API stays flat.

## Design: why gRPC + proto-loader

This library uses **`@grpc/grpc-js` + `@grpc/proto-loader`** with the official
TRON `.proto` definitions (vendored under [`src/proto/`](src/proto)).

- `proto-loader` loads the `.proto` files at runtime and produces plain request
  objects — no codegen step is required to call an RPC, and adding a new method
  is a one-liner via the typed `request<T>()` escape hatch.
- `longs: String` keeps 64-bit integers (balances, amounts) **exact** — they
  surface as decimal strings instead of lossy JS numbers.
- The hand-written typed layer ([`src/codecs`](src/codecs), [`src/types.ts`](src/types.ts))
  decodes those raw responses into readable objects, so `any` never reaches the
  public API.

The alternative, `ts-proto`, would generate a typed runtime but require a build
step and a transport rewrite; the generated message classes are already vendored
here for reference, but the transport deliberately stays on the loader-based path
for flexibility.

---

## Implemented methods

The client covers essentially the whole `Wallet` gRPC service (147 RPCs). Each
method takes human inputs (base58/hex addresses, decimal TRX) and returns
readable, bytes-free results; **state-changing builders return an unsigned
`TransactionExtention`** that you pass to `signAndBroadcast`. Anything not given a
named method is still reachable through the typed `request<T>()` escape hatch.

- **Blocks:** `getNowBlock`, `getBlockByNum`, `getBlockById`, `getBlockByLatestNum`,
  `getBlockByLimitNext`, `getBlock`, `getTransactionCountByBlockNum`,
  `getBlockBalanceTrace`.
- **Accounts:** `getAccount`, `getBalance`, `getAccountResources`, `getAccountById`,
  `getAccountNet`, `getAccountBalance`, `updateAccount`, `setAccountId`,
  `createAccount`, `accountPermissionUpdate`, `getRewardInfo`, `getBrokerageInfo`.
- **Transfers / transactions:** `createTransaction`, `signAndBroadcast`, `sendTrx`,
  `createCommonTransaction`, `getTransactionById`, `getTransactionInfoById`,
  `getTransactionInfoByBlockNum`, `getTransactionSignWeight`,
  `getTransactionApprovedList`, `getTransactionFromPending`,
  `getTransactionListFromPending`, `getPendingSize`.
- **Staking / resources:** `freezeBalanceV2`, `unfreezeBalanceV2`, `unfreezeBalance`,
  `withdrawExpireUnfreeze`, `cancelAllUnfreezeV2`, `delegateResource`,
  `unDelegateResource`, `withdrawBalance`, `updateBrokerage`, plus the delegate /
  unfreeze queries (`getDelegatedResource(V2)`, `getDelegatedResourceAccountIndex(V2)`,
  `getCanDelegatedMaxSize`, `getAvailableUnfreezeCount`, `getCanWithdrawUnfreezeAmount`).
- **Smart contracts:** `deployContract`, `triggerContract`, `triggerConstantContract`,
  `estimateEnergy`, `getTrc20Balance`, `updateSetting`, `updateEnergyLimit`,
  `clearContractABI`, `getContract`, `getContractInfo`.
- **Witnesses / voting:** `createWitness`, `updateWitness`, `voteWitnessAccount`,
  `listWitnesses`, `getPaginatedNowWitnessList`.
- **TRC10 assets:** `createAssetIssue`, `transferAsset`, `participateAssetIssue`,
  `unfreezeAsset`, `updateAsset`, and the asset queries (`getAssetIssueByAccount`,
  `getAssetIssueByName`, `getAssetIssueListByName`, `getAssetIssueById`,
  `getAssetIssueList`, `getPaginatedAssetIssueList`).
- **Governance / markets:** proposals (`proposalCreate/Approve/Delete`,
  `listProposals`, `getPaginatedProposalList`, `getProposalById`), exchanges
  (`exchangeCreate/Inject/Withdraw/Transaction`, `listExchanges`,
  `getPaginatedExchangeList`, `getExchangeById`), storage (`buyStorage`,
  `buyStorageBytes`, `sellStorage`), and the on-chain market
  (`marketSellAsset`, `marketCancelOrder`, `getMarketOrderById`,
  `getMarketOrderByAccount`, `getMarketPriceByPair`, `getMarketOrderListByPair`,
  `getMarketPairList`).
- **Node / chain:** `getChainParameters`, `listNodes`, `getNodeInfo`,
  `totalTransaction`, `getNextMaintenanceTime`, `getBurnTrx`, `getBandwidthPrices`,
  `getEnergyPrices`, `getMemoFee`.
- **Shielded (zk-SNARK):** the full `CreateShieldedTransaction…` / `ScanNote…` /
  shielded-TRC20 family, exposed as readable passthroughs.

**Utilities:** address (`isAddress`, `toBase58Address`, `toHexAddress`,
`base58ToBytes`, `bytesToBase58Address`, `decodeAddress`), units (`trxToSun`,
`sunToTrx`, `toBaseUnits`, `fromBaseUnits`), crypto (`privateKeyToAddress`,
`fromMnemonic`, `signMessage`, `signTransactionId`, `signDigest`), and ABI/hex
helpers (`encodeFunctionData`, `encodeAddressParam`, `encodeUint256`,
`decodeUint256`, `functionSelector`, `stripHexPrefix`, `hexToBytesSafe`,
`longToBytesBE`).

> Deprecated v1 duplicates that return a bare `Transaction` (e.g. `CreateTransaction`,
> legacy `FreezeBalance`) are intentionally not wrapped — their `…2` /
> `TransactionExtention` forms are implemented instead. Use `request<T>()` if you
> need a raw v1 call.

---

## Assumptions

- **Tronscan's public REST API is mainnet-only and keyless.** Cross-check tests
  therefore run on mainnet against stable fixtures (a dormant treasury address,
  the canonical USDT contract, an immutable historical block + transaction). The
  `TRON-PRO-API-KEY` header is *not* sent to Tronscan (it 401s otherwise).
- **The committed test key targets Nile.** Broadcast tests run there; the test
  skips broadcast gracefully if that account has no testnet TRX.
- **TRX has 6 decimals**; TRC20 decimals default to 6 (USDT) and are a parameter.
- Live-balance cross-checks read both sources near-simultaneously and retry until
  two reads agree, to avoid a false failure if a balance moves mid-test.
- Node 20+ is assumed for global `fetch`.
