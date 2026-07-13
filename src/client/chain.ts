import { TronClientGovernance } from './governance';
import { parsePqCapabilities, type PqCapabilities, type Raw } from './helpers';

/** Node + chain info reads. */
export class TronClientChain extends TronClientGovernance {
    /** Raw chain parameters (normalized, bytes-free). */
    async getChainParameters(): Promise<Raw> {
        return this.query('GetChainParameters', {});
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
    async listNodes(): Promise<Raw> {
        return this.query('ListNodes', {});
    }

    /** Info about the connected node. */
    async getNodeInfo(): Promise<Raw> {
        return this.query('GetNodeInfo', {});
    }

    /** Total number of transactions ever processed. */
    async totalTransaction(): Promise<Raw> {
        return this.query('TotalTransaction', {});
    }

    /** Timestamp (ms) of the next maintenance / vote-counting cycle. */
    async getNextMaintenanceTime(): Promise<Raw> {
        return this.query('GetNextMaintenanceTime', {});
    }

    /** Total TRX burned (sun). */
    async getBurnTrx(): Promise<Raw> {
        return this.query('GetBurnTrx', {});
    }

    /** Historical bandwidth prices. */
    async getBandwidthPrices(): Promise<Raw> {
        return this.query('GetBandwidthPrices', {});
    }

    /** Historical energy prices. */
    async getEnergyPrices(): Promise<Raw> {
        return this.query('GetEnergyPrices', {});
    }

    /** Current memo fee schedule. */
    async getMemoFee(): Promise<Raw> {
        return this.query('GetMemoFee', {});
    }
}
