import { TronClientBlocks } from './blocks';
import { intString, type Raw } from './helpers';
import { toAddressBytes, toBase58Address } from '../utils/address';
import { hexToBytesSafe } from '../utils/hex';
import { decodeAccount, decodeAccountResources } from '../codecs/decode';
import type { AccountResources, PermissionInput, TronAccount, TronAccountType } from '../types';

/** Account reads + account-management builders. */
export class TronClientAccounts extends TronClientBlocks {
    /** Get an account, with TRX balance as both sun and decimal TRX. */
    async getAccount(address: string): Promise<TronAccount> {
        const base58 = toBase58Address(address);
        const res = await this.request<Raw>('GetAccount', { address: toAddressBytes(address) });
        return decodeAccount(res, base58);
    }

    /** Convenience: TRX balance of an address as a decimal string. */
    async getBalance(address: string): Promise<string> {
        return (await this.getAccount(address)).balanceTrx;
    }

    /** Get bandwidth + energy resources for an account. */
    async getAccountResources(address: string): Promise<AccountResources> {
        const res = await this.request<Raw>('GetAccountResource', { address: toAddressBytes(address) });
        return decodeAccountResources(res);
    }

    /** Get an account by its immutable account id. */
    async getAccountById(accountId: string): Promise<Raw> {
        return this.query('GetAccountById', { account_id: Buffer.from(accountId, 'utf8') });
    }

    /** Get an account's bandwidth (net) usage + limits. */
    async getAccountNet(address: string): Promise<Raw> {
        return this.query('GetAccountNet', { address: toAddressBytes(address) });
    }

    /** Get an account's TRX balance at a specific block (balance trace). */
    async getAccountBalance(address: string, blockNumber: number, blockHash: string): Promise<Raw> {
        return this.query('GetAccountBalance', {
            account_identifier: { address: toAddressBytes(address) },
            block_identifier: { number: blockNumber, hash: hexToBytesSafe(blockHash) },
        });
    }

    /** Get unclaimed voting/SR reward (in sun) for an address. */
    async getRewardInfo(address: string): Promise<Raw> {
        return this.query('GetRewardInfo', { value: toAddressBytes(address) });
    }

    /** Get an SR's brokerage ratio for an address. */
    async getBrokerageInfo(address: string): Promise<Raw> {
        return this.query('GetBrokerageInfo', { value: toAddressBytes(address) });
    }

    /** Set an account's on-chain name (`UpdateAccount2`). */
    async updateAccount(ownerAddress: string, accountName: string): Promise<Raw> {
        return this.buildExtention('UpdateAccount2', {
            owner_address: toAddressBytes(ownerAddress),
            account_name: Buffer.from(accountName, 'utf8'),
        });
    }

    /** Set an account's immutable id (`SetAccountId`). */
    async setAccountId(ownerAddress: string, accountId: string): Promise<Raw> {
        return this.buildExtention('SetAccountId', {
            owner_address: toAddressBytes(ownerAddress),
            account_id: Buffer.from(accountId, 'utf8'),
        });
    }

    /** Create a new account on-chain (`CreateAccount2`). */
    async createAccount(
        ownerAddress: string,
        accountAddress: string,
        type: TronAccountType = 'Normal'
    ): Promise<Raw> {
        return this.buildExtention('CreateAccount2', {
            owner_address: toAddressBytes(ownerAddress),
            account_address: toAddressBytes(accountAddress),
            type,
        });
    }

    /** Update account permissions / multi-sig (`AccountPermissionUpdate`). */
    async accountPermissionUpdate(
        ownerAddress: string,
        owner: PermissionInput,
        actives: PermissionInput[],
        witness?: PermissionInput
    ): Promise<Raw> {
        const toPermission = (p: PermissionInput, fallbackId: number): Raw => ({
            type: p.type ?? 'Active',
            id: p.id ?? fallbackId,
            permission_name: p.permissionName,
            threshold: intString(p.threshold),
            ...(p.operations ? { operations: hexToBytesSafe(p.operations) } : {}),
            keys: p.keys.map(k => ({ address: toAddressBytes(k.address), weight: k.weight })),
        });
        const contract: Raw = {
            owner_address: toAddressBytes(ownerAddress),
            owner: toPermission({ ...owner, type: 'Owner' }, 0),
            actives: actives.map((a, i) => toPermission({ ...a, type: 'Active' }, 2 + i)),
        };
        if (witness) contract.witness = toPermission({ ...witness, type: 'Witness' }, 1);
        return this.buildExtention('AccountPermissionUpdate', contract);
    }
}
