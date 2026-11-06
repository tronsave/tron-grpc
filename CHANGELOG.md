# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `LICENSE` (MIT) and the `license` field in `package.json`. The bundled `.proto`
  files keep their upstream LGPL-3.0 license; see README → License.

## [3.0.0] - 2026-11-06

### Security

- **A node-built transaction is no longer signed on trust.** Previously `sendTrx` /
  `signAndBroadcast` signed whatever `txid` the node returned, without checking it or
  the transaction it came with: a compromised node — or anyone on a plaintext network
  path — could answer a transfer request with a different transaction, or with the id
  of one. Now:
  - every builder method compares the contract the node returned with the request,
    byte for byte, and rejects a transaction carrying a fee limit, memo, permission or
    extra contract that was not requested (`refusing the transaction the node built`).
    Opt out with the `verifyBuiltTransactions: false` client option;
  - the txid is always recomputed locally as `SHA-256(raw_data)` before signing, and a
    mismatch with the extention's own `txid` throws (`Refusing to sign`). No opt-out.
- **TLS.** The transport was hard-coded to plaintext, so API keys travelled in the
  clear. New `tls` / `credentials` client options; TLS is on by default when the port
  is `443`. `TRON_NETWORKS.mainnet.grpcHost` is now `grpc.trongrid.io:443` (TronGrid
  offers no TLS port for Nile or Shasta, which stay on plaintext 50051). The client
  warns when `headers` are sent over a plaintext connection to a remote host.
- `verifyTransactionById` recomputes the id of the transaction the node returns and
  rejects a mismatch, instead of checking signatures against the id that was asked for.
- **Amounts given as a float are no longer silently rounded.** `trxToSun(0.1234567)`
  returned 123457 sun and `trxToSun(1e-7)` returned 0; both now throw, as the string
  forms always did. `toBaseUnits(0.1, 18)` returned `100000000000000006`; it now
  returns exactly `10^17`.
- `toAddressBytes` validates raw `Uint8Array` input (21 bytes, `0x41` prefix) instead
  of passing any byte string through.
- `ExternalSigner`: `sendTrx`, `sendTrc20`, `signTransaction` and `signAndBroadcast`
  accept a signer object in place of a key, so keys can stay in a KMS / HSM / hardware
  wallet. It may be async; its signature is verified locally before broadcast.

### Added

- **Fee limit, memo, expiration, permission id.** The gRPC builders cannot set these
  (a node-built contract call always has `fee_limit = 0`, so it only ran on staked or
  rented energy). `applyTransactionOptions(extention, { feeLimit, memo, expiration,
  permissionId })` sets them locally and re-derives the txid; `signAndBroadcast` takes
  the same options, and `triggerContract` / `deployContract` accept `feeLimit` (sun).
- `sendTrc20({ contractAddress, to, amount, decimals?, feeLimit?, privateKey })`.
- `signTransaction(extention, key)` (sign without broadcasting) and
  `broadcastTransaction(signed)` — the multi-sig building blocks.
- `TronGrpcClient.solidity(network)` and the `service: 'WalletSolidity'` option: read
  solidified (irreversible) state. `TRON_NETWORKS[*].solidityGrpcHost`.
- Per-call deadlines and cancellation: `timeoutMs` client option,
  `client.withCallOptions({ timeoutMs, signal })`, and a third `request()` argument.
- `channels` client option: spread calls over several HTTP/2 connections.
- `BlockTransaction.pqSignatures`: post-quantum signatures were dropped when decoding
  blocks, so a PQ-signed transaction looked unsigned.
- `hashMessage` / `signMessage` / `verifyMessage` (and the PQ variants) accept
  `Uint8Array` messages as well as strings.
