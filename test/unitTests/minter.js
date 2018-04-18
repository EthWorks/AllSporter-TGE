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
  const etherAmount1 = new BN('10000');
  const tokenAmount1 = new BN('30000');
  const etherAmount2 = new BN('5555555');
  const tokenAmount2 = new BN('7777777');
  const saleCap = new BN(web3.utils.toWei('156000000'));
  const tokenCap = new BN(web3.utils.toWei('260000000'));

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tokenOwner, minterOwner, whitelisted, investor1, investor2, notWhitelisted, investor3] = accounts;
  });

  beforeEach(async () => {
    // token
    tokenContract = await deployContract(web3, allSporterCoinJson, tokenOwner, []);

    // minter
    minterContract = await deployContract(web3, minterJson, minterOwner, [tokenContract.options.address]);
    await tokenContract.methods.transferOwnership(minterContract.options.address).send({from: tokenOwner});
    await minterContract.methods.add(whitelisted).send({from: minterOwner});
  });

  const reserveContribution = async (investor, etherAmount, tokenAmount, from) => 
    minterContract.methods.reserveContribution(investor, etherAmount, tokenAmount).send({from});

  const unreserveContribution = async (investor, from) =>
    minterContract.methods.unreserveContribution(investor).send({from});

  const mintReserved = async (investor, from) =>
    minterContract.methods.mintReserved(investor).send({from});

  const mintAllocation = async (beneficiary, tokenAmount, from) =>
    minterContract.methods.mintAllocation(beneficiary, tokenAmount).send({from});

  const finishMinting = async (newOwner, from) => minterContract.methods.finishMinting(newOwner).send({from});

  const confirmedEtherContributions = async() => minterContract.methods.confirmedEtherContributions().call();
  const reservedEtherContributions = async() => minterContract.methods.reservedEtherContributions().call();
  const soldTokens = async() => minterContract.methods.soldTokens().call();
  const allocatedTokens = async() => minterContract.methods.allocatedTokens().call();
  const reservedEther = async(investor) => minterContract.methods.reservedEther(investor).call();
  const reservedTokens = async(investor) => minterContract.methods.reservedTokens(investor).call();

  it('should be properly created', async () => {
    const actualTokenAddress = await minterContract.methods.token().call({from: minterOwner});
    expect(actualTokenAddress).to.be.equal(tokenContract.options.address);
  });

  describe('reserving', async () => {
    const testShouldReserve = async (investor, etherAmount, tokenAmount, from) => {
      const initialReservedEther = new BN(await reservedEtherContributions());
      const initialConfirmedEther = new BN(await confirmedEtherContributions());
      const initialSoldTokens = new BN(await soldTokens());
      const initialAllocatedTokens = new BN(await allocatedTokens());

      await reserveContribution(investor, etherAmount, tokenAmount, from);

      expect(await reservedEtherContributions()).to.eq.BN(initialReservedEther.add(etherAmount));
      expect(await confirmedEtherContributions()).to.eq.BN(initialConfirmedEther);
      expect(await soldTokens()).to.eq.BN(initialSoldTokens.add(tokenAmount));
      expect(await allocatedTokens()).to.eq.BN(initialAllocatedTokens);
    };

    const testShouldNotReserve = async(investor, etherAmount, tokenAmount, from) => {
      const initialReservedEther = new BN(await reservedEtherContributions());
      const initialConfirmedEther = new BN(await confirmedEtherContributions());
      const initialSoldTokens = new BN(await soldTokens());
      const initialAllocatedTokens = new BN(await allocatedTokens());

      await expectThrow(reserveContribution(investor, etherAmount, tokenAmount, from));

      expect(await reservedEtherContributions()).to.eq.BN(initialReservedEther);
      expect(await confirmedEtherContributions()).to.eq.BN(initialConfirmedEther);
      expect(await soldTokens()).to.eq.BN(initialSoldTokens);
      expect(await allocatedTokens()).to.eq.BN(initialAllocatedTokens);
    };

    it('should allow to reserve contribution by whitelisted', async () => {
      await testShouldReserve(investor1, etherAmount1, tokenAmount1, whitelisted);
      await testShouldReserve(investor2, etherAmount2, tokenAmount2, whitelisted);
    });

    it('should not allow to reserve contribution by not whitelisted', async () => {
      await testShouldNotReserve(investor1, etherAmount1, tokenAmount1, notWhitelisted);
      await testShouldNotReserve(investor2, etherAmount2, tokenAmount2, notWhitelisted);
    });
  });

  describe('unreserving', async () => {
    const testShouldUnreserve = async (investor, from) => {
      const initialReservedEther = new BN(await reservedEtherContributions());
      const initialConfirmedEther = new BN(await confirmedEtherContributions());
      const initialSoldTokens = new BN(await soldTokens());
      const initialAllocatedTokens = new BN(await allocatedTokens());
      const etherAmount = new BN(await reservedEther(investor));
      const tokenAmount = new BN(await reservedTokens(investor));

      await unreserveContribution(investor, from);

      expect(await reservedEtherContributions()).to.eq.BN(initialReservedEther.sub(etherAmount));
      expect(await confirmedEtherContributions()).to.eq.BN(initialConfirmedEther);
      expect(await soldTokens()).to.eq.BN(initialSoldTokens.sub(tokenAmount));
      expect(await allocatedTokens()).to.eq.BN(initialAllocatedTokens);
    };

    const testShouldNotUnreserve = async (investor, from) => {
      const initialReservedEther = new BN(await reservedEtherContributions());
      const initialConfirmedEther = new BN(await confirmedEtherContributions());
      const initialSoldTokens = new BN(await soldTokens());
      const initialAllocatedTokens = new BN(await allocatedTokens());

      await expectThrow(unreserveContribution(investor, from));

      expect(await reservedEtherContributions()).to.eq.BN(initialReservedEther);
      expect(await confirmedEtherContributions()).to.eq.BN(initialConfirmedEther);
      expect(await soldTokens()).to.eq.BN(initialSoldTokens);
      expect(await allocatedTokens()).to.eq.BN(initialAllocatedTokens);
    };

    beforeEach(async() => {
      await reserveContribution(investor1, etherAmount1, tokenAmount1, whitelisted);
      await reserveContribution(investor2, etherAmount2, tokenAmount2, whitelisted);
    });

    it('should allow to unreserve contributions by whitelisted', async () => {
      await testShouldUnreserve(investor1, whitelisted);
      await testShouldUnreserve(investor2, whitelisted);
    });

    it('should not allow to unreserve contributions by not whitelisted', async () => {
      await testShouldNotUnreserve(investor1, notWhitelisted);
    });

    it('should allow to unreserve when nothing reserved', async () => {
      await unreserveContribution(investor1, whitelisted);
      await unreserveContribution(investor2, whitelisted);
      await testShouldUnreserve(investor1, whitelisted);
      await testShouldUnreserve(investor3, whitelisted);
    });
  });

  describe('minting reserved', async () => {
    const testShouldMintReserved = async(investor, from) => {
      const initialReservedEther = new BN(await reservedEtherContributions());
      const initialConfirmedEther = new BN(await confirmedEtherContributions());
      const initialSoldTokens = new BN(await soldTokens());
      const initialAllocatedTokens = new BN(await allocatedTokens());
      const etherAmount = new BN(await reservedEther(investor));

      await mintReserved(investor, from);

      expect(await reservedEtherContributions()).to.eq.BN(initialReservedEther.sub(etherAmount));
      expect(await confirmedEtherContributions()).to.eq.BN(initialConfirmedEther.add(etherAmount));
      expect(await soldTokens()).to.eq.BN(initialSoldTokens);
      expect(await allocatedTokens()).to.eq.BN(initialAllocatedTokens);
    };

    const testShouldNotMintReserved = async(investor, from) => {
      const initialReservedEther = new BN(await reservedEtherContributions());
      const initialConfirmedEther = new BN(await confirmedEtherContributions());
      const initialSoldTokens = new BN(await soldTokens());
      const initialAllocatedTokens = new BN(await allocatedTokens());

      await expectThrow(mintReserved(investor, from));

      expect(await reservedEtherContributions()).to.eq.BN(initialReservedEther);
      expect(await confirmedEtherContributions()).to.eq.BN(initialConfirmedEther);
      expect(await soldTokens()).to.eq.BN(initialSoldTokens);
      expect(await allocatedTokens()).to.eq.BN(initialAllocatedTokens);
    };

    beforeEach(async() => {
      await reserveContribution(investor1, etherAmount1, tokenAmount1, whitelisted);
      await reserveContribution(investor2, etherAmount2, tokenAmount2, whitelisted);
    });

    it('should allow to mint reserved by whitelisted', async () => {
      await testShouldMintReserved(investor1, whitelisted);
      await testShouldMintReserved(investor2, whitelisted);
    });

    it('should not allow to mint reserved by not whitelisted', async () => {
      await testShouldNotMintReserved(investor1, notWhitelisted);
    });

    it('should allow to mint when nothing reserved', async () => {
      await mintReserved(investor1, whitelisted);
      await mintReserved(investor2, whitelisted);
      await testShouldMintReserved(investor1, whitelisted);
      await testShouldMintReserved(investor3, whitelisted);
    });
  });

  describe('minting allocation', async () => {
    const testShouldMintAllocation = async(beneficiary, tokenAmount, from) => {
      const initialReservedEther = new BN(await reservedEtherContributions());
      const initialConfirmedEther = new BN(await confirmedEtherContributions());
      const initialSoldTokens = new BN(await soldTokens());
      const initialAllocatedTokens = new BN(await allocatedTokens());

      await mintAllocation(beneficiary, tokenAmount, from);

      expect(await reservedEtherContributions()).to.eq.BN(initialReservedEther);
      expect(await confirmedEtherContributions()).to.eq.BN(initialConfirmedEther);
      expect(await soldTokens()).to.eq.BN(initialSoldTokens);
      expect(await allocatedTokens()).to.eq.BN(initialAllocatedTokens.add(tokenAmount));
    };

    const testShouldNotMintAllocation = async(beneficiary, tokenAmount, from) => {
      const initialReservedEther = new BN(await reservedEtherContributions());
      const initialConfirmedEther = new BN(await confirmedEtherContributions());
      const initialSoldTokens = new BN(await soldTokens());
      const initialAllocatedTokens = new BN(await allocatedTokens());

      await expectThrow(mintAllocation(beneficiary, tokenAmount, from));

      expect(await reservedEtherContributions()).to.eq.BN(initialReservedEther);
      expect(await confirmedEtherContributions()).to.eq.BN(initialConfirmedEther);
      expect(await soldTokens()).to.eq.BN(initialSoldTokens);
      expect(await allocatedTokens()).to.eq.BN(initialAllocatedTokens);
    };

    it('should allow to mint allocation by whitelisted', async () => {
      await testShouldMintAllocation(investor1, tokenAmount1, whitelisted);
      await testShouldMintAllocation(investor2, tokenAmount1, whitelisted);
    });

    it('should not allow to mint allocation by not whitelisted', async () => {
      await testShouldNotMintAllocation(investor1, tokenAmount1, notWhitelisted);
    });

    it('should allow to mint allocation more than sale cap', async () => {
      await testShouldMintAllocation(investor1, saleCap.add(new BN('100')), whitelisted);
    });

    it('should allow to mint allocation equal to the token cap', async () => {
      await testShouldMintAllocation(investor1, tokenCap, whitelisted);
    });

    it('should not allow to mint allocation more than token cap', async () => {
      await testShouldNotMintAllocation(investor1, tokenCap.add(new BN('100')), whitelisted);
    });
    
    describe('total of tokens minted and reserved exceeding token cap', async () => {
      beforeEach(async() => {
        await reserveContribution(investor1, etherAmount1, saleCap, whitelisted);
      });

      it('should not allow to mint allocation if together with reserved tokens exceeds token cap', async () => {
        await testShouldNotMintAllocation(investor2, tokenCap.sub(saleCap).add(new BN('100')), whitelisted);
      });
  
      it('should allow to mint allocation after some tokens unreserved', async () => {
        await unreserveContribution(investor1, whitelisted);
        await testShouldMintAllocation(investor2, tokenCap.sub(saleCap).add(new BN('100')), whitelisted);
      });

      it('should not allow to mint allocation after some tokens minted', async () => {
        await mintReserved(investor1, whitelisted);
        await testShouldNotMintAllocation(investor2, tokenCap.sub(saleCap).add(new BN('100')), whitelisted);
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

    it('should not allow to finish minting with reserved contributions', async () => {
      await reserveContribution(investor1, etherAmount1, tokenAmount1, whitelisted);
      await testShouldNotFinishMinting(tokenOwner, whitelisted);
    });

    it('should allow to finish minting after unreserving', async () => {
      await reserveContribution(investor1, etherAmount1, tokenAmount1, whitelisted);
      await unreserveContribution(investor1, whitelisted);
      await testShouldFinishMinting(tokenOwner, whitelisted);
    });

    it('should allow to finish minting after minting reserved', async () => {
      await reserveContribution(investor1, etherAmount1, tokenAmount1, whitelisted);
      await mintReserved(investor1, whitelisted);
      await testShouldFinishMinting(tokenOwner, whitelisted);
    });
  });
});
