/**
 * Response shapes of the client's read and builder methods, as the client
 * returns them.
 *
 * Each type mirrors a java-tron proto message (`src/proto/*.proto`) *after* the
 * client's normalization — what you get back, not the wire format:
 *
 * - field names are the proto's own, spelled exactly as there (mostly
 *   `snake_case`, some `camelCase`, typos such as `latest_opration_time` included);
 * - `int64` fields are decimal strings (exact); `int32` and `double` are numbers;
 * - enums are their names;
 * - `bytes` fields are strings: a 21-byte value starting with `0x41` becomes a
 *   base58 `T…` address, anything else lowercase hex (`''` when empty). Text the
 *   chain stores as bytes — a TRC10 name, a token id — is therefore hex-encoded
 *   UTF-8: `Buffer.from(value, 'hex').toString('utf8')`;
 * - every field is present. An unset scalar carries its proto default (`'0'`, `0`,
 *   `''`, `false`, the first enum name), a repeated field is `[]`, a map is `{}`
 *   and an unset sub-message is `null`.
 *
 * A java-tron node answers "not found" with an all-default message rather than an
 * error, so check a key field (`raw_data`, `block_header`, `contract_address`…)
 * before trusting the rest.
 *
 * These are type aliases rather than interfaces on purpose: an object-type alias
 * stays assignable to `Record<string, unknown>`, which is what these methods
 * returned before they were typed, so existing casts and helpers keep compiling.
 *
 * The transaction family takes a `Bytes` parameter. It is `string` everywhere
 * except in the unsigned transaction a builder method returns
 * ({@link UnsignedTransactionExtention}), whose `bytes` fields are left as raw
 * `Uint8Array`s so it can be signed and broadcast unchanged.
 */
import type { TronAccountType, TronResource } from '../types';

// -- Enums -------------------------------------------------------------------

/** `Transaction.Contract.ContractType`: what a transaction's contract does. */
export type ContractType =
    | 'AccountCreateContract'
    | 'TransferContract'
    | 'TransferAssetContract'
    | 'VoteAssetContract'
    | 'VoteWitnessContract'
    | 'WitnessCreateContract'
    | 'AssetIssueContract'
    | 'WitnessUpdateContract'
    | 'ParticipateAssetIssueContract'
    | 'AccountUpdateContract'
    | 'FreezeBalanceContract'
    | 'UnfreezeBalanceContract'
    | 'WithdrawBalanceContract'
    | 'UnfreezeAssetContract'
    | 'UpdateAssetContract'
    | 'ProposalCreateContract'
    | 'ProposalApproveContract'
    | 'ProposalDeleteContract'
    | 'SetAccountIdContract'
    | 'CustomContract'
    | 'CreateSmartContract'
    | 'TriggerSmartContract'
    | 'GetContract'
    | 'UpdateSettingContract'
    | 'ExchangeCreateContract'
    | 'ExchangeInjectContract'
    | 'ExchangeWithdrawContract'
    | 'ExchangeTransactionContract'
    | 'UpdateEnergyLimitContract'
    | 'AccountPermissionUpdateContract'
    | 'ClearABIContract'
    | 'UpdateBrokerageContract'
    | 'ShieldedTransferContract'
    | 'MarketSellAssetContract'
    | 'MarketCancelOrderContract'
    | 'FreezeBalanceV2Contract'
    | 'UnfreezeBalanceV2Contract'
    | 'WithdrawExpireUnfreezeContract'
    | 'DelegateResourceContract'
    | 'UnDelegateResourceContract'
    | 'CancelAllUnfreezeV2Contract';

/** `Transaction.Result.contractResult`: how a contract execution ended. */
export type ContractResult =
    | 'DEFAULT'
    | 'SUCCESS'
    | 'REVERT'
    | 'BAD_JUMP_DESTINATION'
    | 'OUT_OF_MEMORY'
    | 'PRECOMPILED_CONTRACT'
    | 'STACK_TOO_SMALL'
    | 'STACK_TOO_LARGE'
    | 'ILLEGAL_OPERATION'
    | 'STACK_OVERFLOW'
    | 'OUT_OF_ENERGY'
    | 'OUT_OF_TIME'
    | 'JVM_STACK_OVER_FLOW'
    | 'UNKNOWN'
    | 'TRANSFER_FAILED'
    | 'INVALID_CODE';

/** Overall transaction outcome. `SUCESS` is the proto's own spelling. */
export type TransactionResultCode = 'SUCESS' | 'FAILED';

/** `Return.response_code`: a node's verdict on a request or a broadcast. */
export type ReturnCode =
    | 'SUCCESS'
    | 'SIGERROR'
    | 'CONTRACT_VALIDATE_ERROR'
    | 'CONTRACT_EXE_ERROR'
    | 'BANDWITH_ERROR'
    | 'DUP_TRANSACTION_ERROR'
    | 'TAPOS_ERROR'
    | 'TOO_BIG_TRANSACTION_ERROR'
    | 'TRANSACTION_EXPIRATION_ERROR'
    | 'SERVER_BUSY'
    | 'NO_CONNECTION'
    | 'NOT_ENOUGH_EFFECTIVE_CONNECTION'
    | 'BLOCK_UNSOLIDIFIED'
    | 'OTHER_ERROR';

/** `Permission.PermissionType`. */
export type PermissionType = 'Owner' | 'Witness' | 'Active';

/** `PQScheme`: a TIP-899 post-quantum signature scheme, by name. */
export type PqSchemeName = 'UNKNOWN_PQ_SCHEME' | 'FN_DSA_512' | 'ML_DSA_44';

// -- Transactions ------------------------------------------------------------

/** A node `Return` status block. */
export type NodeReturn<Bytes = string> = {
    /** Whether the node accepted the request. */
    result: boolean;
    /** Response code. */
    code: ReturnCode;
    /** Error text as UTF-8 bytes (hex once normalized); empty on success. */
    message: Bytes;
};

/** A contract's payload (`Any`): the contract message, still protobuf-encoded. */
export type ContractParameter<Bytes = string> = {
    /** `type.googleapis.com/protocol.<ContractType>`. */
    type_url: string;
    /** The serialized contract message (hex once normalized). It is not decoded. */
    value: Bytes;
};

/** One contract of a transaction (`Transaction.Contract`). TRON transactions carry exactly one. */
export type TransactionContract<Bytes = string> = {
    /** Contract type. */
    type: ContractType;
    /** The contract's payload; `null` only on a malformed transaction. */
    parameter: ContractParameter<Bytes> | null;
    /** Unused by java-tron; empty. */
    provider: Bytes;
    /** Unused by java-tron; empty. */
    ContractName: Bytes;
    /** Account permission that signs: 0 owner, 1 witness, 2+ active. */
    Permission_id: number;
};

