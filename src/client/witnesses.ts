import { TronClientResources } from './resources';
import { intString, type Raw } from './helpers';
import { toAddressBytes } from '../utils/address';
import type { VoteInput } from '../types';

/** Witness (super-representative) management + voting. */
export class TronClientWitnesses extends TronClientResources {
    /** Create a witness (super-representative candidate) (`CreateWitness2`). */
    async createWitness(ownerAddress: string, url: string): Promise<Raw> {
        return this.buildExtention('CreateWitness2', {
            owner_address: toAddressBytes(ownerAddress),
            url: Buffer.from(url, 'utf8'),
        });
    }

    /** Update a witness URL (`UpdateWitness2`). */
    async updateWitness(ownerAddress: string, url: string): Promise<Raw> {
        return this.buildExtention('UpdateWitness2', {
            owner_address: toAddressBytes(ownerAddress),
            update_url: Buffer.from(url, 'utf8'),
        });
    }

    /** Vote for witnesses with TRON power (`VoteWitnessAccount2`). */
    async voteWitnessAccount(ownerAddress: string, votes: VoteInput[], support = true): Promise<Raw> {
        return this.buildExtention('VoteWitnessAccount2', {
            owner_address: toAddressBytes(ownerAddress),
            support,
            votes: votes.map(v => ({
                vote_address: toAddressBytes(v.voteAddress),
                vote_count: intString(v.voteCount),
            })),
        });
    }

    /** List all witnesses. */
    async listWitnesses(): Promise<Raw> {
        return this.query('ListWitnesses', {});
    }

    /** Paginated list of current witnesses. */
    async getPaginatedNowWitnessList(offset: number, limit: number): Promise<Raw> {
        return this.query('GetPaginatedNowWitnessList', { offset, limit });
    }
}
