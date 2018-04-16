# AllSporter
AllSporter coin and ICO

[![Build Status](https://travis-ci.com/EthWorks/allsporter-crowdsale.svg?token=KKBqp4NVqooxKsABJQeo&branch=master)](https://travis-ci.com/EthWorks/allsporter-crowdsale)

## AllSporter Coin

| Item  | Value |
| ------------- | ------------- |
| Standard  | ERC20  |
| Decimals | 18 |
| Name | AllSporter Coin |
| Symbol | ASC |

## AllSporter Crowdsale

The Smart Contract for managing the AllSporter Coin Crowdsale. The Crowdsale consists of the following phases:

* Presale
* 2-tiered Pre-ICO
* 6-tiered ICO phase

The investments can come from 3 different sources:
* External sales, e.g. BTC investments
* Direct sales in ETH
* Team & Advisors allocations

### Events

The Smart Contracts emit the following events on the blockchain:

| Event  | Description |
| ------------- | ------------- |
|  |  |

## Deploying

If you are running Parity node on your device you can deploy the contracts with placeholder values using the following command:

```javascript
npm run deploy
```

Placeholder values can be changed in **scripts/deploy.js** file.

## Parity wallet

If you are using the Parity Wallet, you can watch the smart contracts by importing ABI files located in **abi** folder.

## Tests

The tests can be run using the following command:
```javascript
npm run dev:test
```
