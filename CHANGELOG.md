# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[2.1.0]: https://github.com/tronsave/tron-grpc/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/tronsave/tron-grpc/releases/tag/v2.0.0
