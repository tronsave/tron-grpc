import { TronClientGovernance } from './governance';
import { parsePqCapabilities, type PqCapabilities } from './helpers';
import type { ChainParameters, NodeInfo, NodeList, NumberMessage, PricesResponseMessage } from '../types/responses';

/** Node + chain info reads. */
export class TronClientChain extends TronClientGovernance {
    /** The chain's governance parameters, as `{ key, value }` pairs. */
    async getChainParameters(): Promise<ChainParameters> {
        return this.query<ChainParameters>('GetChainParameters', {});
    }

    /**
     * Which TIP-899 post-quantum schemes the connected chain accepts.
     *
     * PQ signatures are gated by the `ALLOW_FN_DSA_512` (1000) and
     * `ALLOW_ML_DSA_44` (1001) proposals — a node rejects a PQ transaction until
     * the matching one is active. Enabled on Nile; not yet on mainnet, where
     * both flags read `false`.
     */
    async getPqCapabilities(): Promise<PqCapabilities> {
        return parsePqCapabilities(await this.getChainParameters());
    }

    /** List peer nodes known to the connected node. */
    async listNodes(): Promise<NodeList> {
        return this.query<NodeList>('ListNodes', {});
    }

    /** Info about the connected node. */
    async getNodeInfo(): Promise<NodeInfo> {
        return this.query<NodeInfo>('GetNodeInfo', {});
    }

    /** Total number of transactions ever processed. */
    async totalTransaction(): Promise<NumberMessage> {
        return this.query<NumberMessage>('TotalTransaction', {});
    }

    /** Timestamp (ms) of the next maintenance / vote-counting cycle. */
    async getNextMaintenanceTime(): Promise<NumberMessage> {
        return this.query<NumberMessage>('GetNextMaintenanceTime', {});
    }

    /** Total TRX burned (sun). */
    async getBurnTrx(): Promise<NumberMessage> {
        return this.query<NumberMessage>('GetBurnTrx', {});
    }

    /** Historical bandwidth prices. */
    async getBandwidthPrices(): Promise<PricesResponseMessage> {
        return this.query<PricesResponseMessage>('GetBandwidthPrices', {});
    }

    /** Historical energy prices. */
    async getEnergyPrices(): Promise<PricesResponseMessage> {
        return this.query<PricesResponseMessage>('GetEnergyPrices', {});
    }

    /** Current memo fee schedule. */
    async getMemoFee(): Promise<PricesResponseMessage> {
        return this.query<PricesResponseMessage>('GetMemoFee', {});
    }
}
