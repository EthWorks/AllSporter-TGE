import {createWeb3, deployContract} from 'ethworks-solidity';
import allSporterCoinJson from '../../build/contracts/AllSporterCoin.json';
import Web3 from 'web3';
import chai from 'chai';
import bnChai from 'bn-chai';

const {expect} = chai;
const web3 = createWeb3(Web3);
chai.use(bnChai(web3.utils.BN));
const {BN} = web3.utils;

describe('AllSporter Coin', () => {
  let tokenOwner;
  let tokenContract;
  let accounts;
  const tokenCap = new BN(web3.utils.toWei('260000000'));

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tokenOwner] = accounts;
  });

  beforeEach(async () => {
    tokenContract = await deployContract(web3, allSporterCoinJson, tokenOwner,
      []);
  });

  it('should be properly created', async () => {
    const name = await tokenContract.methods.name().call({from: tokenOwner});
    const symbol = await tokenContract.methods.symbol().call({from: tokenOwner});
    const cap = new BN(await tokenContract.methods.cap().call({from: tokenOwner}));
    const decimals = new BN(await tokenContract.methods.decimals().call({from: tokenOwner}));
    expect(name).to.equal('AllSporter Coin');
    expect(symbol).to.equal('ASC');
    expect(cap).to.eq.BN(tokenCap);
    expect(decimals).to.eq.BN(18);
  });
});
