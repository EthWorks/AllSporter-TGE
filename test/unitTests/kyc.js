import {createWeb3, deployContract, expectThrow} from 'ethworks-solidity';
import allSporterCoinJson from '../../build/contracts/AllSporterCoin.json';
import minterJson from '../../build/contracts/Minter.json';
import kycJson from '../../build/contracts/Kyc.json';
import Web3 from 'web3';
import chai from 'chai';
import bnChai from 'bn-chai';

const {expect} = chai;
const web3 = createWeb3(Web3);
const {BN} = web3.utils;
chai.use(bnChai(BN));

describe('Kyc', () => {
  let tokenOwner;
  let tokenContract;
  let accounts;
  let minterOwner;
  let minterContract;
  let whitelisted;
  let notWhitelisted;
  let kycOwner;
  let kycContract;
  let investor1;
  let investor2;
  const etherAmount1 = new BN('10000');
  const tokenAmount1 = new BN('30000');
  const saleTokenCap = new BN(web3.utils.toWei('156000000'));

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tokenOwner, minterOwner, whitelisted, investor1, investor2, notWhitelisted, kycOwner] = accounts;
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

    // kyc
    kycContract = await deployContract(web3, kycJson, kycOwner, [minterContract.options.address]);
    await minterContract.methods.add(kycContract.options.address).send({from: minterOwner});
    await kycContract.methods.add(whitelisted).send({from: kycOwner});
  });

  const addToKyc = async (beneficiary, etherAmount, tokenAmount, from) => 
    kycContract.methods.addToKyc(beneficiary, etherAmount, tokenAmount).send({from});

  const approve = async(beneficiary, from) => kycContract.methods.approve(beneficiary).send({from});
  const reject = async(beneficiary, from) => kycContract.methods.reject(beneficiary).send({from});
  const totalReservedEther = async() => new BN(await kycContract.methods.totalReservedEther().call());
  const totalConfirmedEther = async() => new BN(await kycContract.methods.totalConfirmedEther().call());
  const reservedEther = async(investor) => new BN(await kycContract.methods.reservedEther(investor).call());

  it('should be properly created', async () => {
    const actualMinterAddress = await kycContract.methods.minter().call({from: kycOwner});
    expect(actualMinterAddress).to.be.equal(minterContract.options.address);
  });

  describe('adding to kyc', async () => {
    const testShouldAddToKyc = async(investor, etherAmount, tokenAmount, from) => {
      const initialTotalReservedEther = await totalReservedEther();
      const initialTotalConfirmedEther = await totalConfirmedEther();
      const initialReservedEther = await reservedEther(investor);

      await addToKyc(investor, etherAmount, tokenAmount, from);

      expect(await totalReservedEther()).to.eq.BN(initialTotalReservedEther.add(etherAmount));
      expect(await totalConfirmedEther()).to.eq.BN(initialTotalConfirmedEther);
      expect(await reservedEther(investor)).to.eq.BN(initialReservedEther.add(etherAmount));
    };

    const testShouldNotAddToKyc = async(investor, etherAmount, tokenAmount, from) => {
      const initialTotalReservedEther = await totalReservedEther();
      const initialTotalConfirmedEther = await totalConfirmedEther();
      const initialReservedEther = await reservedEther(investor);

      await expectThrow(addToKyc(investor, etherAmount, tokenAmount, from));

      expect(await totalReservedEther()).to.eq.BN(initialTotalReservedEther);
      expect(await totalConfirmedEther()).to.eq.BN(initialTotalConfirmedEther);
      expect(await reservedEther(investor)).to.eq.BN(initialReservedEther);
    };

    it('should allow to add to kyc by whitelisted', async () => {
      await testShouldAddToKyc(investor1, etherAmount1, tokenAmount1, whitelisted);
    });
  
    it('should not allow to add to kyc by not whitelisted', async () => {
      await testShouldNotAddToKyc(investor1, etherAmount1, tokenAmount1, notWhitelisted);
    });
  });

  describe('approving', async () => {
    const testShouldApprove = async(investor, from) => {
      const initialTotalReservedEther = await totalReservedEther();
      const initialTotalConfirmedEther = await totalConfirmedEther();
      const etherAmount = await reservedEther(investor);

      await approve(investor, from);

      expect(await totalReservedEther()).to.eq.BN(initialTotalReservedEther.sub(etherAmount));
      expect(await totalConfirmedEther()).to.eq.BN(initialTotalConfirmedEther.add(etherAmount));
      expect(await reservedEther(investor)).to.eq.BN(0);
    };

    const testShouldNotApprove = async(investor, from) => {
      const initialTotalReservedEther = await totalReservedEther();
      const initialTotalConfirmedEther = await totalConfirmedEther();
      const initialReservedEther = await reservedEther(investor);

      await expectThrow(approve(investor, from));

      expect(await totalReservedEther()).to.eq.BN(initialTotalReservedEther);
      expect(await totalConfirmedEther()).to.eq.BN(initialTotalConfirmedEther);
      expect(await reservedEther(investor)).to.eq.BN(initialReservedEther);
    };

    beforeEach(async() => {
      await addToKyc(investor1, etherAmount1, tokenAmount1, whitelisted); 
    });

    it('should allow to approve by whitelisted', async () => {
      await testShouldApprove(investor1, whitelisted);
    });
  
    it('should not allow to approve by not whitelisted', async () => {
      await testShouldNotApprove(investor1, notWhitelisted);
    });

    it('should not throw exception when approving twice', async () => {
      await testShouldApprove(investor1, whitelisted);
      await testShouldApprove(investor1, whitelisted);
    });

    it('should not throw exception when approving investment not added to kyc', async () => {
      await testShouldApprove(investor2, whitelisted);
    });
  });

  describe('rejecting', async () => {
    const testShouldReject = async(investor, from) => {
      const initialTotalReservedEther = await totalReservedEther();
      const initialTotalConfirmedEther = await totalConfirmedEther();
      const etherAmount = await reservedEther(investor);

      await reject(investor, from);

      expect(await totalReservedEther()).to.eq.BN(initialTotalReservedEther.sub(etherAmount));
      expect(await totalConfirmedEther()).to.eq.BN(initialTotalConfirmedEther);
      expect(await reservedEther(investor)).to.eq.BN(0);
    };

    const testShouldNotReject = async(investor, from) => {
      const initialTotalReservedEther = await totalReservedEther();
      const initialTotalConfirmedEther = await totalConfirmedEther();
      const initialReservedEther = await reservedEther(investor);

      await expectThrow(reject(investor, from));

      expect(await totalReservedEther()).to.eq.BN(initialTotalReservedEther);
      expect(await totalConfirmedEther()).to.eq.BN(initialTotalConfirmedEther);
      expect(await reservedEther(investor)).to.eq.BN(initialReservedEther);
    };

    beforeEach(async() => {
      await addToKyc(investor1, etherAmount1, tokenAmount1, whitelisted); 
    });

    it('should allow to reject by whitelisted', async () => {
      await testShouldReject(investor1, whitelisted);
    });
  
    it('should not allow to reject by not whitelisted', async () => {
      await testShouldNotReject(investor1, notWhitelisted);
      await expectThrow(reject(investor1, notWhitelisted));
    });

    it('should not throw exception when rejecting twice', async () => {
      await testShouldReject(investor1, whitelisted);
      await testShouldReject(investor1, whitelisted);
    });

    it('should not throw exception when rejecting investment not added to kyc', async () => {
      await testShouldReject(investor2, whitelisted);
    });
  });

  describe('Approving and rejecting', async() => {
    beforeEach(async() => {
      await addToKyc(investor1, etherAmount1, tokenAmount1, whitelisted); 
    });

    it('approving after rejecting should have no effect', async () => {
      await approve(investor1, whitelisted);
      const initialTotalReservedEther = await totalReservedEther();
      const initialTotalConfirmedEther = await totalConfirmedEther();
      await reject(investor1, whitelisted);
      expect(await totalReservedEther()).to.eq.BN(initialTotalReservedEther);
      expect(await totalConfirmedEther()).to.eq.BN(initialTotalConfirmedEther);
    });

    it('rejecting after approving should have no effect', async () => {
      await reject(investor1, whitelisted);
      const initialTotalReservedEther = await totalReservedEther();
      const initialTotalConfirmedEther = await totalConfirmedEther();
      await approve(investor1, whitelisted);
      expect(await totalReservedEther()).to.eq.BN(initialTotalReservedEther);
      expect(await totalConfirmedEther()).to.eq.BN(initialTotalConfirmedEther);
    });
  });
});
