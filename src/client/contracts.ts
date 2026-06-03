import { TronClientTransactions } from './transactions';
import { assertExtentionOk, buildTriggerRequest, decodeConstantResult, intString, sunString, type Raw } from './helpers';
import { toAddressBytes } from '../utils/address';
import { toBytes } from '../utils/hex';
import { fromBaseUnits } from '../utils/units';
import { encodeAddressParam, decodeUint256 } from '../codecs/abi';
import type { ConstantCallResult, DeployContractInput, Trc20Balance, TriggerContractInput } from '../types';

/** Smart-contract calls, deployment, and TRC20 reads. */
export class TronClientContracts extends TronClientTransactions {
    /** Read-only contract call (`TriggerConstantContract`). */
    async triggerConstantContract(input: TriggerContractInput): Promise<ConstantCallResult> {
        const res = await this.request<Raw>('TriggerConstantContract', buildTriggerRequest(input));
        assertExtentionOk('triggerConstantContract', res);
        return decodeConstantResult(res);
    }

    /**
     * State-changing contract call builder (`TriggerContract`); returns the
     * unsigned TransactionExtention for signing + broadcasting.
     */
    async triggerContract(input: TriggerContractInput): Promise<Raw> {
        const res = await this.request<Raw>('TriggerContract', buildTriggerRequest(input));
        assertExtentionOk('triggerContract', res);
        return res;
    }

    /** Estimate energy for a contract call (`EstimateEnergy`). */
    async estimateEnergy(input: TriggerContractInput): Promise<{ energyRequired: number }> {
        if (!input.functionSelector && input.data === undefined) {
            throw new Error('estimateEnergy requires functionSelector+params or data');
        }
        const res = await this.request<Raw>('EstimateEnergy', buildTriggerRequest(input));
        assertExtentionOk('estimateEnergy', res);
        return { energyRequired: Number(res.energy_required ?? 0) };
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

    /** Deploy a smart contract (`DeployContract`). Returns the unsigned ext. */
    async deployContract(input: DeployContractInput): Promise<Raw> {
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
        return this.buildExtention('DeployContract', contract);
    }

    /** Update a contract's user-resource-percent setting (`UpdateSetting`). */
    async updateSetting(ownerAddress: string, contractAddress: string, consumeUserResourcePercent: number): Promise<Raw> {
        return this.buildExtention('UpdateSetting', {
            owner_address: toAddressBytes(ownerAddress),
            contract_address: toAddressBytes(contractAddress),
            consume_user_resource_percent: consumeUserResourcePercent,
        });
    }

    /** Update a contract's origin energy limit (`UpdateEnergyLimit`). */
    async updateEnergyLimit(ownerAddress: string, contractAddress: string, originEnergyLimit: number | string | bigint): Promise<Raw> {
        return this.buildExtention('UpdateEnergyLimit', {
            owner_address: toAddressBytes(ownerAddress),
            contract_address: toAddressBytes(contractAddress),
            origin_energy_limit: intString(originEnergyLimit),
        });
    }

    /** Clear a contract's ABI (`ClearContractABI`). */
    async clearContractABI(ownerAddress: string, contractAddress: string): Promise<Raw> {
        return this.buildExtention('ClearContractABI', {
            owner_address: toAddressBytes(ownerAddress),
            contract_address: toAddressBytes(contractAddress),
        });
    }

    /** Get a contract's definition (`GetContract`). */
    async getContract(contractAddress: string): Promise<Raw> {
        return this.query('GetContract', { value: toAddressBytes(contractAddress) });
    }

    /** Get a contract's runtime info incl. bytecode (`GetContractInfo`). */
    async getContractInfo(contractAddress: string): Promise<Raw> {
        return this.query('GetContractInfo', { value: toAddressBytes(contractAddress) });
    }
}
