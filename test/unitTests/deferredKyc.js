import {createWeb3, deployContract, expectThrow} from 'ethworks-solidity';
import allSporterCoinJson from '../../build/contracts/AllSporterCoin.json';
import deferredKycJson from '../../build/contracts/DeferredKyc.json';
import tgeMockJson from '../../build/contracts/TgeMock.json';
import Web3 from 'web3';
import chai from 'chai';
import bnChai from 'bn-chai';

const {expect} = chai;
const web3 = createWeb3(Web3, 20);
const {BN} = web3.utils;
chai.use(bnChai(BN));

describe('DeferredKyc', () => {
  let approver;
  let tokenOwner;
  let tokenContract;
  let minterOwner;
  let minterContract;
  let accounts;
  let firstStateMinter;
  let secondStateMinter;
  let kycOwner;
  let kycContract;
  let treasury;
  let investor1;
  let investor2;
  let newApprover;
  let alternativeTreasury;
  const saleEtherCap = new BN(web3.utils.toWei('100000000'));
  const etherAmount1 = new BN('10000');

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tokenOwner, minterOwner, firstStateMinter, secondStateMinter,
      approver, treasury, kycOwner, investor1, investor2, newApprover, alternativeTreasury] = accounts;
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

    await tokenContract.methods.transferOwnership(minterContract.options.address).send({from: tokenOwner});

    kycContract = await deployContract(web3, deferredKycJson, kycOwner, [
      minterContract.options.address,
      approver,
      treasury
    ]);
    minterContract.methods.addAllStateMinter(kycContract.options.address).send({from: minterOwner});
  });

  const addToKyc = async (account, etherAmount, from) => kycContract.methods.addToKyc(account).send({from, value: etherAmount});
  const approve = async(account, from) => kycContract.methods.approve(account).send({from});
  const reject = async(account, from) => kycContract.methods.reject(account).send({from});
  const withdrawRejected = async(from) => kycContract.methods.withdrawRejected().send({from});
  const forceWithdrawRejected = async(account, from) => kycContract.methods.forceWithdrawRejected(account).send({from});
  const transferApprover = async(newApprover, from) => kycContract.methods.transferApprover(newApprover).send({from});

  const etherInProgress = async(account) => kycContract.methods.etherInProgress(account).call();
  const tokenInProgress = async(account) => kycContract.methods.tokenInProgress(account).call();
  const etherRejected = async(account) => kycContract.methods.etherRejected(account).call();
  const etherBalanceOf = async (client) => new BN(await web3.eth.getBalance(client));
  const tokenBalanceOf = async (client) => tokenContract.methods.balanceOf(client).call();
  const isSecondState = async () => await minterContract.methods.secondState().call();

  it('should be properly created', async () => {
    const actualTreasury = await kycContract.methods.treasury().call();
    expect(actualTreasury).to.be.equal(treasury);
  });

  describe('adding to kyc', async () => {
    it('should allow to add to kyc by the owner', async () => {
      const initialEtherInProgress = new BN(await etherInProgress(investor1));
      await addToKyc(investor1, etherAmount1, kycOwner);
      expect(await etherInProgress(investor1)).to.eq.BN(initialEtherInProgress.add(etherAmount1));
    });
  
    it('should not allow to add to kyc by not the owner', async () => {
      const initialEtherInProgress = new BN(await etherInProgress(investor1));
      await expectThrow(addToKyc(investor1, etherAmount1, investor1));
      expect(await etherInProgress(investor1)).to.eq.BN(initialEtherInProgress);
    });

    it('should update the state when adding to kyc', async() => {
      expect(await isSecondState()).to.be.false;
      const secondStateAfter = await minterContract.methods.secondStateAfter().call();
      await addToKyc(investor1, secondStateAfter, kycOwner);
      expect(await isSecondState()).to.be.true;
    });
  });

  describe('approving', async () => {
    const testShouldApprove = async(investor, from) => {
      const initialEtherInProgress = new BN(await etherInProgress(investor));
      const initialTokenInProgress = new BN(await tokenInProgress(investor));
      const initialEtherRejected = new BN(await etherRejected(investor));
      const initialTreasuryBalance = new BN(await etherBalanceOf(treasury));
      const initialTokenBalance = new BN(await tokenBalanceOf(investor));

      await approve(investor, from);

      expect(await etherInProgress(investor)).to.eq.BN(0);
      expect(await tokenInProgress(investor)).to.eq.BN(0);
      expect(await etherRejected(investor)).to.eq.BN(initialEtherRejected);
      expect(await etherBalanceOf(treasury)).to.eq.BN(initialTreasuryBalance.add(initialEtherInProgress));
      expect(await tokenBalanceOf(investor)).to.eq.BN(initialTokenBalance.add(initialTokenInProgress));
    };

    const testShouldNotApprove = async(investor, from) => {
      const initialEtherInProgress = new BN(await etherInProgress(investor));
      const initialTokenInProgress = new BN(await tokenInProgress(investor));
      const initialEtherRejected = new BN(await etherRejected(investor));
      const initialTreasuryBalance = new BN(await etherBalanceOf(treasury));
      const initialTokenBalance = new BN(await tokenBalanceOf(investor));

      await expectThrow(approve(investor, from));

      expect(await etherInProgress(investor)).to.eq.BN(initialEtherInProgress);
      expect(await tokenInProgress(investor)).to.eq.BN(initialTokenInProgress);
      expect(await etherRejected(investor)).to.eq.BN(initialEtherRejected);
      expect(await etherBalanceOf(treasury)).to.eq.BN(initialTreasuryBalance);
      expect(await tokenBalanceOf(investor)).to.eq.BN(initialTokenBalance);
    };

    beforeEach(async() => {
      await addToKyc(investor1, etherAmount1, kycOwner); 
    });

    it('should allow to approve by the approver', async () => {
      await testShouldApprove(investor1, approver);
    });
  
    it('should not allow to approve by not the approver', async () => {
      await testShouldNotApprove(investor1, investor1);
    });

    it('should not throw exception when approving twice', async () => {
      await testShouldApprove(investor1, approver);
      await testShouldApprove(investor1, approver);
    });

    it('should not throw exception when approving investment not added to kyc', async () => {
      await testShouldApprove(investor2, approver);
    });
  });

  describe('rejecting', async () => {
    const testShouldReject = async(investor, from) => {
      const initialEtherInProgress = new BN(await etherInProgress(investor));
      // const initialTokenInProgress = new BN(await tokenInProgress(investor));
      const initialEtherRejected = new BN(await etherRejected(investor));
      const initialTreasuryBalance = new BN(await etherBalanceOf(treasury));
      const initialTokenBalance = new BN(await tokenBalanceOf(investor));

      await reject(investor, from);

      expect(await etherInProgress(investor)).to.eq.BN(0);
      expect(await tokenInProgress(investor)).to.eq.BN(0);
      expect(await etherRejected(investor)).to.eq.BN(initialEtherRejected.add(initialEtherInProgress));
      expect(await etherBalanceOf(treasury)).to.eq.BN(initialTreasuryBalance);
      expect(await tokenBalanceOf(investor)).to.eq.BN(initialTokenBalance);
    };

    const testShouldNotReject = async(investor, from) => {
      const initialEtherInProgress = new BN(await etherInProgress(investor));
      const initialTokenInProgress = new BN(await tokenInProgress(investor));
      const initialEtherRejected = new BN(await etherRejected(investor));
      const initialTreasuryBalance = new BN(await etherBalanceOf(treasury));
      const initialTokenBalance = new BN(await tokenBalanceOf(investor));

      await expectThrow(reject(investor, from));

      expect(await etherInProgress(investor)).to.eq.BN(initialEtherInProgress);
      expect(await tokenInProgress(investor)).to.eq.BN(initialTokenInProgress);
      expect(await etherRejected(investor)).to.eq.BN(initialEtherRejected);
      expect(await etherBalanceOf(treasury)).to.eq.BN(initialTreasuryBalance);
      expect(await tokenBalanceOf(investor)).to.eq.BN(initialTokenBalance);
    };

    beforeEach(async() => {
      await addToKyc(investor1, etherAmount1, kycOwner); 
    });

    it('should allow to reject by the approver', async () => {
      await testShouldReject(investor1, approver);
    });
  
    it('should not allow to reject by not the approver', async () => {
      await testShouldNotReject(investor1, investor1);
    });

    it('should not throw exception when rejecting twice', async () => {
      await testShouldReject(investor1, approver);
      await testShouldReject(investor1, approver);
    });

    it('should not throw exception when rejecting investment not added to kyc', async () => {
      await testShouldReject(investor2, approver);
    });
  });

  describe('Approving and rejecting', async() => {
    beforeEach(async() => {
      await addToKyc(investor1, etherAmount1, kycOwner); 
    });

    it('approving after rejecting should have no effect', async () => {
      await approve(investor1, approver);

      const initialTreasuryBalance = new BN(await etherBalanceOf(treasury));
      const initialTokenBalance = new BN(await tokenBalanceOf(investor1));

      await reject(investor1, approver);

      expect(await etherBalanceOf(treasury)).to.eq.BN(initialTreasuryBalance);
      expect(await tokenBalanceOf(investor1)).to.eq.BN(initialTokenBalance);
    });

    it('rejecting after approving should have no effect', async () => {
      await reject(investor1, approver);

      const initialEtherRejected = new BN(await etherRejected(investor1));

      await approve(investor1, approver);

      expect(await etherRejected(investor1)).to.eq.BN(initialEtherRejected);
    });
  });

  describe('Withdrawing rejected', async() => {
    const investmentAmount = new BN('10000000000000000000000000');

    beforeEach(async() => {
      await addToKyc(investor1, investmentAmount, kycOwner);
      await reject(investor1, approver);
    });

    it('Should allow to withdraw rejected', async() => {
      const initialBalance = new BN(await etherBalanceOf(investor1));
      await withdrawRejected(investor1);
      expect(await etherBalanceOf(investor1)).to.be.gt.BN(initialBalance);
    });

    it('Should allow to force withdraw rejected', async() => {
      const initialBalance = new BN(await etherBalanceOf(investor1));
      await forceWithdrawRejected(investor1, approver);
      expect(await etherBalanceOf(investor1)).to.be.gt.BN(initialBalance);
    });
  });

  describe('Transferring approver', async() => {
    it('should allow to transfer approver', async() => {
      const approver = await kycContract.methods.approver().call();
      await transferApprover(newApprover, approver);
      expect(await kycContract.methods.approver().call()).to.be.equal(newApprover);
    });

    it('should not allow to transfer approver by not the current approver', async() => {
      await expectThrow(transferApprover(newApprover, newApprover));
      expect(await kycContract.methods.approver().call()).to.be.equal(approver);
    });
  });

  describe('updating treasury', async() => {
    it('should allow to update the treasury by the owner', async() => {
      expect(await kycContract.methods.treasury().call()).to.be.equal(treasury);
      await kycContract.methods.updateTreasury(alternativeTreasury).send({from: kycOwner});
      expect(await kycContract.methods.treasury().call()).to.be.equal(alternativeTreasury);
    });

    it('should not allow to update the treasury by not the owner', async() => {
      expect(await kycContract.methods.treasury().call()).to.be.equal(treasury);
      await expectThrow(kycContract.methods.updateTreasury(alternativeTreasury).send({from: approver}));
      expect(await kycContract.methods.treasury().call()).to.be.equal(treasury);
    });
  });
});