/** A `Transaction.raw.auths` entry. Unused by java-tron; always absent in practice. */
export type TransactionAuthority<Bytes = string> = {
    /** Account the authority refers to. */
    account: { name: Bytes; address: Bytes } | null;
    /** Permission name. */
    permission_name: Bytes;
};

/** One fill of an on-chain market order. */
export type MarketOrderDetail<Bytes = string> = {
    /** Maker order id (hex). */
    makerOrderId: Bytes;
    /** Taker order id (hex). */
    takerOrderId: Bytes;
    /** Quantity of the sell token filled, as an exact integer string. */
    fillSellQuantity: string;
    /** Quantity of the buy token filled, as an exact integer string. */
    fillBuyQuantity: string;
};

/**
 * A `Transaction.ret` entry (`Transaction.Result`).
 *
 * Inside a block only `contractRet` is filled in; the amounts are reported by
 * the receipt ({@link TransactionInfo}) instead and read `'0'` here.
 */
export type TransactionRet<Bytes = string> = {
    /** Fee in sun, as an exact integer string. */
    fee: string;
    /** Overall outcome. */
    ret: TransactionResultCode;
    /** Contract execution outcome. */
    contractRet: ContractResult;
    /** Id of the TRC10 asset an `AssetIssueContract` created. */
    assetIssueID: string;
    /** Reward withdrawn, in sun, as an exact integer string. */
    withdraw_amount: string;
    /** Stake 1.0 amount unfrozen, in sun, as an exact integer string. */
    unfreeze_amount: string;
    /** Tokens received from an exchange trade, as an exact integer string. */
    exchange_received_amount: string;
    /** Amount of the other token an exchange injection required, as an exact integer string. */
    exchange_inject_another_amount: string;
    /** Amount of the other token an exchange withdrawal returned, as an exact integer string. */
    exchange_withdraw_another_amount: string;
    /** Id of the exchange an `ExchangeCreateContract` created. */
    exchange_id: string;
    /** Shielded transaction fee in sun, as an exact integer string. */
    shielded_transaction_fee: string;
    /** Id of the market order this transaction created (hex). */
    orderId: Bytes;
    /** Market order fills this transaction caused. */
    orderDetails: MarketOrderDetail<Bytes>[];
    /** Expired Stake 2.0 unfreeze withdrawn, in sun, as an exact integer string. */
    withdraw_expire_amount: string;
    /** Sun re-staked by `CancelAllUnfreezeV2`, keyed by resource (`BANDWIDTH`, `ENERGY`, `TRON_POWER`). */
    cancel_unfreezeV2_amount: Record<string, string>;
};

/** A post-quantum signature on a transaction or block header (TIP-899 `PQAuthSig`). */
export type PqAuthSig<Bytes = string> = {
    /** Signature scheme. */
    scheme: PqSchemeName;
    /** Signer's public key (hex). */
    public_key: Bytes;
    /** Signature (hex). */
    signature: Bytes;
};

/** The signed part of a transaction (`Transaction.raw`); its SHA-256 is the txid. */
export type TransactionRawData<Bytes = string> = {
    /** Bytes 6-7 of the reference block's height (hex) — TaPoS. */
    ref_block_bytes: Bytes;
    /** Unused by java-tron; `'0'`. */
    ref_block_num: string;
    /** Bytes 8-15 of the reference block's id (hex) — TaPoS. */
    ref_block_hash: Bytes;
    /** When the transaction expires (ms epoch), as an exact integer string. */
    expiration: string;
    /** Unused by java-tron; empty. */
    auths: TransactionAuthority<Bytes>[];
    /** Memo (hex-encoded bytes); empty when there is none. */
    data: Bytes;
    /** The transaction's contract — exactly one entry. */
    contract: TransactionContract<Bytes>[];
    /** Unused by java-tron; empty. */
    scripts: Bytes;
    /** When the transaction was created (ms epoch), as an exact integer string. */
    timestamp: string;
    /** Most TRX the transaction may burn for energy, in sun, as an exact integer string. */
    fee_limit: string;
};

/** A transaction (`Transaction`). */
export type Transaction<Bytes = string> = {
    /** The signed content; `null` when the node found no such transaction. */
    raw_data: TransactionRawData<Bytes> | null;
    /** ECDSA signatures, 65 bytes each (hex). */
    signature: Bytes[];
    /** Execution results; empty until the transaction is in a block. */
    ret: TransactionRet<Bytes>[];
    /** Post-quantum signatures (TIP-899). */
    pq_auth_sig: PqAuthSig<Bytes>[];
};

/** An EVM event log (`TransactionInfo.Log`). */
export type EventLog<Bytes = string> = {
    /** Emitting contract: 20-byte EVM address (hex, no `0x41` prefix — as the node returns it). */
    address: Bytes;
    /** Indexed event topics (hex). */
    topics: Bytes[];
    /** Non-indexed event data (hex). */
    data: Bytes;
};

/** A call made by a contract during execution (`InternalTransaction`). */
export type InternalTransaction<Bytes = string> = {
    /** Internal transaction id (hex). */
    hash: Bytes;
    /** Calling contract or account (base58). */
    caller_address: Bytes;
    /** Callee or recipient (base58). */
    transferTo_address: Bytes;
    /** Value moved by the call: TRX when `tokenId` is empty, otherwise that TRC10 token. */
    callValueInfo: {
        /** Amount, in sun or token base units, as an exact integer string. */
        callValue: string;
        /** TRC10 token id; `''` for TRX. */
        tokenId: string;
    }[];
    /** Kind of call as UTF-8 bytes (hex), e.g. `63616c6c` = `call`. */
    note: Bytes;
    /** True when the call failed and its effects were rolled back. */
    rejected: boolean;
    /** Extra data the VM recorded for the call. */
    extra: string;
};

/**
 * A transaction with the node's commentary on it (`TransactionExtention`): the
 * shape of a block's transactions and of what every builder method returns.
 */
