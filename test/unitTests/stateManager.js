import {createWeb3, deployContract, increaseTimeTo, durationInit, expectThrow, increaseTime, latestTime} from 'ethworks-solidity';
import allSporterCoinJson from '../../build/contracts/AllSporterCoin.json';
import minterJson from '../../build/contracts/Minter.json';
import stateManagerJson from '../../build/contracts/StateManager.json';
import Web3 from 'web3';
import chai from 'chai';
import bnChai from 'bn-chai';

const {expect} = chai;
const web3 = createWeb3(Web3);
const {BN} = web3.utils;
chai.use(bnChai(BN));
const duration = durationInit(web3);

describe('State Manager', () => {
  let tokenOwner;
  let tokenContract;
  let accounts;
  let minterOwner;
  let minterContract;
  let whitelisted;
  let stateContract;
  let stateContractOwner;
  let saleStartTime;
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
  const ALLOCATING = 10;
  const FINISHED = 11;
  const etherAmount = new BN(web3.utils.toWei('1000'));
  const singleStateEtherCap = new BN(web3.utils.toWei('10000'));
  const saleTokenCap = new BN(web3.utils.toWei('156000000'));
  const tokenCap = new BN(web3.utils.toWei('260000000'));

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tokenOwner, minterOwner, whitelisted, stateContractOwner] = accounts;
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
    await minterContract.methods.add(whitelisted).send({from: minterOwner});

    // state manager
    saleStartTime = await latestTime(web3) + 100;
    stateContract = await deployContract(web3, stateManagerJson, stateContractOwner, [
      saleStartTime,
      singleStateEtherCap
    ]);
    await minterContract.methods.add(stateContract.options.address).send({from: minterOwner});
  });

  const advanceDays = async (howMany) => {
    await increaseTime(web3, duration.days(howMany));
  };
  const advanceToSaleStartTime = async() => {
    const destination = saleStartTime + 100;
    await increaseTimeTo(web3, destination);
  };
  const updateState = async(totalEtherContributions = 0) => stateContract.methods.updateState(totalEtherContributions).send({from: stateContractOwner});

  const isSellingState = async() => {
    await updateState();
    return await stateContract.methods.isSellingState().call();
  };

  const getCurrentTokensForEther = async(etherAmount) => {
    await updateState();
    return await stateContract.methods.getCurrentTokensForEther(etherAmount).call();
  };

  const currentState = async() => {
    await updateState();
    return await stateContract.methods.currentState().call();
  };

  const finalize = async (from) => stateContract.methods.finalize().send({from});

  const increaseTimeToState = async(state) => {
    const startTime = await stateContract.methods.startTimes(state).call();
    await increaseTimeTo(web3, startTime);
    await updateState();
  };

  const increaseContributionsToStateCap = async(state) => {
    const cap = await stateContract.methods.etherCaps(state).call();
    await stateContract.methods.updateState(cap).send({from: stateContractOwner});
  };

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
      expect(await currentState()).to.eq.BN(ALLOCATING);
    });

    it('should remain in Allocating state', async() => {
      await advanceToSaleStartTime();
      await advanceDays(73);
      expect(await currentState()).to.eq.BN(ALLOCATING);
      await advanceDays(1000);
      expect(await currentState()).to.eq.BN(ALLOCATING);
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

      it('should advance from ico6 to allocating', async () => {
        await increaseTimeToState(ICO6);

        await increaseContributionsToStateCap(ICO6);
        expect(await currentState()).to.eq.BN(ALLOCATING);
      });

      it('should not advance from allocating to finished', async () => {
        await increaseTimeToState(ALLOCATING);

        await increaseContributionsToStateCap(ALLOCATING);
        await updateState(tokenCap);
        expect(await currentState()).to.eq.BN(ALLOCATING);
      });
    });

    describe('advancing more than one state at a time', async () => {
      it('should advance from preico1 to break', async() => {
        await increaseTimeToState(PREICO1);

        await increaseContributionsToStateCap(PREICO2);
        expect(await currentState()).to.eq.BN(BREAK);
      });

      it('should advance from ico1 to allocating', async() => {
        await increaseTimeToState(ICO1);

        await increaseContributionsToStateCap(ICO6);
        expect(await currentState()).to.eq.BN(ALLOCATING);
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

  describe('state characteristics', async () => {
    const testShouldFinalize = async(from) => {
      await finalize(from);
      expect(await currentState()).to.eq.BN(FINISHED);
    };

    const testShouldNotFinalize = async(from) => {
      const initialState = await currentState();
      await expectThrow(finalize(from));
      expect(await currentState()).to.eq.BN(initialState);
    };

    describe('Presale', async () => {
      it('should not be a selling state', async() => {
        expect(await isSellingState()).to.be.false;
      });

      it('should not allow to finalize', async() => testShouldNotFinalize(stateContractOwner));

      it('should return a proper amount of tokens for ether', async() => {
        expect(await getCurrentTokensForEther(etherAmount)).to.eq.BN(0);
      });
    });

    describe('Preico1', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should not allow to finalize', async() => testShouldNotFinalize(stateContractOwner));

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('3250'));
      });
    });

    describe('Preico2', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(5);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should not allow to finalize', async() => testShouldNotFinalize(stateContractOwner));

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('3087.5'));
      });
    });

    describe('Break', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(10);
      });

      it('should not be a selling state', async() => {
        expect(await isSellingState()).to.be.false;
      });

      it('should not allow to finalize', async() => testShouldNotFinalize(stateContractOwner));

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(0);
      });
    });

    describe('Ico1', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(13);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should not allow to finalize', async() => testShouldNotFinalize(stateContractOwner));

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('2925'));
      });
    });

    describe('Ico2', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(23);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should not allow to finalize', async() => testShouldNotFinalize(stateContractOwner));

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('2762.5'));
      });
    });

    describe('Ico3', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(33);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should not allow to finalize', async() => testShouldNotFinalize(stateContractOwner));

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('2600'));
      });
    });

    describe('Ico4', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(43);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should not allow to finalize', async() => testShouldNotFinalize(stateContractOwner));

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('2437.5'));
      });
    });

    describe('Ico5', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(53);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should not allow to finalize', async() => testShouldNotFinalize(stateContractOwner));

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('2112.5'));
      });
    });

    describe('Ico6', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(63);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should not allow to finalize', async() => testShouldNotFinalize(stateContractOwner));

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('1950'));
      });
    });

    describe('Allocating', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(73);
        expect(await currentState()).to.eq.BN(ALLOCATING);
      });

      it('should not be a selling state', async() => {
        expect(await isSellingState()).to.be.false;
      });

      it('should allow to finalize', async() => testShouldFinalize(stateContractOwner));
      it('should not allow to finalize by not the owner', async() => testShouldNotFinalize(tokenOwner));

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('0'));
      });
    });

    describe('Finished', async() => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(73);
        await updateState();
        await finalize(stateContractOwner);
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
