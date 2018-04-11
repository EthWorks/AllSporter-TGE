import {deployContract} from 'ethworks-solidity';
const Web3 = require('Web3');
const web3 = new Web3(new Web3.providers.HttpProvider(`http://localhost:7545`));
import tokenJson from '../build/contracts/AllSporterCoin.json';
import saleJson from '../build/contracts/AllSporterCrowdsale.json';

describe('Deploying', async() => {
  let owner;
  let tokenAddress;
  let saleStartTime;
  let saleEndTime;

  before(async () => {
    [owner] = await web3.eth.getAccounts();
  });

  it('Deploying AllSporter Coin', async() => {
    const contract = await deployContract(web3, tokenJson, owner, []);
    tokenAddress = contract.options.address;
    console.log(`Deployed AllSporter Coin at: ${tokenAddress}`);
  });

  it('Deploying AllSporter Crowdsale', async() => {
    const timestamp = Math.round((new Date()).getTime() / 1000);
    saleStartTime = timestamp + (60 * 60);
    saleEndTime = saleStartTime + (60 * 60);
    const saleArgs = [
      tokenAddress,
      saleStartTime,
      saleEndTime
    ];
    const contract = await deployContract(web3, saleJson, owner, saleArgs);
    console.log(`Deployed AllSporter Crowdsale at: ${contract.options.address}`);
  });
});