export type TransactionExtention<Bytes = string> = {
    /** The transaction; `null` when the node could not build or find it. */
    transaction: Transaction<Bytes> | null;
    /** Transaction id: SHA-256 of `transaction.raw_data` (hex). */
    txid: Bytes;
    /** ABI-encoded return values of a constant call (hex); empty otherwise. */
    constant_result: Bytes[];
    /** The node's verdict on the request. */
    result: NodeReturn<Bytes> | null;
    /** Energy used, as an exact integer string. */
    energy_used: string;
    /** Event logs of a constant call; empty otherwise. */
    logs: EventLog<Bytes>[];
    /** Internal transactions of a constant call; empty otherwise. */
    internal_transactions: InternalTransaction<Bytes>[];
    /** Energy penalty included in `energy_used`, as an exact integer string. */
    energy_penalty: string;
};

/**
 * The unsigned transaction a builder method returns (`createTransaction`,
 * `freezeBalanceV2`, `triggerContract`…): pass it to `signAndBroadcast` or
 * `signTransaction`.
 *
 * Unlike the read methods, this is the node's answer untouched — every `bytes`
 * field is a raw `Uint8Array` (a Node `Buffer`), addresses included, because the
 * same bytes are signed and broadcast. Integers are still strings and enums names.
 */
export type UnsignedTransactionExtention = TransactionExtention<Uint8Array>;

/** Resource accounting of a transaction (`ResourceReceipt`). */
export type ResourceReceipt = {
    /** Energy taken from the caller's stake, as an exact integer string. */
    energy_usage: string;
    /** Sun burned for energy, as an exact integer string. */
    energy_fee: string;
    /** Energy paid by the contract's deployer, as an exact integer string. */
    origin_energy_usage: string;
    /** Total energy the execution consumed, as an exact integer string. */
    energy_usage_total: string;
    /** Bandwidth taken from the sender's stake or free quota, as an exact integer string. */
    net_usage: string;
    /** Sun burned for bandwidth, as an exact integer string. */
    net_fee: string;
    /** Contract execution outcome; `DEFAULT` for a transaction that ran no contract code. */
    result: ContractResult;
    /** Energy penalty included in `energy_usage_total`, as an exact integer string. */
    energy_penalty_total: string;
};

/** A transaction receipt (`TransactionInfo`). */
export type TransactionInfo = {
    /** Transaction id (hex); empty when the node has no receipt for it. */
    id: string;
    /** Total fee in sun, as an exact integer string. */
    fee: string;
    /** Height of the block that includes the transaction, as an exact integer string. */
    blockNumber: string;
    /** Timestamp of that block (ms epoch), as an exact integer string. */
    blockTimeStamp: string;
    /** ABI-encoded contract return values (hex). */
    contractResult: string[];
    /** Contract called or created (base58); empty for a non-contract transaction. */
    contract_address: string;
    /** Energy and bandwidth accounting. */
    receipt: ResourceReceipt | null;
    /** Event logs emitted. */
    log: EventLog[];
    /** Overall outcome. */
    result: TransactionResultCode;
    /** Revert reason or error text as UTF-8 bytes (hex); empty on success. */
    resMessage: string;
    /** Id of the TRC10 asset an `AssetIssueContract` created. */
    assetIssueID: string;
    /** Reward withdrawn, in sun, as an exact integer string. */
    withdraw_amount: string;
    /** Stake 1.0 amount unfrozen, in sun, as an exact integer string. */
    unfreeze_amount: string;
    /** Calls made by the contract during execution. */
    internal_transactions: InternalTransaction[];
    /** Tokens received from an exchange trade, as an exact integer string. */
    exchange_received_amount: string;
    /** Amount of the other token an exchange injection required, as an exact integer string. */
    exchange_inject_another_amount: string;
    /** Amount of the other token an exchange withdrawal returned, as an exact integer string. */
    exchange_withdraw_another_amount: string;
    /** Id of the exchange an `ExchangeCreateContract` created. */
    exchange_id: string;
    /** Shielded transaction fee in sun, as an exact integer string. */
    shielded_transaction_fee: string;
    /** Id of the market order this transaction created (hex). */
    orderId: string;
    /** Market order fills this transaction caused. */
    orderDetails: MarketOrderDetail[];
    /** Part of the fee credited to block producers, in sun, as an exact integer string. */
    packingFee: string;
    /** Expired Stake 2.0 unfreeze withdrawn, in sun, as an exact integer string. */
    withdraw_expire_amount: string;
    /** Sun re-staked by `CancelAllUnfreezeV2`, keyed by resource (`BANDWIDTH`, `ENERGY`, `TRON_POWER`). */
    cancel_unfreezeV2_amount: Record<string, string>;
};

/** Every receipt of a block (`getTransactionInfoByBlockNum`), in transaction order. */
export type TransactionInfoList = {
    /** The block's receipts; empty for an empty or unknown block. */
    transactionInfo: TransactionInfo[];
};

/** Ids of the transactions waiting in the node's pending pool. */
export type TransactionIdList = {
    /** Transaction ids (hex). */
    txId: string[];
};

/** A key of a permission (`Key`). */
export type PermissionKey = {
    /** Signer address (base58). */
    address: string;
    /** Weight this key contributes, as an exact integer string. */
    weight: string;
};

/** An account permission (`Permission`). */
export type Permission = {
    /** Permission category. */
    type: PermissionType;
    /** Permission id: 0 owner, 1 witness, 2+ active. */
    id: number;
    /** Permission name. */
    permission_name: string;
    /** Total key weight a transaction needs, as an exact integer string. */
    threshold: string;
    /** Parent permission id. */
    parent_id: number;
    /** Bitmap of the contract types an active permission may sign (hex); empty otherwise. */
    operations: string;
    /** Authorized keys and their weights. */
    keys: PermissionKey[];
};

/** How far a (partially) signed transaction is from its permission threshold. */
export type TransactionSignWeight = {
    /** The permission the transaction signs under. */
    permission: Permission | null;
    /** Addresses whose signatures were recognized (base58). */
    approved_list: string[];
    /** Combined weight of those signatures, as an exact integer string. */
    current_weight: string;
    /** Verdict: `ENOUGH_PERMISSION` once the threshold is met. */
    result: {
        code:
            | 'ENOUGH_PERMISSION'
            | 'NOT_ENOUGH_PERMISSION'
            | 'SIGNATURE_FORMAT_ERROR'
            | 'COMPUTE_ADDRESS_ERROR'
            | 'PERMISSION_ERROR'
            | 'OTHER_ERROR';
        /** Error detail; empty on success. */
        message: string;
    } | null;
    /** The transaction that was examined. */
    transaction: TransactionExtention | null;
};

