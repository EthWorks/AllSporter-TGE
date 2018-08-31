import {
  createWeb3, deployContract, latestTime, expectThrow,
  increaseTimeTo, durationInit, createContract
} from 'ethworks-solidity';
import allSporterCoinJson from '../../build/contracts/AllSporterCoin.json';
import tgeJson from '../../build/contracts/Tge.json';
import crowdsaleJson from '../../build/contracts/Crowdsale.json';
import referralManagerJson from '../../build/contracts/ReferralManager.json';
import allocatorJson from '../../build/contracts/Allocator.json';
import airdropperJson from '../../build/contracts/Airdropper.json';
import deferredKycJson from '../../build/contracts/DeferredKyc.json';
import lockingContractJson from '../../build/contracts/SingleLockingContract.json';
import Web3 from 'web3';
import chai from 'chai';
import bnChai from 'bn-chai';

/* eslint-disable no-unused-vars */

const {expect} = chai;
const web3 = createWeb3(Web3, 30);
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
  let investor2;
  let investor3;
  let investor4;
  let investor5;
  let investor6;
  let referring1;
  let referring2;
  let referring3;
  let community1;
  let advisor1;
  let customer1;
  let team1;
  let team2;
  let gas;
  let privateIcoStartTime;
  let privateIcoEndTime;
  let priceDivider;
  let snapshotId;
  const lockingPeriod = 10000;
  const privateIcoTokensForEther = new BN('10020');
  const privateIcoMinimumContribution = new BN(web3.utils.toWei('1'));
  const privateIcoCap = new BN(web3.utils.toWei('100'));
  const saleEtherCap = new BN(web3.utils.toWei('100000000'));
  const singleStateEtherCap = new BN(web3.utils.toWei('10000'));
  const etherAmount1 = new BN(web3.utils.toWei('3'));
  const etherAmount2 = new BN(web3.utils.toWei('10'));
  const tokenAmount1 = new BN(web3.utils.toWei('100'));
  const tokenAmount2 = new BN(web3.utils.toWei('1'));
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
  const stateLengths = [
    duration.days(5),
    duration.days(5),
    duration.days(3),
    duration.days(5),
    duration.days(5),
    duration.days(5),
    duration.days(5),
    duration.days(5),
    duration.days(5)
  ];

  const currentState = async () => {
    await updateState();
    return await tgeContract.methods.currentState().call();
  };

  const increaseTimeToState = async (state) => {
    const startTime = await tgeContract.methods.startTimes(state).call();
    await increaseTimeTo(web3, startTime);
    await updateState();
  };

  const takeSnapshot = () => new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_snapshot'
    }, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result.result);
    });
  });

  const revertToSnapshot = (snapshotId) => new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_revert',
      params: [snapshotId]
    }, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });

  const increaseTimeToAfterUnlockTime = async () => {
    const unlockTime = await allocatorContract.methods.LOCKING_UNLOCK_TIME().call();
    await increaseTimeTo(web3, unlockTime + 100);
    await updateState();
  };

  const updateState = async () => tgeContract.methods.updateState().send({from: tgeOwner, gas});
  const moveState = async (fromState, toState) => tgeContract.methods.moveState(fromState, toState).send({from: tgeOwner, gas});
  const etherBalanceOf = async (client) => new BN(await web3.eth.getBalance(client));
  const buy = async (etherAmount, from) => crowdsaleContract.methods.buy().send({from, value: etherAmount, gas});
  const noteSale = async (account, etherAmount, tokenAmount) =>
    crowdsaleContract.methods.noteSale(account, etherAmount, tokenAmount).send({from: crowdsaleOwner, gas});

  const noteSaleLocked = async (account, etherAmount, tokenAmount, lockingPeriod) =>
    crowdsaleContract.methods.noteSaleLocked(account, etherAmount, tokenAmount, lockingPeriod).send({from: crowdsaleOwner, gas});

  const lockedBalanceOf = async (account) => {
    const lockingContract = await createContract(web3, lockingContractJson, await allocatorContract.methods.lockingContracts(account).call());
    return await lockingContract.methods.balanceOf().call();
  };

  const tokenBalanceOf = async (client) => new BN(await tokenContract.methods.balanceOf(client).call());

  const vestedBalanceOf = async (account) => {
    const vestingContractAddress = await allocatorContract.methods.vestingContracts(account).call();
    return await tokenBalanceOf(vestingContractAddress);
  };

  const allocateCommunity = async (account, tokenAmount) =>
    allocatorContract.methods.allocateCommunity(account, tokenAmount).send({from: allocatorOwner, gas});
  const allocateAdvisors = async (account, tokenAmount) =>
    allocatorContract.methods.allocateAdvisors(account, tokenAmount).send({from: allocatorOwner, gas});
  const allocateCustomer = async (account, tokenAmount) =>
    allocatorContract.methods.allocateCustomer(account, tokenAmount).send({from: allocatorOwner, gas});
  const allocateTeam = async (account, tokenAmount) =>
    allocatorContract.methods.allocateTeam(account, tokenAmount).send({from: allocatorOwner, gas});
  const drop = async (account) => airdropperContract.methods.drop(account).send({from: airdropperOwner, gas});
  const dropMultiple = async (accounts) => airdropperContract.methods.dropMultiple(accounts).send({from: airdropperOwner, gas});
  const approve = async (account) => kycContract.methods.approve(account).send({from: approver, gas});
  const reject = async (account) => kycContract.methods.reject(account).send({from: approver, gas});
  const addFee = async (referring, referringPercent, referred, referredPercent) =>
    referralManagerContract.methods.addFee(referring, referringPercent, referred, referredPercent).send({from: referralManagerOwner, gas});
  const tokenInProgress = async (account) => kycContract.methods.tokenInProgress(account).call();
  const etherInProgress = async (account) => kycContract.methods.etherInProgress(account).call();
  const transferTokenOwnership = async () => tgeContract.methods.transferTokenOwnership().send({from: tgeOwner, gas});
  const finishMinting = async () => tokenContract.methods.finishMinting().send({from: tgeOwner, gas});
  const isPrivateIcoActive = async () => tgeContract.methods.isPrivateIcoActive().call();
  const releaseVested = async (account) => allocatorContract.methods.releaseVested(account).send({from: account});
  const releaseLocked = async (account) => allocatorContract.methods.releaseLocked(account).send({from: account});

  const initPrivateIco = async (cap, tokensForEther, startTime, endTime, minimumContribution) => {
    const multipliesTokensForEther = tokensForEther * priceDivider;
    await tgeContract.methods.initPrivateIco(cap, multipliesTokensForEther, startTime, endTime, minimumContribution).send({from: tgeOwner, gas});
  };

  const isPrivateIcoFinalized = async () => tgeContract.methods.privateIcoFinalized().call();
  const finalizePrivateIco = async (from) => tgeContract.methods.finalizePrivateIco().send({from});


  /* eslint-enable no-unused-vars */

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tokenOwner, tgeOwner, crowdsaleOwner, approver, treasury, referralManagerOwner, allocatorOwner, airdropperOwner,
      investor1, investor2, investor3, investor4, investor5, investor6,
      referring1, referring2, referring3,
      community1, advisor1, customer1, team1, team2] = accounts;
    const block = await web3.eth.getBlock('latest');
    gas = block.gasLimit;
  });

  beforeEach(async () => {
    saleStartTime = new BN(await latestTime(web3)).add(duration.days(2));
    // private ico start/end times 
    privateIcoStartTime = new BN(await latestTime(web3)).add(duration.minutes(10));
    privateIcoEndTime = privateIcoStartTime.add(duration.hours(2));

    // TOKEN
    tokenContract = await deployContract(web3, allSporterCoinJson, tokenOwner,
      []);
    tokenContract.options.defaultGas = gas;

    // TGE
    tgeContract = await deployContract(web3, tgeJson, tgeOwner, [
      tokenContract.options.address,
      saleEtherCap
    ]);
    priceDivider = await tgeContract.methods.PRICE_DIVIDER().call();
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
    await tgeContract.methods.setup(
      crowdsaleContract.options.address,
      kycContract.options.address,
      referralManagerContract.options.address,
      allocatorContract.options.address,
      airdropperContract.options.address,
      saleStartTime,
      singleStateEtherCap,
      stateLengths
    ).send({from: tgeOwner});

    snapshotId = await takeSnapshot();
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

  describe('presale', async () => {
    beforeEach(async () => {
      expect(await currentState()).to.eq.BN(PRESALE);
    });

    it('should not allow to buy directly', async () => {
      await expectThrow(buy(etherAmount1, investor1));
    });

    it('should not allow to add referral fee', async () => {
      await expectThrow(addFee(referring1, 1, investor1, 1));
    });

    it('should not allow to allocate', async () => {
      await expectThrow(allocateCommunity(community1, tokenAmount1));
      await expectThrow(allocateAdvisors(advisor1, tokenAmount1));
      await expectThrow(allocateCustomer(customer1, tokenAmount1));
      await expectThrow(allocateTeam(team1, tokenAmount1));
    });

    it('should not allow to airdrop', async () => {
      await expectThrow(drop(investor1));
    });

    it('should allow to note sales', async () => {
      await noteSale(investor1, etherAmount1, tokenAmount1);
    });

    describe('noting sales', async () => {
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

  describe('advancing state by noting sales in presale', async () => {
    it('should advance to preico2 immediately if noted enough sales in presale', async () => {
      await noteSale(investor1, singleStateEtherCap, tokenAmount1);
      expect(await currentState()).to.eq.BN(PRESALE);
      await increaseTimeToState(PREICO1);
      await updateState();
      expect(await currentState()).to.eq.BN(PREICO2);
    });

    it('should advance to break immediately if noted enough sales in presale', async () => {
      await noteSale(investor1, singleStateEtherCap.mul(new BN('2')), tokenAmount1);
      expect(await currentState()).to.eq.BN(PRESALE);
      await increaseTimeToState(PREICO1);
      await updateState();
      expect(await currentState()).to.eq.BN(BREAK);
    });
  });

  describe('preico', async () => {
    beforeEach(async () => {
      await increaseTimeToState(PREICO1);
      expect(await currentState()).to.eq.BN(PREICO1);
    });

    it('should allow to buy directly', async () => {
      await buy(etherAmount1, investor1);
    });

    it('should allow to buy and reject', async () => {
      await buy(etherAmount1, investor1);
      await reject(investor1);
    });

    it('should allow to buy and approve', async () => {
      await buy(etherAmount1, investor1);
      await approve(investor1);
    });

    it('should allow to add referral fee', async () => {
      await addFee(referring1, 1, investor1, 1);
    });

    it('should not allow to allocate', async () => {
      await expectThrow(allocateCommunity(community1, tokenAmount1));
      await expectThrow(allocateAdvisors(advisor1, tokenAmount1));
      await expectThrow(allocateCustomer(customer1, tokenAmount1));
      await expectThrow(allocateTeam(team1, tokenAmount1));
    });

    it('should not allow to airdrop', async () => {
      await expectThrow(drop(investor1));
    });

    it('should allow to note sales', async () => {
      await noteSale(investor1, etherAmount1, tokenAmount1);
    });

    describe('sales and fees', async () => {
      it('should add referral fees based on external sales', async () => {
        const percent = new BN('1');
        const expectedFee = tokenAmount1.div(new BN('100')).mul(percent);
        await noteSale(investor1, etherAmount1, tokenAmount1);

        await addFee(investor2, percent, investor1, percent);

        expect(await tokenBalanceOf(investor2)).to.eq.BN(expectedFee);
        expect(await tokenBalanceOf(investor1)).to.eq.BN(tokenAmount1.add(expectedFee));
      });

      it('should add referral fee based on direct sales', async () => {
        const percent = new BN('1');
        await buy(etherAmount1, investor1);
        await approve(investor1);
        const tokenAmount = await tokenBalanceOf(investor1);
        const expectedFee = tokenAmount.div(new BN('100')).mul(percent);

        await addFee(referring1, percent, investor1, percent);

        expect(await tokenBalanceOf(referring1)).to.eq.BN(expectedFee);
        expect(await tokenBalanceOf(investor1)).to.eq.BN(tokenAmount.add(expectedFee));
      });

      it('should calculate fees based on both external and direct sales', async () => {
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

      it('should not allow to add fee twice for the same investor', async () => {
        await noteSale(investor1, etherAmount1, tokenAmount1);
        await addFee(referring1, 1, investor2, 1);
        await expectThrow(addFee(referring1, 1, investor2, 1));
      });

      it('should not add fee for investments under kyc', async () => {
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

  describe('break', async () => {
    beforeEach(async () => {
      await increaseTimeToState(BREAK);
      expect(await currentState()).to.eq.BN(BREAK);
    });

    it('should not allow to buy directly', async () => {
      await expectThrow(buy(etherAmount1, investor1));
    });

    it('should allow to add referral fee', async () => {
      await addFee(referring1, 1, investor1, 1);
    });

    it('should not allow to allocate', async () => {
      await expectThrow(allocateCommunity(community1, tokenAmount1));
      await expectThrow(allocateAdvisors(advisor1, tokenAmount1));
      await expectThrow(allocateCustomer(customer1, tokenAmount1));
      await expectThrow(allocateTeam(team1, tokenAmount1));
    });

    it('should not allow to airdrop', async () => {
      await expectThrow(drop(investor1));
    });

    it('should allow to note sales', async () => {
      await noteSale(investor1, etherAmount1, tokenAmount1);
    });
  });

  describe('ico', async () => {
    beforeEach(async () => {
      await increaseTimeToState(ICO1);
      expect(await currentState()).to.eq.BN(ICO1);
    });

    it('should allow to buy directly', async () => {
      await buy(etherAmount1, investor1);
    });

    it('should allow to add referral fee', async () => {
      await addFee(referring1, 1, investor1, 1);
    });

    it('should not allow to allocate', async () => {
      await expectThrow(allocateCommunity(community1, tokenAmount1));
      await expectThrow(allocateAdvisors(advisor1, tokenAmount1));
      await expectThrow(allocateCustomer(customer1, tokenAmount1));
      await expectThrow(allocateTeam(team1, tokenAmount1));
    });

    it('should not allow to airdrop', async () => {
      await expectThrow(drop(investor1));
    });

    it('should allow to note sales', async () => {
      await noteSale(investor1, etherAmount1, tokenAmount1);
    });
  });

  describe('finishingIco', async () => {
    beforeEach(async () => {
      await increaseTimeToState(FINISHING_ICO);
      expect(await currentState()).to.eq.BN(FINISHING_ICO);
    });

    it('should not allow to buy directly', async () => {
      await expectThrow(buy(etherAmount1, investor1));
    });

    it('should allow to add referral fee', async () => {
      await addFee(referring1, 1, investor1, 1);
    });

    it('should not allow to allocate', async () => {
      await expectThrow(allocateCommunity(community1, tokenAmount1));
      await expectThrow(allocateAdvisors(advisor1, tokenAmount1));
      await expectThrow(allocateCustomer(customer1, tokenAmount1));
      await expectThrow(allocateTeam(team1, tokenAmount1));
    });

    it('should not allow to airdrop', async () => {
      await expectThrow(drop(investor1));
    });

    it('should allow to note sales', async () => {
      await noteSale(investor1, etherAmount1, tokenAmount1);
    });
  });

  describe('from presale to finishingIco', async () => {
    it('should allow to approve in FinishingIco state investments made previously', async () => {
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

    it('should calculate token amount for the price at time of buying, not time of approving', async () => {
      await increaseTimeToState(PREICO1);
      const expectedTokens = await tgeContract.methods.getTokensForEther(etherAmount1).call();
      await buy(etherAmount1, investor1);
      await increaseTimeToState(ICO6);
      await approve(investor1);
      expect(await tokenBalanceOf(investor1)).to.eq.BN(expectedTokens);
    });

    it('should allow to reject in FinishingIco state investments made previously', async () => {
      await increaseTimeToState(PREICO1);
      await buy(etherAmount1, investor1);
      await increaseTimeToState(FINISHING_ICO);

      await reject(investor1);
      expect(await tokenInProgress(investor1)).to.eq.BN(0);
      expect(await tokenBalanceOf(investor1)).to.eq.BN(0);
    });

    it('should allow to add fees in FinishingIco state for investments made previously', async () => {
      const percent = new BN('1');
      await increaseTimeToState(PREICO1);
      await buy(etherAmount1, investor1);
      await approve(investor1);

      await increaseTimeToState(FINISHING_ICO);
      await addFee(referring1, percent, investor1, percent);
    });
  });

  describe('Allocating', async () => {
    beforeEach(async () => {
      await moveState(PRESALE, PREICO1);
      await noteSale(investor1, etherAmount1, new BN(web3.utils.toWei('1000')));
      await moveState(PREICO1, ALLOCATING);
      expect(await currentState()).to.eq.BN(ALLOCATING);
      await allocateCommunity('0x0', 0); // initialize
    });

    it('should have proper pool for Community', async () => {
      const saleTokens = new BN(await tokenContract.methods.totalSupply().call());
      const actualCommunityPool = await allocatorContract.methods.communityPool().call();
      expect(actualCommunityPool).to.eq.BN(saleTokens.div(new BN('55')).mul(new BN('5')));
    });

    it('should have proper pool for Advisors', async () => {
      const saleTokens = new BN(await tokenContract.methods.totalSupply().call());
      const actualAdvisorsPool = await allocatorContract.methods.advisorsPool().call();
      expect(actualAdvisorsPool).to.eq.BN(saleTokens.div(new BN('55')).mul(new BN('8')));
    });

    it('should have proper pool for Customer', async () => {
      const saleTokens = new BN(await tokenContract.methods.totalSupply().call());
      const actualCustomerPool = await allocatorContract.methods.customerPool().call();
      expect(actualCustomerPool).to.eq.BN(saleTokens.div(new BN('55')).mul(new BN('15')));
    });

    it('should have proper pool for Team', async () => {
      const saleTokens = new BN(await tokenContract.methods.totalSupply().call());
      const actualTeamPool = await allocatorContract.methods.teamPool().call();
      expect(actualTeamPool).to.eq.BN(saleTokens.div(new BN('55')).mul(new BN('17')));
    });

    it('should not allow to buy', async () => {
      await expectThrow(buy(etherAmount1, investor1));
    });

    it('should not allow to add fee', async () => {
      await expectThrow(addFee(referring1, 1, investor1, 1));
    });

    it('should allow to allocate for Community', async () => {
      await allocateCommunity(community1, new BN('1000'));
    });

    it('should allocate for Community directly', async () => {
      await allocateCommunity(community1, new BN('1000'));
      expect(await tokenBalanceOf(community1)).to.eq.BN(1000);
    });

    it('should allow to allocate for Advisors', async () => {
      await allocateAdvisors(advisor1, tokenAmount1);
    });

    it('should allocate for Advisors directly', async () => {
      await allocateAdvisors(advisor1, tokenAmount1);
      expect(await tokenBalanceOf(advisor1)).to.eq.BN(tokenAmount1);
    });

    it('should allow to allocate for Customers', async () => {
      await allocateCustomer(customer1, tokenAmount1);
    });

    it('should allocate for Customers in vesting', async () => {
      await allocateCustomer(customer1, tokenAmount1);
      expect(await vestedBalanceOf(customer1)).to.eq.BN(tokenAmount1);
    });

    it('should allow to allocate for Team', async () => {
      await allocateTeam(team1, tokenAmount1);
    });

    it('should allocate for Team in locking contract', async () => {
      await allocateTeam(team1, tokenAmount1);
      expect(await lockedBalanceOf(team1)).to.eq.BN(tokenAmount1);
    });
  });

  describe('Airdropping', async () => {
    beforeEach(async () => {
      await moveState(PRESALE, PREICO1);
      await noteSale(investor1, etherAmount1, new BN('159999910000000000000000000'));
      await moveState(PREICO1, ALLOCATING);
      await allocateCommunity(community1, new BN('30000000000000000000'));
      await allocateAdvisors(advisor1, new BN('60000000000000000000'));
      await moveState(ALLOCATING, AIRDROPPING);
    });

    it('should allow to airdrop for every account', async () => {
      await drop(investor1);
      await drop(community1);
      await drop(advisor1);
    });

    it('should not throw when dropping for en empty account', async () => {
      await drop(investor2);
    });

    it('should not allow to airdrop twice for the same account', async () => {
      await drop(investor1);
      await expectThrow(drop(investor1));
    });

    it('should allow to airdrop for an array of accounts', async () => {
      await dropMultiple([
        investor1,
        community1,
        advisor1
      ]);
    });

    it('should calculate airdropped amount proportionally', async () => {
      await drop(investor1);
      await drop(community1);
      await drop(advisor1);
      const epsilon = new BN('100000000');

      const actualSupply = new BN(await tokenContract.methods.totalSupply().call());
      const cap = new BN(await tokenContract.methods.cap().call());
      expect(cap.sub(actualSupply).lte(epsilon)).to.be.true;
    });
  });

  describe('Airdropping with vested accounts', async () => {
    let vestingContractAddress;
    beforeEach(async () => {
      await moveState(PRESALE, PREICO1);
      await noteSale(investor1, etherAmount1, new BN('159999920000000000000000000'));
      await moveState(PREICO1, ALLOCATING);
      await allocateCustomer(customer1, new BN('80000000000000000000'));
      await moveState(ALLOCATING, AIRDROPPING);
      vestingContractAddress = await allocatorContract.methods.vestingContracts(customer1).call();
    });

    it('should allow to airdrop for every account', async () => {
      await drop(investor1);
      await drop(vestingContractAddress);
    });

    it('should calculate airdropped amount proportionally', async () => {
      await drop(investor1);
      await drop(vestingContractAddress);
      const epsilon = new BN('100000000');

      const actualSupply = new BN(await tokenContract.methods.totalSupply().call());
      const cap = new BN(await tokenContract.methods.cap().call());
      expect(cap.sub(actualSupply).lte(epsilon)).to.be.true;
    });
  });

  describe('Transferring token ownership', async () => {
    it('should allow to transfer token ownership after all stages', async () => {
      await noteSale(investor1, etherAmount1, tokenAmount1);
      await increaseTimeToState(PREICO1);
      await buy(etherAmount1, investor1);
      await increaseTimeToState(ICO2);
      await buy(etherAmount2, investor2);
      await increaseTimeToState(FINISHING_ICO);
      await approve(investor1);
      await approve(investor2);
      await addFee(referring1, 1, investor2, 1);
      await moveState(FINISHING_ICO, ALLOCATING);
      await allocateCommunity(community1, tokenAmount1);
      await allocateAdvisors(advisor1, tokenAmount1);
      await allocateCustomer(customer1, tokenAmount1);
      await allocateTeam(team1, tokenAmount1);
      await moveState(ALLOCATING, AIRDROPPING);
      await drop(referring1);
      await drop(investor1);
      await drop(investor2);
      await moveState(AIRDROPPING, FINISHED);

      await transferTokenOwnership();
      expect(await tokenContract.methods.owner().call()).to.be.equal(tgeOwner);
    });
  });

  describe('Private ico', async () => {
    const setup = async () => tgeContract.methods.setup(
      crowdsaleContract.options.address,
      kycContract.options.address,
      referralManagerContract.options.address,
      allocatorContract.options.address,
      airdropperContract.options.address,
      saleStartTime,
      singleStateEtherCap,
      stateLengths
    ).send({from: tgeOwner});

    it('should not be active initially', async () => {
      expect(await isPrivateIcoActive()).to.be.false;
    });

    it('should allow to initialize a private ico', async () => {
      await initPrivateIco(privateIcoCap, privateIcoTokensForEther, privateIcoStartTime, privateIcoEndTime, privateIcoMinimumContribution);
    });

    it('should not allow to setup tge when private ico is running', async () => {
      await initPrivateIco(privateIcoCap, privateIcoTokensForEther, privateIcoStartTime, privateIcoEndTime, privateIcoMinimumContribution);
      await increaseTimeTo(web3, privateIcoStartTime.add(duration.minutes(1)));
      await expectThrow(setup());
    });

    it('should allow to setup tge after private ico ends', async () => {
      await initPrivateIco(privateIcoCap, privateIcoTokensForEther, privateIcoStartTime, privateIcoEndTime, privateIcoMinimumContribution);
      await increaseTimeTo(web3, privateIcoStartTime.add(duration.minutes(1)));
      await expectThrow(setup());
      await increaseTimeTo(web3, privateIcoEndTime.add(duration.minutes(1)));
      await setup();
    });
  });

  describe('end to end sale with private icos', async () => {
    const cap = new BN('10');
    const tokensForEther = new BN('2000000');
    const minimumContribution = new BN('2');
    let secondPrivateIcoStartTime;
    let secondPrivateIcoEndTime;
    let ico1Price;
    const anotherCap = cap.add(new BN('2'));
    const anotherMinimum = minimumContribution.sub(new BN('1'));
    const anotherTokensForEther = tokensForEther.sub(new BN('1'));

    const getAmountAirdropped = (events, account) => new BN(events.filter((ev) => ev.returnValues.account === account)[0].returnValues.tokenAmount);

    beforeEach(async () => {
      await revertToSnapshot(snapshotId);
      secondPrivateIcoStartTime = privateIcoEndTime.add(duration.minutes(5));
      secondPrivateIcoEndTime = secondPrivateIcoStartTime.add(duration.minutes(3));
      snapshotId = await takeSnapshot();
      ico1Price = (await tgeContract.methods.PRICE_MULTIPLIER_ICO1().call());
    });

    afterEach(async() => {
      // need to revert state in order to revert time, because there is a constant unlock time in smart contracts
      await revertToSnapshot(snapshotId);
    });

    it('should allow to carry out the sale from start to end', async () => {
      // first private ico
      await initPrivateIco(privateIcoCap, privateIcoTokensForEther, privateIcoStartTime, privateIcoEndTime, privateIcoMinimumContribution);
      await increaseTimeTo(web3, privateIcoStartTime.add(duration.minutes(1)));
      await buy(privateIcoMinimumContribution, investor1);
      await increaseTimeTo(web3, privateIcoEndTime.add(duration.minutes(1)));
      await approve(investor1);
      await finalizePrivateIco(tgeOwner);

      // second private ico
      await initPrivateIco(anotherCap, anotherTokensForEther, secondPrivateIcoStartTime, secondPrivateIcoEndTime, anotherMinimum, tgeOwner);
      await increaseTimeTo(web3, secondPrivateIcoStartTime.add(duration.minutes(1)));
      await buy(anotherMinimum, investor2);
      await increaseTimeTo(web3, secondPrivateIcoEndTime.add(duration.minutes(1)));
      await approve(investor2);
      await finalizePrivateIco(tgeOwner);

      // presale
      await noteSale(investor3, etherAmount1, tokenAmount1);

      // preico1
      await increaseTimeToState(PREICO1);
      await buy(etherAmount1, investor4);

      // ico1
      await increaseTimeToState(ICO1);
      await buy(etherAmount1, investor5);
      await approve(investor5);
      const noteSaleLockedTx = await noteSaleLocked(investor6, etherAmount1, tokenAmount1, lockingPeriod);
      const saleNotedLockedContractAddress = noteSaleLockedTx.events.SaleLockedNoted.returnValues.lockingContract;

      // finishing ico
      await increaseTimeToState(FINISHING_ICO);
      await reject(investor4);

      // allocating
      await moveState(FINISHING_ICO, ALLOCATING);
      await allocateCommunity(community1, tokenAmount2);
      await allocateAdvisors(advisor1, tokenAmount2);
      await allocateCustomer(customer1, tokenAmount2);
      await allocateTeam(team1, tokenAmount2);
      await allocateTeam(team2, tokenAmount2);

      // airdropping
      await moveState(ALLOCATING, AIRDROPPING);
      const addressesToDrop = [
        investor1,
        investor2,
        investor3,
        // investor4, rejected
        investor5,
        // investor6, on locking contract
        saleNotedLockedContractAddress,
        community1,
        advisor1,
        await allocatorContract.methods.lockingContracts(team1).call(),
        await allocatorContract.methods.lockingContracts(team2).call(),
        await allocatorContract.methods.vestingContracts(customer1).call()
      ];
      const dropTx = await dropMultiple(addressesToDrop);
      const dropEvents = dropTx.events.Airdropped;
      addressesToDrop.forEach((address) => expect(getAmountAirdropped(dropEvents, address)).to.not.eq.BN(0));

      // finishing
      await moveState(AIRDROPPING, FINISHED);
      await transferTokenOwnership();
      await finishMinting();
      await increaseTimeToAfterUnlockTime();
      await releaseLocked(team1);
      await releaseLocked(team2);
      await releaseVested(customer1);
      const investor6LockingContract = await createContract(web3, lockingContractJson, saleNotedLockedContractAddress);
      await investor6LockingContract.methods.releaseTokens().send({from: investor6});

      // checking token balances
      const investor1ExpectedToken = privateIcoMinimumContribution.mul(privateIcoTokensForEther).add(getAmountAirdropped(dropEvents, investor1));
      expect(await tokenBalanceOf(investor1)).to.eq.BN(investor1ExpectedToken);

      const investor2ExpectedToken = anotherMinimum.mul(anotherTokensForEther).add(getAmountAirdropped(dropEvents, investor2));
      expect(await tokenBalanceOf(investor2)).to.eq.BN(investor2ExpectedToken);

      const investor3ExpectedToken = tokenAmount1.add(getAmountAirdropped(dropEvents, investor3));
      expect(await tokenBalanceOf(investor3)).to.eq.BN(investor3ExpectedToken);

      expect(await tokenBalanceOf(investor4)).to.eq.BN(0);

      const investor5ExpectedToken = etherAmount1.mul(new BN(ico1Price.toString())).div(new BN('1000'))
        .add(getAmountAirdropped(dropEvents, investor5));
      expect(await tokenBalanceOf(investor5)).to.eq.BN(investor5ExpectedToken);

      const investor6ExpectedToken = tokenAmount1.add(getAmountAirdropped(dropEvents, saleNotedLockedContractAddress));
      expect(await tokenBalanceOf(investor6)).to.eq.BN(investor6ExpectedToken);

      const community1ExpectedToken = tokenAmount2.add(getAmountAirdropped(dropEvents, community1));
      expect(await tokenBalanceOf(community1)).to.eq.BN(community1ExpectedToken);

      const advisor1ExpectedToken = tokenAmount2.add(getAmountAirdropped(dropEvents, advisor1));
      expect(await tokenBalanceOf(advisor1)).to.eq.BN(advisor1ExpectedToken);

      const team1ExpectedToken = tokenAmount2.add(getAmountAirdropped(dropEvents, await allocatorContract.methods.lockingContracts(team1).call()));
      expect(await tokenBalanceOf(team1)).to.eq.BN(team1ExpectedToken);

      const team2ExpectedToken = tokenAmount2.add(getAmountAirdropped(dropEvents, await allocatorContract.methods.lockingContracts(team2).call()));
      expect(await tokenBalanceOf(team2)).to.eq.BN(team2ExpectedToken);

      const customer1ExpectedToken = tokenAmount2.add(getAmountAirdropped(dropEvents, await allocatorContract.methods.vestingContracts(customer1).call()));
      expect(await tokenBalanceOf(customer1)).to.eq.BN(customer1ExpectedToken);

      // should airdrop up to the cap
      const tokenCap = new BN(await tokenContract.methods.cap().call());
      const totalSupply = new BN(await tokenContract.methods.totalSupply().call());
      expect(tokenCap.sub(totalSupply)).to.be.lt.BN(10);
    }).timeout(5000);

    it('should allow to carry out the sale with referral fees', async () => {
      // first private ico
      await initPrivateIco(privateIcoCap, privateIcoTokensForEther, privateIcoStartTime, privateIcoEndTime, privateIcoMinimumContribution);
      await increaseTimeTo(web3, privateIcoStartTime.add(duration.minutes(1)));
      await buy(privateIcoMinimumContribution, investor1);
      await increaseTimeTo(web3, privateIcoEndTime.add(duration.minutes(1)));
      await approve(investor1);
      await finalizePrivateIco(tgeOwner);

      // second private ico
      await initPrivateIco(anotherCap, anotherTokensForEther, secondPrivateIcoStartTime, secondPrivateIcoEndTime, anotherMinimum, tgeOwner);
      await increaseTimeTo(web3, secondPrivateIcoStartTime.add(duration.minutes(1)));
      await buy(anotherMinimum, investor2);
      await increaseTimeTo(web3, secondPrivateIcoEndTime.add(duration.minutes(1)));
      await approve(investor2);
      await finalizePrivateIco(tgeOwner);

      // presale
      await noteSale(investor3, etherAmount1, tokenAmount1);

      // preico1
      await increaseTimeToState(PREICO1);
      await buy(etherAmount1, investor4);
      await addFee(referring1, 10, investor3, 10);

      // ico1
      await increaseTimeToState(ICO1);
      await buy(etherAmount1, investor5);
      await approve(investor5);
      await addFee(referring1, 10, investor5, 10);
      await expectThrow(addFee(referring1, 10, investor5, 10));
      const noteSaleLockedTx = await noteSaleLocked(investor6, etherAmount1, tokenAmount1, lockingPeriod);
      const saleNotedLockedContractAddress = noteSaleLockedTx.events.SaleLockedNoted.returnValues.lockingContract;

      // finishing ico
      await increaseTimeToState(FINISHING_ICO);
      await reject(investor4);
      await addFee(referring2, 10, investor4, 10);

      // allocating
      await moveState(FINISHING_ICO, ALLOCATING);
      await allocateCommunity(community1, tokenAmount2);
      await allocateAdvisors(advisor1, tokenAmount2);
      await allocateCustomer(customer1, tokenAmount2);
      await allocateTeam(team1, tokenAmount2);
      await allocateTeam(team2, tokenAmount2);

      // airdropping
      await moveState(ALLOCATING, AIRDROPPING);
      const addressesToDrop = [
        investor1,
        investor2,
        investor3,
        // investor4, rejected
        investor5,
        // investor6, on locking contract
        saleNotedLockedContractAddress,
        community1,
        advisor1,
        await allocatorContract.methods.lockingContracts(team1).call(),
        await allocatorContract.methods.lockingContracts(team2).call(),
        await allocatorContract.methods.vestingContracts(customer1).call(),
        referring1
        // referring2
      ];
      const dropTx = await dropMultiple(addressesToDrop);
      const dropEvents = dropTx.events.Airdropped;
      addressesToDrop.forEach((address) => expect(getAmountAirdropped(dropEvents, address)).to.not.eq.BN(0));

      // finishing
      await moveState(AIRDROPPING, FINISHED);
      await transferTokenOwnership();
      await finishMinting();
      await increaseTimeToAfterUnlockTime();
      await releaseLocked(team1);
      await releaseLocked(team2);
      await releaseVested(customer1);
      const investor6LockingContract = await createContract(web3, lockingContractJson, saleNotedLockedContractAddress);
      await investor6LockingContract.methods.releaseTokens().send({from: investor6});

      // checking token balances
      const investor1ExpectedToken = privateIcoMinimumContribution.mul(privateIcoTokensForEther).add(getAmountAirdropped(dropEvents, investor1));
      expect(await tokenBalanceOf(investor1)).to.eq.BN(investor1ExpectedToken);

      const investor2ExpectedToken = anotherMinimum.mul(anotherTokensForEther).add(getAmountAirdropped(dropEvents, investor2));
      expect(await tokenBalanceOf(investor2)).to.eq.BN(investor2ExpectedToken);

      const investor3ExpectedToken = tokenAmount1.mul(new BN('110')).div(new BN('100'))
        .add(getAmountAirdropped(dropEvents, investor3));
      expect(await tokenBalanceOf(investor3)).to.eq.BN(investor3ExpectedToken);

      expect(await tokenBalanceOf(investor4)).to.eq.BN(0);

      const investor5ExpectedToken = etherAmount1.mul(new BN(ico1Price.toString())).div(new BN('1000'))
        .mul(new BN('110')).div(new BN('100'))
        .add(getAmountAirdropped(dropEvents, investor5));
      expect(await tokenBalanceOf(investor5)).to.eq.BN(investor5ExpectedToken);

      const investor6ExpectedToken = tokenAmount1.add(getAmountAirdropped(dropEvents, saleNotedLockedContractAddress));
      expect(await tokenBalanceOf(investor6)).to.eq.BN(investor6ExpectedToken);

      const community1ExpectedToken = tokenAmount2.add(getAmountAirdropped(dropEvents, community1));
      expect(await tokenBalanceOf(community1)).to.eq.BN(community1ExpectedToken);

      const advisor1ExpectedToken = tokenAmount2.add(getAmountAirdropped(dropEvents, advisor1));
      expect(await tokenBalanceOf(advisor1)).to.eq.BN(advisor1ExpectedToken);

      const team1ExpectedToken = tokenAmount2.add(getAmountAirdropped(dropEvents, await allocatorContract.methods.lockingContracts(team1).call()));
      expect(await tokenBalanceOf(team1)).to.eq.BN(team1ExpectedToken);

      const team2ExpectedToken = tokenAmount2.add(getAmountAirdropped(dropEvents, await allocatorContract.methods.lockingContracts(team2).call()));
      expect(await tokenBalanceOf(team2)).to.eq.BN(team2ExpectedToken);

      const customer1ExpectedToken = tokenAmount2.add(getAmountAirdropped(dropEvents, await allocatorContract.methods.vestingContracts(customer1).call()));
      expect(await tokenBalanceOf(customer1)).to.eq.BN(customer1ExpectedToken);

      expect(await tokenBalanceOf(referring2)).to.eq.BN(0);

      
      // should airdrop up to the cap
      const tokenCap = new BN(await tokenContract.methods.cap().call());
      const totalSupply = new BN(await tokenContract.methods.totalSupply().call());
      expect(tokenCap.sub(totalSupply)).to.be.lt.BN(10);
    }).timeout(5000);
  });
});
