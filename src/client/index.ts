import { TRON_NETWORKS, type TronNetwork } from '../network';
import { TronClientShielded } from './shielded';
import { type TronClientOptions } from './core';

export { type TronClientOptions, type CallOptions, type TronService } from './core';

/**
 * Typed client for the TRON gRPC `Wallet` service.
 *
 * Every public method accepts ordinary inputs — base58/hex addresses and decimal
 * TRX amounts — and returns decoded, readable values (base58 addresses, numeric
 * strings). All byte packing/unpacking is hidden inside the library.
 *
 * The implementation is split across feature mixins (see `src/client/*.ts`),
 * composed here through a single inheritance chain:
 * core → blocks → accounts → transactions → contracts → resources → witnesses →
 * assets → governance → chain → shielded → `TronGrpcClient`.
 */
export class TronGrpcClient extends TronClientShielded {
    /** Construct a client for a named network (mainnet/nile/shasta). */
    static fromNetwork(network: TronNetwork = 'mainnet', options: TronClientOptions = {}): TronGrpcClient {
        return new TronGrpcClient(TRON_NETWORKS[network].grpcHost, options);
    }

    /**
     * Construct a client for a network's `WalletSolidity` service, which answers
     * from **solidified** state — blocks confirmed by 2/3 of the SRs, which can no
     * longer be reorganized. Use it to decide a deposit is final.
     *
     * The same read methods apply (`getAccount`, `getNowBlock`, `getBlockByNum`,
     * `getTransactionById`, `getTransactionInfoById`, `triggerConstantContract`,
     * `getTrc20Balance`, delegation / asset / market reads…). The service has no
     * builders or broadcast: those methods reject with `Unknown WalletSolidity RPC
     * method`.
     */
    static solidity(network: TronNetwork = 'mainnet', options: TronClientOptions = {}): TronSolidityClient {
        return new TronGrpcClient(TRON_NETWORKS[network].solidityGrpcHost, { ...options, service: 'WalletSolidity' });
    }
}

/** Methods of {@link TronGrpcClient} that the `WalletSolidity` service implements. */
export type TronSolidityClient = Pick<
    TronGrpcClient,
    | 'request'
    | 'withCallOptions'
    | 'isReady'
    | 'close'
    | 'getAccount'
    | 'getBalance'
    | 'getAccountById'
    | 'getRewardInfo'
    | 'getBrokerageInfo'
    | 'getNowBlock'
    | 'getBlockByNum'
    | 'getBlock'
    | 'getTransactionCountByBlockNum'
    | 'getTransactionById'
    | 'verifyTransactionById'
    | 'getTransactionInfoById'
    | 'getTransactionInfoByBlockNum'
    | 'triggerConstantContract'
    | 'estimateEnergy'
    | 'getTrc20Balance'
    | 'getDelegatedResource'
    | 'getDelegatedResourceV2'
    | 'getDelegatedResourceAccountIndex'
    | 'getDelegatedResourceAccountIndexV2'
    | 'getCanDelegatedMaxSize'
    | 'getAvailableUnfreezeCount'
    | 'getCanWithdrawUnfreezeAmount'
    | 'listWitnesses'
    | 'getPaginatedNowWitnessList'
    | 'getAssetIssueList'
    | 'getPaginatedAssetIssueList'
    | 'getAssetIssueByName'
    | 'getAssetIssueListByName'
    | 'getAssetIssueById'
    | 'getExchangeById'
    | 'listExchanges'
    | 'getMarketOrderById'
    | 'getMarketOrderByAccount'
    | 'getMarketPriceByPair'
    | 'getMarketOrderListByPair'
    | 'getMarketPairList'
    | 'getBurnTrx'
    | 'getBandwidthPrices'
    | 'getEnergyPrices'
    | 'getMerkleTreeVoucherInfo'
    | 'scanNoteByIvk'
    | 'scanAndMarkNoteByIvk'
    | 'scanNoteByOvk'
    | 'isSpend'
    | 'scanShieldedTRC20NotesByIvk'
    | 'scanShieldedTRC20NotesByOvk'
    | 'isShieldedTRC20ContractNoteSpent'
>;
