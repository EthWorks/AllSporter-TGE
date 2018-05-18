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
    [tgeOwner, tokenOwner] = accounts;
  });

  beforeEach(async () => {
    tokenContract = await deployContract(web3, allSporterCoinJson, tokenOwner, []);

    saleStartTime = await latestTime(web3) + 100;
    tgeContract = await deployContract(web3, tgeJson, tgeOwner, [
      tokenContract.options.address,
      saleEtherCap,
      saleStartTime,
      singleStateEtherCap
    ]);

    tgeContract.methods.initialize(
      tgeOwner,
      tgeOwner,
      tgeOwner,
      tgeOwner,
      tgeOwner
    ).send({from: tgeOwner});
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
    const destination = saleStartTime + 100;
    await increaseTimeTo(web3, destination);
    await updateState();
  };

  const getCurrentTokensForEther = async(etherAmount) => {
    await updateState();
    return await tgeContract.methods.getTokensForEther(etherAmount).call();
  };

  it('should be properly created', async () => {
    const actualCurrentState = await tgeContract.methods.currentState().call();
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
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('3250'));
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
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('3087.5'));
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
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('2925'));
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
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('2762.5'));
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
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('2600'));
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
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('2437.5'));
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
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('2112.5'));
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
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('1950'));
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
});