/** Who has signed a (multi-sig) transaction. */
export type TransactionApprovedList = {
    /** Addresses whose signatures were recognized (base58). */
    approved_list: string[];
    /** Verdict on the signatures. */
    result: {
        code: 'SUCCESS' | 'SIGNATURE_FORMAT_ERROR' | 'COMPUTE_ADDRESS_ERROR' | 'OTHER_ERROR';
        /** Error detail; empty on success. */
        message: string;
    } | null;
    /** The transaction that was examined. */
    transaction: TransactionExtention | null;
};

// -- Blocks ------------------------------------------------------------------

/** The signed part of a block header (`BlockHeader.raw`). */
export type BlockHeaderRawData = {
    /** Block timestamp (ms epoch), as an exact integer string. */
    timestamp: string;
    /** Merkle root of the block's transactions (hex). */
    txTrieRoot: string;
    /** Id of the parent block (hex). */
    parentHash: string;
    /** Block height, as an exact integer string. */
    number: string;
    /** Unused by java-tron; `'0'`. */
    witness_id: string;
    /** Super representative that produced the block (base58). */
    witness_address: string;
    /** Block version. */
    version: number;
    /** Account state root (hex); empty on mainnet. */
    accountStateRoot: string;
};

/** A block header (`BlockHeader`). */
export type BlockHeader = {
    /** The signed header content. */
    raw_data: BlockHeaderRawData | null;
    /** The producer's ECDSA signature over `raw_data` (hex). */
    witness_signature: string;
    /** The producer's post-quantum signature (TIP-899), when it signs with one. */
    pq_auth_sig: PqAuthSig | null;
};

/** A block as `getBlockById` returns it (`Block`): bare transactions, no block id. */
export type Block = {
    /** The block's transactions. */
    transactions: Transaction[];
    /** The header; `null` when no block has that id. */
    block_header: BlockHeader | null;
};

/** A block with its id and per-transaction ids (`BlockExtention`). */
export type BlockExtention = {
    /** The block's transactions; empty when `getBlock` is called without `detail`. */
    transactions: TransactionExtention[];
    /** The header; `null` when no such block exists. */
    block_header: BlockHeader | null;
    /** Block id / hash (hex). */
    blockid: string;
};

/** A run of consecutive blocks (`getBlockByLatestNum`, `getBlockByLimitNext`). */
export type BlockListExtention = {
    /** The blocks, in ascending height order. */
    block: BlockExtention[];
};

/** A block's height and id. */
export type BlockIdentifier = {
    /** Block id / hash (hex). */
    hash: string;
    /** Block height, as an exact integer string. */
    number: string;
};

/** The balance changes one transaction caused (`TransactionBalanceTrace`). */
export type TransactionBalanceTrace = {
    /** Transaction id (hex). */
    transaction_identifier: string;
    /** Every balance change, in order. */
    operation: {
        /** Index of the operation within the transaction, as an exact integer string. */
        operation_identifier: string;
        /** Account whose balance changed (base58). */
        address: string;
        /** Change in sun — negative for a debit — as an exact integer string. */
        amount: string;
    }[];
    /** Contract type of the transaction. */
    type: string;
    /** Contract result, e.g. `SUCCESS`. */
    status: string;
};

/** Per-transaction balance changes of a block. Needs a node that records balance history. */
export type BlockBalanceTrace = {
    /** The block traced. */
    block_identifier: BlockIdentifier | null;
    /** Block timestamp (ms epoch), as an exact integer string. */
    timestamp: string;
    /** One entry per transaction. */
    transaction_balance_trace: TransactionBalanceTrace[];
};

// -- Accounts ----------------------------------------------------------------

/** A Stake 1.0 frozen balance (`Account.Frozen`). */
export type AccountFrozen = {
    /** Frozen amount, in sun or token base units, as an exact integer string. */
    frozen_balance: string;
    /** When it can be unfrozen (ms epoch), as an exact integer string. */
    expire_time: string;
};

/** A witness vote held by an account (`Vote`). */
export type AccountVote = {
    /** Super representative voted for (base58). */
    vote_address: string;
    /** Number of votes, as an exact integer string. */
    vote_count: string;
};

/** Energy and storage state of an account (`Account.AccountResource`). */
export type AccountResourceDetail = {
    /** Energy consumed, as an exact integer string. */
    energy_usage: string;
    /** Stake 1.0 balance frozen for energy. */
    frozen_balance_for_energy: AccountFrozen | null;
    /** Last energy consumption (ms epoch), as an exact integer string. */
    latest_consume_time_for_energy: string;
    /** Stake 1.0 sun others delegated to this account for energy, as an exact integer string. */
    acquired_delegated_frozen_balance_for_energy: string;
    /** Stake 1.0 sun this account delegated to others for energy, as an exact integer string. */
    delegated_frozen_balance_for_energy: string;
    /** Storage limit (legacy storage resource), as an exact integer string. */
    storage_limit: string;
    /** Storage used (legacy storage resource), as an exact integer string. */
    storage_usage: string;
    /** Last storage exchange (ms epoch), as an exact integer string. */
    latest_exchange_storage_time: string;
    /** Energy recovery window, as an exact integer string. */
    energy_window_size: string;
    /** Stake 2.0 sun this account delegated to others for energy, as an exact integer string. */
    delegated_frozenV2_balance_for_energy: string;
    /** Stake 2.0 sun others delegated to this account for energy, as an exact integer string. */
    acquired_delegated_frozenV2_balance_for_energy: string;
    /** Whether the energy window uses the optimized (TIP-542) representation. */
    energy_window_optimized: boolean;
};

/**
 * An account as the node stores it (`Account`), returned by `getAccountById`.
 *
 * `getAccount` returns the friendlier {@link TronAccount} instead, and exposes
 * this same shape as its `raw` field. An account that does not exist reads as
 * all defaults — check `address`.
 */
