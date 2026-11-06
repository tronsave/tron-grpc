import { TronClientAccounts } from './accounts';
import { decodeReturnMessage, parsePqCapabilities, type PqCapabilities, type Raw } from './helpers';
import { toAddressBytes, toBase58Address } from '../utils/address';
import { hexToBytesSafe } from '../utils/hex';
import { trxToSun, type DecimalLike } from '../utils/units';
import { getSigner } from '../utils/signer';
import { applyTransactionOptions, checkedTxid } from '../utils/transaction';
import { computeTxid, verifyTransaction, type TransactionVerification } from '../utils/verify';
import { decodeTransaction, decodeTransactionInfo } from '../codecs/decode';
import type {
    BroadcastResult,
    ExternalSigner,
    KeyType,
    SendTrxParams,
    SigningKey,
    TransactionInfoResult,
    TransactionOptions,
    TransactionResult,
} from '../types';
import type {
    NumberMessage,
    Transaction,
    TransactionApprovedList,
    TransactionIdList,
    TransactionInfoList,
    TransactionSignWeight,
    UnsignedTransactionExtention,
} from '../types/responses';

const transactionOf = (extention: Raw): Raw => {
    const transaction = extention.transaction as Raw | undefined;
    if (!transaction) throw new Error('TransactionExtention has no transaction to sign');
    return transaction;
};

const isExternalSigner = (key: SigningKey | ExternalSigner): key is ExternalSigner =>
    typeof key === 'object' && key !== null && typeof (key as ExternalSigner).signTransaction === 'function';

/** A key becomes its built-in signer; a signer is used as given. */
const resolveSigner = (key: SigningKey | ExternalSigner): { signer: ExternalSigner; external: boolean } =>
    isExternalSigner(key) ? { signer: key, external: true } : { signer: getSigner(key), external: false };

/** The subset of `options` that was actually set, or undefined when none was. */
const pickTransactionOptions = (options: TransactionOptions): TransactionOptions | undefined => {
    const { feeLimit, memo, expiration, permissionId } = options;
    return feeLimit === undefined && memo === undefined && expiration === undefined && permissionId === undefined
        ? undefined
        : { feeLimit, memo, expiration, permissionId };
};

/** Transaction reads + the create -> sign -> broadcast flow. */
export class TronClientTransactions extends TronClientAccounts {
    /** PQ schemes seen active, latched so each check costs one RPC at most. */
    private readonly pqEnabled = new Set<KeyType>();
    /** In-flight capability lookup, shared so concurrent PQ sends issue one RPC. */
    private pqCapsInFlight?: Promise<PqCapabilities>;

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
        this.pqCapsInFlight ??= this.query<Raw>('GetChainParameters', {})
            .then(parsePqCapabilities)
            .finally(() => {
                this.pqCapsInFlight = undefined;
            });
        const caps = await this.pqCapsInFlight;
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
     * txid. The txid is recomputed from the returned `raw_data` and must equal the
     * one asked for, so a node cannot answer with a different transaction.
     *
     * This is a cryptographic check, not an authorization one: it does not
     * verify that those signers satisfy the account's `Permission` threshold.
     */
    async verifyTransactionById(txid: string): Promise<TransactionVerification> {
        const clean = txid.replace(/^0x/i, '').toLowerCase();
        const res = await this.request<Raw>('GetTransactionById', { value: hexToBytesSafe(clean) });
        if (!res.raw_data) throw new Error(`No transaction found for id ${clean}`);
        const actual = computeTxid(res.raw_data as Raw);
        if (actual !== clean) {
            throw new Error(`The node answered ${clean} with a different transaction (its raw_data hashes to ${actual})`);
        }
        return verifyTransaction(res, actual);
    }

    /** Get a transaction receipt by id (hex). */
    async getTransactionInfoById(txid: string): Promise<TransactionInfoResult> {
        const clean = txid.replace(/^0x/i, '');
        const res = await this.request<Raw>('GetTransactionInfoById', { value: hexToBytesSafe(clean) });
        return decodeTransactionInfo(res);
    }

    /** Get all transaction receipts in a block. */
    async getTransactionInfoByBlockNum(blockNumber: number): Promise<TransactionInfoList> {
        return this.query<TransactionInfoList>('GetTransactionInfoByBlockNum', { num: blockNumber });
    }

    /** Compute the cumulative signature weight of a (partially) signed tx. */
    async getTransactionSignWeight(signedTransaction: Raw): Promise<TransactionSignWeight> {
        return this.query<TransactionSignWeight>('GetTransactionSignWeight', signedTransaction);
    }

    /** List the addresses that have approved a (multi-sig) transaction. */
    async getTransactionApprovedList(signedTransaction: Raw): Promise<TransactionApprovedList> {
        return this.query<TransactionApprovedList>('GetTransactionApprovedList', signedTransaction);
    }

    /** Fetch a still-pending transaction by id (hex). */
    async getTransactionFromPending(txid: string): Promise<Transaction> {
        return this.query<Transaction>('GetTransactionFromPending', { value: hexToBytesSafe(txid) });
    }

    /** List ids of all pending transactions. */
    async getTransactionListFromPending(): Promise<TransactionIdList> {
        return this.query<TransactionIdList>('GetTransactionListFromPending', {});
    }

    /** Number of transactions in the pending pool. */
    async getPendingSize(): Promise<NumberMessage> {
        return this.query<NumberMessage>('GetPendingSize', {});
    }

