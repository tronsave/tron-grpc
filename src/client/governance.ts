import { TronClientAssets } from './assets';
import { intString, sunString, type IntLike, type Raw } from './helpers';
import { toAddressBytes } from '../utils/address';
import { hexToBytesSafe, longToBytesBE } from '../utils/hex';
import type { DecimalLike } from '../utils/units';

/** On-chain governance: proposals, exchanges, storage market, and the order book. */
export class TronClientGovernance extends TronClientAssets {
    // -- Proposals -------------------------------------------------------

    /** Create a parameter-change proposal (`ProposalCreate`). */
    async proposalCreate(ownerAddress: string, parameters: Record<number, IntLike>): Promise<Raw> {
        const map: Record<string, string> = {};
        for (const [k, v] of Object.entries(parameters)) map[k] = intString(v);
        return this.buildExtention('ProposalCreate', { owner_address: toAddressBytes(ownerAddress), parameters: map });
    }

    /** Approve or un-approve a proposal (`ProposalApprove`). */
    async proposalApprove(ownerAddress: string, proposalId: number, isAddApproval: boolean): Promise<Raw> {
        return this.buildExtention('ProposalApprove', {
            owner_address: toAddressBytes(ownerAddress),
            proposal_id: proposalId,
            is_add_approval: isAddApproval,
        });
    }

    /** Delete a proposal (`ProposalDelete`). */
    async proposalDelete(ownerAddress: string, proposalId: number): Promise<Raw> {
        return this.buildExtention('ProposalDelete', { owner_address: toAddressBytes(ownerAddress), proposal_id: proposalId });
    }

    /** List all proposals. */
    async listProposals(): Promise<Raw> {
        return this.query('ListProposals', {});
    }

    /** Paginated list of proposals. */
    async getPaginatedProposalList(offset: number, limit: number): Promise<Raw> {
        return this.query('GetPaginatedProposalList', { offset, limit });
    }

    /** Get a proposal by id. */
    async getProposalById(id: number): Promise<Raw> {
        return this.query('GetProposalById', { value: longToBytesBE(id) });
    }

    // -- Exchanges (Bancor) ---------------------------------------------

    /** Create a token exchange pair (`ExchangeCreate`). Amounts are token units. */
    async exchangeCreate(
        ownerAddress: string,
        firstTokenId: string,
        firstTokenBalance: IntLike,
        secondTokenId: string,
        secondTokenBalance: IntLike
    ): Promise<Raw> {
        return this.buildExtention('ExchangeCreate', {
            owner_address: toAddressBytes(ownerAddress),
            first_token_id: Buffer.from(firstTokenId, 'utf8'),
            first_token_balance: intString(firstTokenBalance),
            second_token_id: Buffer.from(secondTokenId, 'utf8'),
            second_token_balance: intString(secondTokenBalance),
        });
    }

    /** Inject liquidity into an exchange (`ExchangeInject`). */
    async exchangeInject(ownerAddress: string, exchangeId: number, tokenId: string, quant: IntLike): Promise<Raw> {
        return this.buildExtention('ExchangeInject', {
            owner_address: toAddressBytes(ownerAddress),
            exchange_id: exchangeId,
            token_id: Buffer.from(tokenId, 'utf8'),
            quant: intString(quant),
        });
    }

    /** Withdraw liquidity from an exchange (`ExchangeWithdraw`). */
    async exchangeWithdraw(ownerAddress: string, exchangeId: number, tokenId: string, quant: IntLike): Promise<Raw> {
        return this.buildExtention('ExchangeWithdraw', {
            owner_address: toAddressBytes(ownerAddress),
            exchange_id: exchangeId,
            token_id: Buffer.from(tokenId, 'utf8'),
            quant: intString(quant),
        });
    }

    /** Trade against an exchange (`ExchangeTransaction`). */
    async exchangeTransaction(
        ownerAddress: string,
        exchangeId: number,
        tokenId: string,
        quant: IntLike,
        expected: IntLike
    ): Promise<Raw> {
        return this.buildExtention('ExchangeTransaction', {
            owner_address: toAddressBytes(ownerAddress),
            exchange_id: exchangeId,
            token_id: Buffer.from(tokenId, 'utf8'),
            quant: intString(quant),
            expected: intString(expected),
        });
    }