export type Account = {
    /** Account name as UTF-8 bytes (hex). */
    account_name: string;
    /** Account type. */
    type: TronAccountType;
    /** Account address (base58); empty when the account does not exist. */
    address: string;
    /** TRX balance in sun, as an exact integer string. */
    balance: string;
    /** Witness votes cast. */
    votes: AccountVote[];
    /** Legacy TRC10 balances keyed by asset name. */
    asset: Record<string, string>;
    /** TRC10 balances keyed by asset id. */
    assetV2: Record<string, string>;
    /** Stake 1.0 balances frozen for bandwidth. */
    frozen: AccountFrozen[];
    /** Bandwidth consumed from stake, as an exact integer string. */
    net_usage: string;
    /** Stake 1.0 sun others delegated to this account for bandwidth, as an exact integer string. */
    acquired_delegated_frozen_balance_for_bandwidth: string;
    /** Stake 1.0 sun this account delegated to others for bandwidth, as an exact integer string. */
    delegated_frozen_balance_for_bandwidth: string;
    /** Legacy TRON power, in sun, as an exact integer string. */
    old_tron_power: string;
    /** Balance frozen for TRON power (votes). */
    tron_power: AccountFrozen | null;
    /** Whether the account's TRC10 balances use the optimized storage layout. */
    asset_optimized: boolean;
    /** Account creation time (ms epoch), as an exact integer string. */
    create_time: string;
    /** Last operation time (ms epoch), as an exact integer string. The proto spells it `opration`. */
    latest_opration_time: string;
    /** Unclaimed reward in sun, as an exact integer string. */
    allowance: string;
    /** Last reward withdrawal (ms epoch), as an exact integer string. */
    latest_withdraw_time: string;
    /** Unused by java-tron; empty. */
    code: string;
    /** Whether the account is a witness (super representative or candidate). */
    is_witness: boolean;
    /** Whether the account is a committee member. */
    is_committee: boolean;
    /** Frozen supply of the TRC10 asset this account issued. */
    frozen_supply: AccountFrozen[];
    /** Name of the TRC10 asset this account issued, as UTF-8 bytes (hex). */
    asset_issued_name: string;
    /** Id of the TRC10 asset this account issued, as UTF-8 bytes (hex). */
    asset_issued_ID: string;
    /** Last TRC10 operation time per asset name. */
    latest_asset_operation_time: Record<string, string>;
    /** Last TRC10 operation time per asset id. */
    latest_asset_operation_timeV2: Record<string, string>;
    /** Free bandwidth consumed, as an exact integer string. */
    free_net_usage: string;
    /** Free TRC10 bandwidth consumed per asset name. */
    free_asset_net_usage: Record<string, string>;
    /** Free TRC10 bandwidth consumed per asset id. */
    free_asset_net_usageV2: Record<string, string>;
    /** Last bandwidth consumption (ms epoch), as an exact integer string. */
    latest_consume_time: string;
    /** Last free-bandwidth consumption (ms epoch), as an exact integer string. */
    latest_consume_free_time: string;
    /** Immutable account id as UTF-8 bytes (hex). */
    account_id: string;
    /** Bandwidth recovery window, as an exact integer string. */
    net_window_size: string;
    /** Whether the bandwidth window uses the optimized (TIP-542) representation. */
    net_window_optimized: boolean;
    /** Energy and storage state; `null` when unset. */
    account_resource: AccountResourceDetail | null;
    /** Hash of the contract's code (hex), for a contract account. */
    codeHash: string;
    /** Owner permission; `null` while the account uses the default. */
    owner_permission: Permission | null;
    /** Witness permission, for a witness account. */
    witness_permission: Permission | null;
    /** Active permissions. */
    active_permission: Permission[];
    /** Stake 2.0 staked balances, one entry per resource. */
    frozenV2: {
        /** Resource the stake earns. */
        type: TronResource;
        /** Staked amount in sun, as an exact integer string. */
        amount: string;
    }[];
    /** Stake 2.0 balances waiting out the unstaking period. */
    unfrozenV2: {
        /** Resource the stake earned. */
        type: TronResource;
        /** Amount being unstaked in sun, as an exact integer string. */
        unfreeze_amount: string;
        /** When it becomes withdrawable (ms epoch), as an exact integer string. */
        unfreeze_expire_time: string;
    }[];
    /** Stake 2.0 sun this account delegated to others for bandwidth, as an exact integer string. */
    delegated_frozenV2_balance_for_bandwidth: string;
    /** Stake 2.0 sun others delegated to this account for bandwidth, as an exact integer string. */
    acquired_delegated_frozenV2_balance_for_bandwidth: string;
};

/** An account's bandwidth usage and limits (`getAccountNet`). */
export type AccountNetMessage = {
    /** Free bandwidth used, as an exact integer string. */
    freeNetUsed: string;
    /** Free bandwidth available per day, as an exact integer string. */
    freeNetLimit: string;
    /** Staked bandwidth used, as an exact integer string. */
    NetUsed: string;
    /** Bandwidth the account's stake entitles it to, as an exact integer string. */
    NetLimit: string;
    /** Free TRC10 bandwidth used, keyed by asset id. */
    assetNetUsed: Record<string, string>;
    /** Free TRC10 bandwidth limit, keyed by asset id. */
    assetNetLimit: Record<string, string>;
    /** Network-wide bandwidth limit, as an exact integer string. */
    TotalNetLimit: string;
    /** Network-wide TRX staked for bandwidth (in TRX, not sun), as an exact integer string. */
    TotalNetWeight: string;
};

/** An account's TRX balance at a block (`getAccountBalance`). Needs a node that records balance history. */
export type AccountBalanceResponse = {
    /** Balance in sun, as an exact integer string. */
    balance: string;
    /** The block the balance was read at. */
    block_identifier: BlockIdentifier | null;
};

// -- Scalar responses --------------------------------------------------------

/**
 * A single number (`NumberMessage`). What it counts depends on the method: a
 * reward in sun, a brokerage percent, a transaction count, a ms timestamp, the
 * total sun burned…
 */
export type NumberMessage = {
    /** The value, as an exact integer string. */
    num: string;
};

/**
 * A price history (`getBandwidthPrices`, `getEnergyPrices`, `getMemoFee`).
 */
export type PricesResponseMessage = {
    /**
     * Comma-separated `effectiveFromMs:price` pairs, oldest first — e.g.
     * `0:100,1542607200000:20,…`. The last pair is the current price, in sun.
     */
    prices: string;
};

/** Answer of `getCanDelegatedMaxSize`. */
export type CanDelegatedMaxSizeResponseMessage = {
    /** Most sun the account can still delegate for the resource, as an exact integer string. */
    max_size: string;
};

/** Answer of `getAvailableUnfreezeCount`. */
export type GetAvailableUnfreezeCountResponseMessage = {
    /** Unstake operations the account may still start (the chain allows 32 pending), as an exact integer string. */
    count: string;
};

/** Answer of `getCanWithdrawUnfreezeAmount`. */
export type CanWithdrawUnfreezeAmountResponseMessage = {
    /** Unstaked sun withdrawable at the given time, as an exact integer string. */
    amount: string;
};

// -- Resources / delegation --------------------------------------------------