- `mnemonicToSeed`, `derivePrivateKey`, `base58Encode`, `base58Decode`.
- **Typed responses.** The 94 methods that returned `Record<string, unknown>` now
  return the node's message under its proto name: `getBlockByLatestNum` →
  `BlockListExtention`, `getBlock` → `BlockExtention`, `getChainParameters` →
  `ChainParameters`, `getDelegatedResourceV2` → `DelegatedResourceList`,
  `listWitnesses` → `WitnessList`, `getTransactionInfoByBlockNum` →
  `TransactionInfoList`, `getContract` → `SmartContract`, and the account, asset,
  proposal, exchange, market, node and pending-pool reads likewise (README lists
  them all). Every builder method returns `UnsignedTransactionExtention`. 74 new
  exported types (`src/types/responses.ts`), describing the message as the client
  returns it: proto field names, `int64` as strings, enums as names, `bytes` as
  base58 / hex, unset sub-messages as `null`. Types only — what the methods return at
  runtime is unchanged, and each type was checked against live mainnet responses.
  Shielded RPCs still return `Record<string, unknown>`.
- CI workflow (`.github/workflows/ci.yml`): `npm run verify` on Node 20/22/24 and
  `npm audit` of runtime dependencies.

### Changed

- **Runtime dependencies cut from 11 to 6.** Removed:
  - `@scure/base`, `@scure/bip32`, `@scure/bip39` — base58 and the BIP-39 seed / BIP-32
    private derivation behind `fromMnemonic` are now implemented here on `@noble/hashes`
    and `@noble/curves` (already dependencies). Outputs verified identical to the
    replaced packages on 20,000 random base58 inputs and 2,600 random derivations, and
    against the BIP-32 / BIP-39 published vectors, which are now unit tests;
  - `google-protobuf` — only used by generated bindings (`src/proto/*.ts`) that no code
    imported. Those are no longer generated or shipped: `dist/` shrinks from 1.6 MB to
    about 0.45 MB. `gen-ts.sh`, `gen-proto` and the `protoc` requirement are gone;
  - `tslib` — the few emit helpers used are inlined.
- `dist/` is no longer minified (dropped `terser`), so the published code is readable.
- Proto definitions are parsed on first use instead of at import: importing the package
  takes ~48 ms instead of ~78 ms, and code that only uses the address / unit / signing
  helpers never parses them.
- The default 30s deadline moved from the gRPC service config to a per-call deadline
  (so it can be changed per call). `RESOURCE_EXHAUSTED` was removed from the gRPC-level
  retry policy: `rateLimitRetry` already handles it, and listing it twice multiplied
  the attempts.
- Updated `@grpc/grpc-js` 1.14.7 and dev tooling (`eslint` 10.14.0, `typescript-eslint`
  8.72.1, `@types/node` 26.6.6). Still held back: `typescript` 7 (`typescript-eslint`
  supports `<6.1`) and `protobufjs` 8 (`@grpc/proto-loader` requires `^7`).

### Migration notes

- Mainnet now uses port 443 + TLS. To keep the old endpoint, pass the host explicitly:
  `new TronGrpcClient('grpc.trongrid.io:50051')`.
- Code that edits `extention.transaction.raw_data` by hand must update `extention.txid`
  too (or use `applyTransactionOptions`), otherwise signing throws.
- Passing a float with excess precision as an amount now throws; pass a string.
- Deep imports of `tron-grpc/dist/src/proto/*.js` (the generated classes) no longer exist.
- `BlockTransaction` has a new required field, `pqSignatures`.
- TypeScript only: results that were `Record<string, unknown>` are now typed. The new
  types remain assignable to `Record<string, unknown>`, so casts such as
  `res.witnesses as Record<string, unknown>[]` still compile; what stops compiling is
  reading a field that does not exist, or asserting a type the field cannot have
  (`res.num as number` — it is a string). `signTransaction` now returns the type of
  the extention it was given.

## [2.3.1] - 2026-10-22

### Fixed

- **Over-size responses are no longer retried as rate limits.** grpc-js reports
  "Received message larger than max" as `RESOURCE_EXHAUSTED`, which 2.3.0's
  `rateLimitRetry` mistook for a 429: the call was re-downloaded 5 more times over
  ~12s before failing. It now fails immediately.
