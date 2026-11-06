/**
 * Guards and edits for node-built transactions.
 *
 * A java-tron node builds the unsigned transaction (`TransactionExtention`) and
 * reports its id. Neither is taken on trust here:
 *
 * - {@link assertBuiltTransaction} checks that what came back is the contract that
 *   was requested — byte for byte — with nothing value-bearing added.
 * - {@link checkedTxid} recomputes the id from `raw_data`, so the digest that gets
 *   signed is always derived locally from the bytes that get broadcast.
 * - {@link applyTransactionOptions} sets the fields the gRPC builders have no
 *   parameter for (`fee_limit`, memo, expiration, `Permission_id`) and re-derives
 *   the id.
 */
import { computeTxid } from './verify';
import { bytesToHex, hexToBytesSafe } from './hex';
import type { TransactionOptions } from '../types';

type Raw = Record<string, unknown>;

/** The parts of a proto-loader method definition the build check relies on. */
export interface BuilderMethodDefinition {
    requestSerialize(value: unknown): Buffer;
    requestDeserialize(bytes: Buffer): unknown;
    requestType: { type: { name?: string | null } };
}

const TEXT_ENCODER = new TextEncoder();

const isBytes = (v: unknown): v is Uint8Array => v instanceof Uint8Array;
const hexOf = (v: unknown): string => (isBytes(v) ? bytesToHex(v) : typeof v === 'string' ? v.toLowerCase() : '');
const isEmpty = (v: unknown): boolean =>
    v == null || v === 0 || v === '0' || v === '' || ((isBytes(v) || Array.isArray(v)) && v.length === 0);

const sameBytes = (a: Uint8Array, b: Uint8Array): boolean => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
};

const rawDataOf = (extention: Raw): { transaction: Raw; rawData: Raw } => {
    const transaction = extention.transaction as Raw | undefined;
    const rawData = transaction?.raw_data as Raw | undefined;
    if (!transaction || !rawData) throw new Error('TransactionExtention has no transaction to sign');
    return { transaction, rawData };
};

/**
 * The transaction id to sign: `SHA-256(raw_data)`, computed locally.
 *
 * Throws when the extention carries a `txid` that disagrees. Signing an id the
 * node supplied would be signing blind — it could be the id of a different
 * transaction altogether.
 */
export const checkedTxid = (extention: Raw): string => {
    const { rawData } = rawDataOf(extention);
    const local = computeTxid(rawData);
    const claimed = hexOf(extention.txid);
    if (claimed && claimed !== local) {
        throw new Error(
            `Refusing to sign: the transaction id supplied with this transaction (${claimed}) is not the ` +
                `SHA-256 of its raw_data (${local}). Either raw_data was edited without updating txid ` +
                '(use applyTransactionOptions), the node is not trustworthy, or the vendored protos are ' +
                'older than the node (npm run sync-proto).'
        );
    }
    return local;
};

/**
 * Assert that a node-built `TransactionExtention` is exactly the transaction the
 * builder request asked for.
 *
 * `definition` is the RPC's proto-loader method definition. Every java-tron
 * builder packs its request message unchanged into `raw_data.contract[0]`, so the
 * returned contract must re-serialize to the same bytes as the request, and the
 * fields the request cannot express (`fee_limit`, memo, `Permission_id`) must
 * still be unset.
 */
