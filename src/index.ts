/**
 * tron-grpc — a fully-typed TRON gRPC client.
 *
 * Public entry point. Re-exports the client, types, network config, and the
 * address / unit / crypto / ABI utilities.
 */
export { TronGrpcClient } from './client';
export type { TronClientOptions } from './client';

export { TRON_NETWORKS } from './network';
export type { TronNetwork, TronNetworkConfig } from './network';

export type {
    AccountResources,
    BlockSummary,
    BlockTransaction,
    BroadcastResult,
    ConstantCallResult,
    CreateAssetIssueInput,
    DeployContractInput,
    EstimateEnergyResult,
    KeyInput,
    PermissionInput,
    ReturnResult,
    SendTrxParams,
    TransactionInfoResult,
    TransactionLog,
    TransactionResult,
    Trc20Balance,
    TriggerContractInput,
    TronAccount,
    TronAccountResource,
    TronAccountType,
    TronAccountVote,
    TronFrozen,
    TronFrozenV2,
    TronPermission,
    TronPermissionKey,
    TronResource,
    TronUnfrozenV2,
    VoteInput,
} from './types';

// Address utilities
export {
    base58ToBytes,
    bytesToBase58Address,
    decodeAddress,
    isAddress,
    toAddressBytes,
    toBase58Address,
    toHexAddress,
    TRON_ADDRESS_PREFIX,
} from './utils/address';

// Unit utilities
export {
    fromBaseUnits,
    sunToTrx,
    toBaseUnits,
    trxToSun,
    SUN_PER_TRX,
    TRX_DECIMALS,
} from './utils/units';
export type { DecimalLike } from './utils/units';

// Crypto utilities
export {
    fromMnemonic,
    privateKeyToAddress,
    privateKeyToAddressBytes,
    privateKeyToBytes,
    signDigest,
    signMessage,
    signTransactionId,
    TRON_MESSAGE_PREFIX,
} from './utils/crypto';

// Hex + ABI helpers
export { bytesToHex, hexToBytes, hexToBytesSafe, stripHexPrefix, toBytes, toHex } from './utils/hex';
export {
    decodeUint256,
    encodeAddressParam,
    encodeFunctionData,
    encodeUint256,
    functionSelector,
} from './codecs/abi';
