import {createWeb3, deployContract} from 'ethworks-solidity';
import allSporterCoinJson from '../../build/contracts/AllSporterCoin.json';
import minterJson from '../../build/contracts/Minter.json';
import Web3 from 'web3';
import chai from 'chai';
import bnChai from 'bn-chai';
import {expectThrow} from 'ethworks-solidity/test/testUtils';

const {expect} = chai;
const web3 = createWeb3(Web3);
const {BN} = web3.utils;
chai.use(bnChai(BN));

describe('Minter', () => {
  let tokenOwner;
  let tokenContract;
  let accounts;
  let minterOwner;
  let minterContract;
  let whitelisted;
  let notWhitelisted;
  let investor1;
  let investor2;
  let investor3;
  const tokenAmount1 = new BN('30000');
  const tokenAmount2 = new BN('7777777');
  const saleTokenCap = new BN(web3.utils.toWei('156000000'));
  const tokenCap = new BN(web3.utils.toWei('260000000'));

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tokenOwner, minterOwner, whitelisted, investor1, investor2, notWhitelisted, investor3] = accounts;
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
  });

  const lockContribution = async (investor, tokenAmount, from) => 
    minterContract.methods.lockContribution(investor, tokenAmount).send({from});

  const rejectContribution = async (investor, from) =>
    minterContract.methods.rejectContribution(investor).send({from});

  const confirmContribution = async (investor, from) =>
    minterContract.methods.confirmContribution(investor).send({from});

  const mintAllocation = async (beneficiary, tokenAmount, from) =>
    minterContract.methods.mintAllocation(beneficiary, tokenAmount).send({from});

  const finishMinting = async (newOwner, from) => minterContract.methods.finishMinting(newOwner).send({from});

  const totalLockedTokens = async() => new BN(await minterContract.methods.totalLockedTokens().call());
  const totalConfirmedTokens = async() => new BN(await minterContract.methods.totalConfirmedTokens().call());
  const totalAllocatedTokens = async() => new BN(await minterContract.methods.totalAllocatedTokens().call());
  const lockedTokens = async(investor) => new BN(await minterContract.methods.lockedTokens(investor).call());

  it('should be properly created', async () => {
    const actualTokenAddress = await minterContract.methods.token().call({from: minterOwner});
    expect(actualTokenAddress).to.be.equal(tokenContract.options.address);
  });

  describe('locking contributions', async () => {
    const testShouldLockContribution = async (investor, tokenAmount, from) => {
      const initialTotalLockedTokens = await totalLockedTokens();
      const initialTotalConfirmedTokens = await totalConfirmedTokens();
      const initialTotalAllocatedTokens = await totalAllocatedTokens();
      const initialLocked = await lockedTokens(investor);

      await lockContribution(investor, tokenAmount, from);

      expect(await totalLockedTokens()).to.eq.BN(initialTotalLockedTokens.add(tokenAmount));
      expect(await totalConfirmedTokens()).to.eq.BN(initialTotalConfirmedTokens);
      expect(await totalAllocatedTokens()).to.eq.BN(initialTotalAllocatedTokens);
      expect(await lockedTokens(investor)).to.eq.BN(initialLocked.add(tokenAmount));
    };

    const testShouldNotLockContribution = async(investor, tokenAmount, from) => {
      const initialTotalLockedTokens = await totalLockedTokens();
      const initialTotalConfirmedTokens = await totalConfirmedTokens();
      const initialTotalAllocatedTokens = await totalAllocatedTokens();

      await expectThrow(lockContribution(investor, tokenAmount, from));

      expect(await totalLockedTokens()).to.eq.BN(initialTotalLockedTokens);
      expect(await totalConfirmedTokens()).to.eq.BN(initialTotalConfirmedTokens);
      expect(await totalAllocatedTokens()).to.eq.BN(initialTotalAllocatedTokens);
    };

    it('should allow to lock contribution by whitelisted', async () => {
      await testShouldLockContribution(investor1, tokenAmount1, whitelisted);
      await testShouldLockContribution(investor2, tokenAmount2, whitelisted);
    });

    it('should not allow to lock contribution by not whitelisted', async () => {
      await testShouldNotLockContribution(investor1, tokenAmount1, notWhitelisted);
      await testShouldNotLockContribution(investor2, tokenAmount2, notWhitelisted);
    });

    it('should allow to lock up to the sale cap', async () => {
      await testShouldLockContribution(investor1, saleTokenCap, whitelisted);
    });

    it('should not allow to lock more than the sale cap', async () => {
      await testShouldNotLockContribution(investor1, saleTokenCap + 1, whitelisted);
    });

    it('should allow to lock up to the sale cap, even if total allocated exceeds sale cap', async () => {
      await mintAllocation(investor1, saleTokenCap.add(new BN('100')), whitelisted);
      await testShouldLockContribution(investor1, tokenAmount1, whitelisted);
    });
  });

  describe('rejecting contributions', async () => {
    const testShouldRejectContribution = async (investor, from) => {
      const tokenAmount = await lockedTokens(investor);
      const initialTotalLockedTokens = await totalLockedTokens();
      const initialTotalConfirmedTokens = await totalConfirmedTokens();
      const initialTotalAllocatedTokens = await totalAllocatedTokens();

      await rejectContribution(investor, from);

      expect(await totalLockedTokens()).to.eq.BN(initialTotalLockedTokens.sub(tokenAmount));
      expect(await totalConfirmedTokens()).to.eq.BN(initialTotalConfirmedTokens);
      expect(await totalAllocatedTokens()).to.eq.BN(initialTotalAllocatedTokens);
    };

    const testShouldNotRejectContribution = async (investor, from) => {
      const initialTotalLockedTokens = await totalLockedTokens();
      const initialTotalConfirmedTokens = await totalConfirmedTokens();
      const initialTotalAllocatedTokens = await totalAllocatedTokens();

      await expectThrow(rejectContribution(investor, from));

      expect(await totalLockedTokens()).to.eq.BN(initialTotalLockedTokens);
      expect(await totalConfirmedTokens()).to.eq.BN(initialTotalConfirmedTokens);
      expect(await totalAllocatedTokens()).to.eq.BN(initialTotalAllocatedTokens);
    };

    it('should not throw exception when rejecting contribution when nothing locked', async () => {
      await testShouldRejectContribution(investor1, whitelisted);
      await testShouldRejectContribution(investor3, whitelisted);
    });

    describe('Existing locked contributions', async() => {
      beforeEach(async() => {
        await lockContribution(investor1, tokenAmount1, whitelisted);
        await lockContribution(investor2, tokenAmount2, whitelisted);
      });

      it('should allow to reject contributions by whitelisted', async () => {
        await testShouldRejectContribution(investor1, whitelisted);
        await testShouldRejectContribution(investor2, whitelisted);
      });
  
      it('should not allow to reject contributions by not whitelisted', async () => {
        await testShouldNotRejectContribution(investor1, notWhitelisted);
      });
    });
  });

  describe('confirming contributions', async () => {
    const testShouldConfirmContribution = async(investor, from) => {
      const tokenAmount = await lockedTokens(investor);
      const initialTotalLockedTokens = await totalLockedTokens();
      const initialTotalConfirmedTokens = await totalConfirmedTokens();
      const initialTotalAllocatedTokens = await totalAllocatedTokens();

      await confirmContribution(investor, from);

      expect(await totalLockedTokens()).to.eq.BN(initialTotalLockedTokens.sub(tokenAmount));
      expect(await totalConfirmedTokens()).to.eq.BN(initialTotalConfirmedTokens.add(tokenAmount));
      expect(await totalAllocatedTokens()).to.eq.BN(initialTotalAllocatedTokens);
    };

    const testShouldNotConfirmContribution = async(investor, from) => {
      const initialTotalLockedTokens = await totalLockedTokens();
      const initialTotalConfirmedTokens = await totalConfirmedTokens();
      const initialTotalAllocatedTokens = await totalAllocatedTokens();

      await expectThrow(confirmContribution(investor, from));

      expect(await totalLockedTokens()).to.eq.BN(initialTotalLockedTokens);
      expect(await totalConfirmedTokens()).to.eq.BN(initialTotalConfirmedTokens);
      expect(await totalAllocatedTokens()).to.eq.BN(initialTotalAllocatedTokens);
    };

    it('should not throw exception when confirming when nothing locked', async () => {
      await testShouldConfirmContribution(investor1, whitelisted);
      await testShouldConfirmContribution(investor3, whitelisted);
    });

    describe('Existing locked contributions', async() => {
      beforeEach(async() => {
        await lockContribution(investor1, tokenAmount1, whitelisted);
        await lockContribution(investor2, tokenAmount2, whitelisted);
      });

      it('should allow to confirm by whitelisted', async () => {
        await testShouldConfirmContribution(investor1, whitelisted);
        await testShouldConfirmContribution(investor2, whitelisted);
      });
  
      it('should not allow to confirm by not whitelisted', async () => {
        await testShouldNotConfirmContribution(investor1, notWhitelisted);
      });
    });
  });

  describe('minting allocations', async () => {
    const testShouldMintAllocation = async(beneficiary, tokenAmount, from) => {
      const initialTotalLockedTokens = await totalLockedTokens();
      const initialTotalConfirmedTokens = await totalConfirmedTokens();
      const initialTotalAllocatedTokens = await totalAllocatedTokens();

      await mintAllocation(beneficiary, tokenAmount, from);

      expect(await totalLockedTokens()).to.eq.BN(initialTotalLockedTokens);
      expect(await totalConfirmedTokens()).to.eq.BN(initialTotalConfirmedTokens);
      expect(await totalAllocatedTokens()).to.eq.BN(initialTotalAllocatedTokens.add(tokenAmount));
    };

    const testShouldNotMintAllocation = async(beneficiary, tokenAmount, from) => {
      const initialTotalLockedTokens = await totalLockedTokens();
      const initialTotalConfirmedTokens = await totalConfirmedTokens();
      const initialTotalAllocatedTokens = await totalAllocatedTokens();

      await expectThrow(mintAllocation(beneficiary, tokenAmount, from));

      expect(await totalLockedTokens()).to.eq.BN(initialTotalLockedTokens);
      expect(await totalConfirmedTokens()).to.eq.BN(initialTotalConfirmedTokens);
      expect(await totalAllocatedTokens()).to.eq.BN(initialTotalAllocatedTokens);
    };

    it('should allow to mint allocation by whitelisted', async () => {
      await testShouldMintAllocation(investor1, tokenAmount1, whitelisted);
      await testShouldMintAllocation(investor2, tokenAmount1, whitelisted);
    });

    it('should not allow to mint allocation by not whitelisted', async () => {
      await testShouldNotMintAllocation(investor1, tokenAmount1, notWhitelisted);
    });

    it('should allow to mint allocation more than sale token cap', async () => {
      await testShouldMintAllocation(investor1, saleTokenCap.add(new BN('100')), whitelisted);
    });

    it('should allow to mint allocation equal to the token cap', async () => {
      await testShouldMintAllocation(investor1, tokenCap, whitelisted);
    });

    it('should not allow to mint allocation more than token cap', async () => {
      await testShouldNotMintAllocation(investor1, tokenCap.add(new BN('100')), whitelisted);
    });
    
    describe('total of tokens minted and reserved exceeding token cap', async () => {
      beforeEach(async() => {
        await lockContribution(investor1, saleTokenCap, whitelisted);
      });

      it('should not allow to mint allocation if together with reserved tokens exceeds token cap', async () => {
        await testShouldNotMintAllocation(investor2, tokenCap.sub(saleTokenCap).add(new BN('100')), whitelisted);
      });
  
      it('should allow to mint allocation after some tokens rejected', async () => {
        await rejectContribution(investor1, whitelisted);
        await testShouldMintAllocation(investor2, tokenCap.sub(saleTokenCap).add(new BN('100')), whitelisted);
      });

      it('should not allow to mint allocation after some tokens confirmed', async () => {
        await confirmContribution(investor1, whitelisted);
        await testShouldNotMintAllocation(investor2, tokenCap.sub(saleTokenCap).add(new BN('100')), whitelisted);
      });
    });
  });

  describe('finishing minting', async () => {
    const testShouldFinishMinting = async(newOwner, from) => {
      await finishMinting(newOwner, from);
      expect(await tokenContract.methods.owner().call()).to.be.equal(newOwner);
      expect(await tokenContract.methods.mintingFinished().call()).to.be.true;
    };

    const testShouldNotFinishMinting = async(newOwner, from) => {
      await expectThrow(finishMinting(newOwner, from));
      expect(await tokenContract.methods.owner().call()).to.be.equal(minterContract.options.address);
      expect(await tokenContract.methods.mintingFinished().call()).to.be.false;
    };

    it('should allow to finish minting by whitelisted', async () => {
      await testShouldFinishMinting(tokenOwner, whitelisted);
    });

    it('should not allow to finish minting by not whitelisted', async () => {
      await testShouldNotFinishMinting(tokenOwner, notWhitelisted);
    });

    it('should not allow to finish minting with locked contributions', async () => {
      await lockContribution(investor1, tokenAmount1, whitelisted);
      await testShouldNotFinishMinting(tokenOwner, whitelisted);
    });

    it('should allow to finish minting after rejecting locked contribution', async () => {
      await lockContribution(investor1, tokenAmount1, whitelisted);
      await testShouldNotFinishMinting(tokenOwner, whitelisted);

      await rejectContribution(investor1, whitelisted);
      await testShouldFinishMinting(tokenOwner, whitelisted);
    });

    it('should allow to finish minting after confirming locked contribution', async () => {
      await lockContribution(investor1, tokenAmount1, whitelisted);
      await testShouldNotFinishMinting(tokenOwner, whitelisted);

      await confirmContribution(investor1, whitelisted);
      await testShouldFinishMinting(tokenOwner, whitelisted);
    });
  });
});
