import { bytesToHex } from '../utils/hex';
import { bytesToBase58Address, decodeAddress, TRON_ADDRESS_PREFIX } from '../utils/address';
import { sunToTrx } from '../utils/units';
import { pqPublicKeyToAddress } from '../utils/pq';
import type {
    AccountResources,
    BlockSummary,
    BlockTransaction,
    TransactionInfoResult,
    TransactionLog,
    TransactionResult,
    TronAccount,
    TronAccountResource,
    TronAccountVote,
    TronFrozen,
    TronFrozenV2,
    TronPermission,
    TronPermissionKey,
    TronUnfrozenV2,
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

/** Decode a single TransactionInfo.Log {address, topics, data} into hex fields. */
const decodeLog = (v: unknown): TransactionLog => {
    const o = (v ?? {}) as Raw;
    return {
        address: bytesToHexField(o.address),
        topics: Array.isArray(o.topics) ? o.topics.map(bytesToHexField) : [],
        data: bytesToHexField(o.data),
    };
};

/** Decode a repeated TransactionInfo.Log field. */
export const decodeLogs = (v: unknown): TransactionLog[] => (Array.isArray(v) ? v.map(decodeLog) : []);

/** Decode a repeated InternalTransaction field into normalized, JSON-safe objects. */
export const decodeInternalTransactions = (v: unknown): Record<string, unknown>[] =>
    Array.isArray(v) ? (v.map(normalizeDeep) as Record<string, unknown>[]) : [];

/** Decode one TransactionExtention from a BlockExtention into a full typed view. */
const decodeBlockTransaction = (v: unknown): BlockTransaction => {
    const ext = (v ?? {}) as Raw;
    const tx = (ext.transaction ?? {}) as Raw;
    const rawData = (tx.raw_data ?? {}) as Raw;
    const contracts = Array.isArray(rawData.contract) ? (rawData.contract as Raw[]) : [];
    const signature = Array.isArray(tx.signature) ? tx.signature : [];
    const ret = Array.isArray(tx.ret) ? (tx.ret as Raw[]) : [];
    return {
        txid: bytesToHexField(ext.txid),
        contractType: contracts[0]?.type as string | undefined,
        ret: ret.map(r => String(r.contractRet ?? '')),
        signatures: signature.map(bytesToHexField),
        energyUsed: toIntString(ext.energy_used),
        energyPenalty: toIntString(ext.energy_penalty),
        logs: decodeLogs(ext.logs),
        internalTransactions: decodeInternalTransactions(ext.internal_transactions),
        rawData: normalizeDeep(rawData) as Record<string, unknown>,
        raw: normalizeDeep(ext) as Record<string, unknown>,
    };
};

/**
 * Decode a BlockExtention (GetNowBlock2 / GetBlockByNum2).
 *
 * Surfaces the header summary plus every transaction in the block (fully
 * decoded), and preserves the complete normalized message under `raw`.
 */
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
        witnessSignature: bytesToHexField(header.witness_signature) || undefined,
        accountStateRoot: bytesToHexField(raw.accountStateRoot) || undefined,
        transactions: transactions.map(decodeBlockTransaction),
        raw: normalizeDeep(res) as Record<string, unknown>,
    };
};

/** Optional int64-timestamp field -> ms number, or undefined when absent. */
const toOptTime = (v: unknown): number | undefined => (v != null ? toNumber(v) : undefined);

/** proto enum field (longs:String keeps enums as their name) -> trimmed string. */
const toEnumString = (v: unknown, fallback: string): string => (typeof v === 'string' && v.length > 0 ? v : fallback);

/** Decode a single Account.Frozen sub-message. */
const decodeFrozen = (v: unknown): TronFrozen | undefined => {
    if (!v || typeof v !== 'object') return undefined;
    const f = v as Raw;
    return { frozenBalance: toIntString(f.frozen_balance), expireTime: toNumber(f.expire_time) };
};

const decodeFrozenList = (v: unknown): TronFrozen[] =>
    Array.isArray(v) ? v.map(decodeFrozen).filter((x): x is TronFrozen => x != null) : [];

/** Decode repeated Vote {vote_address, vote_count}. */
const decodeVotes = (v: unknown): TronAccountVote[] =>
    Array.isArray(v)
        ? v.map(x => {
              const o = (x ?? {}) as Raw;
              return {
                  voteAddress: decodeAddress(o.vote_address as Uint8Array) ?? '',
                  voteCount: toIntString(o.vote_count),
              };
          })
        : [];

