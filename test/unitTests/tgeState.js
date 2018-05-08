import {createWeb3, deployContract, latestTime, expectThrow, increaseTimeTo, increaseTime, durationInit} from 'ethworks-solidity';
import allSporterCoinJson from '../../build/contracts/AllSporterCoin.json';
import minterJson from '../../build/contracts/Minter.json';
import pricingMockJson from '../../build/contracts/PricingMock.json';
import tgeStateJson from '../../build/contracts/TgeState.json';
import Web3 from 'web3';
import chai from 'chai';
import bnChai from 'bn-chai';

const {expect} = chai;
const web3 = createWeb3(Web3);
const {BN} = web3.utils;
chai.use(bnChai(BN));
const duration = durationInit(web3);

describe('TgeState', () => {
  let tokenOwner;
  let tokenContract;
  let accounts;
  let tgeStateOwner;
  let tgeStateContract;
  let updater;
  const singleStateEtherCap = new BN(web3.utils.toWei('10000'));
  let saleStartTime;
  const tokenCap = new BN(web3.utils.toWei('260000000'));
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

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tgeStateOwner, tokenOwner, updater] = accounts;
  });

  beforeEach(async () => {
    tokenContract = await deployContract(web3, allSporterCoinJson, tokenOwner, []);

    saleStartTime = await latestTime(web3) + 100;
    tgeStateContract = await deployContract(web3, tgeStateJson, tgeStateOwner, [
      saleStartTime,
      singleStateEtherCap
    ]);
    tgeStateContract.methods.addStateUpdater(tgeStateOwner).send({from: tgeStateOwner});
  });

  const advanceDays = async (howMany) => {
    await increaseTime(web3, duration.days(howMany));
  };
  
  const advanceToSaleStartTime = async() => {
    const destination = saleStartTime + 100;
    await increaseTimeTo(web3, destination);
  };

  const updateState = async(totalEtherContributions = 0, from = tgeStateOwner) => tgeStateContract.methods.updateState(totalEtherContributions).send({from});

  const isSellingState = async() => {
    await updateState();
    return await tgeStateContract.methods.isSellingState().call();
  };

  const currentState = async() => {
    await updateState();
    return await tgeStateContract.methods.currentState().call();
  };

  const moveState = async (fromState, toState, from) =>
    tgeStateContract.methods.moveState(fromState, toState).send({from});

  const increaseTimeToState = async(state) => {
    const startTime = await tgeStateContract.methods.startTimes(state).call();
    await increaseTimeTo(web3, startTime);
    await updateState();
  };

  const addStateUpdater = async(newUpdater, from) =>
    tgeStateContract.methods.addStateUpdater(newUpdater).send({from});

  const increaseContributionsToStateCap = async(state) => {
    const cap = await tgeStateContract.methods.etherCaps(state).call();
    await tgeStateContract.methods.updateState(cap).send({from: tgeStateOwner});
  };

  it('should be properly created', async () => {
    const actualCurrentState = await tgeStateContract.methods.currentState().call();
    expect(actualCurrentState).to.eq.BN(0);
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

      await advanceDays(10);
      expect(await currentState()).to.eq.BN(ICO2);

      await advanceDays(10);
      expect(await currentState()).to.eq.BN(ICO3);

      await advanceDays(10);
      expect(await currentState()).to.eq.BN(ICO4);

      await advanceDays(10);
      expect(await currentState()).to.eq.BN(ICO5);

      await advanceDays(10);
      expect(await currentState()).to.eq.BN(ICO6);

      await advanceDays(10);
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

    describe('state updaters', async () => {
      it('should allow to add state updater', async () => {
        expect(await tgeStateContract.methods.stateUpdaters(updater).call()).to.be.false;
        await addStateUpdater(updater, tgeStateOwner);
        expect(await tgeStateContract.methods.stateUpdaters(updater).call()).to.be.true;
      });

      it('should not allow to add state updater by third party', async () => {
        await expectThrow(addStateUpdater(updater, updater));
        expect(await tgeStateContract.methods.stateUpdaters(updater).call()).to.be.false;
      });

      it('should not allow to update state by not state updater', async () => {
        await increaseTimeToState(ICO1);
        await expectThrow(updateState(singleStateEtherCap, updater));
        expect(await currentState()).to.eq.BN(ICO1);
      });

      it('should allow to update state by new state updater', async () => {
        await increaseTimeToState(ICO1);
        await addStateUpdater(updater, tgeStateOwner);
        await updateState(singleStateEtherCap, updater);
        expect(await currentState()).to.eq.BN(ICO2);
      });
    });
  });

  describe('moving states', async() => {
    it('should allow the owner to move the state', async() => {
      await moveState(PRESALE, ICO6, tgeStateOwner);
      expect(await currentState()).to.eq.BN(ICO6);
    });

    it('should not allow any updater to move the state', async() => {
      await addStateUpdater(updater, tgeStateOwner);
      await expectThrow(moveState(PRESALE, ICO6, updater));
      expect(await currentState()).to.eq.BN(PRESALE);
    });
  });

  describe('state characteristics', async () => {
    describe('Presale', async () => {
      it('should not be a selling state', async() => {
        expect(await currentState()).to.eq.BN(PRESALE);
        expect(await isSellingState()).to.be.false;
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
    });

    describe('Ico2', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(23);
        expect(await currentState()).to.eq.BN(ICO2);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });
    });

    describe('Ico3', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(33);
        expect(await currentState()).to.eq.BN(ICO3);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });
    });

    describe('Ico4', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(43);
        expect(await currentState()).to.eq.BN(ICO4);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });
    });

    describe('Ico5', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(53);
        expect(await currentState()).to.eq.BN(ICO5);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });
    });

    describe('Ico6', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(63);
        expect(await currentState()).to.eq.BN(ICO6);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });
    });

    describe('FINISHING_ICO', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(73);
        expect(await currentState()).to.eq.BN(FINISHING_ICO);
      });

      it('should not be a selling state', async() => {
        expect(await isSellingState()).to.be.false;
      });
    });
  });
});
