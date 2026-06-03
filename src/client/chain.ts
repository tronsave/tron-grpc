import { TronClientGovernance } from './governance';
import type { Raw } from './helpers';

/** Node + chain info reads. */
export class TronClientChain extends TronClientGovernance {
    /** Raw chain parameters (normalized, bytes-free). */
    async getChainParameters(): Promise<Raw> {
        return this.query('GetChainParameters', {});
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