/**
 * What one account has delegated to another (`DelegatedResource`).
 *
 * Stake 2.0 keeps locked and unlocked delegations apart, so
 * `getDelegatedResourceV2` can return two entries for one pair: one with expire
 * times of `'0'` (unlocked) and one carrying the lock's expiry.
 */
export type DelegatedResource = {
    /** Delegating account (base58). */
    from: string;
    /** Receiving account (base58). */
    to: string;
    /** Sun delegated for bandwidth, as an exact integer string. */
    frozen_balance_for_bandwidth: string;
    /** Sun delegated for energy, as an exact integer string. */
    frozen_balance_for_energy: string;
    /** When the bandwidth delegation unlocks (ms epoch; `'0'` when not locked), as an exact integer string. */
    expire_time_for_bandwidth: string;
    /** When the energy delegation unlocks (ms epoch; `'0'` when not locked), as an exact integer string. */
    expire_time_for_energy: string;
};

/** Delegations from one account to another (`getDelegatedResource`, `getDelegatedResourceV2`). */
export type DelegatedResourceList = {
    /** The delegations; empty when there are none. */
    delegatedResource: DelegatedResource[];
};

/** Who an account delegates to and receives from (`getDelegatedResourceAccountIndex(V2)`). */
export type DelegatedResourceAccountIndex = {
    /** The account asked about (base58). */
    account: string;
    /** Accounts that delegate resources to it (base58). */
    fromAccounts: string[];
    /** Accounts it delegates resources to (base58). */
    toAccounts: string[];
    /** Unused by the query; `'0'`. */
    timestamp: string;
};

// -- Witnesses ---------------------------------------------------------------

/** A witness: a super representative or a candidate (`Witness`). */
export type Witness = {
    /** Witness address (base58). */
    address: string;
    /** Votes received, as an exact integer string. */
    voteCount: string;
    /** Unused by java-tron; empty. */
    pubKey: string;
    /** The witness's website. */
    url: string;
    /** Blocks produced, as an exact integer string. */
    totalProduced: string;
    /** Block slots missed, as an exact integer string. */
    totalMissed: string;
    /** Height of the last block it produced, as an exact integer string. */
    latestBlockNum: string;
    /** Slot of the last block it produced, as an exact integer string. */
    latestSlotNum: string;
    /** True for an active super representative — one of the 27 producing blocks. */
    isJobs: boolean;
};

/** Witnesses (`listWitnesses`, `getPaginatedNowWitnessList`). */
export type WitnessList = {
    /**
     * The witnesses. `listWitnesses` returns every witness, unordered;
     * `getPaginatedNowWitnessList` returns them by votes, highest first.
     */
    witnesses: Witness[];
};

// -- Smart contracts ---------------------------------------------------------

/** An input or output of an ABI entry. */
export type SmartContractAbiParam = {
    /** Whether an event parameter is indexed (a topic). */
    indexed: boolean;
    /** Parameter name. */
    name: string;
    /** Solidity type, e.g. `address` or `uint256`. */
    type: string;
};

/** One function, event, constructor or error of a contract ABI. */
export type SmartContractAbiEntry = {
    /** Whether an event is anonymous. */
    anonymous: boolean;
    /** Legacy flag: the function does not modify state. */
    constant: boolean;
    /** Function or event name. */
    name: string;
    /** Inputs. */
    inputs: SmartContractAbiParam[];
    /** Outputs. */
    outputs: SmartContractAbiParam[];
    /** Kind of entry. */
    type: 'UnknownEntryType' | 'Constructor' | 'Function' | 'Event' | 'Fallback' | 'Receive' | 'Error';
    /** Legacy flag: the function accepts TRX. */
    payable: boolean;
    /** State mutability. */
    stateMutability: 'UnknownMutabilityType' | 'Pure' | 'View' | 'Nonpayable' | 'Payable';
};

/** A deployed contract (`SmartContract`), returned by `getContract`. */
export type SmartContract = {
    /** Deployer (base58). */
    origin_address: string;
    /** Contract address (base58); empty when no contract lives at the address asked for. */
    contract_address: string;
    /** The ABI stored on chain; `null` when it was never set or has been cleared. */
    abi: { entrys: SmartContractAbiEntry[] } | null;
    /** Creation bytecode (hex). */
    bytecode: string;
    /** TRX sent on deployment, in sun, as an exact integer string. */
    call_value: string;
    /** Percent of energy the caller pays (0-100), as an exact integer string; the deployer pays the rest. */
    consume_user_resource_percent: string;
    /** Contract name. */
    name: string;
    /** Most energy the deployer pays per call, as an exact integer string. */
    origin_energy_limit: string;
    /** Hash of the runtime code (hex). */
    code_hash: string;
    /** Id of the transaction that created it (hex); empty for older contracts. */
    trx_hash: string;
    /** Contract version (0 or 1). */
    version: number;
};

/** Dynamic energy model state of a contract (`ContractState`). */
export type ContractState = {
    /** Energy the contract consumed in the current cycle, as an exact integer string. */
    energy_usage: string;
    /** Extra energy charged per call, in 1/10000ths, as an exact integer string. */
    energy_factor: string;
    /** Maintenance cycle the state was last updated in, as an exact integer string. */
    update_cycle: string;
};

/** A contract with its runtime code and energy state (`getContractInfo`). */
export type SmartContractDataWrapper = {
    /** The contract; `null` when no contract lives at the address. */
    smart_contract: SmartContract | null;
    /** Runtime bytecode (hex). */
    runtimecode: string;
    /** Dynamic energy model state. */
    contract_state: ContractState | null;
};

// -- TRC10 assets ------------------------------------------------------------

/** A TRC10 asset (`AssetIssueContract`). */
export type AssetIssueContract = {
    /** Asset id, e.g. `1002000`. */
    id: string;
    /** Issuer (base58). */
    owner_address: string;
    /** Asset name as UTF-8 bytes (hex). */
    name: string;
    /** Abbreviation as UTF-8 bytes (hex). */
    abbr: string;
    /** Total supply in base units, as an exact integer string. */
    total_supply: string;
    /** Supply frozen at issuance. */
    frozen_supply: {
        /** Amount frozen in base units, as an exact integer string. */
        frozen_amount: string;
        /** Days it stays frozen after the sale starts, as an exact integer string. */
        frozen_days: string;
    }[];
    /** Sale price: `num` base units cost `trx_num` sun. */
    trx_num: number;
    /** Decimals. */
    precision: number;
    /** Sale price: `num` base units cost `trx_num` sun. */
    num: number;
    /** Sale start (ms epoch), as an exact integer string. */
    start_time: string;
    /** Sale end (ms epoch), as an exact integer string. */
    end_time: string;
    /** Unused by java-tron; `'0'`. */
    order: string;
    /** Unused by java-tron; `0`. */
    vote_score: number;
    /** Description as UTF-8 bytes (hex). */
    description: string;
    /** Project URL as UTF-8 bytes (hex). */
    url: string;
    /** Free bandwidth each holder may use per day, as an exact integer string. */
    free_asset_net_limit: string;
    /** Free bandwidth all holders may use per day, as an exact integer string. */
    public_free_asset_net_limit: string;
    /** Free bandwidth holders have used, as an exact integer string. */
    public_free_asset_net_usage: string;
    /** When holders last used free bandwidth, as an exact integer string. */
    public_latest_free_net_time: string;
};