/** Decode a map<string, int64> (e.g. assetV2) into string values. */
const decodeInt64Map = (v: unknown): Record<string, string> => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(v as Raw)) out[k] = toIntString(val);
    return out;
};

/** Decode repeated FreezeV2 {type, amount}. */
const decodeFrozenV2 = (v: unknown): TronFrozenV2[] =>
    Array.isArray(v)
        ? v.map(x => {
              const o = (x ?? {}) as Raw;
              return { type: toEnumString(o.type, 'BANDWIDTH'), amount: toIntString(o.amount) };
          })
        : [];

/** Decode repeated UnFreezeV2 {type, unfreeze_amount, unfreeze_expire_time}. */
const decodeUnfrozenV2 = (v: unknown): TronUnfrozenV2[] =>
    Array.isArray(v)
        ? v.map(x => {
              const o = (x ?? {}) as Raw;
              return {
                  type: toEnumString(o.type, 'BANDWIDTH'),
                  unfreezeAmount: toIntString(o.unfreeze_amount),
                  unfreezeExpireTime: toNumber(o.unfreeze_expire_time),
              };
          })
        : [];

/** Decode a single Permission.Key {address, weight}. */
const decodePermissionKey = (v: unknown): TronPermissionKey => {
    const o = (v ?? {}) as Raw;
    return { address: decodeAddress(o.address as Uint8Array) ?? '', weight: toNumber(o.weight) };
};

/** Decode a Permission sub-message (returns undefined when the field is absent). */
const decodePermission = (v: unknown): TronPermission | undefined => {
    if (!v || typeof v !== 'object') return undefined;
    const p = v as Raw;
    const operations = bytesToHexField(p.operations);
    return {
        type: toEnumString(p.type, 'Owner'),
        id: toNumber(p.id),
        permissionName: typeof p.permission_name === 'string' ? p.permission_name : '',
        threshold: toIntString(p.threshold),
        parentId: toNumber(p.parent_id),
        operations: operations.length > 0 ? operations : undefined,
        keys: Array.isArray(p.keys) ? p.keys.map(decodePermissionKey) : [],
    };
};

/** Decode the Account.AccountResource sub-message (energy + storage). */
const decodeAccountResource = (v: unknown): TronAccountResource => {
    const r = (v ?? {}) as Raw;
    return {
        energyUsage: toIntString(r.energy_usage),
        frozenBalanceForEnergy: decodeFrozen(r.frozen_balance_for_energy),
        latestConsumeTimeForEnergy: toNumber(r.latest_consume_time_for_energy),
        acquiredDelegatedFrozenBalanceForEnergy: toIntString(r.acquired_delegated_frozen_balance_for_energy),
        delegatedFrozenBalanceForEnergy: toIntString(r.delegated_frozen_balance_for_energy),
        storageLimit: toIntString(r.storage_limit),
        storageUsage: toIntString(r.storage_usage),
        latestExchangeStorageTime: toNumber(r.latest_exchange_storage_time),
        energyWindowSize: toIntString(r.energy_window_size),
        delegatedFrozenV2BalanceForEnergy: toIntString(r.delegated_frozenV2_balance_for_energy),
        acquiredDelegatedFrozenV2BalanceForEnergy: toIntString(r.acquired_delegated_frozenV2_balance_for_energy),
        energyWindowOptimized: r.energy_window_optimized === true,
    };
};

/**
 * Decode an Account (GetAccount) into a fully-typed view.
 *
 * Every field the node returns is surfaced as a clean typed property, and the
 * complete normalized message is preserved under `raw` so no data is dropped.
 */
