/**
 * Known TRON networks with their public TronGrid gRPC + HTTP endpoints.
 *
 * `grpcHost` is what this library talks to. `fullHost` / `scanApi` are listed
 * for convenience (e.g. tests that cross-check against the public REST API).
 */
export interface TronNetworkConfig {
    /** gRPC `host:port` for the java-tron Wallet service. */
    readonly grpcHost: string;
    /** HTTP full-node base URL (TronGrid). */
    readonly fullHost: string;
    /** Public Tronscan REST API base URL for this network. */
    readonly scanApi: string;
}

export const TRON_NETWORKS = {
    mainnet: {
        grpcHost: 'grpc.trongrid.io:50051',
        fullHost: 'https://api.trongrid.io',
        scanApi: 'https://apilist.tronscanapi.com',
    },
    nile: {
        grpcHost: 'grpc.nile.trongrid.io:50051',
        fullHost: 'https://nile.trongrid.io',
        scanApi: 'https://nileapi.tronscan.org',
    },
    shasta: {
        grpcHost: 'grpc.shasta.trongrid.io:50051',
        fullHost: 'https://api.shasta.trongrid.io',
        scanApi: 'https://shastapi.tronscan.org',
    },
} as const satisfies Record<string, TronNetworkConfig>;

export type TronNetwork = keyof typeof TRON_NETWORKS;
