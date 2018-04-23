import {deployContract} from 'ethworks-solidity';
import tokenJson from '../build/contracts/AllSporterCoin.json';
const Web3 = require('Web3');
const web3 = new Web3(new Web3.providers.HttpProvider(`http://localhost:7545`));


describe('Deploying', async() => {
  let owner;
  let tokenAddress;

  before(async () => {
    [owner] = await web3.eth.getAccounts();
  });

  it('Deploying AllSporter Coin', async() => {
    const contract = await deployContract(web3, tokenJson, owner, []);
    tokenAddress = contract.options.address;
    console.log(`Deployed AllSporter Coin at: ${tokenAddress}`);
  });
});
