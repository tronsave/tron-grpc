import type { DecimalLike } from './utils/units';

/** TRON resource kinds used by staking / delegation. */
export type TronResource = 'BANDWIDTH' | 'ENERGY' | 'TRON_POWER';

/** Signature algorithm backing an account's key. */
export type KeyType = 'ECDSA' | 'FALCON';

/**
 * A post-quantum keypair (TIP-899 FN-DSA-512 / Falcon-512).
 *
 * Unlike ECDSA, the public key cannot be recovered from a signature, so it
 * travels with every signature and must be known to the signer.
 */
export interface TronPqKey {
    /** Always `'FALCON'`. Present so keystores can tag records by algorithm. */
    keyType?: 'FALCON';
    /** 1280-byte FN-DSA-512 private key (hex). */
    privateKey: string;
    /** 896-byte FN-DSA-512 public key (hex). Derived from `privateKey` when omitted. */
    publicKey?: string;
}

/**
 * Anything this library can sign with: a hex secp256k1 private key — as every
 * existing call-site passes today — or a post-quantum {@link TronPqKey}.
 */
export type SigningKey = string | TronPqKey;

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
/** A single EVM event log (TransactionInfo.Log). */
export interface TransactionLog {
    /** Emitting contract address (20-byte EVM hex, no `0x41` prefix — as the node returns it). */
    address: string;
    /** Indexed event topics (hex). */
    topics: string[];
    /** Non-indexed event data (hex). */
    data: string;
}

/** A decoded node `Return` status block (result / code / message). */
export interface ReturnResult {
    /** Whether the node accepted / validated the call. */
    result: boolean;
    /** Response code (e.g. `SUCCESS`, `CONTRACT_VALIDATE_ERROR`). */
    code: string;
    /** Decoded human-readable message, if any. */
    message: string;
}

/** A fully-decoded transaction inside a block (BlockExtention.transactions). */
export interface BlockTransaction {
    /** Transaction id (hex). */
    txid: string;
    /** First contract type (e.g. `TriggerSmartContract`), if any. */
    contractType?: string;
    /** Execution result codes (contractRet, e.g. `SUCCESS`). */
    ret: string[];
    /** Signatures (hex). */
    signatures: string[];
    /** Energy used by this transaction, as an exact integer string. */
    energyUsed: string;
    /** Energy penalty applied to this transaction, as an exact integer string. */
    energyPenalty: string;
    /** EVM event logs emitted by this transaction. */
    logs: TransactionLog[];
    /** Internal transactions triggered (normalized: addresses base58, bytes hex). */
    internalTransactions: Record<string, unknown>[];
    /** Decoded `raw_data` (contracts, ref_block_*, expiration, fee_limit; addresses base58). */
    rawData: Record<string, unknown>;
    /** Full normalized TransactionExtention — every field. */
    raw: Record<string, unknown>;
}

/**
 * A block view. Carries the header summary plus every transaction in the block
 * (fully decoded), and the complete normalized message under {@link BlockSummary.raw}.
 */
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
    /** Block producer's signature over the header (hex), if present. */
    witnessSignature?: string;
    /** Account state root hash of the block (hex), if present. */
    accountStateRoot?: string;
    /** Every transaction in the block, fully decoded. */
    transactions: BlockTransaction[];
    /** Full normalized BlockExtention — every field. */
    raw: Record<string, unknown>;
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
    /** Network-wide total TRON power (vote) weight. */
    totalTronPowerWeight: string;
    energyUsed: string;
    energyLimit: string;
    totalEnergyLimit: string;
    totalEnergyWeight: string;
    tronPowerUsed: string;
    tronPowerLimit: string;
    /** Per-TRC10 free bandwidth consumed, keyed by asset id. */
    assetNetUsed: Record<string, string>;
    /** Per-TRC10 free bandwidth limit, keyed by asset id. */
    assetNetLimit: Record<string, string>;
    /** Account storage consumed (legacy storage resource). */
    storageUsed: string;
    /** Account storage limit (legacy storage resource). */
    storageLimit: string;
    /** Full normalized AccountResourceMessage — every field. */
    raw: Record<string, unknown>;
}

/** A decoded transaction (from GetTransactionById). */
/** A post-quantum signature carried by a transaction (TIP-899 `pq_auth_sig`). */
export interface PqSignature {
    /** Scheme name, e.g. `FN_DSA_512`. */
    scheme: string;
    /** Signer's PQ public key (hex). */
    publicKey: string;
    /** Signature (hex). */
    signature: string;
    /** Base58 address derived from `publicKey` — the account that signed. */
    address: string;
}

export interface TransactionResult {
    /** Transaction id (hex). */
    txid: string;
    /** Contract type, e.g. `TransferContract`. */
    contractType?: string;
    /** ECDSA signatures (hex). */
    signatures: string[];
    /** Post-quantum signatures (TIP-899). Empty for ordinary ECDSA transactions. */
    pqSignatures: PqSignature[];
    /** Execution result codes reported by the node (e.g. `SUCCESS`). */
    ret: string[];
    /** Decoded `raw_data` passthrough (addresses base58, numbers as strings). */
    rawData: Record<string, unknown>;
    /** Full normalized Transaction — every field, incl. complete `ret` Result objects. */
    raw: Record<string, unknown>;
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
    /** Revert / error message (hex) from a failed contract execution, if any. */
    resMessage?: string;
    /** EVM event logs emitted by the transaction. */
    logs: TransactionLog[];
    /** Internal transactions triggered (normalized: addresses base58, bytes hex). */
    internalTransactions: Record<string, unknown>[];
    /** Staking reward withdrawal amount in sun (exact string). */
    withdrawAmount: string;
    /** Amount unfrozen, Stake 1.0, in sun (exact string). */
    unfreezeAmount: string;
    /** Stake 2.0 expired-unfreeze withdrawal amount in sun (exact string). */
    withdrawExpireAmount: string;
    /** Per-resource amounts re-frozen when cancelling a Stake 2.0 unfreeze. */
    cancelUnfreezeV2Amount: Record<string, string>;
    /** TRC10 asset id associated with the transaction, if any. */
    assetIssueID?: string;
    /** Full normalized TransactionInfo — every field (incl. exchange / order / shielded). */
    raw: Record<string, unknown>;
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
    /** Energy penalty applied to the call, as an exact integer string. */
    energyPenalty: string;
    /** EVM event logs emitted during the simulated call. */
    logs: TransactionLog[];
    /** Internal transactions triggered (normalized: addresses base58, bytes hex). */
    internalTransactions: Record<string, unknown>[];
    /** Node `Return` status (result / code / message). */
    result?: ReturnResult;
    /** Simulated transaction id (hex), if present. */
    txid?: string;
    /** Full normalized TransactionExtention — every field. */
    raw: Record<string, unknown>;
}

/** Result of an `estimateEnergy` call. */
export interface EstimateEnergyResult {
    /** Estimated energy required for the call. */
    energyRequired: number;
    /** Node `Return` status (result / code / message). */
    result?: ReturnResult;
    /** Full normalized EstimateEnergyMessage — every field. */
    raw: Record<string, unknown>;
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
    /** Sender key: an ECDSA private key (hex), or a post-quantum {@link TronPqKey}. */
    privateKey: SigningKey;
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