export const decodeAccount = (res: Raw, queriedAddress: string): TronAccount => {
    const addressBytes = res.address as Uint8Array | undefined;
    const exists = isBytes(addressBytes) && addressBytes.length > 0;
    const balanceSun = toIntString(res.balance);
    return {
        address: exists ? decodeAddress(addressBytes) ?? queriedAddress : queriedAddress,
        balanceSun,
        balanceTrx: sunToTrx(balanceSun),
        name: decodeUtf8(res.account_name),
        type: typeof res.type === 'string' ? res.type : undefined,
        accountId: decodeUtf8(res.account_id),
        createTime: toOptTime(res.create_time),
        exists,

        netUsage: toIntString(res.net_usage),
        freeNetUsage: toIntString(res.free_net_usage),
        netWindowSize: toIntString(res.net_window_size),

        latestOperationTime: toOptTime(res.latest_opration_time),
        latestConsumeTime: toOptTime(res.latest_consume_time),
        latestConsumeFreeTime: toOptTime(res.latest_consume_free_time),
        latestWithdrawTime: toOptTime(res.latest_withdraw_time),

        allowance: toIntString(res.allowance),
        isWitness: res.is_witness === true,
        isCommittee: res.is_committee === true,
        votes: decodeVotes(res.votes),

        assets: decodeInt64Map(res.assetV2),
        assetsV1: decodeInt64Map(res.asset),
        assetIssuedId: decodeUtf8(res.asset_issued_ID),
        assetIssuedName: decodeUtf8(res.asset_issued_name),

        frozenV2: decodeFrozenV2(res.frozenV2),
        unfrozenV2: decodeUnfrozenV2(res.unfrozenV2),
        delegatedFrozenV2BalanceForBandwidth: toIntString(res.delegated_frozenV2_balance_for_bandwidth),
        acquiredDelegatedFrozenV2BalanceForBandwidth: toIntString(res.acquired_delegated_frozenV2_balance_for_bandwidth),

        frozen: decodeFrozenList(res.frozen),
        frozenSupply: decodeFrozenList(res.frozen_supply),
        delegatedFrozenBalanceForBandwidth: toIntString(res.delegated_frozen_balance_for_bandwidth),
        acquiredDelegatedFrozenBalanceForBandwidth: toIntString(res.acquired_delegated_frozen_balance_for_bandwidth),
        oldTronPower: toIntString(res.old_tron_power),
        tronPower: decodeFrozen(res.tron_power),

        accountResource: decodeAccountResource(res.account_resource),

        ownerPermission: decodePermission(res.owner_permission),
        witnessPermission: decodePermission(res.witness_permission),
        activePermission: Array.isArray(res.active_permission)
            ? res.active_permission.map(decodePermission).filter((p): p is TronPermission => p != null)
            : [],

        raw: normalizeDeep(res) as Record<string, unknown>,
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
    totalTronPowerWeight: toIntString(res.TotalTronPowerWeight),
    energyUsed: toIntString(res.EnergyUsed),
    energyLimit: toIntString(res.EnergyLimit),
    totalEnergyLimit: toIntString(res.TotalEnergyLimit),
    totalEnergyWeight: toIntString(res.TotalEnergyWeight),
    tronPowerUsed: toIntString(res.tronPowerUsed),
    tronPowerLimit: toIntString(res.tronPowerLimit),
    assetNetUsed: decodeInt64Map(res.assetNetUsed),
    assetNetLimit: decodeInt64Map(res.assetNetLimit),
    storageUsed: toIntString(res.storageUsed),
    storageLimit: toIntString(res.storageLimit),
    raw: normalizeDeep(res) as Record<string, unknown>,
});

/** Decode a Transaction (GetTransactionById) into a readable view. */
export const decodeTransaction = (res: Raw, txid: string): TransactionResult => {
    const rawData = (res.raw_data ?? {}) as Raw;
    const contracts = Array.isArray(rawData.contract) ? (rawData.contract as Raw[]) : [];
    const signature = Array.isArray(res.signature) ? res.signature : [];
    const pqAuthSig = Array.isArray(res.pq_auth_sig) ? (res.pq_auth_sig as Raw[]) : [];
    const ret = Array.isArray(res.ret) ? (res.ret as Raw[]) : [];
    const found = contracts.length > 0;
    return {
        txid,
        contractType: contracts[0]?.type as string | undefined,
        signatures: signature.map(bytesToHexField),
        pqSignatures: pqAuthSig.map(sig => {
            const publicKey = bytesToHexField(sig.public_key);
            return {
                scheme: String(sig.scheme ?? ''),
                publicKey,
                signature: bytesToHexField(sig.signature),
                address: publicKey ? pqPublicKeyToAddress(publicKey) : '',
            };
        }),
        ret: ret.map(r => String(r.contractRet ?? '')),
        rawData: normalizeDeep(rawData) as Record<string, unknown>,
        raw: normalizeDeep(res) as Record<string, unknown>,
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
        resMessage: bytesToHexField(res.resMessage) || undefined,
        logs: decodeLogs(res.log),
        internalTransactions: decodeInternalTransactions(res.internal_transactions),
        withdrawAmount: toIntString(res.withdraw_amount),
        unfreezeAmount: toIntString(res.unfreeze_amount),
        withdrawExpireAmount: toIntString(res.withdraw_expire_amount),
        cancelUnfreezeV2Amount: decodeInt64Map(res.cancel_unfreezeV2_amount),
        assetIssueID: typeof res.assetIssueID === 'string' && res.assetIssueID.length > 0 ? res.assetIssueID : undefined,
        raw: normalizeDeep(res) as Record<string, unknown>,
        found: idHex.length > 0,
    };
};
