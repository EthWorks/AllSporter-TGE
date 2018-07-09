import {createWeb3, deployContract, latestTime, expectThrow, increaseTime, increaseTimeTo, durationInit} from 'ethworks-solidity';
import allSporterCoinJson from '../../build/contracts/AllSporterCoin.json';
import tgeJson from '../../build/contracts/Tge.json';
import Web3 from 'web3';
import chai from 'chai';
import bnChai from 'bn-chai';

const {expect} = chai;
const web3 = createWeb3(Web3);
const {BN} = web3.utils;
chai.use(bnChai(BN));
const duration = durationInit(web3);

describe('Tge', () => {
  let tokenOwner;
  let tokenContract;
  let accounts;
  let tgeOwner;
  let tgeContract;
  let saleStartTime;
  let thirdParty;
  let gas;
  let privateIcoStartTime;
  let privateIcoEndTime;
  const singleStateEtherCap = new BN(web3.utils.toWei('10000'));
  const saleEtherCap = new BN(web3.utils.toWei('100000000'));
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
  const tokenCap = new BN(web3.utils.toWei('260000000'));

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tgeOwner, tokenOwner, thirdParty] = accounts;
    const block = await web3.eth.getBlock('latest');
    gas = block.gasLimit;
  });

  beforeEach(async () => {
    tokenContract = await deployContract(web3, allSporterCoinJson, tokenOwner, []);

    saleStartTime = new BN(await latestTime(web3)).add(duration.days(10));
    tgeContract = await deployContract(web3, tgeJson, tgeOwner, [
      tokenContract.options.address,
      saleEtherCap
    ]);
    await tokenContract.methods.transferOwnership(tgeContract.options.address).send({from: tokenOwner});

    await tgeContract.methods.initialize(
      tgeOwner,
      tgeOwner,
      tgeOwner,
      tgeOwner,
      tgeOwner,
      saleStartTime,
      singleStateEtherCap
    ).send({from: tgeOwner});

    // private ico start/end times 
    privateIcoStartTime = new BN(await latestTime(web3)).add(duration.minutes(10));
    privateIcoEndTime = privateIcoStartTime.add(duration.days(2));
  });

  const isSellingState = async() => {
    await updateState();
    return await tgeContract.methods.isSellingState().call();
  };

  const increaseTimeToState = async(state) => {
    const startTime = await tgeContract.methods.startTimes(state).call();
    await increaseTimeTo(web3, startTime);
    await updateState();
  };

  const increaseContributionsToStateCap = async(state) => {
    const cap = new BN(await tgeContract.methods.etherCaps(state).call());
    const confirmed = new BN(await tgeContract.methods.confirmedSaleEther().call());
    const reserved = new BN(await tgeContract.methods.reservedSaleEther().call());
    const total = confirmed.add(reserved);
    if (total < cap) {
      await tgeContract.methods.reserve(cap.sub(total)).send({from: tgeOwner});
    }
  };

  const currentState = async() => {
    await updateState();
    return await tgeContract.methods.currentState().call();
  };

  const moveState = async (fromState, toState, from) =>
    tgeContract.methods.moveState(fromState, toState).send({from});

  const updateState = async() => tgeContract.methods.updateState().send({from: tgeOwner});

  const advanceDays = async (howMany) => {
    await increaseTime(web3, duration.days(howMany));
    await updateState();
  };
  
  const advanceToSaleStartTime = async() => {
    const destination = saleStartTime.add(new BN('100'));
    await increaseTimeTo(web3, destination);
    await updateState();
  };

  const getCurrentTokensForEther = async(etherAmount) => {
    await updateState();
    return await tgeContract.methods.getTokensForEther(etherAmount).call();
  };

  const transferTokenOwnership = async(from) => tgeContract.methods.transferTokenOwnership().send({from, gas});

  const initPrivateIco = async(cap, tokensForEther, startTime, endTime, minimumContribution, from) =>
    tgeContract.methods.initPrivateIco(cap, tokensForEther, startTime, endTime, minimumContribution).send({from, gas});

  const isPrivateIcoActive = async() => tgeContract.methods.isPrivateIcoActive().call();

  describe('initializing', async() => {
    let uninitializedTgeContract;
    const zeroAddress = '0x0';

    beforeEach(async() => {
      uninitializedTgeContract = await deployContract(web3, tgeJson, tgeOwner, [
        tokenContract.options.address,
        saleEtherCap
      ]);
    });

    const isInitialized = async() => uninitializedTgeContract.methods.isInitialized().call();

    const initialize = async(crowdsale, deferredKyc, referralManager, allocator, airdropper, saleStartTime, singleStateEtherCap, from) => uninitializedTgeContract.methods.initialize(
      crowdsale,
      deferredKyc,
      referralManager,
      allocator,
      airdropper,
      saleStartTime,
      singleStateEtherCap
    ).send({from});

    it('should be uninitialized initially', async() => {
      expect(await isInitialized()).to.be.false;
    });

    it('should allow to initialize by the owner', async() => {
      await initialize(tgeOwner, tgeOwner, tgeOwner, tgeOwner, tgeOwner, saleStartTime, singleStateEtherCap, tgeOwner);
      expect(await isInitialized()).to.be.true; 
    });

    it('should not allow to initialize by not the owner', async() => {
      await expectThrow(initialize(tgeOwner, tgeOwner, tgeOwner, tgeOwner, tgeOwner, saleStartTime, singleStateEtherCap, tokenOwner));
      expect(await isInitialized()).to.be.false; 
    });

    it('should allow to initialize twice', async() => {
      await initialize(tgeOwner, tgeOwner, tgeOwner, tgeOwner, tgeOwner, saleStartTime, singleStateEtherCap, tgeOwner);
      await initialize(tgeOwner, tgeOwner, tgeOwner, tgeOwner, tgeOwner, saleStartTime, singleStateEtherCap, tgeOwner);
    });

    it('should not initialize after presale', async () => {
      await advanceToSaleStartTime();
      await expectThrow(initialize(tgeOwner, tgeOwner, tgeOwner, tgeOwner, tgeOwner, saleStartTime, singleStateEtherCap, tgeOwner));
    });

    it('should not allow to initialize without crowdsale', async() => {
      await expectThrow(initialize(zeroAddress, tgeOwner, tgeOwner, tgeOwner, tgeOwner, saleStartTime, singleStateEtherCap, tgeOwner));
    });

    it('should not allow to initialize without deferredKyc', async() => {
      await expectThrow(initialize(tgeOwner, zeroAddress, tgeOwner, tgeOwner, tgeOwner, saleStartTime, singleStateEtherCap, tgeOwner));
    });

    it('should not allow to initialize without referralManager', async() => {
      await expectThrow(initialize(tgeOwner, tgeOwner, zeroAddress, tgeOwner, tgeOwner, saleStartTime, singleStateEtherCap, tgeOwner));
    });

    it('should not allow to initialize without allocator', async() => {
      await expectThrow(initialize(tgeOwner, tgeOwner, tgeOwner, zeroAddress, tgeOwner, saleStartTime, singleStateEtherCap, tgeOwner));
    });

    it('should not allow to initialize without airdropper', async() => {
      await expectThrow(initialize(tgeOwner, tgeOwner, tgeOwner, tgeOwner, zeroAddress, saleStartTime, singleStateEtherCap, tgeOwner));
    });

    describe('overriding initialization', async () => {
      beforeEach(async () => {
        await initialize(tgeOwner, tgeOwner, tgeOwner, tgeOwner, tgeOwner, saleStartTime, singleStateEtherCap, tgeOwner);
      });
      
      it('should override addresses', async () => {
        await initialize(thirdParty, thirdParty, thirdParty, thirdParty, thirdParty, saleStartTime, singleStateEtherCap, tgeOwner);
        expect(await uninitializedTgeContract.methods.crowdsale().call()).to.be.equal(thirdParty);
        expect(await uninitializedTgeContract.methods.deferredKyc().call()).to.be.equal(thirdParty);
        expect(await uninitializedTgeContract.methods.referralManager().call()).to.be.equal(thirdParty);
        expect(await uninitializedTgeContract.methods.allocator().call()).to.be.equal(thirdParty);
        expect(await uninitializedTgeContract.methods.airdropper().call()).to.be.equal(thirdParty);
      });

      it('should override state start times', async () => {
        const newStartTime = new BN(saleStartTime + 10000000);
        await initialize(tgeOwner, tgeOwner, tgeOwner, tgeOwner, tgeOwner, newStartTime, singleStateEtherCap, tgeOwner);
        expect(await uninitializedTgeContract.methods.startTimes(PREICO1).call()).to.be.eq.BN(newStartTime);
        expect(await uninitializedTgeContract.methods.startTimes(PREICO2).call()).to.be.eq.BN(newStartTime.add(duration.days(5)));
        expect(await uninitializedTgeContract.methods.startTimes(ICO1).call()).to.be.eq.BN(newStartTime.add(duration.days(13)));
        expect(await uninitializedTgeContract.methods.startTimes(ICO2).call()).to.be.eq.BN(newStartTime.add(duration.days(18)));
        expect(await uninitializedTgeContract.methods.startTimes(ICO3).call()).to.be.eq.BN(newStartTime.add(duration.days(23)));
        expect(await uninitializedTgeContract.methods.startTimes(ICO4).call()).to.be.eq.BN(newStartTime.add(duration.days(28)));
        expect(await uninitializedTgeContract.methods.startTimes(ICO5).call()).to.be.eq.BN(newStartTime.add(duration.days(33)));
        expect(await uninitializedTgeContract.methods.startTimes(ICO6).call()).to.be.eq.BN(newStartTime.add(duration.days(38)));
      });

      it('should override state ether caps', async () => {
        const newSingleEtherCap = 100;
        await initialize(tgeOwner, tgeOwner, tgeOwner, tgeOwner, tgeOwner, saleStartTime, newSingleEtherCap, tgeOwner);
        expect(await uninitializedTgeContract.methods.etherCaps(PREICO1).call()).to.be.eq.BN(newSingleEtherCap);
        expect(await uninitializedTgeContract.methods.etherCaps(PREICO2).call()).to.be.eq.BN(newSingleEtherCap * 2);
        expect(await uninitializedTgeContract.methods.etherCaps(ICO1).call()).to.be.eq.BN(newSingleEtherCap * 3);
        expect(await uninitializedTgeContract.methods.etherCaps(ICO2).call()).to.be.eq.BN(newSingleEtherCap * 4);
        expect(await uninitializedTgeContract.methods.etherCaps(ICO3).call()).to.be.eq.BN(newSingleEtherCap * 5);
        expect(await uninitializedTgeContract.methods.etherCaps(ICO4).call()).to.be.eq.BN(newSingleEtherCap * 6);
        expect(await uninitializedTgeContract.methods.etherCaps(ICO5).call()).to.be.eq.BN(newSingleEtherCap * 7);
        expect(await uninitializedTgeContract.methods.etherCaps(ICO6).call()).to.be.eq.BN(newSingleEtherCap * 8);
      });
    });
  });

  describe('Creating', async () => {
    it('should be properly deployed', async () => {
      const actualCurrentState = await tgeContract.methods.currentState().call();
      expect(actualCurrentState).to.eq.BN('0');
    });

    describe('should have proper state ether caps', async() => {
      it('Presale state should have proper ether cap', async() => {
        expect(await tgeContract.methods.etherCaps(PRESALE).call())
          .to.eq.BN('0');
      });

      it('Preico1 state should have proper ether cap', async() => {
        expect(await tgeContract.methods.etherCaps(PREICO1).call())
          .to.eq.BN(singleStateEtherCap);
      });

      it('Preico2 state should have proper ether cap', async() => {
        expect(await tgeContract.methods.etherCaps(PREICO2).call())
          .to.eq.BN(singleStateEtherCap.mul(new BN('2')));
      });

      it('Break state should have proper ether cap', async() => {
        expect(await tgeContract.methods.etherCaps(BREAK).call())
          .to.eq.BN('0');
      });

      it('Ico1 state should have proper ether cap', async() => {
        expect(await tgeContract.methods.etherCaps(ICO1).call())
          .to.eq.BN(singleStateEtherCap.mul(new BN(3)));
      });

      it('Ico2 state should have proper ether cap', async() => {
        expect(await tgeContract.methods.etherCaps(ICO2).call())
          .to.eq.BN(singleStateEtherCap.mul(new BN('4')));
      });

      it('Ico3 state should have proper ether cap', async() => {
        expect(await tgeContract.methods.etherCaps(ICO3).call())
          .to.eq.BN(singleStateEtherCap.mul(new BN('5')));
      });

      it('Ico4 state should have proper ether cap', async() => {
        expect(await tgeContract.methods.etherCaps(ICO4).call())
          .to.eq.BN(singleStateEtherCap.mul(new BN('6')));
      });

      it('Ico5 state should have proper ether cap', async() => {
        expect(await tgeContract.methods.etherCaps(ICO5).call())
          .to.eq.BN(singleStateEtherCap.mul(new BN('7')));
      });

      it('Ico6 state should have proper ether cap', async() => {
        expect(await tgeContract.methods.etherCaps(ICO6).call())
          .to.eq.BN(singleStateEtherCap.mul(new BN('8')));
      });

      it('FinishingIco state should have proper ether cap', async() => {
        expect(await tgeContract.methods.etherCaps(FINISHING_ICO).call())
          .to.eq.BN('0');
      });

      it('Allocating state should have proper ether cap', async() => {
        expect(await tgeContract.methods.etherCaps(ALLOCATING).call())
          .to.eq.BN('0');
      });

      it('Airdropping state should have proper ether cap', async() => {
        expect(await tgeContract.methods.etherCaps(AIRDROPPING).call())
          .to.eq.BN('0');
      });

      it('Finished state should have proper ether cap', async() => {
        expect(await tgeContract.methods.etherCaps(FINISHED).call())
          .to.eq.BN('0');
      });
    });
  });

  describe('advancing states based on time', async () => {
    it('should be in Presale state initially', async () => {
      expect(await currentState()).to.eq.BN(PRESALE);
    });

    it('should be in Preico1 state after sale start time', async() => {
      await advanceToSaleStartTime();
      expect(await currentState()).to.eq.BN(PREICO1); 
    });

    it('should advance states based on time', async () => {
      await advanceToSaleStartTime();
      expect(await currentState()).to.eq.BN(PREICO1);

      await advanceDays(5);
      expect(await currentState()).to.eq.BN(PREICO2);

      await advanceDays(5);
      expect(await currentState()).to.eq.BN(BREAK);

      await advanceDays(3);
      expect(await currentState()).to.eq.BN(ICO1);

      await advanceDays(5);
      expect(await currentState()).to.eq.BN(ICO2);

      await advanceDays(5);
      expect(await currentState()).to.eq.BN(ICO3);

      await advanceDays(5);
      expect(await currentState()).to.eq.BN(ICO4);

      await advanceDays(5);
      expect(await currentState()).to.eq.BN(ICO5);

      await advanceDays(5);
      expect(await currentState()).to.eq.BN(ICO6);

      await advanceDays(5);
      expect(await currentState()).to.eq.BN(FINISHING_ICO);
    });

    it('should remain in the last state', async() => {
      await advanceToSaleStartTime();
      await advanceDays(73);
      expect(await currentState()).to.eq.BN(FINISHING_ICO);
      await advanceDays(1000);
      expect(await currentState()).to.eq.BN(FINISHING_ICO);
    });
  });

  describe('advancing states based on ethereum caps', async() => {
    describe('advancing one state at a time', async () => {
      it('should not advance from presale to preico1', async () => {
        expect(await currentState()).to.eq.BN(PRESALE);

        await updateState(singleStateEtherCap);
        expect(await currentState()).to.eq.BN(PRESALE);
      });
  
      it('should advance from preico1 to preico2', async () => {
        await increaseTimeToState(PREICO1);

        await increaseContributionsToStateCap(PREICO1);
        expect(await currentState()).to.eq.BN(PREICO2);
      });
  
      it('should advance from preico2 to break', async () => {
        await increaseTimeToState(PREICO2);

        await increaseContributionsToStateCap(PREICO2);
        expect(await currentState()).to.eq.BN(BREAK);
      });
  
      it('should not advance from break to ico1', async () => {
        await increaseTimeToState(BREAK);

        await increaseContributionsToStateCap(BREAK);
        await updateState(tokenCap);
        expect(await currentState()).to.eq.BN(BREAK);
      });

      it('should advance from ico1 to ico2', async () => {
        await increaseTimeToState(ICO1);

        await increaseContributionsToStateCap(ICO1);
        expect(await currentState()).to.eq.BN(ICO2);
      });

      it('should advance from ico2 to ico3', async () => {
        await increaseTimeToState(ICO2);

        await increaseContributionsToStateCap(ICO2);
        expect(await currentState()).to.eq.BN(ICO3);
      });

      it('should advance from ico3 to ico4', async () => {
        await increaseTimeToState(ICO3);

        await increaseContributionsToStateCap(ICO3);
        expect(await currentState()).to.eq.BN(ICO4);
      });

      it('should advance from ico4 to ico5', async () => {
        await increaseTimeToState(ICO4);

        await increaseContributionsToStateCap(ICO4);
        expect(await currentState()).to.eq.BN(ICO5);
      });

      it('should advance from ico5 to ico6', async () => {
        await increaseTimeToState(ICO5);

        await increaseContributionsToStateCap(ICO5);
        expect(await currentState()).to.eq.BN(ICO6);
      });

      it('should advance from ico6 to finishing_ico', async () => {
        await increaseTimeToState(ICO6);

        await increaseContributionsToStateCap(ICO6);
        expect(await currentState()).to.eq.BN(FINISHING_ICO);
      });

      it('should not advance from finishing_ico to the next state', async () => {
        await increaseTimeToState(FINISHING_ICO);

        await increaseContributionsToStateCap(FINISHING_ICO);
        await updateState(tokenCap);
        expect(await currentState()).to.eq.BN(FINISHING_ICO);
      });
    });

    describe('advancing more than one state at a time', async () => {
      it('should advance from preico1 to break', async() => {
        await increaseTimeToState(PREICO1);

        await increaseContributionsToStateCap(PREICO2);
        expect(await currentState()).to.eq.BN(BREAK);
      });

      it('should advance from ico1 to FINISHING_ICO', async() => {
        await increaseTimeToState(ICO1);

        await increaseContributionsToStateCap(ICO6);
        expect(await currentState()).to.eq.BN(FINISHING_ICO);
      });
    });

    it('should not reverse state to a previous one', async() => {
      await increaseTimeToState(ICO1);
      
      await increaseContributionsToStateCap(ICO5);
      expect(await currentState()).to.eq.BN(ICO6);

      await increaseContributionsToStateCap(ICO1);
      expect(await currentState()).to.eq.BN(ICO6);
    });
  });

  describe('moving states', async() => {
    it('should allow the owner to move the state', async() => {
      await moveState(PRESALE, ICO6, tgeOwner);
      expect(await currentState()).to.eq.BN(ICO6);
    });

    it('should not allow third party to move the state', async() => {
      await expectThrow(moveState(PRESALE, ICO6, tokenOwner));
      expect(await currentState()).to.eq.BN(PRESALE);
    });
  });

  describe('state characteristics', async () => {
    describe('Presale', async () => {
      beforeEach(async() => {
        expect(await currentState()).to.eq.BN(PRESALE);
      });

      it('should not be a selling state', async() => {
        expect(await isSellingState()).to.be.false;
      });

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(0);
      });
    });

    describe('Preico1', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        expect(await currentState()).to.eq.BN(PREICO1);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('3955.3'));
      });
    });

    describe('Preico2', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(5);
        expect(await currentState()).to.eq.BN(PREICO2);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('3818.9'));
      });
    });

    describe('Break', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(10);
        expect(await currentState()).to.eq.BN(BREAK);
      });

      it('should not be a selling state', async() => {
        expect(await isSellingState()).to.be.false;
      });

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(0);
      });
    });

    describe('Ico1', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(13);
        expect(await currentState()).to.eq.BN(ICO1);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('3460.9'));
      });
    });

    describe('Ico2', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(18);
        expect(await currentState()).to.eq.BN(ICO2);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('3355.9'));
      });
    });

    describe('Ico3', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(23);
        expect(await currentState()).to.eq.BN(ICO3);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('3164.1'));
      });
    });

    describe('Ico4', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(28);
        expect(await currentState()).to.eq.BN(ICO4);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('3076.2'));
      });
    });

    describe('Ico5', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(33);
        expect(await currentState()).to.eq.BN(ICO5);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('2914.3'));
      });
    });

    describe('Ico6', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(38);
        expect(await currentState()).to.eq.BN(ICO6);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('2768.6'));
      });
    });

    describe('FinishingIco', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(73);
        expect(await currentState()).to.eq.BN(FINISHING_ICO);
      });

      it('should not be a selling state', async() => {
        expect(await isSellingState()).to.be.false;
      });

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('0'));
      });
    });

    describe('Allocating', async () => {
      beforeEach(async() => {
        await moveState(PRESALE, ALLOCATING, tgeOwner);
        expect(await currentState()).to.eq.BN(ALLOCATING);
      });

      it('should not be a selling state', async() => {
        expect(await isSellingState()).to.be.false;
      });

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('0'));
      });
    });

    describe('Airdropping', async () => {
      beforeEach(async() => {
        await moveState(PRESALE, AIRDROPPING, tgeOwner);
        expect(await currentState()).to.eq.BN(AIRDROPPING);
      });

      it('should not be a selling state', async() => {
        expect(await isSellingState()).to.be.false;
      });

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('0'));
      });
    });

    describe('Finished', async () => {
      beforeEach(async() => {
        await moveState(PRESALE, FINISHED, tgeOwner);
        expect(await currentState()).to.eq.BN(FINISHED);
      });

      it('should not be a selling state', async() => {
        expect(await isSellingState()).to.be.false;
      });

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('0'));
      });
    });
  });

  describe('Transferring token ownership', async () => {
    const getTokenOwner = async() => tokenContract.methods.owner().call();

    it('should allow to transfer token ownership', async() => {
      await moveState(PRESALE, FINISHED, tgeOwner);
      await transferTokenOwnership(tgeOwner);
      expect(await getTokenOwner()).to.be.equal(tgeOwner);
    });

    it('should not allow to transfer token ownership before finishing', async() => {
      await increaseTimeToState(FINISHING_ICO, tgeOwner);
      await expectThrow(transferTokenOwnership(tgeOwner));

      await moveState(FINISHING_ICO, ALLOCATING, tgeOwner);
      await expectThrow(transferTokenOwnership(tgeOwner));

      await moveState(ALLOCATING, AIRDROPPING, tgeOwner);
      await expectThrow(transferTokenOwnership(tgeOwner));

      expect(await getTokenOwner()).to.be.equal(tgeContract.options.address);
    });

    it('should not allow to transfer token ownership by third party', async() => {
      await expectThrow(transferTokenOwnership(thirdParty));
      expect(await getTokenOwner()).to.be.equal(tgeContract.options.address);
    });
  });

  describe('Private ico', async () => {
    const cap = new BN('10');
    const tokensForEther = new BN('2000000');
    const minimumContribution = new BN('2');

    it('should not be active initially', async () => {
      expect(await isPrivateIcoActive()).to.be.false;
    });

    it('should allow to start a private ico by the owner', async () => {
      await initPrivateIco(cap, tokensForEther, privateIcoStartTime, privateIcoEndTime, minimumContribution, tgeOwner);
      expect(await isPrivateIcoActive()).to.be.false;
      await increaseTimeTo(web3, privateIcoStartTime);
      expect(await isPrivateIcoActive()).to.be.true;
    });

    it('should set up fields correctly', async () => {
      await initPrivateIco(cap, tokensForEther, privateIcoStartTime, privateIcoEndTime, minimumContribution, tgeOwner);
      expect(await tgeContract.methods.privateIcoCap().call()).to.eq.BN(cap);
      expect(await tgeContract.methods.privateIcoTokensForEther().call()).to.eq.BN(tokensForEther);
      expect(await tgeContract.methods.privateIcoStartTime().call()).to.eq.BN(privateIcoStartTime);
      expect(await tgeContract.methods.privateIcoEndTime().call()).to.eq.BN(privateIcoEndTime);
      expect(await tgeContract.methods.privateIcoMinimumContribution().call()).to.eq.BN(minimumContribution);
    });

    it('should not allow to start a private ico by not the owner', async () => {
      await expectThrow(initPrivateIco(cap, tokensForEther, privateIcoStartTime, privateIcoEndTime, minimumContribution, thirdParty));
      expect(await isPrivateIcoActive()).to.be.false;
      await increaseTimeTo(web3, privateIcoStartTime);
      expect(await isPrivateIcoActive()).to.be.false;
    });

    it('should not allow to start a private ico after presale', async () => {
      await increaseTimeToState(PREICO1);
      await expectThrow(initPrivateIco(cap, tokensForEther, privateIcoStartTime, privateIcoEndTime, minimumContribution, thirdParty));
      expect(await isPrivateIcoActive()).to.be.false;
    });

    it('should not allow to start a private ico with end date after presale end date', async () => {
      const preicoStart = await tgeContract.methods.startTimes(PREICO1).call();
      await expectThrow(initPrivateIco(cap, tokensForEther, privateIcoStartTime, preicoStart, minimumContribution, tgeOwner));
    });

    describe('Starting second private ico', async () => {
      let secondPrivateIcoStartTime;
      let secondPrivateIcoEndTime;
      const anotherCap = cap.add(new BN('2'));
      const anotherMinimum = minimumContribution.sub(new BN('1'));
      const anotherTokensForEther = tokensForEther.sub(new BN('1'));

      beforeEach(async() => {
        secondPrivateIcoStartTime = privateIcoEndTime.add(duration.days(2));
        secondPrivateIcoEndTime = secondPrivateIcoStartTime.add(duration.days(2));
        await initPrivateIco(cap, tokensForEther, privateIcoStartTime, privateIcoEndTime, minimumContribution, tgeOwner);
      });

      it('should not allow to start a private ico after one is already started', async () => {
        await increaseTimeTo(web3, privateIcoStartTime.add(duration.minutes(1)));
        await expectThrow(initPrivateIco(anotherCap, anotherTokensForEther, secondPrivateIcoStartTime, secondPrivateIcoEndTime, anotherMinimum, tgeOwner));
      });
  
      it('should not allow to start a private ico after one is already initiated (but not started yet)', async () => {
        expect(await isPrivateIcoActive()).to.be.false;
        await expectThrow(initPrivateIco(anotherCap, anotherTokensForEther, secondPrivateIcoStartTime, secondPrivateIcoEndTime, anotherMinimum, tgeOwner));
      });
  
      it('should allow to start a private ico after previous one is finished', async () => {
        await increaseTimeTo(web3, privateIcoEndTime.add(duration.minutes(1)));
        expect(await isPrivateIcoActive()).to.be.false;
  
        await initPrivateIco(anotherCap, anotherTokensForEther, secondPrivateIcoStartTime, secondPrivateIcoEndTime, anotherMinimum, tgeOwner);
        await increaseTimeTo(web3, secondPrivateIcoStartTime.add(duration.minutes(1)));
        expect(await isPrivateIcoActive()).to.be.true;
      });

      it('should not allow to start a second private ico without bigger cap', async () => {
        await increaseTimeTo(web3, privateIcoEndTime.add(duration.minutes(1)));
        await expectThrow(initPrivateIco(cap, anotherTokensForEther, secondPrivateIcoStartTime, secondPrivateIcoEndTime, anotherMinimum, tgeOwner));
      });
    });    
  });
});
