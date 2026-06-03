import { TRON_NETWORKS, type TronNetwork } from '../network';
import { TronClientShielded } from './shielded';
import { type TronClientOptions } from './core';

export { type TronClientOptions } from './core';

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
}
