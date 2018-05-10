import {createWeb3, deployContract} from 'ethworks-solidity';
import allSporterCoinJson from '../../build/contracts/AllSporterCoin.json';
import tgeMockJson from '../../build/contracts/TgeMock.json';
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
  let minterOwner;
  let minterContract;
  let accounts;
  let firstStateMinter;
  let secondStateMinter;
  let secondStateAfter;
  let investor1;
  const saleEtherCap = new BN(web3.utils.toWei('100000000'));
  const etherAmount1 = new BN('10000');
  const tokenAmount1 = new BN('40000');
  const minimumContribution = new BN('10');

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tokenOwner, minterOwner, firstStateMinter, secondStateMinter, investor1] = accounts;
  });

  beforeEach(async () => {
    tokenContract = await deployContract(web3, allSporterCoinJson, tokenOwner,
      []);

    minterContract = await deployContract(web3, tgeMockJson, minterOwner, [
      tokenContract.options.address,
      saleEtherCap,
      firstStateMinter,
      secondStateMinter
    ]);
    secondStateAfter = new BN(await minterContract.methods.secondStateAfter().call());

    await tokenContract.methods.transferOwnership(minterContract.options.address).send({from: tokenOwner});
  });

  const reservedEther = async () => minterContract.methods.reservedSaleEther().call();
  const confirmedEther = async () => minterContract.methods.confirmedSaleEther().call();
  const tokenBalanceOf = async (client) => tokenContract.methods.balanceOf(client).call();

  const reserve = async (etherAmount, from) => minterContract.methods.reserve(etherAmount).send({from});
  const mintReserved = async (account, etherAmount, tokenAmount, from) => minterContract.methods.mintReserved(account, etherAmount, tokenAmount).send({from});
  const unreserve = async (etherAmount, from) => minterContract.methods.unreserve(etherAmount).send({from});
  const mint = async (account, etherAmount, tokenAmount, from) => minterContract.methods.mint(account, etherAmount, tokenAmount).send({from});

  it('should be properly created', async () => {
    const actualSaleEtherCap = await minterContract.methods.saleEtherCap().call();
    expect(actualSaleEtherCap).to.eq.BN(saleEtherCap);
  });

  describe('reserving', async () => {
    it('should allow to reserve by first approver in the first state', async() => {
      await reserve(etherAmount1, firstStateMinter);
    });

    it('should not allow to reserve by second approver in the first state', async() => {
      await expectThrow(reserve(etherAmount1, secondStateMinter));
    });

    it('reserving should advance to second state', async() => {
      await reserve(secondStateAfter, firstStateMinter);
      expect(await minterContract.methods.secondState().call()).to.be.true;
    });

    describe('second state', async () => {
      beforeEach(async() => {
        await reserve(secondStateAfter, firstStateMinter);
      });

      it('should allow to reserve by second approver in the second state', async() => {
        await reserve(etherAmount1, secondStateMinter);
      });
  
      it('should not allow to reserve by first approver in the second state', async() => {
        await expectThrow(reserve(etherAmount1, firstStateMinter));
      });
    });

    it('should not allow to reserve below minimum contribution', async() => {
      await reserve(minimumContribution, firstStateMinter);
      await expectThrow(reserve(minimumContribution.sub(new BN('1')), firstStateMinter));
    });
  });

  describe('minting reserved', async () => {
    const testShouldMintReserved = async(account, etherAmount, tokenAmount, from) => {
      const initialReservedEther = new BN(await reservedEther());
      const initialConfirmedEther = new BN(await confirmedEther());

      await mintReserved(account, etherAmount, tokenAmount, from);

      expect(await reservedEther()).to.eq.BN(0);
      expect(await confirmedEther()).to.eq.BN(initialConfirmedEther.add(initialReservedEther));
    };

    const testShouldNotMintReserved = async(account, etherAmount, tokenAmount, from) => {
      const initialReservedEther = new BN(await reservedEther());
      const initialConfirmedEther = new BN(await confirmedEther());

      await expectThrow(mintReserved(account, etherAmount, tokenAmount, from));

      expect(await reservedEther()).to.eq.BN(initialReservedEther);
      expect(await confirmedEther()).to.eq.BN(initialConfirmedEther);
    };

    it('should allow to mintReserved by the approved minter', async() => {
      await reserve(etherAmount1, firstStateMinter);
      await testShouldMintReserved(investor1, etherAmount1, tokenAmount1, firstStateMinter);
    });

    it('should not allow to mintReserved by unapproved minter', async() => {
      await reserve(etherAmount1, firstStateMinter);
      await testShouldNotMintReserved(investor1, etherAmount1, tokenAmount1, secondStateMinter);
    });

    it('mintingReserved should not add up to reserved for advancing state based on contributions', async() => {
      await reserve(secondStateAfter.sub(new BN('100')), firstStateMinter);
      await mintReserved(investor1, secondStateAfter.sub(new BN('100')), tokenAmount1, firstStateMinter);
      expect(await minterContract.methods.secondState().call()).to.be.false;
    });
  });

  describe('unreserving', async () => {
    it('should allow to unreserve by approved minter', async() => {
      await reserve(etherAmount1, firstStateMinter);
      const initialReserved = new BN(await reservedEther());

      await unreserve(etherAmount1, firstStateMinter);

      expect(await reservedEther()).to.eq.BN(initialReserved.sub(etherAmount1));
    });

    it('should not allow to unreserve by unapproved minter', async() => {
      await reserve(etherAmount1, firstStateMinter);
      const initialReserved = await reservedEther();

      await expectThrow(unreserve(etherAmount1, secondStateMinter)); 

      expect(await reservedEther()).to.eq.BN(initialReserved);
    });

    it('should not allow to unreserve if not reserved', async() => {
      await expectThrow(unreserve(etherAmount1, firstStateMinter)); 
    });
  });

  describe('minting', async () => {
    const testShouldMint = async(account, etherAmount, tokenAmount, from) => {
      const initialConfirmedEther = new BN(await confirmedEther());
      const initialTokenBalance = new BN(await tokenBalanceOf(account));

      await mint(account, etherAmount, tokenAmount, from);

      expect(await confirmedEther()).to.eq.BN(initialConfirmedEther.add(etherAmount));
      expect(await tokenBalanceOf(account)).to.eq.BN(initialTokenBalance.add(tokenAmount));
    };

    const testShouldNotMint = async(account, etherAmount, tokenAmount, from) => {
      const initialConfirmedEther = new BN(await confirmedEther());
      const initialTokenBalance = new BN(await tokenBalanceOf(account));

      await expectThrow(mint(account, etherAmount, tokenAmount, from));

      expect(await confirmedEther()).to.eq.BN(initialConfirmedEther);
      expect(await tokenBalanceOf(account)).to.eq.BN(initialTokenBalance);
    };

    it('should allow to mint by approved minter', async() => {
      await testShouldMint(investor1, etherAmount1, tokenAmount1, firstStateMinter);
    });

    it('should not allow to mint by unapproved minter', async() => {
      await testShouldNotMint(investor1, etherAmount1, tokenAmount1, secondStateMinter);
    });

    it('should advance state when minting', async () => {
      await mint(investor1, secondStateAfter, tokenAmount1, firstStateMinter);
      expect(await minterContract.methods.secondState().call()).to.be.true;
    });
  });
});
