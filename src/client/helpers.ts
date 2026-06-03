import { toAddressBytes } from '../utils/address';
import { toBytes } from '../utils/hex';
import { encodeFunctionData } from '../codecs/abi';
import { bytesToHexField } from '../codecs/decode';
import { trxToSun, type DecimalLike } from '../utils/units';
import type { ConstantCallResult, TriggerContractInput } from '../types';

/** A loose proto-loader request/response object. */
export type Raw = Record<string, unknown>;

/** Integer-amount input (token base units), stringified without precision loss. */
export type IntLike = number | string | bigint;

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

/** Decode the `constant_result` of a TriggerConstantContract response. */
export const decodeConstantResult = (res: Raw): ConstantCallResult => {
    const constant = Array.isArray(res.constant_result) ? res.constant_result : [];
    return {
        constantResult: constant.map(bytesToHexField),
        energyUsed: Number(res.energy_used ?? 0),
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
