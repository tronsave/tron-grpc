import * as protoLoader from '@grpc/proto-loader';
import * as grpc from '@grpc/grpc-js';
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
