import { bytesToHex } from '../utils/hex';
import { bytesToBase58Address, decodeAddress, TRON_ADDRESS_PREFIX } from '../utils/address';
import { sunToTrx } from '../utils/units';
import type {
    AccountResources,
    BlockSummary,
    TransactionInfoResult,
    TransactionResult,
    TronAccount,
} from '../types';

/** A loose view of a proto-loader response object. */
type Raw = Record<string, unknown>;

const isBytes = (v: unknown): v is Uint8Array =>
    v instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(v));

/** proto-loader `bytes` field -> hex string ('' when absent/empty). */
export const bytesToHexField = (v: unknown): string => (isBytes(v) ? bytesToHex(v) : typeof v === 'string' ? v : '');

/** int64 field (string with longs:String) -> Number. */
const toNumber = (v: unknown): number => (v == null ? 0 : Number(v));

/** int64 field -> exact integer string. */
const toIntString = (v: unknown): string => (v == null ? '0' : String(v));

/**
 * Recursively convert a proto-loader value into a JSON-safe, readable form:
 *   - 21-byte `0x41`-prefixed `bytes` (TRON addresses) become base58 ("T..."),
 *   - any other `bytes` field becomes a hex string,
 * so no raw Buffers ever reach the caller and addresses are human-readable.
 */
export const normalizeDeep = (value: unknown): unknown => {
    if (isBytes(value)) {
        return value.length === 21 && value[0] === TRON_ADDRESS_PREFIX
            ? bytesToBase58Address(value)
            : bytesToHex(value);
    }
    if (Array.isArray(value)) return value.map(normalizeDeep);
    if (value && typeof value === 'object') {
        const out: Raw = {};
        for (const [k, v] of Object.entries(value as Raw)) out[k] = normalizeDeep(v);
        return out;
    }
    return value;
};

const decodeUtf8 = (v: unknown): string | undefined => {
    if (!isBytes(v) || v.length === 0) return undefined;
    const text = Buffer.from(v).toString('utf8');
    // Only surface printable names; otherwise leave undefined.
    return /^[\x20-\x7e].*$/.test(text) ? text : undefined;
};

/** Decode a BlockExtention (GetNowBlock2 / GetBlockByNum2) into a summary. */
export const decodeBlock = (res: Raw): BlockSummary => {
    const header = (res.block_header ?? {}) as Raw;
    const raw = (header.raw_data ?? {}) as Raw;
    const transactions = Array.isArray(res.transactions) ? res.transactions : [];
    return {
        number: toNumber(raw.number),
        hash: bytesToHexField(res.blockid),
        parentHash: bytesToHexField(raw.parentHash),
        txTrieRoot: bytesToHexField(raw.txTrieRoot),
        timestamp: toNumber(raw.timestamp),
        witnessAddress: decodeAddress(raw.witness_address as Uint8Array) ?? '',
        version: toNumber(raw.version),
        txCount: transactions.length,
    };
};

/** Decode an Account (GetAccount) into a readable account view. */
export const decodeAccount = (res: Raw, queriedAddress: string): TronAccount => {
    const addressBytes = res.address as Uint8Array | undefined;
    const exists = isBytes(addressBytes) && addressBytes.length > 0;
    const balanceSun = toIntString(res.balance);
    return {
        address: exists ? decodeAddress(addressBytes) ?? queriedAddress : queriedAddress,
        balanceSun,
        balanceTrx: sunToTrx(balanceSun),
        name: decodeUtf8(res.account_name),
        createTime: res.create_time != null ? toNumber(res.create_time) : undefined,
        exists,
    };
};

/** Decode an AccountResourceMessage (GetAccountResource). */
export const decodeAccountResources = (res: Raw): AccountResources => ({
    freeNetUsed: toIntString(res.freeNetUsed),
    freeNetLimit: toIntString(res.freeNetLimit),
    netUsed: toIntString(res.NetUsed),
    netLimit: toIntString(res.NetLimit),
    totalNetLimit: toIntString(res.TotalNetLimit),
    totalNetWeight: toIntString(res.TotalNetWeight),
    energyUsed: toIntString(res.EnergyUsed),
    energyLimit: toIntString(res.EnergyLimit),
    totalEnergyLimit: toIntString(res.TotalEnergyLimit),
    totalEnergyWeight: toIntString(res.TotalEnergyWeight),
    tronPowerUsed: toIntString(res.tronPowerUsed),
    tronPowerLimit: toIntString(res.tronPowerLimit),
});

/** Decode a Transaction (GetTransactionById) into a readable view. */
export const decodeTransaction = (res: Raw, txid: string): TransactionResult => {
    const rawData = (res.raw_data ?? {}) as Raw;
    const contracts = Array.isArray(rawData.contract) ? (rawData.contract as Raw[]) : [];
    const signature = Array.isArray(res.signature) ? res.signature : [];
    const ret = Array.isArray(res.ret) ? (res.ret as Raw[]) : [];
    const found = contracts.length > 0;
    return {
        txid,
        contractType: contracts[0]?.type as string | undefined,
        signatures: signature.map(bytesToHexField),
        ret: ret.map(r => String(r.contractRet ?? '')),
        rawData: normalizeDeep(rawData) as Record<string, unknown>,
        found,
    };
};

/** Decode a TransactionInfo (GetTransactionInfoById). */
export const decodeTransactionInfo = (res: Raw): TransactionInfoResult => {
    const idHex = bytesToHexField(res.id);
    const receiptRaw = (res.receipt ?? {}) as Raw;
    const receipt: Record<string, string> = {};
    for (const [k, v] of Object.entries(receiptRaw)) {
        receipt[k] = typeof v === 'string' || typeof v === 'number' ? String(v) : '';
    }
    const contractResult = Array.isArray(res.contractResult) ? res.contractResult : [];
    return {
        id: idHex,
        blockNumber: toNumber(res.blockNumber),
        blockTimeStamp: toNumber(res.blockTimeStamp),
        fee: toIntString(res.fee),
        result: String(res.result ?? 'SUCESS'),
        contractResult: contractResult.map(bytesToHexField),
        contractAddress: decodeAddress(res.contract_address as Uint8Array),
        receipt,
        found: idHex.length > 0,
    };
};
