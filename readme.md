# AllSporter TGE

[![Build Status](https://travis-ci.org/EthWorks/AllSporter-TGE.svg?branch=master)](https://travis-ci.org/EthWorks/AllSporter-TGE)

## AllSporter ICO details

The AllSporter ICO sports 8 different price tiers. All investments have to pass KYC before bought tokens are minted. Additionally, there is an optional private ICO (or multiple private ICOs).

## Security

The codebase have been audited, confirming security of the Smart Contracts. The report can be found in the **audit** folder.

### Price tiers

| Tier | Duration | Token quantity for 1 ETH |
| --- | --- | --- |
| Presale | TBD | 4764,9 |
| Pre ICO 1 | 5 days | 2600,5 |
| Pre ICO 2 | 5 days | 2510,8 |
| ICO 1 | 5 days | 2275,4 |
| ICO 2 | 5 days | 2206,4 |
| ICO 3 | 5 days | 2080,3 |
| ICO 4 | 5 days | 2022,5 |
| ICO 5 | 5 days | 1916 |
| ICO 6 | 5 days | 1820,2 |

### Token split

| Group | Split |
| --- | --- |
| Community and Bounty | 5% |
| Advisors, Developers, Ambassadors and Partners | 8% |
| Customer Rewards | 15% |
| Team | 17% |
| PRE-ICO & ICO | 55% |

### Unlocking duration

| Group | Period |
| --- | --- |
| Team | Locked for 24 months |
| Customer Rewards | Unlocking over 15 months (first 3 months frozen) |

### Private ICO

The owner can conduct a private ICO in presale (before pre iCO 1 tier starts). The private ICO is customized with the following parameters:

* total ether cap
* token quantity for 1 ETH
* start time
* end time
* minimum contribution

After one private ICO ends and is finalized by the owner, it's possible to create another one if there is still time before pre ICO 1 tier.

## AllSporter Coin

| Item | Value |
| ------------- | ------------- |
| Standard  | ERC20  |
| Decimals | 18 |
| Name | AllSporter Coin |
| Symbol | ALL |
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
| Airdropper | Proportionally mints tokens maintaining the token split percentages up to the token cap of 260M ALL |

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
| Minted | A portion of tokens has been minted |
| Reserved | A portion of ether in the sale ether cap has been reserved |
| Unreserved | Reserved portion of ether has been unreserved |
| MintedReserved | Reserved portion of ether has been minted |

#### Tge events

| Event  | Description |
| ------------- | ------------- |
| StateChanged | The state of the TGE has changed |
| PrivateIcoInitialized | Private ICO has been initialized |
| PrivateIcoFinalized | Private ICO has been finalized by the owner |

#### Crowdsale events

| Event  | Description |
| ------------- | ------------- |
| Bought | Tokens have been bought by an investor |
| SaleNoted | External sale has been noted |
| SaleLockedNoted | External sale has been noted and locked |

#### DeferredKyc events

| Event  | Description |
| ------------- | ------------- |
| AddedToKyc | An investment has been placed under KYC |
| Approved | An investment under KYC has been approved |
| Rejected | An investment under KYC has been rejected |
| RejectedWithdrawn | Investment that did not pass KYC has been withdrawn |
| ApproverTransferred | The approver of the KYC has been changed |


#### ReferralManager events

| Event  | Description |
| ------------- | ------------- |
| FeeAdded | A referral fee has been minted |

#### Allocator events

| Event  | Description |
| ------------- | ------------- |
| Initialized | The contract has been initialized |
| AllocatedCommunity | Tokens have been allocated for group: Community and Bounty |
| AllocatedAdvisors | Tokens have been allocated for group: Advisors, Developers, Ambassadors and Partners |
| AllocatedCustomer | Tokens have been allocated for group: Customer Rewards |
| AllocatedTeam | Tokens have been allocated for group: Team |
| LockedTokensReleased | Locked tokens are unlocked after locking period |
| VestedTokensReleased | A portion of vested tokens is released |

#### Airdropper events

| Event  | Description |
| ------------- | ------------- |
| Initialized | The contract has been initialized with the current state of token total supply |
| Airdropped | The tokens have been minted for an account |


## ABI

ABI (Application binary interface) files are located in the **abi** folder.

## Testing

The tests can be run using the following command:
```javascript
npm run dev:test
```
