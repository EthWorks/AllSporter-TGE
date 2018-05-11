import {createWeb3, deployContract} from 'ethworks-solidity';
import allSporterCoinJson from '../../build/contracts/AllSporterCoin.json';
import airdropperJson from '../../build/contracts/Airdropper.json';
import tgeMockJson from '../../build/contracts/TgeMock.json';
import Web3 from 'web3';
import chai from 'chai';
import bnChai from 'bn-chai';

const {expect} = chai;
const web3 = createWeb3(Web3, 20);
const {BN} = web3.utils;
chai.use(bnChai(BN));

describe('Airdropper', () => {
  let tokenOwner;
  let tokenContract;
  let minterOwner;
  let minterContract;
  let airdropperContract;
  let airdropperOwner;
  let accounts;
  let firstStateMinter;
  let secondStateMinter;
  const saleEtherCap = new BN(web3.utils.toWei('100000000'));

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tokenOwner, minterOwner, firstStateMinter, secondStateMinter,
      airdropperOwner] = accounts;
  });

  beforeEach(async () => {
    tokenContract = await deployContract(web3, allSporterCoinJson, tokenOwner,
      []);

    minterContract = await deployContract(web3, tgeMockJson, minterOwner, [
      tokenContract.options.address,
      saleEtherCap,
      firstStateMinter,
      secondStateMinter
    ]);
    await tokenContract.methods.transferOwnership(minterContract.options.address).send({from: tokenOwner});

    airdropperContract = await deployContract(web3, airdropperJson, airdropperOwner, [
      minterContract.options.address
    ]);
    minterContract.methods.addAllStateMinter(airdropperContract.options.address).send({from: minterOwner});
  });

  it('should be properly created', async () => {
    const actualMinter = await airdropperContract.methods.minter().call();
    expect(actualMinter).to.be.equal(minterContract.options.address);
  });
});
