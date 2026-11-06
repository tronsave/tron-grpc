import * as grpc from '@grpc/grpc-js';
import { getServiceClient } from '../protoLoader';
import { TRON_NETWORKS } from '../network';
import { normalizeDeep } from '../codecs/decode';
import { createLogger, resolveLogLevel, type Logger, type LogLevel } from '../logger';
import { assertBuiltTransaction, type BuilderMethodDefinition } from '../utils/transaction';
import { assertExtentionOk as checkExtentionOk, type Raw } from './helpers';
import type { UnsignedTransactionExtention } from '../types/responses';

type UnaryFn = (
    req: unknown,
    options: grpc.CallOptions,
    cb: (err: grpc.ServiceError | null, res: unknown) => void
) => grpc.ClientUnaryCall;

/** Which java-tron gRPC service a client talks to. */
export type TronService = 'Wallet' | 'WalletSolidity';

/** Per-call options, for {@link TronClientCore.request} and {@link TronClientCore.withCallOptions}. */
export interface CallOptions {
    /**
     * Deadline for the whole call, retries included, in milliseconds. Defaults to
     * the client's `timeoutMs` (30s). `0` or `Infinity` disables the deadline.
     */
    timeoutMs?: number;
    /** Cancels the in-flight call (and any pending rate-limit retry) when aborted. */
    signal?: AbortSignal;
}

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
    /**
     * Retry calls rejected by rate limiting (TronGrid HTTP 429 /
     * `RESOURCE_EXHAUSTED`) with exponential backoff and jitter. On by default;
     * `false` disables it.
     *
     * gRPC's own retry policy cannot cover this: a 429 arrives with response
     * headers, which commits the call, so grpc-js never retries it.
     */
    rateLimitRetry?: false | { maxRetries?: number; baseDelayMs?: number; maxDelayMs?: number };
    /**
     * Encrypt the connection with TLS. Defaults to `true` when the host's port is
     * `443` and `false` otherwise (java-tron's own gRPC port, 50051, is plaintext).
     *
     * On a plaintext connection everything — including `headers` such as an API
     * key — is readable and modifiable by anyone on the network path.
     */
    tls?: boolean;
    /** Explicit channel credentials (custom CA, mTLS…). Overrides `tls`. */
    credentials?: grpc.ChannelCredentials;
    /** Default deadline per call in milliseconds (30000). See {@link CallOptions.timeoutMs}. */
    timeoutMs?: number;
    /**
     * Number of HTTP/2 connections to spread calls over (round-robin). Default 1.
     * One connection multiplexes ~100 concurrent calls; raise this only for
     * workloads that hold more than that in flight.
     */
    channels?: number;
    /**
     * `'Wallet'` (default) or `'WalletSolidity'` — the read-only service that
     * answers from solidified (irreversible) state. See `TronGrpcClient.solidity()`.
     */
    service?: TronService;
    /**
     * Check every node-built transaction against the request that produced it
     * before returning it: same contract, byte for byte, no fee limit, memo or
     * permission the caller did not ask for, and a txid that recomputes locally.
     * On by default; `false` skips the contract comparison only — the txid is
     * always recomputed before anything is signed.
     */
    verifyBuiltTransactions?: boolean;
}

/** Defaults for {@link TronClientOptions.rateLimitRetry}: waits ~0.5s, 1s, 2s, 4s, 8s. */
const RATE_LIMIT_RETRY = { maxRetries: 5, baseDelayMs: 500, maxDelayMs: 8000 };

/**
 * True for a rejection by rate limiting. Such a request never reached a node, so
 * retrying is safe for every method — including `BroadcastTransaction`, where
 * re-sending the same signed transaction cannot double-spend anyway.
 *
 * grpc-js also reports an over-size response as `RESOURCE_EXHAUSTED` ("Received
 * message larger than max"). That is deterministic, so it is not retried.
 */
const isRateLimited = (err: grpc.ServiceError): boolean => {
    const details = err.details ?? err.message ?? '';
    if (err.code === grpc.status.RESOURCE_EXHAUSTED) return !/larger than max/i.test(details);
    return err.code === grpc.status.UNAVAILABLE && /\b429\b/.test(details);
};

const DEFAULT_TIMEOUT_MS = 30000;

/** Resolve after `ms`, or reject as soon as `signal` aborts. */
const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
    new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(abortError(signal));
        const onAbort = (): void => {
            clearTimeout(timer);
            reject(abortError(signal as AbortSignal));
        };
        const timer = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
        }, ms);
        signal?.addEventListener('abort', onAbort, { once: true });
    });

const abortError = (signal: AbortSignal): Error =>
    signal.reason instanceof Error ? signal.reason : new Error('The call was aborted');

/** Loopback hosts, where a plaintext channel never leaves the machine. */
const isLoopback = (host: string): boolean => /^(localhost|127\.\d+\.\d+\.\d+|\[::1\])(:\d+)?$/i.test(host);