- The default maximum response size is raised from grpc-js's 4 MiB to 64 MiB
  (`grpc.max_receive_message_length`), so range reads work: `getBlockByLatestNum(60)`
  on mainnet is ~8 MB and previously always failed. Override via `grpcOptions`.
- Passing `headers` no longer discards `interceptors` given in `grpcOptions`.

### Performance

- `getNowBlock` / `getBlockByNum` decode ~3x faster (1.7 → 0.56 ms for a 381-tx
  mainnet block, output byte-identical): each transaction is normalized once instead
  of three times, and the byte/address normalizer skips primitives first.
  `BlockTransaction.raw` / `rawData` / `internalTransactions` are now the same objects
  as the corresponding subtrees of `BlockSummary.raw` (likewise `TransactionResult.rawData`
  is `raw.raw_data`), so mutating one is visible through the other.
- `sendTrx` builds its signer once instead of twice (saves a public-key derivation:
  ~0.2 ms ECDSA, up to ~0.9 ms for a PQ key given without its public key).
- Concurrent PQ sends share one in-flight `GetChainParameters` capability check.

## [2.3.0] - 2026-10-22

### Fixed

- **Base58 addresses are now checksum-validated everywhere.** `toAddressBytes`,
  `toHexAddress`, `toBase58Address` and `base58ToBytes` previously stripped the
  checksum without checking it, so a mistyped "T..." address silently decoded to a
  different, unowned address — including as the recipient of `sendTrx`. They now
  throw `Invalid TRON address checksum`. (`isAddress` already validated.)
- Generated google-protobuf bindings (`src/proto/*.ts`) were stale and lacked the
  TIP-899 `PQScheme` / `PQAuthSig` / `pq_auth_sig` definitions; regenerated.

### Changed

- Synced protos with `tronprotocol/protocol@master`: `events` in
  `IvkDecryptTRC20Parameters` / `OvkDecryptTRC20Parameters` is now `deprecated`.
  TIP-899 fields remain vendored (not yet upstream).
- Dependencies updated to latest: `@grpc/grpc-js` 1.14.6, `@noble/curves` /
  `@noble/hashes` / `@scure/*` 2.4.0, `@noble/post-quantum` 0.7.1 (Falcon-512 keygen
  verified byte-identical to 0.6.1, so existing PQ keys and addresses are unchanged),
  `google-protobuf` 4.0.3, `protobufjs` 7.6.6, plus dev tooling.
- `@grpc/proto-loader` is now a declared dependency (it was imported but only
  installed transitively via `@grpc/grpc-js`).
- Held back: `typescript` 7 (`typescript-eslint` supports `<6.1`) and `protobufjs` 8
  (`@grpc/proto-loader` still requires `^7`; upgrading would ship two copies).

### Added

- **ML-DSA-44 (FIPS 204) post-quantum signatures — TIP-899's second scheme.** Keygen
  (`generateMlDsa44Key`, seed-portable), signing (`signDigestMlDsa44`,
  `signTransactionIdMlDsa44`, `signMessageMlDsa44`), verification (`verifyDigestMlDsa44`,
  and the scheme-agnostic `verifyDigestPQ`), `MlDsa44Signer`, and
  `encodeVerifyMlDsa44Input` for the `VerifyMlDsa44` precompile (`0x02000018`). Wire format
  matches java-tron's reference `MLDSA44` (pure ML-DSA, empty context; 1312 B public key,
  2420 B signature, 2560 B private key); keygen matches its BouncyCastle KAT vectors byte
  for byte.
  - `sendTrx` / `signAndBroadcast` / `getSigner` accept ML-DSA-44 keys. A `TronPqKey`'s
    scheme comes from `keyType` (`'FALCON'` | `'ML_DSA_44'`) or is inferred from the private
    key's length (`pqKeyType`).
  - `verifyTransaction` / `verifyMessagePQ` / `verifySignedMessage` verify ML-DSA-44 instead
    of rejecting it as unsupported; `KeyType` gains `'ML_DSA_44'`.
  - The pre-broadcast activation guard now checks each scheme's own flag
    (`ALLOW_FN_DSA_512` / `ALLOW_ML_DSA_44`).
