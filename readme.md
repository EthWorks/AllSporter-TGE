# AllSporter coin and ICO

[![Build Status](https://travis-ci.com/EthWorks/allsporter-crowdsale.svg?token=KKBqp4NVqooxKsABJQeo&branch=master)](https://travis-ci.com/EthWorks/allsporter-crowdsale)

## AllSporter Coin

| Item  | Value |
| ------------- | ------------- |
| Standard  | ERC20  |
| Decimals | 18 |
| Name | AllSporter Coin |
| Symbol | ASC |

## AllSporter ICO

The AllSporter ICO sports 8 different price tiers. All investments have to pass KYC before bought tokens are minted. The architecture of the ICO consists of the following Smart Contracts:

| Smart Contract  | Description |
| ------------- | ------------- |
| Crowdsale | Allows the investors to buy tokens for the current price. Allows the owner to allocate tokens for team & advisors. Also records external sales. |
| Kyc | Manages pending investments before they are approved or rejected |
| Minter | Takes care of minting tokens for investors and allocations, taking into account the token cap and the sale token cap. Also takes into account tokens placed under kyc before they are rejected or confirmed |
| StateManager | Manages the state of the ICO, which is based on time and on contributions made by the investors |
| ReferralWhitelist | Restricts referrals to whitelisted only |

### Architecture diagram

![Architecture](/images/architecture.png)

## Events

The Smart Contracts emit the following events on the blockchain:

### Crowdsale events

| Event  | Description |
| ------------- | ------------- |
| ContributionMade | An investment has been recorded |
| ExternalSaleNoted | An external sale has been recorded. Successful KYC pass is assumed |
| PercentageAllocationMade | A percentage allocation has been recorded |
| LockedPercentageAllocationMade | A percentage allocation has been recorded. These tokens will be additionally locked after the sale end time |
| ReferralBonusAdded | A purchase with a referral has been noted. Bonus tokens have been added for the referral and the referred. |

### Kyc events

| Event  | Description |
| ------------- | ------------- |
| AddedToKyc | An investment has been placed under KYC |
| Approved | An investment under KYC has been approved |
| Rejected | An investment under KYC has been rejected |

### Minter events

| Event  | Description |
| ------------- | ------------- |
| LockedContribution | Investor's tokens from an investment placed under KYC have been locked |
| RejectedContribution | Investor's locked tokens have been rejected after failing KYC |
| ConfirmedContribution | Investor's locked tokens have been confirmed after passing KYC |
| MintedAllocation | Allocated tokens have been minted |

### StateManager events

| Event  | Description |
| ------------- | ------------- |
| StateChanged | The state of the ICO has changed |

### AllSporter Coin events

| Event  | Description |
| ------------- | ------------- |
| Mint | Tokens are minted for a given address |
| MintFinished | Minting is finished, and the tokens are no longer frozen (can be transferred) |

## Deploying and testing

### Deploying

If you are running Parity node on your device you can deploy the contracts with placeholder values using the following command:

```javascript
npm run deploy
```

Placeholder values can be changed in **scripts/deploy.js** file.

### ABI

ABI (Application binary interface) files are located in the **abi** folder.

### Testing

The tests can be run using the following command:
```javascript
npm run dev:test
```
