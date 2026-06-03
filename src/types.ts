import type { DecimalLike } from './utils/units';

/** TRON resource kinds used by staking / delegation. */
export type TronResource = 'BANDWIDTH' | 'ENERGY' | 'TRON_POWER';

/** Account category for `createAccount`. */
export type TronAccountType = 'Normal' | 'AssetIssue' | 'Contract';

/** A single witness vote. */
export interface VoteInput {
    /** Witness (super-representative) address, base58 or hex. */
    voteAddress: string;
    /** Number of votes (TRON power) to cast. */
    voteCount: number | string;
}

/** A key inside a permission. */
export interface KeyInput {
    /** Signer address (base58 or hex). */
    address: string;
    /** Voting weight of this key. */
    weight: number;
}

/** A permission for `accountPermissionUpdate`. */
export interface PermissionInput {
    /** Permission category. */
    type?: 'Owner' | 'Witness' | 'Active';
    /** Permission id (Owner=0, Witness=1, Active>=2). */
    id?: number;
    /** Human-readable permission name. */
    permissionName: string;
    /** Signature weight threshold required. */
    threshold: number | string;
    /** Hex bitmap of allowed contract types (Active permissions). */
    operations?: string;
    /** Authorized keys + weights. */
    keys: KeyInput[];
}

/** Friendly input for {@link TronGrpcClient.createAssetIssue} (issue a TRC10). */
export interface CreateAssetIssueInput {
    /** Issuer address (base58 or hex). */
    ownerAddress: string;
    /** Token name. */
    name: string;
    /** Token abbreviation. */
    abbr: string;
    /** Total supply (token base units). */
    totalSupply: number | string | bigint;
    /** Exchange rate numerator: `num` tokens cost `trxNum` TRX. */
    trxNum: number;
    /** Exchange rate denominator (tokens). */
    num: number;
    /** Issue window start (ms epoch). */
    startTime: number;
    /** Issue window end (ms epoch). */
    endTime: number;
    /** Token decimals. */
    precision?: number;
    /** Free bandwidth per account holding the token. */
    freeAssetNetLimit?: number;
    /** Total free bandwidth across all holders. */
    publicFreeAssetNetLimit?: number;
    /** Token description. */
    description?: string;
    /** Project URL. */
    url?: string;
    /** Frozen-supply schedule. */
    frozenSupply?: Array<{ frozenAmount: number | string | bigint; frozenDays: number }>;
}

/** Friendly input for {@link TronGrpcClient.deployContract}. */
export interface DeployContractInput {
    /** Deployer address (base58 or hex). */
    ownerAddress: string;
    /** Compiled contract bytecode (hex or bytes). */
    bytecode: string | Uint8Array;
    /** Contract name. */
    name?: string;
    /** Contract ABI as the `SmartContract.ABI` proto shape (`{ entrys: [...] }`). */
    abi?: Record<string, unknown>;
    /** TRX (decimal) sent on construction. */
    callValue?: DecimalLike;
    /** Percent of energy paid by the caller (0-100). */
    consumeUserResourcePercent?: number;
    /** Max energy the origin will pay per call. */
    originEnergyLimit?: number;
    /** TRC10 token id sent on construction. */
    tokenId?: number;
    /** TRC10 token amount sent on construction. */
    callTokenValue?: number | bigint;
}

/** A header summary of a block, fully decoded into readable values. */
export interface BlockSummary {
    /** Block height. */
    number: number;
    /** Block id / hash (hex). */
    hash: string;
    /** Parent block hash (hex). */
    parentHash: string;
    /** Transaction trie root (hex). */
    txTrieRoot: string;
    /** Block timestamp in milliseconds. */
    timestamp: number;
    /** Producing super-representative address (base58). */
    witnessAddress: string;
    /** Block version. */
    version: number;
    /** Number of transactions in the block. */
    txCount: number;
}

/** Account state with balance exposed both as raw sun and decimal TRX. */
export interface TronAccount {
    /** Account address (base58). */
    address: string;
    /** TRX balance in sun, as an exact integer string. */
    balanceSun: string;
    /** TRX balance as a trimmed decimal string. */
    balanceTrx: string;
    /** Decoded account name, if any. */
    name?: string;
    /** Account creation time (ms), if present. */
    createTime?: number;
    /** False when the address has no on-chain account yet. */
    exists: boolean;
}

