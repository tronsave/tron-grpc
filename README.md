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
npm install --save tron-grpc google-protobuf tslib
```

or

```bash
yarn add tron-grpc google-protobuf tslib
```

## Creating an Instance

Default Tron GRPC Client using mainnet Trongrid: grpc.trongrid.io:50051

```js
import { TronGrpcClient } from 'tron-grpc';
const tronclient = new TronGrpcClient()
const account = await tronclient.getAccount('TRxxxxxxxxxxx');
```

If you using Nile testnet

```js
const tronclient = new TronGrpcClient('grpc.nile.trongrid.io:50051')
```

## GRPC Supported Methods

### Account Methods

- [X] getAccount - Get account information
- [X] getAccountBalance - Get account balance at a specific block
- [X] getAccountNet - Get account bandwidth information
- [X] getAccountResource - Get account resource information
- [X] createAccount - Create a new account
- [X] updateAccount - Update account name
- [X] accountPermissionUpdate - Update account permissions
- [ ] getAccountById - Get account by ID

### Transaction Methods

- [X] createTransaction - Create a TRX transfer transaction
- [X] getTransaction - Get transaction by ID
- [X] getTransactionInfo - Get transaction info by ID
- [X] getTransactionById - Get transaction details by ID
- [X] getTransactionInfoByBlockNum - Get all transaction info in a block
- [X] getTransactionCountByBlockNum - Get transaction count in a block
- [X] broadcastTransaction - Broadcast signed transaction
- [X] getTransactionSignWeight - Get transaction sign weight
- [X] getTransactionApprovedList - Get transaction approved list
- [ ] getTransactionFromPending - Get transaction from pending pool
- [ ] getTransactionListFromPending - Get all transactions from pending pool

### Block Methods

- [X] getNowBlock - Get current block
- [X] getBlockByNum - Get block by number
- [X] getBlockById - Get block by ID
- [X] getBlockByLimitNext - Get blocks between start and end
- [X] getBlockByLatestNum - Get latest N blocks
- [X] getBlock - Get block by number with details option
- [X] getBlockBalanceTrace - Get block balance changes

### Smart Contract Methods

- [X] getContract - Get contract code
- [X] getContractInfo - Get contract information
- [X] triggerContract - Trigger smart contract
- [X] triggerConstantContract - Trigger constant contract (view/pure)
- [X] estimateEnergy - Estimate energy cost for contract call
- [X] updateSetting - Update contract consume_user_resource_percent
- [X] updateEnergyLimit - Update contract origin_energy_limit
- [X] clearContractABI - Clear contract ABI
- [X] deployContract - Deploy new smart contract

### Resource Methods

- [X] freezeBalanceV2 - Freeze TRX for resources (V2)
- [X] unfreezeBalance - Unfreeze TRX (legacy)
- [X] unfreezeBalanceV2 - Unfreeze TRX (V2)
- [X] withdrawExpireUnfreeze - Withdraw expired unfrozen TRX
- [X] getDelegatedResourceV2 - Get resource delegation info
- [X] delegateResource - Delegate resources to another account
- [X] unDelegateResource - Undelegate resources
- [X] cancelAllUnfreezeV2 - Cancel all unfreezing transactions
- [ ] getResourceUsage - Get account resource usage details
- [X] getDelegatedResourceAccountIndex - Get delegated resource index
- [X] getDelegatedResourceAccountIndexV2 - Get delegated resource index V2

### Asset Methods

- [X] transferAsset - Transfer TRC10 tokens
- [X] updateAsset - Update TRC10 token parameters
- [X] getAssetIssueByAccount - Get account's TRC10 tokens
- [ ] createAssetIssue - Create new TRC10 token
- [ ] participateAssetIssue - Participate in TRC10 token sale
- [ ] getAssetIssueByName - Get TRC10 token by name
- [ ] getAssetIssueListByName - Get TRC10 tokens by name
- [ ] getAssetIssueById - Get TRC10 token by ID
- [ ] getAssetIssueList - Get all TRC10 tokens
- [ ] getPaginatedAssetIssueList - Get paginated TRC10 tokens

### Witness (Super Representative) Methods

- [X] createWitness - Apply for Super Representative
- [X] updateWitness - Update SR URL
- [X] voteWitness - Vote for SR
- [X] getListWitnesses - Get all SR list
- [X] updateBrokerage - Update SR brokerage
- [X] getBrokerageInfo - Get SR brokerage info
- [X] getRewardInfo - Get SR rewards
- [ ] withdrawBalance - Withdraw SR rewards

### Network Methods

- [X] listNodes - List all nodes
- [X] getNodeInfo - Get node information
- [X] getBandwidthPrices - Get bandwidth prices
- [X] getEnergyPrices - Get energy prices
- [X] getMemoFee - Get memo fee
- [X] getBurnTrx - Get burned TRX amount
- [X] getChainParameters - Get chain parameters
- [X] totalTransaction - Get total transaction count
- [X] getNextMaintenanceTime - Get next maintenance time
- [ ] getConnectedNodes - Get connected node list
- [ ] getBlockProduction - Get block production stats
- [ ] getNodeMetrics - Get node performance metrics
- [ ] getNetworkResources - Get network resource status

### Proposal Methods

- [X] getProposalList - Get all proposals
- [X] getPaginatedProposalList - Get paginated proposals
- [X] getProposalById - Get proposal by ID
- [ ] createProposal - Create new network proposal
- [ ] approveProposal - Approve network proposal
- [ ] deleteProposal - Delete network proposal

### Resource Query Methods

- [X] getCanDelegatedMaxSize - Get max delegatable size
- [X] getAvailableUnfreezeCount - Get available unfreeze count
- [X] getCanWithdrawUnfreezeAmount - Get withdrawable unfreeze amount

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
