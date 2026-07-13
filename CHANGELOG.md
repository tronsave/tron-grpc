# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[2.2.0]: https://github.com/tronsave/tron-grpc/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/tronsave/tron-grpc/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/tronsave/tron-grpc/releases/tag/v2.0.0