/** Bandwidth + energy resources for an account (all values as strings). */
export interface AccountResources {
    freeNetUsed: string;
    freeNetLimit: string;
    netUsed: string;
    netLimit: string;
    totalNetLimit: string;
    totalNetWeight: string;
    energyUsed: string;
    energyLimit: string;
    totalEnergyLimit: string;
    totalEnergyWeight: string;
    tronPowerUsed: string;
    tronPowerLimit: string;
}

/** A decoded transaction (from GetTransactionById). */
export interface TransactionResult {
    /** Transaction id (hex). */
    txid: string;
    /** Contract type, e.g. `TransferContract`. */
    contractType?: string;
    /** Signatures (hex). */
    signatures: string[];
    /** Execution result codes reported by the node (e.g. `SUCCESS`). */
    ret: string[];
    /** Decoded `raw_data` passthrough (addresses base58, numbers as strings). */
    rawData: Record<string, unknown>;
    /** False when no transaction exists for the id. */
    found: boolean;
}

/** A decoded transaction receipt (from GetTransactionInfoById). */
export interface TransactionInfoResult {
    /** Transaction id (hex). */
    id: string;
    /** Block that includes the transaction. */
    blockNumber: number;
    /** Block timestamp (ms). */
    blockTimeStamp: number;
    /** Burned fee in sun (string). */
    fee: string;
    /** Overall result (`SUCESS` / `FAILED`, per the TRON enum spelling). */
    result: string;
    /** ABI-encoded contract return values (hex). */
    contractResult: string[];
    /** Target contract address (base58), for smart-contract calls. */
    contractAddress?: string;
    /** Energy / bandwidth receipt, numbers as strings. */
    receipt: Record<string, string>;
    /** False when no receipt exists yet for the id. */
    found: boolean;
}

/** A TRC20 token balance, raw and human-formatted. */
export interface Trc20Balance {
    /** Raw balance in token base units (integer string). */
    raw: string;
    /** Token decimals used for formatting. */
    decimals: number;
    /** Balance as a trimmed decimal string. */
    value: string;
}

/** Result of a constant (read-only) contract call. */
export interface ConstantCallResult {
    /** ABI-encoded return words (hex, no `0x`). */
    constantResult: string[];
    /** Estimated energy used by the call. */
    energyUsed: number;
}

/** Result of broadcasting a signed transaction. */
export interface BroadcastResult {
    /** Transaction id (hex). */
    txid: string;
    /** True when the node accepted the transaction. */
    success: boolean;
    /** Node result code, e.g. `SUCCESS` or `BANDWIDTH_ERROR`. */
    code?: string;
    /** Decoded human-readable node message, if any. */
    message?: string;
}

/** Friendly input for {@link TronGrpcClient.sendTrx}. */
export interface SendTrxParams {
    /** Sender address (base58 or hex). Optional — derived from `privateKey`. */
    from?: string;
    /** Recipient address (base58 or hex). */
    to: string;
    /** Amount in TRX (decimal). Accepts number | string | bigint. */
    amount: DecimalLike;
    /** Sender private key (hex, with or without `0x`). */
    privateKey: string;
}

/**
 * Friendly input for the trigger-contract family. Provide either
 * `functionSelector` + `params` (the client ABI-encodes the call data) or a
 * pre-encoded `data` payload. Addresses accept base58 or hex.
 */
export interface TriggerContractInput {
    ownerAddress: string | Uint8Array;
    contractAddress: string | Uint8Array;
    /** Solidity function signature, e.g. `balanceOf(address)`. */
    functionSelector?: string;
    /** ABI-encoded params hex (paired with `functionSelector`). */
    params?: string;
    /** Pre-encoded call data hex/bytes (alternative to selector + params). */
    data?: string | Uint8Array;
    /** TRX to send with the call, in sun. */
    callValue?: number | bigint;
    /** TRC10 token amount to send with the call. */
    callTokenValue?: number | bigint;
    /** TRC10 token id to send with the call. */
    tokenId?: number;
}
