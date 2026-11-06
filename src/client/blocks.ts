import { TronClientCore } from './core';
import type { Raw } from './helpers';
import { hexToBytesSafe } from '../utils/hex';
import { decodeBlock } from '../codecs/decode';
import type { BlockSummary } from '../types';
import type { Block, BlockBalanceTrace, BlockExtention, BlockListExtention, NumberMessage } from '../types/responses';

/** Block reads. */
export class TronClientBlocks extends TronClientCore {
    /** Get the current head block. */
    async getNowBlock(): Promise<BlockSummary> {
        return decodeBlock(await this.request<Raw>('GetNowBlock2', {}));
    }

    /** Get a block by height. */
    async getBlockByNum(blockNumber: number): Promise<BlockSummary> {
        return decodeBlock(await this.request<Raw>('GetBlockByNum2', { num: blockNumber }));
    }

    /** Get a block by its id/hash (hex). */
    async getBlockById(blockHash: string): Promise<Block> {
        return this.query<Block>('GetBlockById', { value: hexToBytesSafe(blockHash) });
    }

    /** Get the latest N blocks (`GetBlockByLatestNum2`). */
    async getBlockByLatestNum(num: number): Promise<BlockListExtention> {
        return this.query<BlockListExtention>('GetBlockByLatestNum2', { num });
    }

    /** Get a range of blocks `[startNum, endNum)` (`GetBlockByLimitNext2`). */
    async getBlockByLimitNext(startNum: number, endNum: number): Promise<BlockListExtention> {
        return this.query<BlockListExtention>('GetBlockByLimitNext2', { startNum, endNum });
    }

    /** Get a block by number or id, optionally with full tx detail (`GetBlock`). */
    async getBlock(idOrNum: number | string, detail = false): Promise<BlockExtention> {
        return this.query<BlockExtention>('GetBlock', { id_or_num: String(idOrNum), detail });
    }

    /** Count transactions in a block. */
    async getTransactionCountByBlockNum(blockNumber: number): Promise<NumberMessage> {
        return this.query<NumberMessage>('GetTransactionCountByBlockNum', { num: blockNumber });
    }

    /** Trace per-account balance changes in a block. */
    async getBlockBalanceTrace(blockNumber: number, blockHash: string): Promise<BlockBalanceTrace> {
        return this.query<BlockBalanceTrace>('GetBlockBalanceTrace', { number: blockNumber, hash: hexToBytesSafe(blockHash) });
    }
}
