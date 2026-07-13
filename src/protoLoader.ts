import * as protoLoader from '@grpc/proto-loader';
import * as grpc from '@grpc/grpc-js';
import * as protobuf from 'protobufjs';
import * as path from 'path';

// __dirname is `<root>/src` in source and `<root>/dist/src` after build. The
// .proto files live under `<root>/src/proto`, and their `import` statements are
// written relative to the project root (`import "src/proto/Tron.proto"`), so the
// include dir must be that root (one level above this file's directory).
const ROOT = path.resolve(__dirname, '..');
const PROTO_PATH = path.resolve(ROOT, 'src/proto/API.proto');

/** Shared proto-loader package definition for the TRON Wallet service. */
export const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    // Exact int64 handling: balances/amounts come back as decimal strings.
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [ROOT, path.resolve(ROOT, 'src/proto'), path.resolve(ROOT, 'src/proto/contract')],
});

const loaded = grpc.loadPackageDefinition(packageDefinition) as unknown as {
    protocol: { Wallet: grpc.ServiceClientConstructor };
};

/** Constructor for the gRPC `protocol.Wallet` service client. */
export const WalletServiceClient = loaded.protocol.Wallet;

/**
 * A protobuf.js view of the same protos, used to *encode* `Transaction.raw`.
 *
 * proto-loader can decode but not serialize on its own, and the txid — the digest
 * every signature is made over — is `SHA-256(Transaction.raw)`. Verifying a
 * transaction we did not fetch from a node (say, a signed blob posted to a server)
 * means re-serializing `raw_data` ourselves.
 *
 * The imports inside Tron.proto are written relative to the project root, so paths
 * resolve from `ROOT` rather than from the importing file.
 */
// `keepCase` matters: proto-loader decodes to snake_case field names, and
// protobuf.js would otherwise expect camelCase and silently drop what it can't
// match (e.g. `type_url`), producing a valid-looking but wrong serialization.
const root = new protobuf.Root();
root.resolvePath = (_origin: string, target: string): string => path.resolve(ROOT, target);
root.loadSync(path.resolve(ROOT, 'src/proto/Tron.proto'), { keepCase: true });

/** protobuf.js message type for `Transaction.raw`. */
export const TransactionRawType = root.lookupType('protocol.Transaction.raw');
