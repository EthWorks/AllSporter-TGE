import {createWeb3, deployContract, latestTime, expectThrow, increaseTime, increaseTimeTo, durationInit} from 'ethworks-solidity';
import allSporterCoinJson from '../../build/contracts/AllSporterCoin.json';
import minterJson from '../../build/contracts/Minter.json';
import pricingMockJson from '../../build/contracts/PricingMock.json';
import tgeStateJson from '../../build/contracts/TgeState.json';
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
  const singleStateEtherCap = new BN(web3.utils.toWei('10000'));
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
  const FINISHING_ICO = 10;

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tgeOwner, tokenOwner] = accounts;
  });

  beforeEach(async () => {
    tokenContract = await deployContract(web3, allSporterCoinJson, tokenOwner, []);

    saleStartTime = await latestTime(web3) + 100;
    tgeContract = await deployContract(web3, tgeJson, tgeOwner, [
      saleStartTime,
      singleStateEtherCap
    ]);
    tgeContract.methods.addStateUpdater(tgeOwner).send({from: tgeOwner});
  });

  const updateState = async(totalEtherContributions = 0, from = tgeOwner) => tgeContract.methods.updateState(totalEtherContributions).send({from});

  const currentState = async() => {
    await updateState();
    return await tgeContract.methods.currentState().call();
  };

  const advanceDays = async (howMany) => {
    await increaseTime(web3, duration.days(howMany));
  };
  
  const advanceToSaleStartTime = async() => {
    const destination = saleStartTime + 100;
    await increaseTimeTo(web3, destination);
  };

  const getCurrentTokensForEther = async(etherAmount) => {
    await updateState();
    return await tgeContract.methods.getTokensForEther(etherAmount).call();
  };

  it('should be properly created', async () => {
    const actualCurrentState = await tgeContract.methods.currentState().call();
    expect(actualCurrentState).to.eq.BN(0);
  });

  describe('tokens for ether per state', async () => {
    describe('Presale', async () => {
      it('should return a proper amount of tokens for ether', async() => {
        expect(await currentState()).to.eq.BN(PRESALE);
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(0);
      });
    });

    describe('Preico1', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        expect(await currentState()).to.eq.BN(PREICO1);
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

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('2925'));
      });
    });

    describe('Ico2', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(23);
        expect(await currentState()).to.eq.BN(ICO2);
      });

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('2762.5'));
      });
    });

    describe('Ico3', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(33);
        expect(await currentState()).to.eq.BN(ICO3);
      });

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('2600'));
      });
    });

    describe('Ico4', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(43);
        expect(await currentState()).to.eq.BN(ICO4);
      });

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('2437.5'));
      });
    });

    describe('Ico5', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(53);
        expect(await currentState()).to.eq.BN(ICO5);
      });

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('2112.5'));
      });
    });

    describe('Ico6', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(63);
        expect(await currentState()).to.eq.BN(ICO6);
      });

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('1950'));
      });
    });

    describe('FINISHING_ICO', async () => {
      beforeEach(async() => {
        await advanceToSaleStartTime();
        await advanceDays(73);
        expect(await currentState()).to.eq.BN(FINISHING_ICO);
      });

      it('should calculate proper quantity of tokens', async() => {
        expect(await getCurrentTokensForEther(web3.utils.toWei('1'))).to.eq.BN(web3.utils.toWei('0'));
      });
    });
  });
});