    /** List all exchanges. */
    async listExchanges(): Promise<Raw> {
        return this.query('ListExchanges', {});
    }

    /** Paginated list of exchanges. */
    async getPaginatedExchangeList(offset: number, limit: number): Promise<Raw> {
        return this.query('GetPaginatedExchangeList', { offset, limit });
    }

    /** Get an exchange by id. */
    async getExchangeById(id: number): Promise<Raw> {
        return this.query('GetExchangeById', { value: longToBytesBE(id) });
    }

    // -- Storage market --------------------------------------------------

    /** Buy storage with TRX (`BuyStorage`). `amount` is TRX. */
    async buyStorage(ownerAddress: string, amount: DecimalLike): Promise<Raw> {
        return this.buildExtention('BuyStorage', { owner_address: toAddressBytes(ownerAddress), quant: sunString(amount) });
    }

    /** Buy a number of storage bytes (`BuyStorageBytes`). */
    async buyStorageBytes(ownerAddress: string, bytes: IntLike): Promise<Raw> {
        return this.buildExtention('BuyStorageBytes', { owner_address: toAddressBytes(ownerAddress), bytes: intString(bytes) });
    }

    /** Sell storage bytes back for TRX (`SellStorage`). */
    async sellStorage(ownerAddress: string, storageBytes: IntLike): Promise<Raw> {
        return this.buildExtention('SellStorage', { owner_address: toAddressBytes(ownerAddress), storage_bytes: intString(storageBytes) });
    }

    // -- Market (decentralized token order book) -------------------------

    /** Place a market sell order (`MarketSellAsset`). */
    async marketSellAsset(
        ownerAddress: string,
        sellTokenId: string,
        sellTokenQuantity: IntLike,
        buyTokenId: string,
        buyTokenQuantity: IntLike
    ): Promise<Raw> {
        return this.buildExtention('MarketSellAsset', {
            owner_address: toAddressBytes(ownerAddress),
            sell_token_id: Buffer.from(sellTokenId, 'utf8'),
            sell_token_quantity: intString(sellTokenQuantity),
            buy_token_id: Buffer.from(buyTokenId, 'utf8'),
            buy_token_quantity: intString(buyTokenQuantity),
        });
    }

    /** Cancel a market order (`MarketCancelOrder`). `orderId` is hex. */
    async marketCancelOrder(ownerAddress: string, orderId: string): Promise<Raw> {
        return this.buildExtention('MarketCancelOrder', {
            owner_address: toAddressBytes(ownerAddress),
            order_id: hexToBytesSafe(orderId),
        });
    }

    /** Get a market order by id (hex). */
    async getMarketOrderById(orderId: string): Promise<Raw> {
        return this.query('GetMarketOrderById', { value: hexToBytesSafe(orderId) });
    }

    /** List an account's market orders. */
    async getMarketOrderByAccount(address: string): Promise<Raw> {
        return this.query('GetMarketOrderByAccount', { value: toAddressBytes(address) });
    }

    /** Get the price book for a token pair. */
    async getMarketPriceByPair(sellTokenId: string, buyTokenId: string): Promise<Raw> {
        return this.query('GetMarketPriceByPair', {
            sell_token_id: Buffer.from(sellTokenId, 'utf8'),
            buy_token_id: Buffer.from(buyTokenId, 'utf8'),
        });
    }

    /** List orders for a token pair. */
    async getMarketOrderListByPair(sellTokenId: string, buyTokenId: string): Promise<Raw> {
        return this.query('GetMarketOrderListByPair', {
            sell_token_id: Buffer.from(sellTokenId, 'utf8'),
            buy_token_id: Buffer.from(buyTokenId, 'utf8'),
        });
    }

    /** List all tradable market pairs. */
    async getMarketPairList(): Promise<Raw> {
        return this.query('GetMarketPairList', {});
    }
}
