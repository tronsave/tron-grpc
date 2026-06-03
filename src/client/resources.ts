import { TronClientContracts } from './contracts';
import { sunString, type Raw } from './helpers';
import { toAddressBytes } from '../utils/address';
import type { DecimalLike } from '../utils/units';
import type { TronResource } from '../types';

/** Staking (Stake 2.0), delegation, and resource queries. */
export class TronClientResources extends TronClientContracts {
    /** Stake TRX for a resource (`FreezeBalanceV2`). `amount` is TRX. */
    async freezeBalanceV2(ownerAddress: string, amount: DecimalLike, resource: TronResource = 'BANDWIDTH'): Promise<Raw> {
        return this.buildExtention('FreezeBalanceV2', {
            owner_address: toAddressBytes(ownerAddress),
            frozen_balance: sunString(amount),
            resource,
        });
    }

    /** Unstake TRX (`UnfreezeBalanceV2`). `amount` is TRX. */
    async unfreezeBalanceV2(ownerAddress: string, amount: DecimalLike, resource: TronResource = 'BANDWIDTH'): Promise<Raw> {
        return this.buildExtention('UnfreezeBalanceV2', {
            owner_address: toAddressBytes(ownerAddress),
            unfreeze_balance: sunString(amount),
            resource,
        });
    }

    /** Unstake a legacy (Stake 1.0) frozen balance (`UnfreezeBalance2`). */
    async unfreezeBalance(ownerAddress: string, resource: TronResource = 'BANDWIDTH', receiverAddress?: string): Promise<Raw> {
        return this.buildExtention('UnfreezeBalance2', {
            owner_address: toAddressBytes(ownerAddress),
            resource,
            ...(receiverAddress ? { receiver_address: toAddressBytes(receiverAddress) } : {}),
        });
    }

    /** Withdraw all expired unstaked TRX (`WithdrawExpireUnfreeze`). */
    async withdrawExpireUnfreeze(ownerAddress: string): Promise<Raw> {
        return this.buildExtention('WithdrawExpireUnfreeze', { owner_address: toAddressBytes(ownerAddress) });
    }

    /** Cancel all pending unstake requests (`CancelAllUnfreezeV2`). */
    async cancelAllUnfreezeV2(ownerAddress: string): Promise<Raw> {
        return this.buildExtention('CancelAllUnfreezeV2', { owner_address: toAddressBytes(ownerAddress) });
    }

    /** Delegate resource to another account (`DelegateResource`). `amount` is TRX. */
    async delegateResource(
        ownerAddress: string,
        receiverAddress: string,
        amount: DecimalLike,
        resource: TronResource = 'ENERGY',
        lock = false,
        lockPeriod = 0
    ): Promise<Raw> {
        return this.buildExtention('DelegateResource', {
            owner_address: toAddressBytes(ownerAddress),
            receiver_address: toAddressBytes(receiverAddress),
            balance: sunString(amount),
            resource,
            lock,
            lock_period: lockPeriod,
        });
    }

    /** Reclaim delegated resource (`UnDelegateResource`). `amount` is TRX. */
    async unDelegateResource(
        ownerAddress: string,
        receiverAddress: string,
        amount: DecimalLike,
        resource: TronResource = 'ENERGY'
    ): Promise<Raw> {
        return this.buildExtention('UnDelegateResource', {
            owner_address: toAddressBytes(ownerAddress),
            receiver_address: toAddressBytes(receiverAddress),
            balance: sunString(amount),
            resource,
        });
    }

    /** Claim staking / SR rewards to the spendable balance (`WithdrawBalance2`). */
    async withdrawBalance(ownerAddress: string): Promise<Raw> {
        return this.buildExtention('WithdrawBalance2', { owner_address: toAddressBytes(ownerAddress) });
    }

    /** Set an SR's brokerage ratio (`UpdateBrokerage`). `brokerage` is a percent. */
    async updateBrokerage(ownerAddress: string, brokerage: number): Promise<Raw> {
        return this.buildExtention('UpdateBrokerage', { owner_address: toAddressBytes(ownerAddress), brokerage });
    }

    /** List resources delegated from one account to another (Stake 1.0). */
    async getDelegatedResource(fromAddress: string, toAddress: string): Promise<Raw> {
        return this.query('GetDelegatedResource', {
            fromAddress: toAddressBytes(fromAddress),
            toAddress: toAddressBytes(toAddress),
        });
    }

    /** List resources delegated from one account to another (Stake 2.0). */
    async getDelegatedResourceV2(fromAddress: string, toAddress: string): Promise<Raw> {
        return this.query('GetDelegatedResourceV2', {
            fromAddress: toAddressBytes(fromAddress),
            toAddress: toAddressBytes(toAddress),
        });
    }

    /** Get the delegation index for an account (Stake 1.0). */
    async getDelegatedResourceAccountIndex(address: string): Promise<Raw> {
        return this.query('GetDelegatedResourceAccountIndex', { value: toAddressBytes(address) });
    }

    /** Get the delegation index for an account (Stake 2.0). */
    async getDelegatedResourceAccountIndexV2(address: string): Promise<Raw> {
        return this.query('GetDelegatedResourceAccountIndexV2', { value: toAddressBytes(address) });
    }

    /** Max size (sun) an account can delegate for a resource type (0=bw,1=energy). */
    async getCanDelegatedMaxSize(address: string, type: number): Promise<Raw> {
        return this.query('GetCanDelegatedMaxSize', { owner_address: toAddressBytes(address), type });
    }

    /** Remaining number of allowed unstake operations for an account. */
    async getAvailableUnfreezeCount(address: string): Promise<Raw> {
        return this.query('GetAvailableUnfreezeCount', { owner_address: toAddressBytes(address) });
    }

    /** Withdrawable expired-unstake amount at a timestamp (ms; default now). */
    async getCanWithdrawUnfreezeAmount(address: string, timestamp = 0): Promise<Raw> {
        return this.query('GetCanWithdrawUnfreezeAmount', { owner_address: toAddressBytes(address), timestamp });
    }
}
