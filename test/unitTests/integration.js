import {createWeb3, deployContract, latestTime, expectThrow, increaseTime, increaseTimeTo, durationInit, createContract} from 'ethworks-solidity';
import allSporterCoinJson from '../../build/contracts/AllSporterCoin.json';
import tgeJson from '../../build/contracts/Tge.json';
import crowdsaleJson from '../../build/contracts/Crowdsale.json';
import referralManagerJson from '../../build/contracts/ReferralManager.json';
import allocatorJson from '../../build/contracts/Allocator.json';
import airdropperJson from '../../build/contracts/Airdropper.json';
import deferredKycJson from '../../build/contracts/DeferredKyc.json';
import Web3 from 'web3';
import chai from 'chai';
import bnChai from 'bn-chai';

const {expect} = chai;
const web3 = createWeb3(Web3, 20);
const {BN} = web3.utils;
chai.use(bnChai(BN));
const duration = durationInit(web3);

describe('Integration', () => {
  let accounts;
  let tokenContract;
  let tokenOwner;
  let saleStartTime;
  let tgeContract;
  let tgeOwner;
  let crowdsaleContract;
  let crowdsaleOwner;
  let approver;
  let treasury;
  let referralManagerContract;
  let referralManagerOwner;
  let allocatorContract;
  let allocatorOwner;
  let airdropperContract;
  let airdropperOwner;
  let kycContract;
  let investor1;
  let referring;
  let community1;
  let advisor1;
  let customer1;
  let team1;
  const saleEtherCap = new BN(web3.utils.toWei('100000000'));
  const singleStateEtherCap = new BN(web3.utils.toWei('10000'));
  const etherAmount1 = new BN(web3.utils.toWei('1000'));
  const tokenAmount1 = new BN(web3.utils.toWei('4000'));
  const PRESALE = 0;
  const PREICO1 = 1;
  const PREICO2 = 2;
  const BREAK = 3;
  const ICO1 = 4;
  const ICO2 = 5;
  const ICO3 = 6;
  const ICO4 = 7;
  const ICO5 = 8;
  const ICO6 = 9;
  const FINISHING_ICO = 10;
  const ALLOCATING = 11;
  const AIRDROPPING = 12;
  const FINISHED = 13;

  const currentState = async() => {
    await updateState();
    return await tgeContract.methods.currentState().call();
  };

  const increaseTimeToState = async(state) => {
    const startTime = await tgeContract.methods.startTimes(state).call();
    await increaseTimeTo(web3, startTime);
    await updateState();
  };

  const updateState = async() => tgeContract.methods.updateState().send({from: tgeOwner});
  const moveState = async (fromState, toState) => tgeContract.methods.moveState(fromState, toState).send({from: tgeOwner});
  const etherBalanceOf = async (client) => new BN(await web3.eth.getBalance(client));
  const buy = async(etherAmount, from) => crowdsaleContract.methods.buy().send({from, value: etherAmount});
  const noteSale = async(account, etherAmount, tokenAmount) => crowdsaleContract.methods.noteSale(account, etherAmount, tokenAmount).send({from: crowdsaleOwner});
  const tokenBalanceOf = async (client) => new BN(await tokenContract.methods.balanceOf(client).call());
  const allocateCommunity = async(account, tokenAmount) => allocatorContract.methods.allocateCommunity(account, tokenAmount).send({from: allocatorOwner});
  const allocateAdvisors = async(account, tokenAmount) => allocatorContract.methods.allocateAdvisors(account, tokenAmount).send({from: allocatorOwner});
  const allocateCustomer = async(account, tokenAmount) => allocatorContract.methods.allocateCustomer(account, tokenAmount).send({from: allocatorOwner});
  const allocateTeam = async(account, tokenAmount) => allocatorContract.methods.allocateTeam(account, tokenAmount).send({from: allocatorOwner});
  const drop = async(account) => airdropperContract.methods.drop(account).send({from: airdropperOwner});
  const approve = async(account) => kycContract.methods.approve(account).send({from: approver});
  const reject = async(account) => kycContract.methods.reject(account).send({from: approver});
  const addFee = async(referring, referringPercent, referred, referredPercent) =>
    referralManagerContract.methods.addFee(referring, referringPercent, referred, referredPercent).send({from: referralManagerOwner});

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tokenOwner, tgeOwner, crowdsaleOwner, approver, treasury, referralManagerOwner, allocatorOwner, airdropperOwner,
      investor1, referring, community1, advisor1, customer1, team1] = accounts;
  });

  beforeEach(async () => {
    saleStartTime = await latestTime(web3) + 100;

    // TOKEN
    tokenContract = await deployContract(web3, allSporterCoinJson, tokenOwner,
      []);

    // TGE
    tgeContract = await deployContract(web3, tgeJson, tgeOwner, [
      tokenContract.options.address,
      saleEtherCap,
      saleStartTime,
      singleStateEtherCap
    ]);
    await tokenContract.methods.transferOwnership(tgeContract.options.address).send({from: tokenOwner});

    // CROWDSALE
    crowdsaleContract = await deployContract(web3, crowdsaleJson, crowdsaleOwner, [
      tgeContract.options.address,
      approver,
      treasury
    ]);

    // DEFERRED KYC
    const deferredKycAddress = await crowdsaleContract.methods.deferredKyc().call();
    kycContract = await createContract(web3, deferredKycJson, deferredKycAddress);

    // REFERRAL MANAGER
    referralManagerContract = await deployContract(web3, referralManagerJson, referralManagerOwner, [
      tgeContract.options.address
    ]);
    
    // ALLOCATOR
    allocatorContract = await deployContract(web3, allocatorJson, allocatorOwner, [
      tgeContract.options.address
    ]);

    // AIRDROPPER
    airdropperContract = await deployContract(web3, airdropperJson, airdropperOwner, [
      tgeContract.options.address
    ]);

    // TGE DEPENDENCIES
    await tgeContract.methods.initialize(
      crowdsaleContract.options.address,
      kycContract.options.address,
      referralManagerContract.options.address,
      allocatorContract.options.address,
      airdropperContract.options.address
    ).send({from: tgeOwner});
  });

  describe('initialization', async () => {
    it('should initialize fields in Tge properly', async () => {
      expect(await tgeContract.methods.crowdsale().call()).to.be.equal(crowdsaleContract.options.address);
      expect(await tgeContract.methods.deferredKyc().call()).to.be.equal(kycContract.options.address);
      expect(await tgeContract.methods.referralManager().call()).to.be.equal(referralManagerContract.options.address);
      expect(await tgeContract.methods.allocator().call()).to.be.equal(allocatorContract.options.address);
      expect(await tgeContract.methods.airdropper().call()).to.be.equal(airdropperContract.options.address);
      expect(await tgeContract.methods.currentState().call()).to.eq.BN(PRESALE);
    });
  
    it('should initialize fields in Crowdsale properly', async () => {
      expect(await crowdsaleContract.methods.minter().call()).to.be.equal(tgeContract.options.address);
    });
  
    it('should initialize fields in Deferred KYC properly', async () => {
      expect(await kycContract.methods.minter().call()).to.be.equal(tgeContract.options.address);
      expect(await kycContract.methods.treasury().call()).to.be.equal(treasury);
      expect(await kycContract.methods.approver().call()).to.be.equal(approver);
    });
  
    it('should initialize fields in Referral Manager properly', async () => {
      expect(await referralManagerContract.methods.minter().call()).to.be.equal(tgeContract.options.address);
    });
  
    it('should initialize fields in Allocator properly', async () => {
      expect(await allocatorContract.methods.minter().call()).to.be.equal(tgeContract.options.address);
      expect(await allocatorContract.methods.isInitialized().call()).to.be.equal(false);
    });
  
    it('should initialize fields in Airdropper properly', async () => {
      expect(await airdropperContract.methods.minter().call()).to.be.equal(tgeContract.options.address);
      expect(await airdropperContract.methods.isInitialized().call()).to.be.equal(false);
    });
  });

  describe('presale', async() => {
    beforeEach(async() => {
      expect(await currentState()).to.eq.BN(PRESALE);
    });

    it('should not allow to buy directly', async() => {
      await expectThrow(buy(etherAmount1, investor1));
    });

    it('should not allow to add referral fee', async() => {
      await expectThrow(addFee(referring, 1, investor1, 1));
    });

    it('should not allow to allocate', async() => {
      await expectThrow(allocateCommunity(community1, tokenAmount1));
      await expectThrow(allocateAdvisors(advisor1, tokenAmount1));
      await expectThrow(allocateCustomer(customer1, tokenAmount1));
      await expectThrow(allocateTeam(team1, tokenAmount1));
    });

    it('should not allow to airdrop', async() => {
      await expectThrow(drop(investor1));
    });

    it('should allow to note sales', async() => {
      await noteSale(investor1, etherAmount1, tokenAmount1);
    });
  });

  describe('preico', async() => {
    beforeEach(async() => {
      await increaseTimeToState(PREICO1);
      expect(await currentState()).to.eq.BN(PREICO1);
    });

    it('should allow to buy directly', async() => {
      await buy(etherAmount1, investor1);
    });

    it('should allow to add referral fee', async() => {
      await addFee(referring, 1, investor1, 1);
    });

    it('should not allow to allocate', async() => {
      await expectThrow(allocateCommunity(community1, tokenAmount1));
      await expectThrow(allocateAdvisors(advisor1, tokenAmount1));
      await expectThrow(allocateCustomer(customer1, tokenAmount1));
      await expectThrow(allocateTeam(team1, tokenAmount1));
    });

    it('should not allow to airdrop', async() => {
      await expectThrow(drop(investor1));
    });

    it('should allow to note sales', async() => {
      await noteSale(investor1, etherAmount1, tokenAmount1);
    });
  });

  describe('break', async() => {
    beforeEach(async() => {
      await increaseTimeToState(BREAK);
      expect(await currentState()).to.eq.BN(BREAK);
    });

    it('should not allow to buy directly', async() => {
      await expectThrow(buy(etherAmount1, investor1));
    });

    it('should allow to add referral fee', async() => {
      await addFee(referring, 1, investor1, 1);
    });

    it('should not allow to allocate', async() => {
      await expectThrow(allocateCommunity(community1, tokenAmount1));
      await expectThrow(allocateAdvisors(advisor1, tokenAmount1));
      await expectThrow(allocateCustomer(customer1, tokenAmount1));
      await expectThrow(allocateTeam(team1, tokenAmount1));
    });

    it('should not allow to airdrop', async() => {
      await expectThrow(drop(investor1));
    });

    it('should allow to note sales', async() => {
      await noteSale(investor1, etherAmount1, tokenAmount1);
    });
  });

  describe('ico', async() => {
    beforeEach(async() => {
      await increaseTimeToState(ICO1);
      expect(await currentState()).to.eq.BN(ICO1);
    });

    it('should allow to buy directly', async() => {
      await buy(etherAmount1, investor1);
    });

    it('should allow to add referral fee', async() => {
      await addFee(referring, 1, investor1, 1);
    });

    it('should not allow to allocate', async() => {
      await expectThrow(allocateCommunity(community1, tokenAmount1));
      await expectThrow(allocateAdvisors(advisor1, tokenAmount1));
      await expectThrow(allocateCustomer(customer1, tokenAmount1));
      await expectThrow(allocateTeam(team1, tokenAmount1));
    });

    it('should not allow to airdrop', async() => {
      await expectThrow(drop(investor1));
    });

    it('should allow to note sales', async() => {
      await noteSale(investor1, etherAmount1, tokenAmount1);
    });
  });

  describe('finishingIco', async() => {
    beforeEach(async() => {
      await increaseTimeToState(FINISHING_ICO);
      expect(await currentState()).to.eq.BN(FINISHING_ICO);
    });

    it('should not allow to buy directly', async() => {
      await expectThrow(buy(etherAmount1, investor1));
    });

    it('should allow to add referral fee', async() => {
      await addFee(referring, 1, investor1, 1);
    });

    it('should not allow to allocate', async() => {
      await expectThrow(allocateCommunity(community1, tokenAmount1));
      await expectThrow(allocateAdvisors(advisor1, tokenAmount1));
      await expectThrow(allocateCustomer(customer1, tokenAmount1));
      await expectThrow(allocateTeam(team1, tokenAmount1));
    });

    it('should not allow to airdrop', async() => {
      await expectThrow(drop(investor1));
    });

    it('should allow to note sales', async() => {
      await noteSale(investor1, etherAmount1, tokenAmount1);
    });
  });
});
