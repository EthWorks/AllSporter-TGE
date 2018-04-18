import {createWeb3, deployContract, expectThrow} from 'ethworks-solidity';
import allSporterCoinJson from '../../build/contracts/AllSporterCoin.json';
import minterJson from '../../build/contracts/Minter.json';
import kycJson from '../../build/contracts/Kyc.json';
import Web3 from 'web3';
import chai from 'chai';
import bnChai from 'bn-chai';

const {expect} = chai;
const web3 = createWeb3(Web3);
const {BN} = web3.utils;
chai.use(bnChai(BN));

describe('Kyc', () => {
  let tokenOwner;
  let tokenContract;
  let accounts;
  let minterOwner;
  let minterContract;
  let whitelisted;
  let notWhitelisted;
  let kycOwner;
  let kycContract;
  let investor1;
  let investor2;
  const etherAmount1 = new BN('10000');
  const tokenAmount1 = new BN('30000');

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tokenOwner, minterOwner, whitelisted, investor1, investor2, notWhitelisted, kycOwner] = accounts;
  });

  beforeEach(async () => {
    // token
    tokenContract = await deployContract(web3, allSporterCoinJson, tokenOwner, []);

    // minter
    minterContract = await deployContract(web3, minterJson, minterOwner, [tokenContract.options.address]);
    await tokenContract.methods.transferOwnership(minterContract.options.address).send({from: tokenOwner});

    // kyc
    kycContract = await deployContract(web3, kycJson, kycOwner, [minterContract.options.address]);
    await minterContract.methods.add(kycContract.options.address).send({from: minterOwner});
    await kycContract.methods.add(whitelisted).send({from: kycOwner});
  });

  const addToKyc = async (beneficiary, etherAmount, tokenAmount, from) => 
    kycContract.methods.addToKyc(beneficiary, etherAmount, tokenAmount).send({from});

  const approve = async(beneficiary, from) => kycContract.methods.approve(beneficiary).send({from});
  const reject = async(beneficiary, from) => kycContract.methods.reject(beneficiary).send({from});

  it('should be properly created', async () => {
    const actualMinterAddress = await kycContract.methods.minter().call({from: kycOwner});
    expect(actualMinterAddress).to.be.equal(minterContract.options.address);
  });

  describe('adding to kyc', async () => {
    it('should allow to add to kyc by whitelisted', async () => {
      await addToKyc(investor1, etherAmount1, tokenAmount1, whitelisted);
    });
  
    it('should not allow to add to kyc by not whitelisted', async () => {
      await expectThrow(addToKyc(investor1, etherAmount1, tokenAmount1, notWhitelisted));
    });
  });

  describe('approving', async () => {
    beforeEach(async() => {
      await addToKyc(investor1, etherAmount1, tokenAmount1, whitelisted); 
    });

    it('should allow to approve by whitelisted', async () => {
      await approve(investor1, whitelisted);
    });
  
    it('should not allow to approve by not whitelisted', async () => {
      await expectThrow(approve(investor1, notWhitelisted));
    });

    it('should not throw when approving twice', async () => {
      await approve(investor1, whitelisted);
      await approve(investor1, whitelisted);
    });

    it('should not throw when approving investment not added to kyc', async () => {
      await approve(investor2, whitelisted);
    });
  });

  describe('rejecting', async () => {
    beforeEach(async() => {
      await addToKyc(investor1, etherAmount1, tokenAmount1, whitelisted); 
    });

    it('should allow to reject by whitelisted', async () => {
      await reject(investor1, whitelisted);
    });
  
    it('should not allow to reject by not whitelisted', async () => {
      await expectThrow(reject(investor1, notWhitelisted));
    });

    it('should not throw when rejecting twice', async () => {
      await reject(investor1, whitelisted);
      await reject(investor1, whitelisted);
    });

    it('should not throw when rejecting investment not added to kyc', async () => {
      await reject(investor2, whitelisted);
    });
  });
});
