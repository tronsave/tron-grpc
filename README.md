## What is TronGRPC?

TronGRPC is a powerful GRPC client implementation for the TRON blockchain, developed by [TronSave](https://tronsave.io) and [SaveWallet](https://savewallet.io). It provides a streamlined interface for interacting with TRON's GRPC services, making it easier to build and integrate TRON-based applications.

The library offers a unified, seamless development experience for interacting with the TRON blockchain through GRPC. Built with TypeScript, it provides type-safe interactions and modern development features while maintaining high performance and reliability.

**Project scope**

TronGRPC aims to provide comprehensive coverage of TRON's GRPC services while maintaining a clean, developer-friendly API. The project focuses on delivering:

- Full TRON GRPC protocol support
- Type-safe interactions
- Simplified integration for Node.js applications
- High performance and reliability
- Comprehensive documentation and examples

Any questions or feedback are welcome [here](https://github.com/tronsave/tron-grpc/issues/new).

## HomePage

__[TronSave](https://tronsave.io)__

__[SaveWallet](https://savewallet.io)__

__[TronTools](https://tools.tronsave.io/)__

## Compatibility

- Version built for Node.js v20 and above

## Recent History

For recent history, see the [CHANGELOG](https://github.com/tronsave/tron-grpc/blob/master/CHANGELOG.md). You can check it out for:

- New features
- Dependencies update
- Bug fix

## Installation

### Node.js

```bash
npm install tron-grpc
```

or

```bash
yarn add tron-grpc
```

## Creating an Instance

Default Tron GRPC Client using mainnet Trongrid: grpc.trongrid.io:50051

```js
const tronclient = new TronGrpcClient()
```

If you using Nile testnet

```js
const tronclient = new TronGrpcClient('grpc.nile.trongrid.io:50051')
```

## GRPC Supported Methods

### Account Methods

- [ ] getAccount - Get account information
- [ ] getAccountBalance - Get account balance at a specific block
- [ ] getAccountNet - Get account bandwidth information
- [ ] getAccountResource - Get account resource information
- [ ] createAccount - Create a new account
- [ ] updateAccount - Update account name
- [ ] accountPermissionUpdate - Update account permissions
- [ ] getAccountById - Get account by ID
- [ ] getAccountAssets - Get all assets owned by account
- [ ] getAccountNotExists - Check if account doesn't exist

### Transaction Methods

- [ ] createTransaction - Create a TRX transfer transaction
- [ ] getTransaction - Get transaction by ID
- [ ] getTransactionInfo - Get transaction info by ID
- [ ] getTransactionById - Get transaction details by ID
- [ ] getTransactionInfoByBlockNum - Get all transaction info in a block
- [ ] getTransactionCountByBlockNum - Get transaction count in a block
- [ ] broadcastTransaction - Broadcast signed transaction
- [ ] getTransactionSignWeight - Get transaction sign weight
- [ ] getTransactionApprovedList - Get transaction approved list
- [ ] getTransactionFromPending - Get transaction from pending pool
- [ ] getTransactionListFromPending - Get all transactions from pending pool

### Block Methods

- [ ] getNowBlock - Get current block
- [ ] getBlockByNum - Get block by number
- [ ] getBlockById - Get block by ID
- [ ] getBlockByLimitNext - Get blocks between start and end
- [ ] getBlockByLatestNum - Get latest N blocks
- [ ] getBlock - Get block by number with details option
- [ ] getBlockBalanceTrace - Get block balance changes
- [ ] getBlockIndex - Get block index by block hash
- [ ] getBlockByHash - Get block by block hash
- [ ] getBlockHeader - Get block header

### Smart Contract Methods

- [ ] getContract - Get contract code
- [ ] getContractInfo - Get contract information
- [ ] triggerContract - Trigger smart contract
- [ ] triggerConstantContract - Trigger constant contract (view/pure)
- [ ] estimateEnergy - Estimate energy cost for contract call
- [ ] updateSetting - Update contract consume_user_resource_percent
- [ ] updateEnergyLimit - Update contract origin_energy_limit
- [ ] clearContractABI - Clear contract ABI
- [ ] deployContract - Deploy new smart contract
- [ ] getContractEvents - Get contract events
- [ ] getContractStats - Get contract statistics
- [ ] updateContractParams - Update contract parameters

### Resource Methods

- [ ] freezeBalanceV2 - Freeze TRX for resources (V2)
- [ ] unfreezeBalance - Unfreeze TRX (legacy)
- [ ] unfreezeBalanceV2 - Unfreeze TRX (V2)
- [ ] withdrawExpireUnfreeze - Withdraw expired unfrozen TRX
- [ ] getDelegatedResourceV2 - Get resource delegation info
- [ ] delegateResource - Delegate resources to another account
- [ ] unDelegateResource - Undelegate resources
- [ ] cancelAllUnfreezeV2 - Cancel all unfreezing transactions
- [ ] getResourceUsage - Get account resource usage details
- [ ] getDelegatedResourceAccountIndex - Get delegated resource index
- [ ] getResourcePrices - Get current resource prices

### Asset Methods

- [ ] transferAsset - Transfer TRC10 tokens
- [ ] updateAsset - Update TRC10 token parameters
- [ ] getAssetIssueByAccount - Get account's TRC10 tokens
- [ ] createAssetIssue - Create new TRC10 token
- [ ] participateAssetIssue - Participate in TRC10 token sale
- [ ] getAssetIssueByName - Get TRC10 token by name
- [ ] getAssetIssueListByName - Get TRC10 tokens by name
- [ ] getAssetIssueById - Get TRC10 token by ID
- [ ] getAssetIssueList - Get all TRC10 tokens
- [ ] getPaginatedAssetIssueList - Get paginated TRC10 tokens

### Witness (Super Representative) Methods

- [ ] createWitness - Apply for Super Representative
- [ ] updateWitness - Update SR URL
- [ ] voteWitness - Vote for SR
- [ ] getListWitnesses - Get all SR list
- [ ] updateBrokerage - Update SR brokerage
- [ ] getBrokerageInfo - Get SR brokerage info
- [ ] getRewardInfo - Get SR rewards
- [ ] withdrawBalance - Withdraw SR rewards
- [ ] getWitnessPermission - Get SR permissions
- [ ] getWitnessesByVoteCount - Get SRs sorted by votes

### Network Methods

- [ ] listNodes - List all nodes
- [ ] getNodeInfo - Get node information
- [ ] getBandwidthPrices - Get bandwidth prices
- [ ] getEnergyPrices - Get energy prices
- [ ] getMemoFee - Get memo fee
- [ ] getBurnTrx - Get burned TRX amount
- [ ] getChainParameters - Get chain parameters
- [ ] totalTransaction - Get total transaction count
- [ ] getNextMaintenanceTime - Get next maintenance time
- [ ] getConnectedNodes - Get connected node list
- [ ] getBlockProduction - Get block production stats
- [ ] getNodeMetrics - Get node performance metrics
- [ ] getNetworkResources - Get network resource status

### Proposal Methods

- [ ] getProposalList - Get all proposals
- [ ] getPaginatedProposalList - Get paginated proposals
- [ ] getProposalById - Get proposal by ID
- [ ] createProposal - Create new network proposal
- [ ] approveProposal - Approve network proposal
- [ ] deleteProposal - Delete network proposal
- [ ] getChainConfig - Get current chain configuration

### Resource Query Methods

- [ ] getCanDelegatedMaxSize - Get max delegatable size
- [ ] getAvailableUnfreezeCount - Get available unfreeze count
- [ ] getCanWithdrawUnfreezeAmount - Get withdrawable unfreeze amount
- [ ] getResourceDelegationByAccount - Get resource delegation by account
- [ ] getAccountFrozenBalance - Get account frozen balance
- [ ] getAccountAllowance - Get account resource allowance

### Market Methods

- [ ] getMarketOrderById - Get market order by ID
- [ ] getMarketOrderByAccount - Get market orders by account
- [ ] getMarketPriceByPair - Get market price by pair
- [ ] getMarketOrderListByPair - Get market orders by pair
- [ ] getMarketPairList - Get all market pairs

### Exchange Methods

- [ ] getExchangeById - Get exchange by ID
- [ ] getExchangeByAccount - Get exchanges by account
- [ ] getExchangeList - Get all exchanges
- [ ] getPaginatedExchangeList - Get paginated exchanges
- [ ] createExchange - Create new exchange
- [ ] injectExchange - Inject capital into exchange
- [ ] withdrawExchange - Withdraw capital from exchange
- [ ] tradeExchange - Trade on exchange

## Testnet

Nile is the official Tron testnet. To use it use the following endpoint:

```
grpc.nile.trongrid.io:50051
```

Get some Nile TRX at [faucet](https://nileex.io/join/getJoinPage) and play with it.
Anything you do should be explorer on [nile.tronscan.org](https://nile.tronscan.org)

## Your local private network for heavy testing

You can set up your own private network, running Tron Quickstart. To do it you must [install Docker](https://docs.docker.com/install/) and, when ready, run a command like

```bash
docker run -it --rm \
  -p 50051:50051 \
  -e "defaultBalance=100000" \
  -e "showQueryString=true" \
  -e "showBody=true" \
  -e "formatJson=true" \
  --name tron \
  trontools/quickstart
```

[More details about Tron Quickstart on GitHub](https://github.com/tron-us/docker-tron-quickstart)

## FAQ

## Contact

```
mail: admin@tronsave.io
```
