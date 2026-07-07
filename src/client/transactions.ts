import { TronClientAccounts } from './accounts';
import { decodeReturnMessage, type Raw } from './helpers';
import { toAddressBytes, toBase58Address } from '../utils/address';
import { hexToBytesSafe } from '../utils/hex';
import { trxToSun, type DecimalLike } from '../utils/units';
import { privateKeyToAddress, signTransactionId } from '../utils/crypto';
import { bytesToHexField, decodeTransaction, decodeTransactionInfo } from '../codecs/decode';
import type { BroadcastResult, SendTrxParams, TransactionInfoResult, TransactionResult } from '../types';

/** Transaction reads + the create -> sign -> broadcast flow. */
export class TronClientTransactions extends TronClientAccounts {
    /** Get a transaction by id (hex). */
    async getTransactionById(txid: string): Promise<TransactionResult> {
        const clean = txid.replace(/^0x/i, '');
        const res = await this.request<Raw>('GetTransactionById', { value: hexToBytesSafe(clean) });
        return decodeTransaction(res, clean.toLowerCase());
    }

    /** Get a transaction receipt by id (hex). */
    async getTransactionInfoById(txid: string): Promise<TransactionInfoResult> {
        const clean = txid.replace(/^0x/i, '');
        const res = await this.request<Raw>('GetTransactionInfoById', { value: hexToBytesSafe(clean) });
        return decodeTransactionInfo(res);
    }

    /** Get all transaction receipts in a block. */
    async getTransactionInfoByBlockNum(blockNumber: number): Promise<Raw> {
        return this.query('GetTransactionInfoByBlockNum', { num: blockNumber });
    }

    /** Compute the cumulative signature weight of a (partially) signed tx. */
    async getTransactionSignWeight(signedTransaction: Raw): Promise<Raw> {
        return this.query('GetTransactionSignWeight', signedTransaction);
    }

    /** List the addresses that have approved a (multi-sig) transaction. */
    async getTransactionApprovedList(signedTransaction: Raw): Promise<Raw> {
        return this.query('GetTransactionApprovedList', signedTransaction);
    }

    /** Fetch a still-pending transaction by id (hex). */
    async getTransactionFromPending(txid: string): Promise<Raw> {
        return this.query('GetTransactionFromPending', { value: hexToBytesSafe(txid) });
    }

    /** List ids of all pending transactions. */
    async getTransactionListFromPending(): Promise<Raw> {
        return this.query('GetTransactionListFromPending', {});
    }

    /** Number of transactions in the pending pool. */
    async getPendingSize(): Promise<Raw> {
        return this.query('GetPendingSize', {});
    }

    /** Wrap an existing raw transaction into a TransactionExtention. */
    async createCommonTransaction(transaction: Raw): Promise<Raw> {
        return this.buildExtention('CreateCommonTransaction', transaction);
    }

    /**
     * Build an unsigned TRX transfer (`CreateTransaction2`). Returns the node's
     * `TransactionExtention` (raw passthrough) containing `transaction` + `txid`.
     */
    async createTransaction(from: string, to: string, amountTrx: DecimalLike): Promise<Raw> {
        const sun = trxToSun(amountTrx);
        if (sun <= 0n) throw new Error('Transfer amount must be positive');
        return this.buildExtention('CreateTransaction2', {
            owner_address: toAddressBytes(from),
            to_address: toAddressBytes(to),
            amount: sun.toString(),
        });
    }

    /**
     * Attach a signature to a node-built TransactionExtention and broadcast it.
     * The node-built `raw_data` is re-broadcast verbatim, so the signed `txid`
     * stays valid (matches java-tron's serialization exactly).
     */
    async signAndBroadcast(extention: Raw, privateKey: string): Promise<BroadcastResult> {
        const transaction = extention.transaction as Raw | undefined;
        if (!transaction) throw new Error('TransactionExtention has no transaction to sign');
        const txid = bytesToHexField(extention.txid);
        const signature = signTransactionId(txid, privateKey);
        transaction.signature = [hexToBytesSafe(signature)];

        const ret = await this.request<Raw>('BroadcastTransaction', transaction);
        const success = ret.result === true;
        const code = ret.code != null ? String(ret.code) : undefined;
        const message = decodeReturnMessage(ret.message) || undefined;
        if (!success) {
            const detail = code ? ` (${code})` : '';
            this.log.error(`✗ BroadcastTransaction failed${detail}: ${message || 'no message'}`);
        }
        return { txid, success, code, message };
    }

    /**
     * High-level TRX transfer: create -> sign with `privateKey` -> broadcast.
     * `amount` is in TRX (decimal). Returns the txid and broadcast outcome.
     */
    async sendTrx(params: SendTrxParams): Promise<BroadcastResult> {
        const from = params.from ? toBase58Address(params.from) : privateKeyToAddress(params.privateKey);
        const to = toBase58Address(params.to);
        const extention = await this.createTransaction(from, to, params.amount);
        return this.signAndBroadcast(extention, params.privateKey);
    }
}