- **Rate-limit retry** (`rateLimitRetry` client option, on by default): calls rejected with
  HTTP 429 / `RESOURCE_EXHAUSTED` are retried with exponential backoff and jitter. The
  existing gRPC retry policy never covered this case — a 429 commits the call.
- `getCanDelegatedMaxSize(address, type, pqScheme?)`: TIP-899's `pq_scheme` request field,
  so the bandwidth estimate reserves room for a PQ signature. `sync-proto` now vendors it
  (and `HelloMessage.pq_auth_sig`) from the TIP-899 reference implementation.
- `npm run test:nile`: real signed broadcasts on Nile — ECDSA, FN-DSA-512, ML-DSA-44 (or its
  refusal while inactive), and a mixed ECDSA + FN-DSA-512 multi-sig owner permission.
- `engines.node >= 20.19.0` (required by `@noble/post-quantum` 0.7).
- Committed test suite in `test/`: `npm run test:unit` (offline known-answer tests
  against the built package) and `npm run test:live` (read-only mainnet checks,
  including txid recomputation of real transactions). `npm run verify` now builds
  and runs the unit tests.

## [2.2.0] - 2026-07-13

### Added

- **Post-quantum signature support (TIP-899, FN-DSA-512 / Falcon-512).** Signing is chosen
  by key type, so existing call-sites are unchanged: `signAndBroadcast` and `sendTrx` now
  accept either an ECDSA private key (hex, exactly as before) or a `TronPqKey`.
- `Signer` interface with `EcdsaSigner` (a wrapper around the existing secp256k1 functions —
  its logic is untouched) and `FalconSigner`; `getSigner` / `addressOf` select by key type.
- Falcon utilities: `generateFalconKey`, `signDigestFalcon`, `signTransactionIdFalcon`,
  `verifyDigestFalcon`, `falconPublicKeyToAddress`, `falconPrivateKeyToPublicKey`, and the
  scheme-agnostic `pqPublicKeyToAddress`.
- Off-chain message signing: `signMessagePQ` returns a hex envelope (so `signMessage`
  call-sites keep working), and `verifyMessagePQ` verifies it and returns the signer's
  address. `verifyMessageV2` behaviour is untouched.
- `encodeVerifyFnDsa512Input` builds input for the `VerifyFnDsa512` precompile (`0x02000016`).
- **Signature verification**, which the library previously had none of (not even for ECDSA):
  - `verifyTransaction(tx, txid?)` — one entry point that dispatches on the signature fields
    present, verifying ECDSA (`signature[]`) and post-quantum (`pq_auth_sig[]`) signatures,
    including a mix of both on one multi-sig transaction. Reports every signer. Unknown PQ
    schemes are rejected rather than treated as valid.
  - `client.verifyTransactionById(txid)` — fetch and verify in one step.
  - `computeTxid(rawData)` — `SHA-256(Transaction.raw)`, so a transaction can be verified
    without asking a node for its id. Validated against real mainnet and Nile transactions
    across 6 contract types.
  - `verifyMessage` / `recoverAddress` (ECDSA `ecrecover`), and `verifySignedMessage`, which
    accepts an ECDSA signature or a PQ envelope and dispatches on it.
  - Verification is cryptographic only — it does not check `Permission` thresholds, which
    depend on account state and only a node can settle.
- `client.getPqCapabilities()` reports whether `ALLOW_FN_DSA_512` / `ALLOW_ML_DSA_44` are
  active, for capability detection before signing.
- Capability guard: signing with a PQ key on a chain where FN-DSA-512 is not active (mainnet
  today) now throws before broadcasting, instead of emitting a transaction the node will
  reject. The check runs only on the PQ path — ECDSA signing issues no extra RPC — and the
  result is cached only when enabled, so a long-lived client picks up a future mainnet
  activation without a restart.
