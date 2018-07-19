# UI Use Cases
Use cases for the crowdsale UI

# Moving states

## Actions:

1. **Move State** in **TGE** tab

## Expected:

1. Tokens for ether should amount to 0 in non-selling states

<img src="/images/ui-cases/1.1.png" width="660">

2. Tokens for ether should be calculated for PRE-ICO and ICO states

<img src="/images/ui-cases/1.2.png" width="480">
<img src="/images/ui-cases/1.3.png" width="480">

3. Should be able to move states from beginning to end

<img src="/images/ui-cases/1.4.png" width="660">

4. Should display **MoveState** events

<img src="/images/ui-cases/1.5.png" width="250">

## Notes:

- For safety, moving state to **Finished** state is possible only via script

# Noting sales

## Actions:

1. **Note sale** in **Crowdsale** tab
2. **Note sale (locked)** in **Crowdsale** tab

## Expected:

1. Should display **SaleNoted** and **SaleLockedNoted** events

<img src="/images/ui-cases/2.1.png" width="700">

2. Should update ICO progress and total tokens minted

<img src="/images/ui-cases/2.2.png" width="700">

# Buying and KYC

## Actions:

1. **Move state** to a selling state in **TGE** tab
2. **Buy** in **Crowdsale** tab
3. **Approve** or **Reject** in **KYC** tab
3. **Withdraw Rejected** or **Force Withdraw Rejected** in **KYC** tab

## Expected:

1. Should display **Bought** events

2. Should increase TGE progress when buying, but not mint any tokens

<img src="/images/ui-cases/3.3.png" width="700">

3. Should revert TGE progress when **Rejecting**

<img src="/images/ui-cases/3.4.png" width="700">

4. Should mint the tokens when **Approving**

<img src="/images/ui-cases/3.5.png" width="700">

5. Should display **RejectedWithdrawn** events

<img src="/images/ui-cases/3.6.png" width="700">

## Notes:

- There is a minimum contribution in ether when buying in pre-ico and ico (1 eth and 0.2 eth respectively)
- For safety, changing the approver is possible only via script

# Referrals

## Actions:

1. **Move** state to a selling state

2. **Add referral token fee** in **Referrals** tab

<img src="/images/ui-cases/4.1.png" width="400">

## Expected:

1. Should display **FeeAdded** tokens

<img src="/images/ui-cases/4.2.png" width="480">

# Allocations

## Actions:

1. **Note sale** some amount of tokens for any investor
2. Move to **Allocating** state
3. **Allocate** for 4 different groups

## Expected:

1. Should display **AllocatedCommunity**, **AllocatedAdvisors**, **AllocatedCustomer** and **AllocatedTeam** events

<img src="/images/ui-cases/5.1.png" width="550">

## Notes:

- There is a maximum amount to allocate calculated as a percent of total tokens minted, so it is required to note or buy some tokens first

# Airdropping

## Actions:

1. **Note sale** for some investors
2. Move to **Airdrop** state
3. **Drop** or **Drop multiple** in Airdrops tab for all investors

<img src="/images/ui-cases/6.2.png" width="420">

## Expected:

1. Should display **Airdropped** events

<img src="/images/ui-cases/6.3.png" width="500">

1. Should mint up to total token cap of 260M ALL

<img src="/images/ui-cases/6.4.png" width="440">

## Notes:

- Missing fractions of the token on last decimal places is expected

## Actions:

1. Initialize Private ICO in **TGE** tab
2. Buy during Private ico
3. Finalize Private ICO in **TGE** tab

<img src="/images/ui-cases/7.0.png" width="420">

## Expected:

1. Should indicate whether the Private Ico is active / finalized

<img src="/images/ui-cases/7.1.png" width="660">

2. Should allow to buy during private ico
3. Should not allow to finalize before private ico ends
4. Should not allow to finalize if KYC not finished
5. Should display **PrivateIcoInitialized** and **PrivateIcoFinalized** events

<img src="/images/ui-cases/7.2.png" width="660">
