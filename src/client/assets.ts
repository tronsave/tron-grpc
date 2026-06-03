import { TronClientWitnesses } from './witnesses';
import { intString, sunString, type IntLike, type Raw } from './helpers';
import { toAddressBytes } from '../utils/address';
import type { DecimalLike } from '../utils/units';
import type { CreateAssetIssueInput } from '../types';

/** TRC10 asset issuance, transfer, and queries. */
export class TronClientAssets extends TronClientWitnesses {
    /** Issue a new TRC10 asset (`CreateAssetIssue2`). */
    async createAssetIssue(input: CreateAssetIssueInput): Promise<Raw> {
        const contract: Raw = {
            owner_address: toAddressBytes(input.ownerAddress),
            name: Buffer.from(input.name, 'utf8'),
            abbr: Buffer.from(input.abbr, 'utf8'),
            total_supply: intString(input.totalSupply),
            trx_num: input.trxNum,
            num: input.num,
            start_time: input.startTime,
            end_time: input.endTime,
            ...(input.precision !== undefined ? { precision: input.precision } : {}),
            ...(input.freeAssetNetLimit !== undefined ? { free_asset_net_limit: input.freeAssetNetLimit } : {}),
            ...(input.publicFreeAssetNetLimit !== undefined
                ? { public_free_asset_net_limit: input.publicFreeAssetNetLimit }
                : {}),
            ...(input.description ? { description: Buffer.from(input.description, 'utf8') } : {}),
            ...(input.url ? { url: Buffer.from(input.url, 'utf8') } : {}),
            ...(input.frozenSupply
                ? {
                      frozen_supply: input.frozenSupply.map(f => ({
                          frozen_amount: intString(f.frozenAmount),
                          frozen_days: f.frozenDays,
                      })),
                  }
                : {}),
        };
        return this.buildExtention('CreateAssetIssue2', contract);
    }

    /** Transfer a TRC10 asset (`TransferAsset2`). `amount` is in token units. */
    async transferAsset(ownerAddress: string, toAddress: string, assetName: string, amount: IntLike): Promise<Raw> {
        return this.buildExtention('TransferAsset2', {
            owner_address: toAddressBytes(ownerAddress),
            to_address: toAddressBytes(toAddress),
            asset_name: Buffer.from(assetName, 'utf8'),
            amount: intString(amount),
        });
    }

    /** Participate in (buy) a TRC10 asset issue (`ParticipateAssetIssue2`). `amount` is TRX. */
    async participateAssetIssue(ownerAddress: string, toAddress: string, assetName: string, amount: DecimalLike): Promise<Raw> {
        return this.buildExtention('ParticipateAssetIssue2', {
            owner_address: toAddressBytes(ownerAddress),
            to_address: toAddressBytes(toAddress),
            asset_name: Buffer.from(assetName, 'utf8'),
            amount: sunString(amount),
        });
    }

    /** Unfreeze a frozen TRC10 asset (`UnfreezeAsset2`). */
    async unfreezeAsset(ownerAddress: string): Promise<Raw> {
        return this.buildExtention('UnfreezeAsset2', { owner_address: toAddressBytes(ownerAddress) });
    }

    /** Update a TRC10 asset's description / url / bandwidth limits (`UpdateAsset2`). */
    async updateAsset(ownerAddress: string, description: string, url: string, newLimit: IntLike, newPublicLimit: IntLike): Promise<Raw> {
        return this.buildExtention('UpdateAsset2', {
            owner_address: toAddressBytes(ownerAddress),
            description: Buffer.from(description, 'utf8'),
            url: Buffer.from(url, 'utf8'),
            new_limit: intString(newLimit),
            new_public_limit: intString(newPublicLimit),
        });
    }

    /** Get the TRC10 assets issued by an account. */
    async getAssetIssueByAccount(address: string): Promise<Raw> {
        return this.query('GetAssetIssueByAccount', { address: toAddressBytes(address) });
    }

    /** Get a TRC10 asset by its name. */
    async getAssetIssueByName(name: string): Promise<Raw> {
        return this.query('GetAssetIssueByName', { value: Buffer.from(name, 'utf8') });
    }

    /** Get all TRC10 assets sharing a name. */
    async getAssetIssueListByName(name: string): Promise<Raw> {
        return this.query('GetAssetIssueListByName', { value: Buffer.from(name, 'utf8') });
    }

    /** Get a TRC10 asset by its numeric id. */
    async getAssetIssueById(id: string): Promise<Raw> {
        return this.query('GetAssetIssueById', { value: Buffer.from(id, 'utf8') });
    }

    /** List all TRC10 assets. */
    async getAssetIssueList(): Promise<Raw> {
        return this.query('GetAssetIssueList', {});
    }

    /** Paginated list of TRC10 assets. */
    async getPaginatedAssetIssueList(offset: number, limit: number): Promise<Raw> {
        return this.query('GetPaginatedAssetIssueList', { offset, limit });
    }
}