/** TRC10 assets. */
export type AssetIssueList = {
    /** The assets; empty when none match. */
    assetIssue: AssetIssueContract[];
};

// -- Governance: proposals, exchanges, market --------------------------------

/** A network parameter proposal (`Proposal`). */
export type Proposal = {
    /** Proposal id, as an exact integer string. */
    proposal_id: string;
    /** Super representative that proposed it (base58). */
    proposer_address: string;
    /**
     * Proposed values, keyed by chain parameter id.
     *
     * The keys are not readable as returned: the decoder leaves each 64-bit key
     * as an 8-character string holding the id's little-endian bytes, so parameter
     * 9 arrives as `'\t\0\0\0\0\0\0\0'`. Recover the id with
     * `Buffer.from(key, 'latin1').readBigInt64LE()`. Values are exact integer strings.
     */
    parameters: Record<string, string>;
    /** When voting ends (ms epoch), as an exact integer string. */
    expiration_time: string;
    /** When it was created (ms epoch), as an exact integer string. */
    create_time: string;
    /** Super representatives that approved it (base58). */
    approvals: string[];
    /** Current state. */
    state: 'PENDING' | 'DISAPPROVED' | 'APPROVED' | 'CANCELED';
};

/** Proposals (`listProposals`, `getPaginatedProposalList`). */
export type ProposalList = {
    /** The proposals. `listProposals` returns them newest first. */
    proposals: Proposal[];
};

/** A Bancor exchange pair (`Exchange`). */
export type Exchange = {
    /** Exchange id, as an exact integer string. */
    exchange_id: string;
    /** Creator (base58). */
    creator_address: string;
    /** When it was created (ms epoch), as an exact integer string. */
    create_time: string;
    /** First token: a TRC10 id as UTF-8 bytes (hex), or `5f` (`_`) for TRX. */
    first_token_id: string;
    /** Balance of the first token, as an exact integer string. */
    first_token_balance: string;
    /** Second token: a TRC10 id as UTF-8 bytes (hex), or `5f` (`_`) for TRX. */
    second_token_id: string;
    /** Balance of the second token, as an exact integer string. */
    second_token_balance: string;
};

/** Exchanges (`listExchanges`, `getPaginatedExchangeList`). */
export type ExchangeList = {
    /** The exchange pairs. */
    exchanges: Exchange[];
};

/** An order on the on-chain market (`MarketOrder`). */
export type MarketOrder = {
    /** Order id (hex). */
    order_id: string;
    /** Account that placed it (base58). */
    owner_address: string;
    /** When it was placed (ms epoch), as an exact integer string. */
    create_time: string;
    /** Token sold: a TRC10 id as UTF-8 bytes (hex), or `5f` (`_`) for TRX. */
    sell_token_id: string;
    /** Quantity offered, as an exact integer string. */
    sell_token_quantity: string;
    /** Token bought: a TRC10 id as UTF-8 bytes (hex), or `5f` (`_`) for TRX. */
    buy_token_id: string;
    /** Least quantity to receive for the whole order, as an exact integer string. */
    buy_token_quantity: string;
    /** Quantity still unsold, as an exact integer string. */
    sell_token_quantity_remain: string;
    /** Quantity returned to the owner when the order closed, as an exact integer string. */
    sell_token_quantity_return: string;
    /** Order state. */
    state: 'ACTIVE' | 'INACTIVE' | 'CANCELED';
    /** Previous order at the same price (hex order id). */
    prev: string;
    /** Next order at the same price (hex order id). */
    next: string;
};

/** Market orders (`getMarketOrderByAccount`, `getMarketOrderListByPair`). */
export type MarketOrderList = {
    /** The orders. */
    orders: MarketOrder[];
};

/** A price level of a market pair. */
export type MarketPrice = {
    /** Sell-side quantity of the ratio, as an exact integer string. */
    sell_token_quantity: string;
    /** Buy-side quantity of the ratio, as an exact integer string. */
    buy_token_quantity: string;
};

/** The price levels of a market pair (`getMarketPriceByPair`). */
export type MarketPriceList = {
    /** Token sold: a TRC10 id as UTF-8 bytes (hex), or `5f` (`_`) for TRX. */
    sell_token_id: string;
    /** Token bought: a TRC10 id as UTF-8 bytes (hex), or `5f` (`_`) for TRX. */
    buy_token_id: string;
    /** Price levels. */
    prices: MarketPrice[];
};

/** The token pairs with open market orders (`getMarketPairList`). */
export type MarketOrderPairList = {
    /** The pairs. */
    orderPair: {
        /** Token sold: a TRC10 id as UTF-8 bytes (hex), or `5f` (`_`) for TRX. */
        sell_token_id: string;
        /** Token bought: a TRC10 id as UTF-8 bytes (hex), or `5f` (`_`) for TRX. */
        buy_token_id: string;
    }[];
};

// -- Chain / node ------------------------------------------------------------

/** One chain parameter. */
export type ChainParameter = {
    /** Parameter name, e.g. `getEnergyFee`. */
    key: string;
    /** Current value, as an exact integer string. */
    value: string;
};

/** The chain's governance parameters (`getChainParameters`). */
export type ChainParameters = {
    /** Every parameter the node knows, in the node's own order. */
    chainParameter: ChainParameter[];
};

/** Peers the node has discovered (`listNodes`). */
export type NodeList = {
    /** The peers. */
    nodes: {
        /** Where the peer listens. */
        address: {
            /** IP address as ASCII bytes (hex): `Buffer.from(host, 'hex').toString()`. */
            host: string;
            /** P2P port. */
            port: number;
        } | null;
    }[];
};

