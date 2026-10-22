import { TronClientAccounts } from './accounts';
import { decodeReturnMessage, parsePqCapabilities, type Raw } from './helpers';
import { toAddressBytes, toBase58Address } from '../utils/address';
import { hexToBytesSafe } from '../utils/hex';
import { trxToSun, type DecimalLike } from '../utils/units';
import { getSigner } from '../utils/signer';
import { verifyTransaction, type TransactionVerification } from '../utils/verify';
import { bytesToHexField, decodeTransaction, decodeTransactionInfo } from '../codecs/decode';
import type {
    BroadcastResult,
    KeyType,
    SendTrxParams,
    SigningKey,
    TransactionInfoResult,
    TransactionResult,
} from '../types';

/** Transaction reads + the create -> sign -> broadcast flow. */
export class TronClientTransactions extends TronClientAccounts {
    /** PQ schemes seen active, latched so each check costs one RPC at most. */
    private readonly pqEnabled = new Set<KeyType>();

    /**
     * Refuse to sign with a post-quantum key on a chain that would reject it.
     *
     * Each TIP-899 scheme is activated by its own proposal (`ALLOW_FN_DSA_512`,
     * `ALLOW_ML_DSA_44`). Until then a node either ignores `pq_auth_sig` as an
     * unknown field and rejects the transaction as unsigned, or rejects it
     * outright. Failing here — before the broadcast — turns that into an
     * actionable error.
     *
     * Only the PQ path pays for this; ECDSA signing issues no extra call. The
     * result is cached only when enabled, so a client that outlives an
     * activation vote still picks it up.
     */
    private async assertPqSchemeEnabled(keyType: KeyType): Promise<void> {
        if (keyType === 'ECDSA' || this.pqEnabled.has(keyType)) return;
        const caps = parsePqCapabilities(await this.query('GetChainParameters', {}));
        const [enabled, name] = keyType === 'ML_DSA_44' ? [caps.mlDsa44, 'ML-DSA-44'] : [caps.fnDsa512, 'FN-DSA-512'];
        if (!enabled) {
            throw new Error(
                `Refusing to sign: ${name} (TIP-899) is not active on this network, so a ` +
                    'post-quantum signature would be rejected. ' +
                    'Use an ECDSA private key here, or check client.getPqCapabilities() first.'
            );
        }
        this.pqEnabled.add(keyType);
    }

    /** Get a transaction by id (hex). */
    async getTransactionById(txid: string): Promise<TransactionResult> {
        const clean = txid.replace(/^0x/i, '');
        const res = await this.request<Raw>('GetTransactionById', { value: hexToBytesSafe(clean) });
        return decodeTransaction(res, clean.toLowerCase());
    }

    /**
     * Fetch a transaction and verify its signatures locally — ECDSA, post-quantum,
     * or a mix of both (TIP-899).
     *
     * Reports each signer and whether its signature is valid for the transaction's
     * txid. This is a cryptographic check, not an authorization one: it does not
     * verify that those signers satisfy the account's `Permission` threshold.
     */
    async verifyTransactionById(txid: string): Promise<TransactionVerification> {
        const clean = txid.replace(/^0x/i, '');
        const res = await this.request<Raw>('GetTransactionById', { value: hexToBytesSafe(clean) });
        if (!res.raw_data) throw new Error(`No transaction found for id ${clean}`);
        return verifyTransaction(res, clean);
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
     *
     * `key` may be an ECDSA private key (hex) or a post-quantum keypair; the
     * signer writes to `signature` or `pq_auth_sig` accordingly. Signing an
     * already-signed transaction appends, which is how a mixed ECDSA + PQ
     * multi-sig transaction accumulates weight (TIP-899).
     */
    async signAndBroadcast(extention: Raw, key: SigningKey): Promise<BroadcastResult> {
        const transaction = extention.transaction as Raw | undefined;
        if (!transaction) throw new Error('TransactionExtention has no transaction to sign');
        const signer = getSigner(key);
        await this.assertPqSchemeEnabled(signer.keyType);
        const txid = bytesToHexField(extention.txid);
        signer.signTransaction(transaction, txid);

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
        const signer = getSigner(params.privateKey);
        // Check the network before asking it to build anything, so an unusable PQ key
        // fails with "PQ not active here" rather than a confusing node-side error.
        await this.assertPqSchemeEnabled(signer.keyType);
        const from = params.from ? toBase58Address(params.from) : signer.address;
        const to = toBase58Address(params.to);
        const extention = await this.createTransaction(from, to, params.amount);
        return this.signAndBroadcast(extention, params.privateKey);
    }
}
