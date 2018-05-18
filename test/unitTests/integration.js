import {createWeb3, deployContract, latestTime, expectThrow,
  increaseTimeTo, durationInit, createContract} from 'ethworks-solidity';
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

/* eslint-disable no-unused-vars */

const {expect} = chai;
const web3 = createWeb3(Web3, 20);
const {BN} = web3.utils;
chai.use(bnChai(BN));
const duration = durationInit(web3);
const gas = 6721975;

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
  let investor2;
  let referring1;
  let community1;
  let advisor1;
  let customer1;
  let team1;
  let gas;
  const saleEtherCap = new BN(web3.utils.toWei('100000000'));
  const singleStateEtherCap = new BN(web3.utils.toWei('10000'));
  const etherAmount1 = new BN(web3.utils.toWei('1'));
  const etherAmount2 = new BN(web3.utils.toWei('10'));
  const tokenAmount1 = new BN(web3.utils.toWei('4'));
  const tokenAmount2 = new BN(web3.utils.toWei('40'));
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

  const updateState = async() => tgeContract.methods.updateState().send({from: tgeOwner, gas});
  const moveState = async (fromState, toState) => tgeContract.methods.moveState(fromState, toState).send({from: tgeOwner, gas});
  const etherBalanceOf = async (client) => new BN(await web3.eth.getBalance(client));
  const buy = async(etherAmount, from) => crowdsaleContract.methods.buy().send({from, value: etherAmount, gas});
  const noteSale = async(account, etherAmount, tokenAmount) =>
    crowdsaleContract.methods.noteSale(account, etherAmount, tokenAmount).send({from: crowdsaleOwner, gas});
  const tokenBalanceOf = async (client) => new BN(await tokenContract.methods.balanceOf(client).call());
  const allocateCommunity = async(account, tokenAmount) =>
    allocatorContract.methods.allocateCommunity(account, tokenAmount).send({from: allocatorOwner, gas});
  const allocateAdvisors = async(account, tokenAmount) =>
    allocatorContract.methods.allocateAdvisors(account, tokenAmount).send({from: allocatorOwner, gas});
  const allocateCustomer = async(account, tokenAmount) =>
    allocatorContract.methods.allocateCustomer(account, tokenAmount).send({from: allocatorOwner, gas});
  const allocateTeam = async(account, tokenAmount) =>
    allocatorContract.methods.allocateTeam(account, tokenAmount).send({from: allocatorOwner, gas});
  const drop = async(account) => airdropperContract.methods.drop(account).send({from: airdropperOwner, gas});
  const approve = async(account) => kycContract.methods.approve(account).send({from: approver, gas});
  const reject = async(account) => kycContract.methods.reject(account).send({from: approver, gas});
  const addFee = async(referring, referringPercent, referred, referredPercent) =>
    referralManagerContract.methods.addFee(referring, referringPercent, referred, referredPercent).send({from: referralManagerOwner, gas});
  const tokenInProgress = async(account) => kycContract.methods.tokenInProgress(account).call();
  const etherInProgress = async(account) => kycContract.methods.etherInProgress(account).call();
  
  /* eslint-enable no-unused-vars */

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tokenOwner, tgeOwner, crowdsaleOwner, approver, treasury, referralManagerOwner, allocatorOwner, airdropperOwner,
      investor1, investor2, referring1, community1, advisor1, customer1, team1] = accounts;
    const block = await web3.eth.getBlock('latest');
    gas = block.gasLimit;
  });

  beforeEach(async () => {
    saleStartTime = await latestTime(web3) + 100;

    // TOKEN
    tokenContract = await deployContract(web3, allSporterCoinJson, tokenOwner,
      []);
    tokenContract.options.defaultGas = gas;

    // TGE
    tgeContract = await deployContract(web3, tgeJson, tgeOwner, [
      tokenContract.options.address,
      saleEtherCap,
      saleStartTime,
      singleStateEtherCap
    ]);
    await tokenContract.methods.transferOwnership(tgeContract.options.address).send({from: tokenOwner});
    tgeContract.options.defaultGas = gas;

    // CROWDSALE
    crowdsaleContract = await deployContract(web3, crowdsaleJson, crowdsaleOwner, [
      tgeContract.options.address,
      approver,
      treasury
    ]);
    crowdsaleContract.options.defaultGas = gas;

    // DEFERRED KYC
    const deferredKycAddress = await crowdsaleContract.methods.deferredKyc().call();
    kycContract = await createContract(web3, deferredKycJson, deferredKycAddress);
    kycContract.options.defaultGas = gas;

    // REFERRAL MANAGER
    referralManagerContract = await deployContract(web3, referralManagerJson, referralManagerOwner, [
      tgeContract.options.address
    ]);
    referralManagerContract.options.defaultGas = gas;
    
    // ALLOCATOR
    allocatorContract = await deployContract(web3, allocatorJson, allocatorOwner, [
      tgeContract.options.address
    ]);
    allocatorContract.options.defaultGas = gas;

    // AIRDROPPER
    airdropperContract = await deployContract(web3, airdropperJson, airdropperOwner, [
      tgeContract.options.address
    ]);
    airdropperContract.options.defaultGas = gas;

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
      await expectThrow(addFee(referring1, 1, investor1, 1));
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

    describe('noting sales', async() => {
      it('should allow to note up to the sale ether cap', async () => {
        await noteSale(investor1, saleEtherCap, tokenAmount1);
      });

      it('should not allow to note exceeding the sale ether cap (in one investment)', async () => {
        await expectThrow(noteSale(investor1, saleEtherCap.add(new BN('1')), tokenAmount1));
      });

      it('should not allow to note exceeding the sale ether cap (in multiple investment)', async () => {
        await noteSale(investor1, saleEtherCap, tokenAmount1);
        await expectThrow(noteSale(investor2, new BN('1'), tokenAmount1));
      });
    });
  });

  describe('advancing state by noting sales in presale', async() => {
    it('should advance to preico2 immediately if noted enough sales in presale', async() => {
      await noteSale(investor1, singleStateEtherCap, tokenAmount1);
      expect(await currentState()).to.eq.BN(PRESALE);
      await increaseTimeToState(PREICO1);
      await updateState();
      expect(await currentState()).to.eq.BN(PREICO2);
    });

    it('should advance to break immediately if noted enough sales in presale', async() => {
      await noteSale(investor1, singleStateEtherCap.mul(new BN('2')), tokenAmount1);
      expect(await currentState()).to.eq.BN(PRESALE);
      await increaseTimeToState(PREICO1);
      await updateState();
      expect(await currentState()).to.eq.BN(BREAK);
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

    it('should allow to buy and reject', async() => {
      await buy(etherAmount1, investor1);
      await reject(investor1);
    });

    it('should allow to buy and approve', async() => {
      await buy(etherAmount1, investor1);
      await approve(investor1);
    });

    it('should allow to add referral fee', async() => {
      await addFee(referring1, 1, investor1, 1);
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

    describe('sales and fees', async() => {
      it('should add referral fees based on external sales', async() => {
        const percent = new BN('1');
        const expectedFee = tokenAmount1.div(new BN('100')).mul(percent);
        await noteSale(investor1, etherAmount1, tokenAmount1);

        await addFee(investor2, percent, investor1, percent);

        expect(await tokenBalanceOf(investor2)).to.eq.BN(expectedFee);
        expect(await tokenBalanceOf(investor1)).to.eq.BN(tokenAmount1.add(expectedFee));
      });

      it('should add referral fee based on direct sales', async() => {
        const percent = new BN('1');
        await buy(etherAmount1, investor1);
        await approve(investor1);
        const tokenAmount = await tokenBalanceOf(investor1);
        const expectedFee = tokenAmount.div(new BN('100')).mul(percent);

        await addFee(referring1, percent, investor1, percent);

        expect(await tokenBalanceOf(referring1)).to.eq.BN(expectedFee);
        expect(await tokenBalanceOf(investor1)).to.eq.BN(tokenAmount.add(expectedFee));
      });

      it('should calculate fees based on both external and direct sales', async() => {
        const percent = new BN('1');
        await noteSale(investor1, etherAmount1, tokenAmount1);
        await buy(etherAmount2, investor2);
        await approve(investor2);
        const tokenAmount2 = await tokenBalanceOf(investor2);

        await addFee(referring1, percent, investor2, percent);
        await addFee(referring1, percent, investor1, percent);
        const expectedFee1 = tokenAmount1.div(new BN('100')).mul(percent);
        const expectedFee2 = tokenAmount2.div(new BN('100')).mul(percent);
        expect(await tokenBalanceOf(investor1)).to.eq.BN(tokenAmount1.add(expectedFee1));
        expect(await tokenBalanceOf(investor2)).to.eq.BN(tokenAmount2.add(expectedFee2));
        expect(await tokenBalanceOf(referring1)).to.eq.BN(expectedFee1.add(expectedFee2));
      });

      it('should not allow to add fee twice for the same investor', async() => {
        await noteSale(investor1, etherAmount1, tokenAmount1);
        await addFee(referring1, 1, investor2, 1);
        await expectThrow(addFee(referring1, 1, investor2, 1));
      });

      it('should not add fee for investments under kyc', async() => {
        const percent = new BN('1');
        await buy(etherAmount1, investor1);
        const tokenAmount = await tokenBalanceOf(investor1);
        expect(tokenAmount).to.eq.BN(0);

        await addFee(referring1, percent, investor1, percent);

        expect(await tokenBalanceOf(referring1)).to.eq.BN(0);
        expect(await tokenBalanceOf(investor1)).to.eq.BN(tokenAmount);
      });
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
      await addFee(referring1, 1, investor1, 1);
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
      await addFee(referring1, 1, investor1, 1);
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
      await addFee(referring1, 1, investor1, 1);
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

  describe('from presale to finishingIco', async() => {
    it('should allow to approve in FinishingIco state investments made previously', async() => {
      await increaseTimeToState(PREICO1);
      await buy(etherAmount1, investor1);
      const expectedTokenAmount1 = await tokenInProgress(investor1);
      await increaseTimeToState(ICO1);
      await buy(etherAmount2, investor2);
      const expectedTokenAmount2 = await tokenInProgress(investor2);
      await increaseTimeToState(FINISHING_ICO);

      await approve(investor1);
      await approve(investor2);
      expect(await tokenBalanceOf(investor1)).to.eq.BN(expectedTokenAmount1);
      expect(await tokenBalanceOf(investor2)).to.eq.BN(expectedTokenAmount2);
    });

    it('should calculate token amount for the price at time of buying, not time of approving', async() => {
      await increaseTimeToState(PREICO1);
      const expectedTokens = await tgeContract.methods.getTokensForEther(etherAmount1).call();
      await buy(etherAmount1, investor1);
      await increaseTimeToState(ICO6);
      await approve(investor1);
      expect(await tokenBalanceOf(investor1)).to.eq.BN(expectedTokens);
    });

    it('should allow to reject in FinishingIco state investments made previously', async() => {
      await increaseTimeToState(PREICO1);
      await buy(etherAmount1, investor1);
      await increaseTimeToState(FINISHING_ICO);

      await reject(investor1);
      expect(await tokenInProgress(investor1)).to.eq.BN(0);
      expect(await tokenBalanceOf(investor1)).to.eq.BN(0);
    });

    it('should allow to add fees in FinishingIco state for investments made previously', async() => {
      const percent = new BN('1');
      await increaseTimeToState(PREICO1);
      await buy(etherAmount1, investor1);
      await approve(investor1);

      await increaseTimeToState(FINISHING_ICO);
      await addFee(referring1, percent, investor1, percent);
    });
  });
});
