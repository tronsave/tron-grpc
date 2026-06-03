import { TronClientChain } from './chain';
import type { Raw } from './helpers';
import { hexToBytesSafe } from '../utils/hex';

/**
 * Shielded (zk-SNARK) transactions & shielded TRC20.
 *
 * These take/return the specialized shielded proto messages and are exposed as
 * readable passthroughs. See java-tron's shielded docs for the message shapes.
 */
export class TronClientShielded extends TronClientChain {
    /** Build a shielded transaction (`CreateShieldedTransaction`). */
    async createShieldedTransaction(params: Raw): Promise<Raw> {
        return this.buildExtention('CreateShieldedTransaction', params);
    }

    /** Build a shielded transaction without spend-auth signature. */
    async createShieldedTransactionWithoutSpendAuthSig(params: Raw): Promise<Raw> {
        return this.buildExtention('CreateShieldedTransactionWithoutSpendAuthSig', params);
    }

    /** Get the incremental Merkle voucher info for output points. */
    async getMerkleTreeVoucherInfo(params: Raw): Promise<Raw> {
        return this.query('GetMerkleTreeVoucherInfo', params);
    }

    /** Scan notes by incoming viewing key. */
    async scanNoteByIvk(params: Raw): Promise<Raw> {
        return this.query('ScanNoteByIvk', params);
    }

    /** Scan and mark notes by incoming viewing key. */
    async scanAndMarkNoteByIvk(params: Raw): Promise<Raw> {
        return this.query('ScanAndMarkNoteByIvk', params);
    }

    /** Scan notes by outgoing viewing key. */
    async scanNoteByOvk(params: Raw): Promise<Raw> {
        return this.query('ScanNoteByOvk', params);
    }

    /** Generate a new shielded spending key. */
    async getSpendingKey(): Promise<Raw> {
        return this.query('GetSpendingKey', {});
    }

    /** Expand a spending key. */
    async getExpandedSpendingKey(spendingKey: string): Promise<Raw> {
        return this.query('GetExpandedSpendingKey', { value: hexToBytesSafe(spendingKey) });
    }

    /** Derive ak from ask. */
    async getAkFromAsk(ask: string): Promise<Raw> {
        return this.query('GetAkFromAsk', { value: hexToBytesSafe(ask) });
    }

    /** Derive nk from nsk. */
    async getNkFromNsk(nsk: string): Promise<Raw> {
        return this.query('GetNkFromNsk', { value: hexToBytesSafe(nsk) });
    }

    /** Derive the incoming viewing key from ak + nk. */
    async getIncomingViewingKey(params: Raw): Promise<Raw> {
        return this.query('GetIncomingViewingKey', params);
    }

    /** Generate a diversifier. */
    async getDiversifier(): Promise<Raw> {
        return this.query('GetDiversifier', {});
    }

    /** Generate a new shielded payment address. */
    async getNewShieldedAddress(): Promise<Raw> {
        return this.query('GetNewShieldedAddress', {});
    }

    /** Derive a zen payment address from ivk + diversifier. */
    async getZenPaymentAddress(params: Raw): Promise<Raw> {
        return this.query('GetZenPaymentAddress', params);
    }

    /** Generate a random commitment (rcm). */
    async getRcm(): Promise<Raw> {
        return this.query('GetRcm', {});
    }

    /** Check whether a note has been spent. */
    async isSpend(params: Raw): Promise<Raw> {
        return this.query('IsSpend', params);
    }

    /** Compute the hash of a shielded transaction. */
    async getShieldTransactionHash(transaction: Raw): Promise<Raw> {
        return this.query('GetShieldTransactionHash', transaction);
    }

    /** Create a spend-auth signature. */
    async createSpendAuthSig(params: Raw): Promise<Raw> {
        return this.query('CreateSpendAuthSig', params);
    }

    /** Create a shield nullifier. */
    async createShieldNullifier(params: Raw): Promise<Raw> {
        return this.query('CreateShieldNullifier', params);
    }

    /** Build shielded TRC20 contract parameters. */
    async createShieldedContractParameters(params: Raw): Promise<Raw> {
        return this.query('CreateShieldedContractParameters', params);
    }

    /** Build shielded TRC20 contract parameters without spend-auth signature. */
    async createShieldedContractParametersWithoutAsk(params: Raw): Promise<Raw> {
        return this.query('CreateShieldedContractParametersWithoutAsk', params);
    }

    /** Scan shielded TRC20 notes by incoming viewing key. */
    async scanShieldedTRC20NotesByIvk(params: Raw): Promise<Raw> {
        return this.query('ScanShieldedTRC20NotesByIvk', params);
    }

    /** Scan shielded TRC20 notes by outgoing viewing key. */
    async scanShieldedTRC20NotesByOvk(params: Raw): Promise<Raw> {
        return this.query('ScanShieldedTRC20NotesByOvk', params);
    }

    /** Check whether a shielded TRC20 note has been spent. */
    async isShieldedTRC20ContractNoteSpent(params: Raw): Promise<Raw> {
        return this.query('IsShieldedTRC20ContractNoteSpent', params);
    }

    /** Build the trigger input for a shielded TRC20 contract call. */
    async getTriggerInputForShieldedTRC20Contract(params: Raw): Promise<Raw> {
        return this.query('GetTriggerInputForShieldedTRC20Contract', params);
    }
}