export const assertBuiltTransaction = (
    method: string,
    definition: BuilderMethodDefinition,
    request: unknown,
    extention: Raw
): void => {
    const refuse = (why: string): Error =>
        new Error(
            `${method}: refusing the transaction the node built — ${why}. ` +
                'The node, or the network path to it, may be compromised.'
        );

    const { rawData } = rawDataOf(extention);
    const contracts = rawData.contract;
    if (!Array.isArray(contracts) || contracts.length !== 1) {
        throw refuse(`expected exactly one contract, got ${Array.isArray(contracts) ? contracts.length : 0}`);
    }
    const contract = contracts[0] as Raw;
    const parameter = (contract.parameter ?? {}) as Raw;

    const expectedUrl = `type.googleapis.com/protocol.${definition.requestType.type.name}`;
    if (parameter.type_url !== expectedUrl) {
        throw refuse(`contract is ${String(parameter.type_url)}, not ${expectedUrl}`);
    }

    // Round-trip both sides through the same decode/encode so the comparison is
    // on canonical bytes, not on whatever field order or defaults either used.
    const canonical = (bytes: Uint8Array): Uint8Array =>
        definition.requestSerialize(definition.requestDeserialize(Buffer.from(bytes)));
    const value = isBytes(parameter.value) ? parameter.value : new Uint8Array(0);
    if (!sameBytes(canonical(definition.requestSerialize(request)), canonical(value))) {
        throw refuse('its contract differs from the one requested');
    }

    if (!isEmpty(rawData.fee_limit)) throw refuse(`it sets fee_limit ${String(rawData.fee_limit)}, which was not requested`);
    if (!isEmpty(rawData.data)) throw refuse('it carries a memo that was not requested');
    if (!isEmpty(rawData.scripts) || !isEmpty(rawData.auths)) throw refuse('it carries scripts/auths that were not requested');
    if (!isEmpty(contract.Permission_id)) {
        throw refuse(`it selects permission ${String(contract.Permission_id)}, which was not requested`);
    }

    const claimed = hexOf(extention.txid);
    const local = computeTxid(rawData);
    if (claimed !== local) throw refuse(`its txid ${claimed || '(none)'} is not the SHA-256 of its raw_data (${local})`);
};

const toSun = (value: number | string | bigint, what: string): bigint => {
    let sun: bigint;
    try {
        sun = BigInt(typeof value === 'string' ? value.trim() : value);
    } catch {
        throw new Error(`${what} must be an integer number of sun, got ${String(value)}`);
    }
    if (sun < 0n) throw new Error(`${what} cannot be negative`);
    return sun;
};

/**
 * Set transaction fields the gRPC builder RPCs have no parameter for, then
 * re-derive `txid`. Mutates and returns `extention`.
 *
 * - `feeLimit` — the most TRX (in **sun**) the transaction may burn for energy.
 *   Node-built contract calls come back with `fee_limit = 0`, which only works
 *   while the caller has enough staked or rented energy.
 * - `memo` — a note stored in `raw_data.data` (charged the chain's memo fee).
 * - `expiration` — when the transaction stops being valid (ms epoch or `Date`).
 *   Nodes default to ~60s after the head block and accept up to 24h.
 * - `permissionId` — which account permission signs: 0 owner (default), 1 witness,
 *   2+ active. Required to sign with an active-permission (multi-sig) key.
 *
 * Refuses to touch a transaction that already carries a signature: its id — what
 * those signatures cover — would change.
 */
export const applyTransactionOptions = <T extends Raw>(extention: T, options: TransactionOptions): T => {
    const { transaction, rawData } = rawDataOf(extention);
    if (!isEmpty(transaction.signature) || !isEmpty(transaction.pq_auth_sig)) {
        throw new Error('Cannot change a transaction that is already signed: its txid would no longer match');
    }

    if (options.feeLimit !== undefined) rawData.fee_limit = toSun(options.feeLimit, 'feeLimit').toString();

    if (options.memo !== undefined) {
        rawData.data = typeof options.memo === 'string' ? TEXT_ENCODER.encode(options.memo) : options.memo;
    }

    if (options.expiration !== undefined) {
        const expiration = options.expiration instanceof Date ? options.expiration.getTime() : options.expiration;
        if (!Number.isSafeInteger(expiration) || expiration <= Number(rawData.timestamp ?? 0)) {
            throw new Error('expiration must be a millisecond timestamp after the transaction was built');
        }
        rawData.expiration = String(expiration);
    }

    if (options.permissionId !== undefined) {
        if (!Number.isInteger(options.permissionId) || options.permissionId < 0) {
            throw new Error('permissionId must be a non-negative integer');
        }
        for (const contract of (rawData.contract ?? []) as Raw[]) contract.Permission_id = options.permissionId;
    }

    (extention as Raw).txid = hexToBytesSafe(computeTxid(rawData));
    return extention;
};