/** State shared by a client and every scoped view made with `withCallOptions`. */
interface ChannelPool {
    readonly clients: grpc.Client[];
    readonly ready: boolean[];
    readonly lastState: (number | undefined)[];
    next: number;
    watching: boolean;
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
    private readonly pool: ChannelPool;
    private readonly service: TronService;
    private readonly definition: grpc.ServiceDefinition;
    private readonly retry: typeof RATE_LIMIT_RETRY | null;
    private readonly verifyBuilt: boolean;
    private callDefaults: CallOptions;
    protected readonly log: Logger;

    private static readonly DEFAULT_OPTIONS: grpc.ClientOptions = {
        'grpc.keepalive_time_ms': 20000,
        'grpc.keepalive_timeout_ms': 10000,
        'grpc.keepalive_permit_without_calls': 1,
        'grpc.http2.max_pings_without_data': 0,
        'grpc.initial_reconnect_backoff_ms': 100,
        'grpc.max_reconnect_backoff_ms': 10000,
        'grpc.enable_retries': 1,
        // Range reads (GetBlockByLatestNum2 / GetBlockByLimitNext2) routinely exceed
        // grpc-js's 4 MiB default: 60 mainnet blocks are ~8 MB.
        'grpc.max_receive_message_length': 64 * 1024 * 1024,
        'grpc.service_config': JSON.stringify({
            methodConfig: [
                {
                    name: [{ service: 'protocol.Wallet' }, { service: 'protocol.WalletSolidity' }],
                    // RESOURCE_EXHAUSTED is deliberately absent: `rateLimitRetry`
                    // owns it, and listing it here too would multiply the attempts.
                    // The deadline is set per call (see `CallOptions.timeoutMs`).
                    retryPolicy: {
                        maxAttempts: 5,
                        initialBackoff: '0.1s',
                        maxBackoff: '10s',
                        backoffMultiplier: 1.5,
                        retryableStatusCodes: ['UNAVAILABLE', 'UNKNOWN', 'DEADLINE_EXCEEDED'],
                    },
                },
            ],
        }),
    };

    constructor(host: string = TRON_NETWORKS.mainnet.grpcHost, options: TronClientOptions = {}) {
        this.retry = options.rateLimitRetry === false ? null : { ...RATE_LIMIT_RETRY, ...options.rateLimitRetry };
        this.log = createLogger(resolveLogLevel(options.logLevel), options.logger);
        this.service = options.service ?? 'Wallet';
        this.verifyBuilt = options.verifyBuiltTransactions !== false;
        this.callDefaults = { timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS };

        const channels = options.channels ?? 1;
        if (!Number.isInteger(channels) || channels < 1) throw new Error('channels must be a positive integer');
        const merged: grpc.ClientOptions = { ...TronClientCore.DEFAULT_OPTIONS, ...options.grpcOptions };
        // grpc-js shares one connection between channels with identical options
        // unless each keeps its own subchannel pool.
        if (channels > 1) merged['grpc.use_local_subchannel_pool'] = 1;

        const tls = options.credentials ? undefined : (options.tls ?? /:443$/.test(host));
        const credentials =
            options.credentials ?? (tls ? grpc.credentials.createSsl() : grpc.credentials.createInsecure());

        if (options.headers) {
            const headers = Object.entries(options.headers);
            // Append: interceptors passed via `grpcOptions` keep working.
            merged.interceptors = [
                ...(merged.interceptors ?? []),
                (opts, nextCall) =>
                    new grpc.InterceptingCall(nextCall(opts), {
                        start: (metadata, listener, next) => {
                            for (const [key, value] of headers) metadata.add(key, value);
                            next(metadata, listener);
                        },
                    }),
            ];
            if (tls === false && !isLoopback(host)) {
                this.log.warn(`headers are sent unencrypted to ${host} (plaintext gRPC); use a TLS endpoint for API keys`);
            }
        }

        const ServiceClient = getServiceClient(this.service);
        this.definition = ServiceClient.service;
        const clients = Array.from({ length: channels }, () => new ServiceClient(host, credentials, merged));
        this.pool = {
            clients,
            ready: clients.map(() => false),
            lastState: clients.map(() => undefined),
            next: 0,
            watching: false,
        };
        this.log.info(`connecting to ${host} (${this.service}, ${tls === false ? 'plaintext' : 'TLS'}${channels > 1 ? `, ${channels} channels` : ''})`);
        this.watchConnectivity();
    }

    /**
     * A view of this client whose calls all use `options` (deadline, abort signal).
     * It shares the connection — nothing is reconnected, and closing either closes both.
     *
     * ```ts
     * const fast = client.withCallOptions({ timeoutMs: 3000 });
     * await fast.getNowBlock();
     * ```
     */
    withCallOptions(options: CallOptions): this {
        const scoped = Object.create(this) as this;
        scoped.callDefaults = { ...this.callDefaults, ...options };
        return scoped;
    }

