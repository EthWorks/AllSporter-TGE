# AllSporter TGE

[![Build Status](https://travis-ci.org/EthWorks/AllSporter-TGE.svg?branch=master)](https://travis-ci.org/EthWorks/AllSporter-TGE)

## AllSporter ICO details

The AllSporter ICO sports 8 different price tiers. All investments have to pass KYC before bought tokens are minted. 

### Price tiers

| Tier | Duration | Token quantity for 1 ETH |
| --- | --- | --- |
| Pre ICO 1 | 5 days | 3250 |
| Pre ICO 2 | 5 days | 3087,5 |
| Break | 3 days | Investments not possible |
| ICO 1 | 10 days | 2925 |
| ICO 2 | 10 days | 2762,5 |
| ICO 3 | 10 days | 2600 |
| ICO 4 | 10 days | 2437,5 |
| ICO 5 | 10 days | 2112,5 |
| ICO 6 | 10 days | 1950 |

### Token split

| Group | Split |
| --- | --- |
| Community and Bounty | 5% |
| Advisors, Developers, Ambassadors and Partners | 8% |
| Customer Rewards | 15% |
| Team | 17% |
| PRE-ICO & ICO | 55% |

### Locking and vesting durations

| Group | Period |
| --- | --- |
| Team | Locked for 24M |
| Customer Rewards | Vesting for 15M (first 3M frozen) |

## AllSporter Coin

| Item | Value |
| ------------- | ------------- |
| Standard  | ERC20  |
| Decimals | 18 |
| Name | AllSporter Coin |
| Symbol | ASC |
| Cap | 260M |

## AllSporter ICO technical details

The architecture of the ICO consists of the following Smart Contracts:

| Smart Contract  | Description |
| ------------- | ------------- |
| Minter | Abstract base class responsible for minting tokens and tracking sale cap |
| Tge | Main contract managing prices, permissions and the state of the ICO |
| Crowdsale | Entry point for the investors and external sales |
| DeferredKyc | Responsible for managing investments undergoing KYC process |
| ReferralManager | Manages the fees for referring investors |
| Allocator | Allows the allocation of tokens for Team & Developers, Customer Rewards, Advisors & Bounty |
| Airdropper | Proportionally mints tokens maintaining the token split percentages up to the token cap of 260M ASC |

### Architecture diagram

![Architecture](/images/architecture.png)

### Events

The Smart Contracts emit the following events on the blockchain:

#### AllSporter Coin events

| Event  | Description |
| ------------- | ------------- |
| Mint | Tokens are minted for a given address |
| MintFinished | Minting is finished, and the tokens are no longer frozen (can be transferred) |

#### Minter events

| Event  | Description |
| ------------- | ------------- |
|  |  |

#### Tge events

| Event  | Description |
| ------------- | ------------- |
| StateChanged | The state of the TGE has changed |

#### Crowdsale events

| Event  | Description |
| ------------- | ------------- |
|  |  |

#### DeferredKyc events

| Event  | Description |
| ------------- | ------------- |
| AddedToKyc | An investment has been placed under KYC |
| Approved | An investment under KYC has been approved |
| Rejected | An investment under KYC has been rejected |


#### ReferralManager events

| Event  | Description |
| ------------- | ------------- |
|  |  |

#### Allocator events

| Event  | Description |
| ------------- | ------------- |
|  |  |

#### Airdropper events

| Event  | Description |
| ------------- | ------------- |
|  |  |


## ABI

ABI (Application binary interface) files are located in the **abi** folder.

## Testing

The tests can be run using the following command:
```javascript
npm run dev:test
```
