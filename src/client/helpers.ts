import { toAddressBytes } from '../utils/address';
import { toBytes } from '../utils/hex';
import { encodeFunctionData } from '../codecs/abi';
import { bytesToHexField, decodeInternalTransactions, decodeLogs, normalizeDeep } from '../codecs/decode';
import { trxToSun, type DecimalLike } from '../utils/units';
import type { ConstantCallResult, ReturnResult, TriggerContractInput } from '../types';

/** A loose proto-loader request/response object. */
export type Raw = Record<string, unknown>;

/** Integer-amount input (token base units), stringified without precision loss. */
export type IntLike = number | string | bigint;

/** Which TIP-899 post-quantum schemes a chain accepts. */
export interface PqCapabilities {
    fnDsa512: boolean;
    mlDsa44: boolean;
}

/**
 * Read the TIP-899 activation flags out of a `GetChainParameters` response.
 *
 * A chain that predates TIP-899 (mainnet today) simply has no such parameters,
 * which reads as "not enabled" — the safe answer.
 */
export const parsePqCapabilities = (chainParameters: Raw): PqCapabilities => {
    const params = (chainParameters.chainParameter ?? []) as { key?: string; value?: unknown }[];
    const enabled = (key: string): boolean =>
        params.some(p => p.key === key && String(p.value ?? '0') === '1');
    return {
        fnDsa512: enabled('getAllowFnDsa512'),
        mlDsa44: enabled('getAllowMlDsa44'),
    };
};

/** TRX (decimal) -> sun string. */
export const sunString = (amount: DecimalLike): string => trxToSun(amount).toString();

/** Integer base-unit amount -> string (bigint-safe). */
export const intString = (amount: IntLike): string =>
    typeof amount === 'bigint' ? amount.toString() : String(amount);

/**
 * Decode a TRON `Return.message` (bytes, or base64 string after JSON) into a
 * human-readable string.
 */
export const decodeReturnMessage = (message: unknown): string => {
    if (message == null) return '';
    if (typeof message === 'string') {
        const decoded = Buffer.from(message, 'base64').toString('utf8');
        return decoded || message;
    }
    if (message instanceof Uint8Array || Buffer.isBuffer(message)) {
        return Buffer.from(message as Uint8Array).toString('utf8');
    }
    return String(message);
};

/**
 * TRON's TransactionExtention RPCs report business failures inside
 * `response.result` rather than as a gRPC error. Throw a readable error when the
 * node explicitly reports failure.
 */
export const assertExtentionOk = (method: string, res: Raw): void => {
    const result = res.result as Raw | undefined;
    if (!result) return;
    const code = result.code;
    const failed = result.result === false || (code !== undefined && code !== 'SUCCESS' && code !== 0);
    if (!failed) return;
    const message = decodeReturnMessage(result.message);
    throw new Error(`${method} failed${code ? ` (${String(code)})` : ''}: ${message || 'no message'}`);
};

/** Decode a node `Return` {result, code, message} status block. */
export const decodeReturn = (v: unknown): ReturnResult | undefined => {
    if (!v || typeof v !== 'object') return undefined;
    const r = v as Raw;
    return {
        result: r.result === true,
        code: typeof r.code === 'string' && r.code.length > 0 ? r.code : 'SUCCESS',
        message: decodeReturnMessage(r.message),
    };
};

/** Decode a full TriggerConstantContract response (constant result + logs + internal txs + status). */
export const decodeConstantResult = (res: Raw): ConstantCallResult => {
    const constant = Array.isArray(res.constant_result) ? res.constant_result : [];
    return {
        constantResult: constant.map(bytesToHexField),
        energyUsed: Number(res.energy_used ?? 0),
        energyPenalty: String(res.energy_penalty ?? '0'),
        logs: decodeLogs(res.logs),
        internalTransactions: decodeInternalTransactions(res.internal_transactions),
        result: decodeReturn(res.result),
        txid: bytesToHexField(res.txid) || undefined,
        raw: normalizeDeep(res) as Record<string, unknown>,
    };
};

/** Build a `TriggerSmartContract` request object from friendly input. */
export const buildTriggerRequest = (input: TriggerContractInput): Raw => {
    const req: Raw = {
        owner_address: toAddressBytes(input.ownerAddress),
        contract_address: toAddressBytes(input.contractAddress),
    };
    if (input.functionSelector && input.params !== undefined) {
        req.data = encodeFunctionData(input.functionSelector, input.params);
    } else if (input.data !== undefined) {
        req.data = toBytes(input.data);
    }
    if (input.callValue !== undefined) req.call_value = input.callValue.toString();
    if (input.tokenId !== undefined) {
        req.token_id = input.tokenId;
        req.call_token_value = (input.callTokenValue ?? 0).toString();
    }
    return req;
};
