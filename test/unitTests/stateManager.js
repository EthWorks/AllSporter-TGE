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
  const ICO1 = 5;
  const ICO2 = 6;
  const ICO3 = 7;
  const ICO4 = 8;
  const ICO5 = 9;
  const ICO6 = 10;
  const ALLOCATING = 11;
  const AIRDROPPING = 12;
  const FINISHED = 13;
  const etherAmount = new BN(web3.utils.toWei('1000'));

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tokenOwner, minterOwner, whitelisted, stateContractOwner] = accounts;
  });

  beforeEach(async () => {
    // token
    tokenContract = await deployContract(web3, allSporterCoinJson, tokenOwner, []);

    // minter
    minterContract = await deployContract(web3, minterJson, minterOwner, [tokenContract.options.address]);
    await tokenContract.methods.transferOwnership(minterContract.options.address).send({from: tokenOwner});
    await minterContract.methods.add(whitelisted).send({from: minterOwner});

    // state manager
    saleStartTime = (await latestTime(web3)) + 100;
    stateContract = await deployContract(web3, stateManagerJson, stateContractOwner, [minterContract.options.address, saleStartTime]);
    await minterContract.methods.add(stateContract.options.address).send({from: minterOwner});
    await stateContract.methods.add(whitelisted).send({from: stateContractOwner});
  });

  const advanceDays = async (howMany) => {
    await increaseTime(web3, duration.days(howMany));
  };
  const advanceToSaleStartTime = async() => {
    await increaseTimeTo(web3, saleStartTime + 1);
  };
  const isSellingState = async() => stateContract.methods.isSellingState().call();
  const getCurrentTokensForEther = async(etherAmount) => stateContract.methods.getCurrentTokensForEther(etherAmount).call();
  const currentState = async() => {
    await stateContract.methods.icoEnded().send({from: stateContractOwner}); // to updateState
    const state = await stateContract.methods.currentState().call();
    return state;
  };
  const startAirdropping = async (from) => stateContract.methods.startAirdropping().send({from});
  const finalize = async (from) => stateContract.methods.finalize().send({from});

  it('should be properly created', async () => {
    const actualMinterAddress = await stateContract.methods.minter().call({from: stateContractOwner});
    expect(actualMinterAddress).to.be.equal(minterContract.options.address);
  });

  xdescribe('advancing states based on time', async () => {
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

    xit('should remain in ALLOCATING state', async() => {
      await advanceToSaleStartTime();
      await advanceDays(13);
      await advanceDays(30);
      await advanceDays(30);
      expect(await currentState()).to.eq.BN(ALLOCATING);
      await advanceDays(20);
      expect(await currentState()).to.eq.BN(ALLOCATING);
    });
  });

  xdescribe('advancing states based on token caps', async() => {

  });

  xdescribe('state characteristics', async () => {
    const testShouldFinalize = async() => {
      await finalize(tokenOwner);
      expect(await tokenContract.methods.owner().call()).to.be.equal(tokenOwner);
      expect(await currentState()).to.eq.BN(FINISHED);
    };

    const testShouldNotFinalize = async() => {
      const initialState = await currentState();
      await expectThrow(finalize(tokenOwner));
      expect(await tokenContract.methods.owner().call()).to.be.equal(minterContract.options.address);
      expect(await currentState()).to.eq.BN(initialState);
    };

    const testShouldStartAirdropping = async() => {
      await startAirdropping(tokenOwner);
      expect(await tokenContract.methods.owner().call()).to.be.equal(tokenOwner);
      expect(await currentState()).to.eq.BN(AIRDROPPING);
    };

    const testShouldNotStartAirdropping = async() => {
      const initialState = await currentState();
      await expectThrow(startAirdropping(tokenOwner));
      expect(await tokenContract.methods.owner().call()).to.be.equal(minterContract.options.address);
      expect(await currentState()).to.eq.BN(initialState);
    };

    describe('Presale', async () => {
      it('should not be a selling state', async() => {
        expect(await isSellingState()).to.be.false;
      });

      it('should not allow to finalize', async() => testShouldNotFinalize());
      it('should not allow to start airdropping', async() => testShouldNotStartAirdropping());

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

      it('should not allow to finalize', async() => testShouldNotFinalize());
      it('should not allow to start airdropping', async() => testShouldNotStartAirdropping());
    });

    describe('Preico2', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(5);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should not allow to finalize', async() => testShouldNotFinalize());
      it('should not allow to start airdropping', async() => testShouldNotStartAirdropping());
    });

    describe('Break', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(10);
      });

      it('should not be a selling state', async() => {
        expect(await isSellingState()).to.be.false;
      });

      it('should not allow to finalize', async() => testShouldNotFinalize());
      it('should not allow to start airdropping', async() => testShouldNotStartAirdropping());
    });

    describe('Ico1', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(13);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should not allow to finalize', async() => testShouldNotFinalize());
      it('should not allow to start airdropping', async() => testShouldNotStartAirdropping());
    });

    describe('Ico2', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(23);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should not allow to finalize', async() => testShouldNotFinalize());
      it('should not allow to start airdropping', async() => testShouldNotStartAirdropping());
    });

    describe('Ico3', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(33);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should not allow to finalize', async() => testShouldNotFinalize());
      it('should not allow to start airdropping', async() => testShouldNotStartAirdropping());
    });

    describe('Ico4', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(43);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should not allow to finalize', async() => testShouldNotFinalize());
      it('should not allow to start airdropping', async() => testShouldNotStartAirdropping());
    });

    describe('Ico5', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(53);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should not allow to finalize', async() => testShouldNotFinalize());
      it('should not allow to start airdropping', async() => testShouldNotStartAirdropping());
    });

    describe('Ico6', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(63);
      });

      it('should be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should not allow to finalize', async() => testShouldNotFinalize());
      it('should not allow to start airdropping', async() => testShouldNotStartAirdropping());
    });

    describe('Allocating', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(73);
      });

      it('should not be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should not allow to finalize', async() => testShouldNotFinalize());
      it('should allow to start airdropping', async() => testShouldStartAirdropping());
    });

    describe('Airdropping', async() => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(73);
      });

      it('should not be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should allow to finalize', async() => testShouldFinalize());
      it('should allow to start airdropping', async() => testShouldStartAirdropping());
    });

    describe('Finished', async() => {
      it('should not be a selling state', async() => {
        expect(await isSellingState()).to.be.true;
      });

      it('should allow to finalize', async() => testShouldFinalize());
      it('should allow to start airdropping', async() => testShouldStartAirdropping());
    });
  });
});
