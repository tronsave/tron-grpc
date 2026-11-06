/**
 * Known TRON networks with their public TronGrid gRPC + HTTP endpoints.
 *
 * `grpcHost` is what this library talks to. Mainnet uses TronGrid's TLS port;
 * the testnets offer plaintext only, so never send a mainnet-grade secret there. `fullHost` / `scanApi` are listed
 * for convenience (e.g. tests that cross-check against the public REST API).
 */
export interface TronNetworkConfig {
    /** gRPC `host:port` for the java-tron Wallet service. Port 443 means TLS. */
    readonly grpcHost: string;
    /** gRPC `host:port` for the WalletSolidity service (solidified, irreversible state). */
    readonly solidityGrpcHost: string;
    /** HTTP full-node base URL (TronGrid). */
    readonly fullHost: string;
    /** Public Tronscan REST API base URL for this network. */
    readonly scanApi: string;
}

export const TRON_NETWORKS = {
    mainnet: {
        // TronGrid terminates TLS on 443 for mainnet only (both services share it);
        // the plaintext ports remain 50051 (Wallet) and 50052 (WalletSolidity).
        grpcHost: 'grpc.trongrid.io:443',
        solidityGrpcHost: 'grpc.trongrid.io:443',
        fullHost: 'https://api.trongrid.io',
        scanApi: 'https://apilist.tronscanapi.com',
    },
    nile: {
        grpcHost: 'grpc.nile.trongrid.io:50051',
        solidityGrpcHost: 'grpc.nile.trongrid.io:50061',
        fullHost: 'https://nile.trongrid.io',
        scanApi: 'https://nileapi.tronscan.org',
    },
    shasta: {
        grpcHost: 'grpc.shasta.trongrid.io:50051',
        solidityGrpcHost: 'grpc.shasta.trongrid.io:50052',
        fullHost: 'https://api.shasta.trongrid.io',
        scanApi: 'https://shastapi.tronscan.org',
    },
} as const satisfies Record<string, TronNetworkConfig>;

export type TronNetwork = keyof typeof TRON_NETWORKS;