/** A peer the node is connected to (`NodeInfo.PeerInfo`). */
export type NodePeerInfo = {
    /** Last block synced from the peer, as `Num:<height>,ID:<hash>`. */
    lastSyncBlock: string;
    /** Blocks left to sync from the peer, as an exact integer string. */
    remainNum: string;
    /** When the peer last announced a block (ms epoch), as an exact integer string. */
    lastBlockUpdateTime: string;
    /** Whether a sync with the peer is in progress. */
    syncFlag: boolean;
    /** Timestamp of the newest block both sides have, as an exact integer string. */
    headBlockTimeWeBothHave: string;
    /** Whether this node needs blocks from the peer. */
    needSyncFromPeer: boolean;
    /** Whether the peer needs blocks from this node. */
    needSyncFromUs: boolean;
    /** Peer IP. */
    host: string;
    /** Peer P2P port. */
    port: number;
    /** Peer node id (hex string). */
    nodeId: string;
    /** When the connection was made (ms epoch), as an exact integer string. */
    connectTime: string;
    /** Average latency in ms. */
    avgLatency: number;
    /** Blocks queued to fetch from the peer. */
    syncToFetchSize: number;
    /** Height of the first queued block (`'-1'` when none), as an exact integer string. */
    syncToFetchSizePeekNum: string;
    /** Blocks requested from the peer and not yet received. */
    syncBlockRequestedSize: number;
    /** Blocks of the sync not yet fetched, as an exact integer string. */
    unFetchSynNum: string;
    /** Blocks from the peer being processed. The proto spells it `Porc`. */
    blockInPorcSize: number;
    /** Newest block both sides have, as `Num:<height>,ID:<hash>`. */
    headBlockWeBothHave: string;
    /** Whether this node dialed the peer (rather than the reverse). */
    isActive: boolean;
    /** Peer reputation score. */
    score: number;
    /** Nodes the peer knows. */
    nodeCount: number;
    /** Bytes received from the peer, as an exact integer string. */
    inFlow: string;
    /** Times the connection has dropped. */
    disconnectTimes: number;
    /** Why this node last disconnected the peer. */
    localDisconnectReason: string;
    /** Why the peer last disconnected this node. */
    remoteDisconnectReason: string;
};

/** The node's configuration (`NodeInfo.ConfigNodeInfo`). */
export type NodeConfigInfo = {
    /** java-tron version, e.g. `4.8.0`. */
    codeVersion: string;
    /** P2P network id. */
    p2pVersion: string;
    /** P2P listen port. */
    listenPort: number;
    /** Whether node discovery is on. */
    discoverEnable: boolean;
    /** Configured active peers. */
    activeNodeSize: number;
    /** Configured passive peers. */
    passiveNodeSize: number;
    /** Configured seed nodes. */
    sendNodeSize: number;
    /** Most connections allowed. */
    maxConnectCount: number;
    /** Most connections allowed from one IP. */
    sameIpMaxConnectCount: number;
    /** Backup (HA) listen port. */
    backupListenPort: number;
    /** Members of the backup group. */
    backupMemberSize: number;
    /** Priority within the backup group. */
    backupPriority: number;
    /** Database version. */
    dbVersion: number;
    /** Least SR participation rate (percent) at which the node produces blocks. */
    minParticipationRate: number;
    /** Whether constant contract calls are served. */
    supportConstant: boolean;
    /** Lower bound of the VM time ratio. */
    minTimeRatio: number;
    /** Upper bound of the VM time ratio. */
    maxTimeRatio: number;
    /** Node config override of the same-named chain parameter, as an exact integer string. */
    allowCreationOfContracts: string;
    /** Node config override of the same-named chain parameter, as an exact integer string. */
    allowAdaptiveEnergy: string;
};

/** The node's host machine (`NodeInfo.MachineInfo`). */
export type NodeMachineInfo = {
    /** Live JVM threads. */
    threadCount: number;
    /** Deadlocked JVM threads. */
    deadLockThreadCount: number;
    /** CPU cores. */
    cpuCount: number;
    /** Physical memory in bytes, as an exact integer string. */
    totalMemory: string;
    /** Free physical memory in bytes, as an exact integer string. */
    freeMemory: string;
    /** System CPU load, 0-1. */
    cpuRate: number;
    /** Java version. */
    javaVersion: string;
    /** Operating system name and version. */
    osName: string;
    /** JVM heap size in bytes, as an exact integer string. */
    jvmTotalMemory: string;
    /** Free JVM heap in bytes, as an exact integer string. */
    jvmFreeMemory: string;
    /** CPU load of the node process, 0-1. */
    processCpuRate: number;
    /** JVM memory pools. */
    memoryDescInfoList: {
        /** Pool name. */
        name: string;
        /** Initial size in bytes, as an exact integer string. */
        initSize: string;
        /** Used size in bytes, as an exact integer string. */
        useSize: string;
        /** Maximum size in bytes, as an exact integer string. */
        maxSize: string;
        /** Fraction in use, 0-1. */
        useRate: number;
    }[];
    /** Deadlocked threads, if any. */
    deadLockThreadInfoList: {
        /** Thread name. */
        name: string;
        /** Lock it waits for. */
        lockName: string;
        /** Thread holding that lock. */
        lockOwner: string;
        /** Thread state. */
        state: string;
        /** Time blocked in ms, as an exact integer string. */
        blockTime: string;
        /** Time waited in ms, as an exact integer string. */
        waitTime: string;
        /** Stack trace. */
        stackTrace: string;
    }[];
};

/** The connected node's status (`getNodeInfo`). Public gateways may answer for any node behind them. */
export type NodeInfo = {
    /** Height the node started syncing from, as an exact integer string. */
    beginSyncNum: string;
    /** Head block, as `Num:<height>,ID:<hash>`. */
    block: string;
    /** Latest solidified block, as `Num:<height>,ID:<hash>`. */
    solidityBlock: string;
    /** Current connections. */
    currentConnectCount: number;
    /** Connections this node dialed. */
    activeConnectCount: number;
    /** Connections peers dialed. */
    passiveConnectCount: number;
    /** Bytes received from peers, as an exact integer string. */
    totalFlow: string;
    /** Connected peers. */
    peerInfoList: NodePeerInfo[];
    /** Node configuration. */
    configNodeInfo: NodeConfigInfo | null;
    /** Host machine. */
    machineInfo: NodeMachineInfo | null;
    /** Witnesses caught producing conflicting blocks, by address. */
    cheatWitnessInfoMap: Record<string, string>;
};
