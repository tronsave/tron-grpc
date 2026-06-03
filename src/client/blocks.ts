import { TronClientCore } from './core';
import type { Raw } from './helpers';
import { hexToBytesSafe } from '../utils/hex';
import { decodeBlock } from '../codecs/decode';
import type { BlockSummary } from '../types';

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
    async getBlockById(blockHash: string): Promise<Raw> {
        return this.query('GetBlockById', { value: hexToBytesSafe(blockHash) });
    }

    /** Get the latest N blocks (`GetBlockByLatestNum2`). */
    async getBlockByLatestNum(num: number): Promise<Raw> {
        return this.query('GetBlockByLatestNum2', { num });
    }

    /** Get a range of blocks `[startNum, endNum)` (`GetBlockByLimitNext2`). */
    async getBlockByLimitNext(startNum: number, endNum: number): Promise<Raw> {
        return this.query('GetBlockByLimitNext2', { startNum, endNum });
    }

    /** Get a block by number or id, optionally with full tx detail (`GetBlock`). */
    async getBlock(idOrNum: number | string, detail = false): Promise<Raw> {
        return this.query('GetBlock', { id_or_num: String(idOrNum), detail });
    }

    /** Count transactions in a block. */
    async getTransactionCountByBlockNum(blockNumber: number): Promise<Raw> {
        return this.query('GetTransactionCountByBlockNum', { num: blockNumber });
    }

    /** Trace per-account balance changes in a block. */
    async getBlockBalanceTrace(blockNumber: number, blockHash: string): Promise<Raw> {
        return this.query('GetBlockBalanceTrace', { number: blockNumber, hash: hexToBytesSafe(blockHash) });
    }
}
