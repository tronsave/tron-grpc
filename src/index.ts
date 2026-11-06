/**
 * tron-grpc — a fully-typed TRON gRPC client.
 *
 * Public entry point. Re-exports the client, types, network config, and the
 * address / unit / crypto / ABI utilities.
 */
export { TronGrpcClient } from './client';
export type { CallOptions, TronClientOptions, TronService, TronSolidityClient } from './client';
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
    ExternalSigner,
    KeyInput,
    KeyType,
    PermissionInput,
    PqSignature,
    ReturnResult,
    SendTrc20Params,
    SendTrxParams,
    SigningKey,
    TronPqKey,
    TransactionInfoResult,
    TransactionLog,
    TransactionOptions,
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

// Response shapes of the read / builder methods (proto messages, normalized)
export type {
    Account,
    AccountBalanceResponse,
    AccountFrozen,
    AccountNetMessage,
    AccountResourceDetail,
    AccountVote,
    AssetIssueContract,
    AssetIssueList,
    Block,
    BlockBalanceTrace,
    BlockExtention,
    BlockHeader,
    BlockHeaderRawData,
    BlockIdentifier,
    BlockListExtention,
    CanDelegatedMaxSizeResponseMessage,
    CanWithdrawUnfreezeAmountResponseMessage,
    ChainParameter,
    ChainParameters,
    ContractParameter,
    ContractResult,
    ContractState,
    ContractType,
    DelegatedResource,
    DelegatedResourceAccountIndex,
    DelegatedResourceList,
    EventLog,
    Exchange,
    ExchangeList,
    GetAvailableUnfreezeCountResponseMessage,
    InternalTransaction,
    MarketOrder,
    MarketOrderDetail,
    MarketOrderList,
    MarketOrderPairList,
    MarketPrice,
    MarketPriceList,
    NodeConfigInfo,
    NodeInfo,
    NodeList,
    NodeMachineInfo,
    NodePeerInfo,
    NodeReturn,
    NumberMessage,
    Permission,
    PermissionKey,
    PermissionType,
    PqAuthSig,
    PqSchemeName,
    PricesResponseMessage,
    Proposal,
    ProposalList,
    ResourceReceipt,
    ReturnCode,
    SmartContract,
    SmartContractAbiEntry,
    SmartContractAbiParam,
    SmartContractDataWrapper,
    Transaction,
    TransactionApprovedList,
    TransactionAuthority,
    TransactionBalanceTrace,
    TransactionContract,
    TransactionExtention,
    TransactionIdList,
    TransactionInfo,
    TransactionInfoList,
    TransactionRawData,
    TransactionResultCode,
    TransactionRet,
    TransactionSignWeight,
    UnsignedTransactionExtention,
    Witness,
    WitnessList,
} from './types/responses';

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

// HD wallet primitives (BIP-39 seed, BIP-32 private derivation) and base58
export { derivePrivateKey, mnemonicToSeed } from './utils/hd';
export { base58Decode, base58Encode } from './utils/base58';

// Transaction verification (ECDSA + post-quantum, auto-dispatched)
export { computeTxid, verifyTransaction } from './utils/verify';
export { applyTransactionOptions, assertBuiltTransaction, checkedTxid } from './utils/transaction';
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
