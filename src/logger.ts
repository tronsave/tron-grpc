/** Minimum severity for client diagnostic logs. */
export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

/** Log sink used by the client (defaults to `console`). */
export interface Logger {
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
}

const LEVEL_RANK: Record<LogLevel, number> = {
    silent: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
};

const VALID_LEVELS = new Set<string>(Object.keys(LEVEL_RANK));

/** Parse a log-level string (case-insensitive). Returns `undefined` when invalid. */
export const parseLogLevel = (value: string | undefined): LogLevel | undefined => {
    if (!value) return undefined;
    const normalized = value.toLowerCase();
    return VALID_LEVELS.has(normalized) ? (normalized as LogLevel) : undefined;
};

/** Resolve the effective log level from options and environment. */
export const resolveLogLevel = (optionLevel?: LogLevel): LogLevel =>
    optionLevel ?? parseLogLevel(process.env.TRON_GRPC_LOG_LEVEL) ?? 'silent';

const PREFIX = '[tron-grpc]';

/** Create a level-filtered logger that prefixes every message with `[tron-grpc]`. */
export const createLogger = (level: LogLevel, sink: Logger = console): Logger => {
    const minRank = LEVEL_RANK[level];
    const emit =
        (rank: number, method: 'debug' | 'info' | 'warn' | 'error') =>
        (message: string, ...args: unknown[]): void => {
            if (rank > minRank) return;
            sink[method](`${PREFIX} ${message}`, ...args);
        };
    return {
        debug: emit(LEVEL_RANK.debug, 'debug'),
        info: emit(LEVEL_RANK.info, 'info'),
        warn: emit(LEVEL_RANK.warn, 'warn'),
        error: emit(LEVEL_RANK.error, 'error'),
    };
};