    /**
     * Generic escape hatch: invoke any RPC of the service by name and get the raw
     * proto-loader response typed as `T` (defaults to `unknown`, never `any`).
     */
    async request<T = unknown>(method: string, requestMessage: unknown, options?: CallOptions): Promise<T> {
        const { timeoutMs, signal } = options ? { ...this.callDefaults, ...options } : this.callDefaults;
        const client = this.pool.clients[this.pool.next++ % this.pool.clients.length];
        const fn = (client as unknown as Record<string, UnaryFn>)[method];
        if (typeof fn !== 'function' || !Object.prototype.hasOwnProperty.call(this.definition, method)) {
            this.log.error(`unknown RPC method: ${method}`);
            throw new Error(`Unknown ${this.service} RPC method: ${method}`);
        }
        const started = Date.now();
        this.log.debug(`→ ${method}`);
        for (let attempt = 0; ; attempt++) {
            try {
                const res = await new Promise<unknown>((resolve, reject) => {
                    if (signal?.aborted) return reject(abortError(signal));
                    const callOptions: grpc.CallOptions =
                        timeoutMs && Number.isFinite(timeoutMs) ? { deadline: Date.now() + timeoutMs } : {};
                    const onAbort = (): void => call.cancel();
                    const call = fn.call(client, requestMessage, callOptions, (err, value) => {
                        signal?.removeEventListener('abort', onAbort);
                        if (err) reject(err);
                        else resolve(value);
                    });
                    signal?.addEventListener('abort', onAbort, { once: true });
                });
                this.log.debug(`✓ ${method} (${Date.now() - started}ms)`);
                return res as T;
            } catch (e) {
                const err = e as grpc.ServiceError;
                if (this.retry && attempt < this.retry.maxRetries && !signal?.aborted && isRateLimited(err)) {
                    const ceiling = Math.min(this.retry.maxDelayMs, this.retry.baseDelayMs * 2 ** attempt);
                    const delay = ceiling / 2 + Math.random() * (ceiling / 2);
                    this.log.warn(`rate limited on ${method}; retry ${attempt + 1} in ${Math.round(delay)}ms`);
                    await sleep(delay, signal);
                    continue;
                }
                this.log.error(`✗ ${method} (${err.code}): ${err.message}`);
                throw err;
            }
        }
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

    /**
     * Run a builder RPC, assert the node accepted it, and — unless the client was
     * created with `verifyBuiltTransactions: false` — that the transaction it
     * returned is the one that was asked for. Returns the unsigned ext.
     *
     * A node is not trusted to describe what will be signed: without this check a
     * compromised node (or anyone on a plaintext network path) could answer a
     * transfer request with a transaction paying someone else.
     *
     * `verify: false` is for the few RPCs whose request is not the contract itself
     * (shielded transfers, `CreateCommonTransaction`).
     */
    protected async buildExtention(
        method: string,
        contract: Raw,
        { verify = true } = {}
    ): Promise<UnsignedTransactionExtention> {
        const res = await this.request<UnsignedTransactionExtention>(method, contract);
        this.assertExtentionOk(method, res);
        if (verify && this.verifyBuilt) {
            try {
                assertBuiltTransaction(method, this.definition[method] as unknown as BuilderMethodDefinition, contract, res);
            } catch (err) {
                this.log.error(`✗ ${(err as Error).message}`);
                throw err;
            }
        }
        return res;
    }

    /** Run a query RPC and return a readable, bytes-free object. */
    protected async query<T = Raw>(method: string, message: unknown = {}): Promise<T> {
        return normalizeDeep(await this.request<Raw>(method, message)) as T;
    }

    /** True once at least one gRPC channel has reached READY. */
    get isReady(): boolean {
        return this.pool.ready.some(Boolean);
    }

    private logConnectivityChange(index: number, state: number): void {
        if (this.pool.lastState[index] === state) return;
        const label = this.pool.clients.length > 1 ? `channel ${index} state` : 'channel state';
        const name = connectivityStateName(state);
        if (state === grpc.connectivityState.TRANSIENT_FAILURE) {
            this.log.warn(`${label}: ${name}`);
        } else {
            this.log.info(`${label}: ${name}`);
        }
        this.pool.lastState[index] = state;
    }

    private watchConnectivity(): void {
        const pool = this.pool;
        if (pool.watching) return;
        pool.watching = true;
        pool.clients.forEach((client, index) => {
            const channel = client.getChannel();
            const update = (state: number): void => {
                pool.ready[index] = state === grpc.connectivityState.READY;
                this.logConnectivityChange(index, state);
            };
            const loop = (): void => {
                if (!pool.watching) return;
                const state = channel.getConnectivityState(true);
                update(state);
                channel.watchConnectivityState(state, Infinity, () => {
                    if (!pool.watching) return;
                    const next = channel.getConnectivityState(false);
                    update(next);
                    if (next !== grpc.connectivityState.SHUTDOWN) loop();
                });
            };
            loop();
        });
    }

    /** Stop watching channel state and close the underlying connection(s). */
    close(): void {
        this.pool.watching = false;
        for (const client of this.pool.clients) client.close();
        this.log.debug('connection closed');
    }
}
