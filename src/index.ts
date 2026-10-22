/**
 * tron-grpc — a fully-typed TRON gRPC client.
 *
 * Public entry point. Re-exports the client, types, network config, and the
 * address / unit / crypto / ABI utilities.
 */
export { TronGrpcClient } from './client';
export type { TronClientOptions } from './client';
export type { LogLevel, Logger } from './logger';

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
    KeyType,
    PermissionInput,
    PqSignature,
    ReturnResult,
    SendTrxParams,
    SigningKey,
    TronPqKey,
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
    hashMessage,
    privateKeyToAddress,
    privateKeyToAddressBytes,
    privateKeyToBytes,
    recoverAddress,
    recoverAddressBytes,
    signDigest,
    signMessage,
    signTransactionId,
    verifyMessage,
    verifyTransactionId,
    TRON_MESSAGE_PREFIX,
} from './utils/crypto';

// Transaction verification (ECDSA + post-quantum, auto-dispatched)
export { computeTxid, verifyTransaction } from './utils/verify';
export type { TransactionSigner, TransactionVerification } from './utils/verify';

// Post-quantum signatures (TIP-899: FN-DSA-512 / Falcon-512, ML-DSA-44)
export {
    decodePqEnvelope,
    encodePqEnvelope,
    encodeVerifyFnDsa512Input,
    encodeVerifyMlDsa44Input,
    falconPrivateKeyToBytes,
    falconPrivateKeyToPublicKey,
    falconPublicKeyToAddress,
    falconPublicKeyToAddressBytes,
    falconPublicKeyToBytes,
    generateFalconKey,
    generateMlDsa44Key,
    isPqEnvelope,
    mlDsa44PrivateKeyToBytes,
    mlDsa44PrivateKeyToPublicKey,
    mlDsa44PublicKeyToAddress,
    mlDsa44PublicKeyToBytes,
    PQScheme,
    pqPublicKeyToAddress,
    pqPublicKeyToAddressBytes,
    signDigestFalcon,
    signDigestMlDsa44,
    signMessageMlDsa44,
    signMessagePQ,
    signTransactionIdFalcon,
    signTransactionIdMlDsa44,
    toPrecompileSignature,
    verifyDigestFalcon,
    verifyDigestMlDsa44,
    verifyDigestPQ,
    verifyMessagePQ,
    verifySignedMessage,
    FALCON_PRECOMPILE_SIGNATURE_BYTES,
    FALCON_PRIVATE_KEY_BYTES,
    FALCON_PUBLIC_KEY_BYTES,
    FALCON_SEED_BYTES,
    FALCON_SIGNATURE_HEADER,
    FALCON_SIGNATURE_MAX_BYTES,
    FALCON_SIGNATURE_MIN_BYTES,
    ML_DSA_44_PRIVATE_KEY_BYTES,
    ML_DSA_44_PUBLIC_KEY_BYTES,
    ML_DSA_44_SEED_BYTES,
    ML_DSA_44_SIGNATURE_BYTES,
    PQ_ENVELOPE_MAGIC,
    VERIFY_FN_DSA_512_PRECOMPILE,
    VERIFY_ML_DSA_44_PRECOMPILE,
} from './utils/pq';
export type { FalconKeyPair, MlDsa44KeyPair, PqEnvelope, PQSchemeValue } from './utils/pq';

// Signing strategies (ECDSA + post-quantum, selected by key type)
export { addressOf, EcdsaSigner, FalconSigner, getSigner, isPqKey, MlDsa44Signer, pqKeyType } from './utils/signer';
export type { Signer } from './utils/signer';

// Hex + ABI helpers
export { bytesToHex, hexToBytes, hexToBytesSafe, stripHexPrefix, toBytes, toHex } from './utils/hex';
export {
    decodeUint256,
    encodeAddressParam,
    encodeFunctionData,
    encodeUint256,
    functionSelector,
} from './codecs/abi';
