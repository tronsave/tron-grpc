import * as grpc from '@grpc/grpc-js';
import { WalletServiceClient } from '../protoLoader';
import { TRON_NETWORKS } from '../network';
import { normalizeDeep } from '../codecs/decode';
import { createLogger, resolveLogLevel, type Logger, type LogLevel } from '../logger';
import { assertExtentionOk as checkExtentionOk, type Raw } from './helpers';

type UnaryFn = (
    req: unknown,
    cb: (err: grpc.ServiceError | null, res: unknown) => void
) => grpc.ClientUnaryCall;

/** Options for constructing a {@link TronGrpcClient}. */
export interface TronClientOptions {
    /** Extra gRPC channel options, merged over the tuned defaults. */
    grpcOptions?: Partial<grpc.ClientOptions>;
    /** Custom metadata headers added to every call (e.g. `TRON-PRO-API-KEY`). */
    headers?: Record<string, string>;
    /** Minimum log level. Defaults to `'silent'`, or `TRON_GRPC_LOG_LEVEL` when set. */
    logLevel?: LogLevel;
    /** Custom log sink (e.g. pino/winston). Defaults to `console`. */
    logger?: Logger;
}

const connectivityStateName = (state: number): string => {
    switch (state) {
        case grpc.connectivityState.IDLE:
            return 'IDLE';
        case grpc.connectivityState.CONNECTING:
            return 'CONNECTING';
        case grpc.connectivityState.READY:
            return 'READY';
        case grpc.connectivityState.TRANSIENT_FAILURE:
            return 'TRANSIENT_FAILURE';
        case grpc.connectivityState.SHUTDOWN:
            return 'SHUTDOWN';
        default:
            return String(state);
    }
};

/**
 * Transport core for the TRON `Wallet` gRPC service: connection management, the
 * generic `request<T>()` escape hatch, and the shared `buildExtention` / `query`
 * helpers used by the feature method groups that extend this class.
 */
export class TronClientCore {
    private readonly walletClient: grpc.Client;
    private readonly headers?: Record<string, string>;
    protected readonly log: Logger;
    private ready = false;
    private watching = false;
    private lastConnectivityState?: number;

    private static readonly DEFAULT_OPTIONS: grpc.ClientOptions = {
        'grpc.keepalive_time_ms': 20000,
        'grpc.keepalive_timeout_ms': 10000,
        'grpc.keepalive_permit_without_calls': 1,
        'grpc.http2.max_pings_without_data': 0,
        'grpc.initial_reconnect_backoff_ms': 100,
        'grpc.max_reconnect_backoff_ms': 10000,
        'grpc.enable_retries': 1,
        'grpc.service_config': JSON.stringify({
            methodConfig: [
                {
                    name: [{ service: 'protocol.Wallet' }],
                    retryPolicy: {
                        maxAttempts: 5,
                        initialBackoff: '0.1s',
                        maxBackoff: '10s',
                        backoffMultiplier: 1.5,
                        retryableStatusCodes: ['UNAVAILABLE', 'UNKNOWN', 'DEADLINE_EXCEEDED', 'RESOURCE_EXHAUSTED'],
                    },
                    timeout: '30s',
                },
            ],
        }),
    };

    constructor(host: string = TRON_NETWORKS.mainnet.grpcHost, options: TronClientOptions = {}) {
        this.headers = options.headers;
        this.log = createLogger(resolveLogLevel(options.logLevel), options.logger);
        const merged: grpc.ClientOptions = { ...TronClientCore.DEFAULT_OPTIONS, ...options.grpcOptions };

        if (this.headers) {
            const headers = this.headers;
            merged.interceptors = [
                (opts, nextCall) =>
                    new grpc.InterceptingCall(nextCall(opts), {
                        start: (metadata, listener, next) => {
                            for (const [key, value] of Object.entries(headers)) metadata.add(key, value);
                            next(metadata, listener);
                        },
                    }),
            ];
        }

        this.walletClient = new WalletServiceClient(host, grpc.credentials.createInsecure(), merged);
        this.log.info(`connecting to ${host}`);
        this.watchConnectivity();
    }

    /**
     * Generic escape hatch: invoke any Wallet RPC by name and get the raw
     * proto-loader response typed as `T` (defaults to `unknown`, never `any`).
     */
    request<T = unknown>(method: string, requestMessage: unknown): Promise<T> {
        const fn = (this.walletClient as unknown as Record<string, UnaryFn>)[method];
        if (typeof fn !== 'function') {
            this.log.error(`unknown RPC method: ${method}`);
            return Promise.reject(new Error(`Unknown Wallet RPC method: ${method}`));
        }
        const started = Date.now();
        this.log.debug(`→ ${method}`);
        return new Promise<T>((resolve, reject) => {
            fn.call(this.walletClient, requestMessage, (err, res) => {
                if (err) {
                    this.log.error(`✗ ${method} (${err.code}): ${err.message}`);
                    reject(err);
                    return;
                }
                this.log.debug(`✓ ${method} (${Date.now() - started}ms)`);
                resolve(res as T);
            });
        });
    }

    /** Assert TRON-level success on an extention response; logs at error before throw. */
    protected assertExtentionOk(method: string, res: Raw): void {
        try {
            checkExtentionOk(method, res);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.log.error(`✗ ${message}`);
            throw err;
        }
    }

    /** Run a builder RPC, assert the node accepted it, return the unsigned ext. */
    protected async buildExtention(method: string, contract: Raw): Promise<Raw> {
        const res = await this.request<Raw>(method, contract);
        this.assertExtentionOk(method, res);
        return res;
    }

    /** Run a query RPC and return a readable, bytes-free object. */
    protected async query<T = Raw>(method: string, message: unknown = {}): Promise<T> {
        return normalizeDeep(await this.request<Raw>(method, message)) as T;
    }

    /** True once the gRPC channel has reached READY. */
    get isReady(): boolean {
        return this.ready;
    }

    private logConnectivityChange(state: number): void {
        if (this.lastConnectivityState === state) return;
        const name = connectivityStateName(state);
        if (state === grpc.connectivityState.TRANSIENT_FAILURE) {
            this.log.warn(`channel state: ${name}`);
        } else {
            this.log.info(`channel state: ${name}`);
        }
        this.lastConnectivityState = state;
    }

    private watchConnectivity(): void {
        if (this.watching) return;
        this.watching = true;
        const channel = this.walletClient.getChannel();
        const loop = (): void => {
            if (!this.watching) return;
            const state = channel.getConnectivityState(true);
            this.ready = state === grpc.connectivityState.READY;
            this.logConnectivityChange(state);
            channel.watchConnectivityState(state, Infinity, () => {
                if (!this.watching) return;
                const next = channel.getConnectivityState(false);
                this.ready = next === grpc.connectivityState.READY;
                this.logConnectivityChange(next);
                if (next !== grpc.connectivityState.SHUTDOWN) loop();
                else this.watching = false;
            });
        };
        loop();
    }

    /** Stop watching channel state and close the underlying connection. */
    close(): void {
        this.watching = false;
        this.walletClient.close();
        this.log.debug('connection closed');
    }
}
