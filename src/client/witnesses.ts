import { TronClientResources } from './resources';
import { intString } from './helpers';
import { toAddressBytes } from '../utils/address';
import type { VoteInput } from '../types';
import type { UnsignedTransactionExtention, WitnessList } from '../types/responses';

/** Witness (super-representative) management + voting. */
export class TronClientWitnesses extends TronClientResources {
    /** Create a witness (super-representative candidate) (`CreateWitness2`). */
    async createWitness(ownerAddress: string, url: string): Promise<UnsignedTransactionExtention> {
        return this.buildExtention('CreateWitness2', {
            owner_address: toAddressBytes(ownerAddress),
            url: Buffer.from(url, 'utf8'),
        });
    }

    /** Update a witness URL (`UpdateWitness2`). */
    async updateWitness(ownerAddress: string, url: string): Promise<UnsignedTransactionExtention> {
        return this.buildExtention('UpdateWitness2', {
            owner_address: toAddressBytes(ownerAddress),
            update_url: Buffer.from(url, 'utf8'),
        });
    }

    /** Vote for witnesses with TRON power (`VoteWitnessAccount2`). */
    async voteWitnessAccount(ownerAddress: string, votes: VoteInput[], support = true): Promise<UnsignedTransactionExtention> {
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
    async listWitnesses(): Promise<WitnessList> {
        return this.query<WitnessList>('ListWitnesses', {});
    }

    /** Paginated list of current witnesses. */
    async getPaginatedNowWitnessList(offset: number, limit: number): Promise<WitnessList> {
        return this.query<WitnessList>('GetPaginatedNowWitnessList', { offset, limit });
    }
}
