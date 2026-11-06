import { TronClientTransactions } from './transactions';
import { buildTriggerRequest, decodeConstantResult, decodeReturn, intString, sunString, type Raw } from './helpers';
import { toAddressBytes } from '../utils/address';
import { toBytes } from '../utils/hex';
import { fromBaseUnits, toBaseUnits } from '../utils/units';
import { applyTransactionOptions } from '../utils/transaction';
import { normalizeDeep } from '../codecs/decode';
import { encodeAddressParam, encodeUint256, decodeUint256 } from '../codecs/abi';
import type {
    BroadcastResult,
    ConstantCallResult,
    DeployContractInput,
    EstimateEnergyResult,
    SendTrc20Params,
    Trc20Balance,
    TriggerContractInput,
} from '../types';
import type { SmartContract, SmartContractDataWrapper, UnsignedTransactionExtention } from '../types/responses';

/** Smart-contract calls, deployment, and TRC20 reads. */
export class TronClientContracts extends TronClientTransactions {
    /** Read-only contract call (`TriggerConstantContract`). */
    async triggerConstantContract(input: TriggerContractInput): Promise<ConstantCallResult> {
        const res = await this.request<Raw>('TriggerConstantContract', buildTriggerRequest(input));
        this.assertExtentionOk('triggerConstantContract', res);
        return decodeConstantResult(res);
    }

    /**
     * State-changing contract call builder (`TriggerContract`); returns the
     * unsigned TransactionExtention for signing + broadcasting.
     *
     * The gRPC builder has no fee-limit parameter and always returns
     * `fee_limit = 0`: pass `input.feeLimit` (sun) to allow burning TRX for
     * energy, or leave it unset to run purely on staked / rented energy.
     */
    async triggerContract(input: TriggerContractInput): Promise<UnsignedTransactionExtention> {
        const res = await this.buildExtention('TriggerContract', buildTriggerRequest(input));
        return input.feeLimit === undefined ? res : applyTransactionOptions(res, { feeLimit: input.feeLimit });
    }

    /** Estimate energy for a contract call (`EstimateEnergy`). */
    async estimateEnergy(input: TriggerContractInput): Promise<EstimateEnergyResult> {
        if (!input.functionSelector && input.data === undefined) {
            throw new Error('estimateEnergy requires functionSelector+params or data');
        }
        const res = await this.request<Raw>('EstimateEnergy', buildTriggerRequest(input));
        this.assertExtentionOk('estimateEnergy', res);
        return {
            energyRequired: Number(res.energy_required ?? 0),
            result: decodeReturn(res.result),
            raw: normalizeDeep(res) as Record<string, unknown>,
        };
    }

    /**
     * Read a TRC20 token balance via `balanceOf(address)`.
     *
     * @param contractAddress TRC20 contract (base58 or hex).
     * @param ownerAddress    Holder address (base58 or hex).
     * @param decimals        Token decimals used to format `value` (default 6).
     */
    async getTrc20Balance(
        contractAddress: string,
        ownerAddress: string,
        decimals: number = 6
    ): Promise<Trc20Balance> {
        const result = await this.triggerConstantContract({
            ownerAddress,
            contractAddress,
            functionSelector: 'balanceOf(address)',
            params: encodeAddressParam(ownerAddress),
        });
        const raw = result.constantResult[0] ? decodeUint256(result.constantResult[0]) : 0n;
        return { raw: raw.toString(), decimals, value: fromBaseUnits(raw, decimals) };
    }

    /**
     * High-level TRC20 transfer: build `transfer(address,uint256)` -> sign -> broadcast.
     *
     * `success` means the node accepted the broadcast, not that the transfer
     * executed: read the receipt (`getTransactionInfoById`) for the contract result.
     * Without `feeLimit` the call burns no TRX and needs staked or rented energy.
     */
    async sendTrc20(params: SendTrc20Params): Promise<BroadcastResult> {
        const amount =
            params.decimals === undefined ? toBaseUnits(params.amount, 0) : toBaseUnits(params.amount, params.decimals);
        if (amount <= 0n) throw new Error('Transfer amount must be positive');
        const resolved = await this.readySigner(params.privateKey);
        const extention = await this.triggerContract({
            ownerAddress: params.from ?? resolved.signer.address,
            contractAddress: params.contractAddress,
            functionSelector: 'transfer(address,uint256)',
            params: encodeAddressParam(params.to) + encodeUint256(amount),
        });
        return this.signResolvedAndBroadcast(extention, resolved, params);
    }

    /** Deploy a smart contract (`DeployContract`). Returns the unsigned ext. */
    async deployContract(input: DeployContractInput): Promise<UnsignedTransactionExtention> {
        const owner = toAddressBytes(input.ownerAddress);
        const newContract: Raw = {
            origin_address: owner,
            bytecode: toBytes(input.bytecode),
            ...(input.abi ? { abi: input.abi } : {}),
            ...(input.name ? { name: input.name } : {}),
            ...(input.callValue !== undefined ? { call_value: sunString(input.callValue) } : {}),
            ...(input.consumeUserResourcePercent !== undefined
                ? { consume_user_resource_percent: input.consumeUserResourcePercent }
                : {}),
            ...(input.originEnergyLimit !== undefined ? { origin_energy_limit: input.originEnergyLimit } : {}),
        };
        const contract: Raw = { owner_address: owner, new_contract: newContract };
        if (input.tokenId !== undefined) {
            contract.token_id = input.tokenId;
            contract.call_token_value = intString(input.callTokenValue ?? 0);
        }
        const res = await this.buildExtention('DeployContract', contract);
        return input.feeLimit === undefined ? res : applyTransactionOptions(res, { feeLimit: input.feeLimit });
    }

    /** Update a contract's user-resource-percent setting (`UpdateSetting`). */
    async updateSetting(ownerAddress: string, contractAddress: string, consumeUserResourcePercent: number): Promise<UnsignedTransactionExtention> {
        return this.buildExtention('UpdateSetting', {
            owner_address: toAddressBytes(ownerAddress),
            contract_address: toAddressBytes(contractAddress),
            consume_user_resource_percent: consumeUserResourcePercent,
        });
    }

    /** Update a contract's origin energy limit (`UpdateEnergyLimit`). */
    async updateEnergyLimit(ownerAddress: string, contractAddress: string, originEnergyLimit: number | string | bigint): Promise<UnsignedTransactionExtention> {
        return this.buildExtention('UpdateEnergyLimit', {
            owner_address: toAddressBytes(ownerAddress),
            contract_address: toAddressBytes(contractAddress),
            origin_energy_limit: intString(originEnergyLimit),
        });
    }

    /** Clear a contract's ABI (`ClearContractABI`). */
    async clearContractABI(ownerAddress: string, contractAddress: string): Promise<UnsignedTransactionExtention> {
        return this.buildExtention('ClearContractABI', {
            owner_address: toAddressBytes(ownerAddress),
            contract_address: toAddressBytes(contractAddress),
        });
    }

    /** Get a contract's definition (`GetContract`). */
    async getContract(contractAddress: string): Promise<SmartContract> {
        return this.query<SmartContract>('GetContract', { value: toAddressBytes(contractAddress) });
    }

    /** Get a contract's runtime info incl. bytecode (`GetContractInfo`). */
    async getContractInfo(contractAddress: string): Promise<SmartContractDataWrapper> {
        return this.query<SmartContractDataWrapper>('GetContractInfo', { value: toAddressBytes(contractAddress) });
    }
}
