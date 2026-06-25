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
/** A single witness vote held by an account. */
export interface TronAccountVote {
    /** Super-representative address voted for (base58). */
    voteAddress: string;
    /** Number of votes cast, as an exact integer string. */
    voteCount: string;
}

/** A legacy (Stake 1.0) frozen balance entry. */
export interface TronFrozen {
    /** Frozen amount in sun, as an exact integer string. */
    frozenBalance: string;
    /** Unix ms when this frozen balance expires. */
    expireTime: number;
}

/** A Stake 2.0 frozen balance entry. */
export interface TronFrozenV2 {
    /** Resource the stake is frozen for (`BANDWIDTH` | `ENERGY` | `TRON_POWER`). */
    type: string;
    /** Frozen amount in sun, as an exact integer string. */
    amount: string;
}

/** A Stake 2.0 unfreezing balance entry (in the withdraw waiting period). */
export interface TronUnfrozenV2 {
    /** Resource being unfrozen (`BANDWIDTH` | `ENERGY` | `TRON_POWER`). */
    type: string;
    /** Amount being unfrozen in sun, as an exact integer string. */
    unfreezeAmount: string;
    /** Unix ms when the unfrozen amount becomes withdrawable. */
    unfreezeExpireTime: number;
}

/** A signer key within a permission. */
export interface TronPermissionKey {
    /** Signer address (base58). */
    address: string;
    /** Signing weight of this key. */
    weight: number;
}

/** An account permission (multi-sig). */
export interface TronPermission {
    /** Permission category (`Owner` | `Witness` | `Active`). */
    type: string;
    /** Permission id (Owner=0, Witness=1, Active>=2). */
    id: number;
    /** Human-readable permission name. */
    permissionName: string;
    /** Signature weight threshold required, as an exact integer string. */
    threshold: string;
    /** Parent permission id. */
    parentId: number;
    /** Hex bitmap of allowed contract types (Active permissions only). */
    operations?: string;
    /** Authorized keys + weights. */
    keys: TronPermissionKey[];
}

/** Energy + storage resource block (`account_resource`). */
export interface TronAccountResource {
    /** Energy consumed, as an exact integer string. */
    energyUsage: string;
    /** Legacy (Stake 1.0) balance frozen for energy, if any. */
    frozenBalanceForEnergy?: TronFrozen;
    /** Unix ms of the last energy consumption. */
    latestConsumeTimeForEnergy: number;
    /** Energy delegated to this account by others (sun), as a string. */
    acquiredDelegatedFrozenBalanceForEnergy: string;
    /** Energy this account delegates to others (sun), as a string. */
    delegatedFrozenBalanceForEnergy: string;
    /** Storage limit, as an exact integer string. */
    storageLimit: string;
    /** Storage used, as an exact integer string. */
    storageUsage: string;
    /** Unix ms of the last storage exchange. */
    latestExchangeStorageTime: number;
    /** Energy usage recovery window size. */
    energyWindowSize: string;
    /** Stake 2.0 energy delegated to others (sun), as a string. */
    delegatedFrozenV2BalanceForEnergy: string;
    /** Stake 2.0 energy delegated to this account (sun), as a string. */
    acquiredDelegatedFrozenV2BalanceForEnergy: string;
    /** Whether the energy window is in optimized mode. */
    energyWindowOptimized: boolean;
}

/**
 * A fully-decoded account view — every field the node returns for an account,
 * surfaced as clean typed properties (addresses as base58, int64 amounts as
 * exact strings, timestamps as numbers). The complete normalized message is
 * also available under {@link TronAccount.raw} so nothing is ever dropped.
 */
export interface TronAccount {
    /** Account address (base58). */
    address: string;
    /** TRX balance in sun, as an exact integer string. */
    balanceSun: string;
    /** TRX balance as a trimmed decimal string. */
    balanceTrx: string;
    /** Decoded account name, if any. */
    name?: string;
    /** Account type (`Normal` | `AssetIssue` | `Contract`). */
    type?: string;
    /** Immutable account id, if set. */
    accountId?: string;
    /** Account creation time (ms), if present. */
    createTime?: number;
    /** False when the address has no on-chain account yet. */
    exists: boolean;

    /** Bandwidth consumed from staked TRX, as an exact integer string. */
    netUsage: string;
    /** Free bandwidth consumed, as an exact integer string. */
    freeNetUsage: string;
    /** Bandwidth usage recovery window size. */
    netWindowSize: string;

    /** Unix ms of the last operation (transfer, vote, ...), if present. */
    latestOperationTime?: number;
    /** Unix ms of the last bandwidth consumption, if present. */
    latestConsumeTime?: number;
    /** Unix ms of the last free-bandwidth consumption, if present. */
    latestConsumeFreeTime?: number;
    /** Unix ms of the last reward withdrawal, if present. */
    latestWithdrawTime?: number;

    /** Witness block-producing allowance in sun, as an exact integer string. */
    allowance: string;
    /** Whether this account is a witness (super representative). */
    isWitness: boolean;
    /** Whether this account is a committee member. */
    isCommittee: boolean;
    /** Witness votes cast by this account. */
    votes: TronAccountVote[];

    /** TRC10 balances keyed by asset id (`assetV2`), values as exact strings. */
    assets: Record<string, string>;
    /** Legacy TRC10 balances keyed by asset name (`asset`), values as strings. */
    assetsV1: Record<string, string>;
    /** Issued TRC10 asset id (for asset-issuer accounts), if any. */
    assetIssuedId?: string;
    /** Issued TRC10 asset name (for asset-issuer accounts), if any. */
    assetIssuedName?: string;

    /** Stake 2.0 frozen balances. */
    frozenV2: TronFrozenV2[];
    /** Stake 2.0 balances currently unfreezing. */
    unfrozenV2: TronUnfrozenV2[];
    /** Stake 2.0 bandwidth delegated to others (sun), as a string. */
    delegatedFrozenV2BalanceForBandwidth: string;
    /** Stake 2.0 bandwidth delegated to this account (sun), as a string. */
    acquiredDelegatedFrozenV2BalanceForBandwidth: string;

    /** Legacy (Stake 1.0) frozen balances for bandwidth. */
    frozen: TronFrozen[];
    /** Legacy frozen supply (for asset issuers). */
    frozenSupply: TronFrozen[];
    /** Legacy bandwidth delegated to others (sun), as a string. */
    delegatedFrozenBalanceForBandwidth: string;
    /** Legacy bandwidth delegated to this account (sun), as a string. */
    acquiredDelegatedFrozenBalanceForBandwidth: string;
    /** Legacy TRON power amount (sun), as a string. */
    oldTronPower: string;
    /** Current TRON power frozen balance, if any. */
    tronPower?: TronFrozen;

    /** Energy + storage resource details. */
    accountResource: TronAccountResource;

    /** Owner permission, if set. */
    ownerPermission?: TronPermission;
    /** Witness permission, if set. */
    witnessPermission?: TronPermission;
    /** Active permissions (multi-sig). */
    activePermission: TronPermission[];

    /**
     * The complete normalized account message — every field keyed exactly as
     * the proto / HTTP `/wallet/getaccount` response (addresses as base58, other
     * bytes as hex, int64 as strings). Use this for any field not surfaced above.
     */
    raw: Record<string, unknown>;
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
