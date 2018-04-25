import {createWeb3, deployContract, expectThrow, createContract, increaseTimeTo, latestTime, durationInit} from 'ethworks-solidity';
import allSporterCoinJson from '../../build/contracts/AllSporterCoin.json';
import minterJson from '../../build/contracts/Minter.json';
import stateManagerJson from '../../build/contracts/StateManager.json';
import crowdsaleJson from '../../build/contracts/Crowdsale.json';
import kycJson from '../../build/contracts/Kyc.json';
import whitelistJson from '../../build/contracts/Whitelist.json';
import lockingJson from '../../build/contracts/LockingContract.json';
import Web3 from 'web3';
import chai from 'chai';
import bnChai from 'bn-chai';

const {expect} = chai;
const web3 = createWeb3(Web3, 20);
const {BN} = web3.utils;
chai.use(bnChai(BN));
const duration = durationInit(web3);

describe('Crowdsale', () => {
  let tokenOwner;
  let tokenContract;
  let accounts;
  let minterOwner;
  let minterContract;
  let stateContract;
  let stateContractOwner;
  let kycContract;
  let kycOwner;
  let crowdsaleContract;
  let crowdsaleOwner;
  let treasury;
  let referralWhitelistContract;
  let referralWhitelistOwner;
  let whitelistedReferral;
  let kycApprover;
  let lockingContract;
  let investor1;
  let saleStartTime;
  let unlockTime;
  const minimumContributionAmount = new BN(web3.utils.toWei('0.2'));
  const etherAmount1 = minimumContributionAmount.add(new BN('1000'));
  const singleStateEtherCap = new BN(web3.utils.toWei('10000'));
  const saleTokenCap = new BN(web3.utils.toWei('156000000'));
  const PREICO1 = 1;
  const PREICO2 = 2;
  const BREAK = 3;
  const ICO1 = 4;
  const ICO2 = 5;
  const ICO3 = 6;
  const ICO4 = 7;
  const ICO5 = 8;
  const ICO6 = 9;
  const ALLOCATING = 10;

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tokenOwner, minterOwner,
      stateContractOwner, kycOwner, crowdsaleOwner,
      treasury, referralWhitelistOwner,whitelistedReferral, kycApprover, investor1] = accounts;
  });

  beforeEach(async () => {
    // token
    tokenContract = await deployContract(web3, allSporterCoinJson, tokenOwner, []);

    // minter
    minterContract = await deployContract(web3, minterJson, minterOwner, [
      tokenContract.options.address,
      saleTokenCap
    ]);
    await tokenContract.methods.transferOwnership(minterContract.options.address).send({from: tokenOwner});

    // state manager
    saleStartTime = (new BN(await latestTime(web3))).add(duration.days(7));
    stateContract = await deployContract(web3, stateManagerJson, stateContractOwner, [
      saleStartTime,
      singleStateEtherCap
    ]);
    await minterContract.methods.add(stateContract.options.address).send({from: minterOwner});

    // kyc
    kycContract = await deployContract(web3, kycJson, kycOwner, [minterContract.options.address]);
    await minterContract.methods.add(kycContract.options.address).send({from: minterOwner});

    // referralWhitelist
    referralWhitelistContract = await deployContract(web3, whitelistJson, referralWhitelistOwner, []);
    await referralWhitelistContract.methods.add(whitelistedReferral).send({from: referralWhitelistOwner});

    // crowdsale
    unlockTime = (new BN(await latestTime(web3))).add(duration.years(6));
    crowdsaleContract = await deployContract(web3, crowdsaleJson, crowdsaleOwner, [
      minterContract.options.address,
      stateContract.options.address,
      kycContract.options.address,
      unlockTime,
      treasury,
      referralWhitelistContract.options.address
    ]);
    lockingContract = createContract(web3, lockingJson, await crowdsaleContract.methods.lockingContract().call());

    // setting whitelist referrals for the minter
    await minterContract.methods.add(kycContract.options.address).send({from: minterOwner});
    await minterContract.methods.add(crowdsaleContract.options.address).send({from: minterOwner});

    // kyc whitelist referrals
    await kycContract.methods.add(crowdsaleContract.options.address).send({from: kycOwner});
    await kycContract.methods.add(kycApprover).send({from: kycOwner});

    // state manager ownership
    await stateContract.methods.transferOwnership(crowdsaleContract.options.address).send({from: stateContractOwner});
  });

  const increaseTimeToState = async(state) => {
    const startTime = await stateContract.methods.startTimes(state).call();
    await increaseTimeTo(web3, startTime);
  };

  /* eslint-disable no-unused-vars */
  const etherBalanceOf = async (client) => new BN(await web3.eth.getBalance(client));
  const tokenBalanceOf = async (client) => new BN(await tokenContract.methods.balanceOf(client).call());
  const lockedBalanceOf = async (client) => new BN(await lockingContract.methods.balanceOf(client).call());
  const buy = async(etherAmount, from) => crowdsaleContract.methods.buy('0x0').send({from, value: etherAmount});
  const buyReferred = async(referral, etherAmount, from) => crowdsaleContract.methods.buy(referral).send({from, value: etherAmount});
  const allocate = async(beneficiary, tokenAmount, from) => crowdsaleContract.methods.allocate(beneficiary, tokenAmount).send({from});
  const allocateLocked = async(beneficiary, tokenAmount, from) => crowdsaleContract.methods.allocateLocked(beneficiary, tokenAmount).send({from});
  const finalize = async(newTokenOwner, from) => crowdsaleContract.methods.finalize(newTokenOwner).send({from});
  /* eslint-enable no-unused-vars */

  it('should be properly created', async () => {
    const actualTreasury = await crowdsaleContract.methods.treasury().call({from: crowdsaleOwner});
    expect(actualTreasury).to.be.equal(treasury);
  });

  describe('deploying', async () => {
    it('should deploy successfully with all parameters', async() => {
      const args = [
        minterContract.options.address,
        stateContract.options.address,
        kycContract.options.address,
        unlockTime,
        treasury,
        referralWhitelistContract.options.address
      ];
      await deployContract(web3, crowdsaleJson, crowdsaleOwner, args);
    });

    it('should not allow to deploy without referralWhitelist', async () => {
      const args = [
        minterContract.options.address,
        stateContract.options.address,
        kycContract.options.address,
        unlockTime,
        treasury,
        0x0 // referralWhitelist
      ];
      await expectThrow(deployContract(web3, crowdsaleJson, crowdsaleOwner, args));
    });

    it('should not allow to deploy without treasury', async () => {
      const args = [
        minterContract.options.address,
        stateContract.options.address,
        kycContract.options.address,
        unlockTime,
        0x0, // treasury
        referralWhitelistContract.options.address
      ];
      await expectThrow(deployContract(web3, crowdsaleJson, crowdsaleOwner, args));
    });

    it('should not allow to deploy with invalid unlock time', async () => {
      const args = [
        minterContract.options.address,
        stateContract.options.address,
        kycContract.options.address,
        500, // unlockTime
        treasury,
        referralWhitelistContract.options.address
      ];
      await expectThrow(deployContract(web3, crowdsaleJson, crowdsaleOwner, args));
    });

    it('should not allow to deploy without kyc', async () => {
      const args = [
        minterContract.options.address,
        stateContract.options.address,
        0x0, // kyc
        unlockTime,
        treasury,
        referralWhitelistContract.options.address
      ];
      await expectThrow(deployContract(web3, crowdsaleJson, crowdsaleOwner, args));
    });

    it('should not allow to deploy without state manager', async () => {
      const args = [
        minterContract.options.address,
        0x0, // state manager
        kycContract.options.address,
        unlockTime,
        treasury,
        referralWhitelistContract.options.address
      ];
      await expectThrow(deployContract(web3, crowdsaleJson, crowdsaleOwner, args));
    });

    it('should not allow to deploy without minter', async () => {
      const args = [
        0x0, // minter
        stateContract.options.address,
        kycContract.options.address,
        unlockTime,
        treasury,
        referralWhitelistContract.options.address
      ];
      await expectThrow(deployContract(web3, crowdsaleJson, crowdsaleOwner, args));
    });
  });

  describe('buying', async () => {
    const testShouldBuy = async (etherAmount, from) => {
      const initialTreasuryBalance = await etherBalanceOf(treasury);

      await buy(etherAmount, from);

      expect(await etherBalanceOf(treasury)).to.eq.BN(initialTreasuryBalance.add(etherAmount));
    };
    
    const testShouldNotBuy = async (etherAmount, from) => {
      const initialTreasuryBalance = await etherBalanceOf(treasury);

      await expectThrow(buy(etherAmount, from));

      expect(await etherBalanceOf(treasury)).to.eq.BN(initialTreasuryBalance);
    };

    it('should not allow to buy in presale state', async() => {
      await testShouldNotBuy(etherAmount1, investor1);
    });

    it('should allow to buy in preico stages', async() => {
      await increaseTimeToState(PREICO1);
      await testShouldBuy(etherAmount1, investor1);

      await increaseTimeToState(PREICO2);
      await testShouldBuy(etherAmount1, investor1);
    });

    it('should not allow to buy in the break state', async() => {
      await increaseTimeToState(BREAK);
      await testShouldNotBuy(etherAmount1, investor1);
    });

    it('should allow to buy in ico stages', async() => {
      await increaseTimeToState(ICO1);
      await testShouldBuy(etherAmount1, investor1);

      await increaseTimeToState(ICO2);
      await testShouldBuy(etherAmount1, investor1);

      await increaseTimeToState(ICO3);
      await testShouldBuy(etherAmount1, investor1);

      await increaseTimeToState(ICO4);
      await testShouldBuy(etherAmount1, investor1);

      await increaseTimeToState(ICO5);
      await testShouldBuy(etherAmount1, investor1);

      await increaseTimeToState(ICO6);
      await testShouldBuy(etherAmount1, investor1);
    });

    it('should not allow to buy in allocating state', async() => {
      await increaseTimeToState(ALLOCATING);
      await testShouldNotBuy(etherAmount1, investor1);
    });

    it('should not allow to buy below minimum ether contribution in all selling stages', async() => {
      await increaseTimeToState(PREICO1);
      await testShouldNotBuy(minimumContributionAmount.sub(new BN('1')), investor1);

      await increaseTimeToState(PREICO2);
      await testShouldNotBuy(minimumContributionAmount.sub(new BN('1')), investor1);

      await increaseTimeToState(ICO1);
      await testShouldNotBuy(minimumContributionAmount.sub(new BN('1')), investor1);

      await increaseTimeToState(ICO2);
      await testShouldNotBuy(minimumContributionAmount.sub(new BN('1')), investor1);

      await increaseTimeToState(ICO3);
      await testShouldNotBuy(minimumContributionAmount.sub(new BN('1')), investor1);

      await increaseTimeToState(ICO4);
      await testShouldNotBuy(minimumContributionAmount.sub(new BN('1')), investor1);

      await increaseTimeToState(ICO5);
      await testShouldNotBuy(minimumContributionAmount.sub(new BN('1')), investor1);

      await increaseTimeToState(ICO6);
      await testShouldNotBuy(minimumContributionAmount.sub(new BN('1')), investor1);
    });
  });
});