- `TransactionResult.pqSignatures` surfaces `pq_auth_sig` on fetched transactions, with the
  signer address derived from each public key.
- Protobuf: `PQScheme`, `PQAuthSig`, `Transaction.pq_auth_sig = 6`, `BlockHeader.pq_auth_sig = 3`.
  `sync-proto` re-vendors these until upstream ships TIP-899, so a proto sync can't drop them.

### Changed

- `SendTrxParams.privateKey` and `signAndBroadcast`'s key parameter widen from `string` to
  `SigningKey` (`string | TronPqKey`). Passing a hex string behaves exactly as before.
- `hashMessage` extracted from `signMessage` and exported, so the PQ path digests messages
  through the identical code. ECDSA output is byte-for-byte unchanged.
- Signers now append to `signature[]` / `pq_auth_sig` instead of overwriting, which is what
  lets a mixed ECDSA + PQ multi-sig transaction accumulate weight. For the ordinary
  single-signature flow the result is identical.

### Compatibility

- **Mainnet is unaffected.** ECDSA transactions serialize to byte-identical wire output
  under the pre-TIP-899 protobuf and the new one, and the pre-TIP-899 protobuf still decodes
  transactions this version produces. Verified against live mainnet: chain reads, transaction
  decoding (`pqSignatures: []`), and the ECDSA create → sign → broadcast flow are unchanged.
- FN-DSA-512 is enabled on Nile only. PQ signing on any other network fails fast; it will
  start working on mainnet once the `ALLOW_FN_DSA_512` proposal passes, with no code change.

### Dependencies

- Added `@noble/post-quantum` (Falcon-512), from the same author as the `@noble/curves` and
  `@noble/hashes` already in use.
- Added `protobufjs` as an explicit dependency (it was already present transitively via
  `@grpc/proto-loader`). It serializes `Transaction.raw` for local txid computation —
  proto-loader can decode but not encode.

## [2.1.0] - 2026-07-07

### Added

- Configurable client diagnostic logging via `logLevel` on `TronClientOptions` and the
  `TRON_GRPC_LOG_LEVEL` environment variable (`silent` | `error` | `warn` | `info` | `debug`,
  default `silent`).
- `Logger` interface and `LogLevel` type exported from the public API; optional custom
  `logger` sink for integration with pino, winston, etc.
- `[tron-grpc]`-prefixed logs for connection host, gRPC channel state, RPC method
  timing, transport errors, TRON-level extension failures, and broadcast rejections.

### Changed

- `TronClientCore` now exposes a protected `assertExtentionOk()` wrapper that logs
  application-level RPC failures at `error` before rethrowing.
- `signAndBroadcast` logs at `error` when the node rejects a broadcast.

## [2.0.0] - 2026-06-25

### Added

- Fully-typed `TronGrpcClient` with decoded, human-readable responses (base58 addresses,
  exact numeric strings, no raw bytes in the public API).
- Rich `TronAccount` view with balances, TRC10 assets, staking (v1/v2), resources,
  permissions, votes, and a complete `raw` passthrough.
- `BlockSummary` with fully decoded transactions, event logs, and internal transactions.
- `TransactionInfoResult`, `ConstantCallResult`, and `EstimateEnergyResult` with
  EVM logs, energy penalty, and internal transaction decoding.
- Address, unit, crypto, and ABI utility exports from the package root.
- Tuned gRPC defaults: keepalive, retries, and service config for `protocol.Wallet`.

### Changed

- Major API redesign: v1 escape-hatch style replaced by typed feature methods across
  blocks, accounts, transactions, contracts, resources, witnesses, assets, governance,
  chain, and shielded modules.

[2.3.1]: https://github.com/tronsave/tron-grpc/compare/v2.3.0...v2.3.1
[2.3.0]: https://github.com/tronsave/tron-grpc/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/tronsave/tron-grpc/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/tronsave/tron-grpc/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/tronsave/tron-grpc/releases/tag/v2.0.0