    /** Wrap an existing raw transaction into a TransactionExtention. */
    async createCommonTransaction(transaction: Raw): Promise<UnsignedTransactionExtention> {
        // The request is a Transaction, not a contract: nothing to compare against.
        return this.buildExtention('CreateCommonTransaction', transaction, { verify: false });
    }

    /**
     * Build an unsigned TRX transfer (`CreateTransaction2`). Returns the node's
     * `TransactionExtention` (raw passthrough) containing `transaction` + `txid`.
     */
    async createTransaction(from: string, to: string, amountTrx: DecimalLike): Promise<UnsignedTransactionExtention> {
        const sun = trxToSun(amountTrx);
        if (sun <= 0n) throw new Error('Transfer amount must be positive');
        return this.buildExtention('CreateTransaction2', {
            owner_address: toAddressBytes(from),
            to_address: toAddressBytes(to),
            amount: sun.toString(),
        });
    }

    /**
     * Sign a node-built TransactionExtention without broadcasting it — the
     * multi-sig building block: call once per signer, then {@link broadcastTransaction}.
     *
     * The txid is recomputed from `raw_data` (never taken from the node), and the
     * call throws if the extention carries a different one. `key` may be an ECDSA
     * private key (hex), a post-quantum keypair, or an {@link ExternalSigner}; the
     * signer writes to `signature` or `pq_auth_sig` accordingly, appending to any
     * signatures already present. Returns the same extention.
     */
    async signTransaction<T extends Raw>(extention: T, key: SigningKey | ExternalSigner): Promise<T> {
        const { signer, external } = resolveSigner(key);
        await this.assertPqSchemeEnabled(signer.keyType);
        await this.signWith(extention, signer, external);
        return extention;
    }

    /** Broadcast a signed transaction (`extention.transaction`, or a bare `Transaction`). */
    async broadcastTransaction(signed: Raw): Promise<BroadcastResult> {
        const transaction = (signed.transaction as Raw | undefined) ?? signed;
        if (!transaction.raw_data) throw new Error('No transaction to broadcast');
        return this.broadcast(transaction, computeTxid(transaction.raw_data as Raw));
    }

    /**
     * Attach a signature to a node-built TransactionExtention and broadcast it.
     * The node-built `raw_data` is re-broadcast verbatim; the id that gets signed
     * is recomputed from it locally, and a mismatch with the extention's own
     * `txid` throws before anything is signed.
     *
     * `key` may be an ECDSA private key (hex), a post-quantum keypair, or an
     * {@link ExternalSigner}; the signer writes to `signature` or `pq_auth_sig`
     * accordingly. Signing an already-signed transaction appends, which is how a
     * mixed ECDSA + PQ multi-sig transaction accumulates weight (TIP-899).
     *
     * `options` sets `feeLimit` / `memo` / `expiration` / `permissionId` first
     * (see {@link applyTransactionOptions}).
     */
    async signAndBroadcast(
        extention: Raw,
        key: SigningKey | ExternalSigner,
        options?: TransactionOptions
    ): Promise<BroadcastResult> {
        const { signer, external } = resolveSigner(key);
        await this.assertPqSchemeEnabled(signer.keyType);
        if (options) applyTransactionOptions(extention, options);
        const txid = await this.signWith(extention, signer, external);
        return this.broadcast(transactionOf(extention), txid);
    }

    /** Sign with an already-built (and capability-checked) signer; returns the txid signed. */
    private async signWith(extention: Raw, signer: ExternalSigner, external: boolean): Promise<string> {
        const transaction = transactionOf(extention);
        const txid = checkedTxid(extention);
        await signer.signTransaction(transaction, txid);
        if (external) {
            // The key lives elsewhere, so check what came back: a valid signature
            // over this txid, by the address the signer claims.
            const { signers } = verifyTransaction(transaction, txid);
            if (!signers.some(s => s.valid && s.address === signer.address)) {
                throw new Error(`Signer ${signer.address} did not produce a valid signature for ${txid}`);
            }
        }
        return txid;
    }

    private async broadcast(transaction: Raw, txid: string): Promise<BroadcastResult> {
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

    /** Sign a freshly built extention with a resolved signer and broadcast it. */
    protected async signResolvedAndBroadcast(
        extention: Raw,
        resolved: { signer: ExternalSigner; external: boolean },
        options: TransactionOptions
    ): Promise<BroadcastResult> {
        const set = pickTransactionOptions(options);
        if (set) applyTransactionOptions(extention, set);
        const txid = await this.signWith(extention, resolved.signer, resolved.external);
        return this.broadcast(transactionOf(extention), txid);
    }

    /** Resolve a key to its signer and check the network accepts its scheme. */
    protected async readySigner(key: SigningKey | ExternalSigner): Promise<{ signer: ExternalSigner; external: boolean }> {
        const resolved = resolveSigner(key);
        // Check the network before asking it to build anything, so an unusable PQ key
        // fails with "PQ not active here" rather than a confusing node-side error.
        await this.assertPqSchemeEnabled(resolved.signer.keyType);
        return resolved;
    }

    /**
     * High-level TRX transfer: create -> sign with `privateKey` -> broadcast.
     * `amount` is in TRX (decimal). Returns the txid and broadcast outcome.
     */
    async sendTrx(params: SendTrxParams): Promise<BroadcastResult> {
        // Resolve once: building a signer derives the key's public key/address.
        const resolved = await this.readySigner(params.privateKey);
        const from = params.from ? toBase58Address(params.from) : resolved.signer.address;
        const to = toBase58Address(params.to);
        const extention = await this.createTransaction(from, to, params.amount);
        return this.signResolvedAndBroadcast(extention, resolved, params);
    }
}
