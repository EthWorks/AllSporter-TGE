import {createWeb3, deployContract, expectThrow} from 'ethworks-solidity';
import kycJson from '../../build/contracts/Kyc.json';
import Web3 from 'web3';
import chai from 'chai';
import bnChai from 'bn-chai';

const {expect} = chai;
const web3 = createWeb3(Web3);
chai.use(bnChai(web3.utils.BN));
const {BN} = web3.utils;

describe('Kyc', () => {
  let owner;
  let kycContract;
  let accounts;
  let approver;
  let treasury;
  let investor1;
  let investor2;
  const tokenAmount1 = new BN(web3.utils.toWei('1000'));
  const etherAmount1 = new BN(web3.utils.toWei('200'));
  const tokenAmount2 = new BN(web3.utils.toWei('123'));
  const etherAmount2 = new BN(web3.utils.toWei('12'));

  const clearAndReturnPendingMinting = async (investor, from) =>
    kycContract.methods.clearAndReturnPendingMinting(investor).send({from});

  const clearAndReturnPendingRejection = async (investor, from) =>
    kycContract.methods.clearAndReturnPendingRejection(investor).send({from});

  const placeUnderKyc = async (investor, tokenAmount, etherAmount, from) =>
    kycContract.methods.placeUnderKyc(investor, tokenAmount).send({from, value: etherAmount});

  const approve = async (investor, from) => kycContract.methods.approve(investor).send({from});
  const reject = async (investor, from) => kycContract.methods.reject(investor).send({from});
  const withdraw = async (from) => kycContract.methods.withdraw().send({from});
  const forceWithdraw = async (investor, from) => kycContract.methods.forceWithdraw(investor).send({from});
  const isResolved = async () => kycContract.methods.isResolved().call();

  const etherUnderKyc = async (investor) => kycContract.methods.etherUnderKyc(investor).call();
  const totalEtherUnderKyc = async () => kycContract.methods.totalEtherUnderKyc().call();

  const tokensUnderKyc = async (investor) => kycContract.methods.tokensUnderKyc(investor).call();
  const totalTokensUnderKyc = async () => kycContract.methods.totalTokensUnderKyc().call();

  const pendingEtherWithdrawals = async (investor) => kycContract.methods.pendingEtherWithdrawals(investor).call();

  const pendingTokenMinting = async (investor) => kycContract.methods.pendingTokenMinting(investor).call();

  const pendingTokenRejections = async (investor) => kycContract.methods.pendingTokenRejections(investor).call();

  const balanceOf = async (account) => web3.eth.getBalance(account);

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [owner, approver, treasury, investor1, investor2] = accounts;
  });

  beforeEach(async () => {
    kycContract = await deployContract(web3, kycJson, owner,
      [approver, treasury]);
  });

  it('should be properly created', async () => {
    const actualApprover = await kycContract.methods.approver().call({from: owner});
    const actualTreasury = await kycContract.methods.treasury().call({from: owner});
    expect(actualApprover).to.equal(approver);
    expect(actualTreasury).to.equal(treasury);
  });

  it('should be resolved initially', async() => {
    expect(await isResolved()).to.be.true;
  });

  describe('placing under kyc', async () => {
    const testShouldPlaceUnderKyc = async (investor, tokenAmount, etherAmount, from) => {
      const initialEtherUnderKyc = new BN(await totalEtherUnderKyc());
      const initialTokensUnderKyc = new BN(await totalTokensUnderKyc());

      await placeUnderKyc(investor, tokenAmount, etherAmount, from);

      expect(await totalEtherUnderKyc()).to.eq.BN(initialEtherUnderKyc.add(etherAmount));
      expect(await totalTokensUnderKyc()).to.eq.BN(initialTokensUnderKyc.add(tokenAmount));
    };
    const testShouldNotPlaceUnderKyc = async (investor, tokenAmount, etherAmount, from) => {
      const initialEtherUnderKyc = new BN(await totalEtherUnderKyc());
      const initialTokensUnderKyc = new BN(await totalTokensUnderKyc());

      await expectThrow(placeUnderKyc(investor, tokenAmount, etherAmount, from));

      expect(await totalEtherUnderKyc()).to.eq.BN(initialEtherUnderKyc);
      expect(await totalTokensUnderKyc()).to.eq.BN(initialTokensUnderKyc);
    };

    it('should allow to place under kyc by the owner', async () => {
      await testShouldPlaceUnderKyc(investor1, tokenAmount1, etherAmount1, owner);
      await testShouldPlaceUnderKyc(investor2, tokenAmount1, etherAmount1, owner);
    });

    it('should not allow to place under kyc by not the owner', async () => {
      await testShouldNotPlaceUnderKyc(investor1, tokenAmount1, etherAmount1, investor1);
      await testShouldNotPlaceUnderKyc(investor1, tokenAmount1, etherAmount1, approver);
    });
  });

  describe('approving', async () => {
    const testShouldApprove = async (investor, from) => {
      const initialTreasury = new BN(await balanceOf(treasury));
      const etherValue = new BN(await etherUnderKyc(investor));
      const tokenValue = new BN(await tokensUnderKyc(investor));
      const initialPendingTokenMinting = new BN(await pendingTokenMinting(investor));
      const initialPendingTokenRejections = new BN(await pendingTokenRejections(investor));
      const initialPendingEtherWithdrawals = new BN(await pendingEtherWithdrawals(investor));

      await approve(investor, from);

      expect(await balanceOf(treasury)).to.eq.BN(initialTreasury.add(etherValue));
      expect(await etherUnderKyc(investor)).to.eq.BN(0);
      expect(await tokensUnderKyc(investor)).to.eq.BN(0);
      expect(await pendingTokenMinting(investor)).to.eq.BN(initialPendingTokenMinting.add(tokenValue));
      expect(await pendingTokenRejections(investor)).to.eq.BN(initialPendingTokenRejections);
      expect(await pendingEtherWithdrawals(investor)).to.eq.BN(initialPendingEtherWithdrawals);
    };

    const testShouldNotApprove = async (investor, from) => {
      const initialTreasury = new BN(await balanceOf(treasury));
      const etherValue = new BN(await etherUnderKyc(investor));
      const tokenValue = new BN(await tokensUnderKyc(investor));
      const initialPendingTokenMinting = new BN(await pendingTokenMinting(investor));
      const initialPendingTokenRejections = new BN(await pendingTokenRejections(investor));
      const initialPendingEtherWithdrawals = new BN(await pendingEtherWithdrawals(investor));

      await expectThrow(approve(investor, from));

      expect(await balanceOf(treasury)).to.eq.BN(initialTreasury);
      expect(await etherUnderKyc(investor)).to.eq.BN(etherValue);
      expect(await tokensUnderKyc(investor)).to.eq.BN(tokenValue);
      expect(await pendingTokenMinting(investor)).to.eq.BN(initialPendingTokenMinting);
      expect(await pendingTokenRejections(investor)).to.eq.BN(initialPendingTokenRejections);
      expect(await pendingEtherWithdrawals(investor)).to.eq.BN(initialPendingEtherWithdrawals);
    };

    beforeEach(async() => {
      await placeUnderKyc(investor1, tokenAmount1, etherAmount1, owner);
      await placeUnderKyc(investor2, tokenAmount2, etherAmount2, owner);
    });

    it('should allow to approve by the approver', async () => {
      await testShouldApprove(investor1, approver);
    });

    it('should not allow to approve by not the approver', async () => {
      await testShouldNotApprove(investor1, investor1);
      await testShouldNotApprove(investor1, owner);
    });
  });

  describe('rejecting', async () => {
    const testShouldReject = async (investor, from) => {
      const initialTreasury = new BN(await balanceOf(treasury));
      const etherValue = new BN(await etherUnderKyc(investor));
      const tokenValue = new BN(await tokensUnderKyc(investor));
      const initialPendingTokenMinting = new BN(await pendingTokenMinting(investor));
      const initialPendingTokenRejections = new BN(await pendingTokenRejections(investor));
      const initialPendingEtherWithdrawals = new BN(await pendingEtherWithdrawals(investor));

      await reject(investor, from);

      expect(await balanceOf(treasury)).to.eq.BN(initialTreasury);
      expect(await etherUnderKyc(investor)).to.eq.BN(0);
      expect(await tokensUnderKyc(investor)).to.eq.BN(0);
      expect(await pendingTokenMinting(investor)).to.eq.BN(initialPendingTokenMinting);
      expect(await pendingTokenRejections(investor)).to.eq.BN(initialPendingTokenRejections.add(tokenValue));
      expect(await pendingEtherWithdrawals(investor)).to.eq.BN(initialPendingEtherWithdrawals.add(etherValue));
    };

    const testShouldNotReject = async (investor, from) => {
      const initialTreasury = new BN(await balanceOf(treasury));
      const etherValue = new BN(await etherUnderKyc(investor));
      const tokenValue = new BN(await tokensUnderKyc(investor));
      const initialPendingTokenMinting = new BN(await pendingTokenMinting(investor));
      const initialPendingTokenRejections = new BN(await pendingTokenRejections(investor));
      const initialPendingEtherWithdrawals = new BN(await pendingEtherWithdrawals(investor));

      await expectThrow(reject(investor, from));

      expect(await balanceOf(treasury)).to.eq.BN(initialTreasury);
      expect(await etherUnderKyc(investor)).to.eq.BN(etherValue);
      expect(await tokensUnderKyc(investor)).to.eq.BN(tokenValue);
      expect(await pendingTokenMinting(investor)).to.eq.BN(initialPendingTokenMinting);
      expect(await pendingTokenRejections(investor)).to.eq.BN(initialPendingTokenRejections);
      expect(await pendingEtherWithdrawals(investor)).to.eq.BN(initialPendingEtherWithdrawals);
    };

    beforeEach(async() => {
      await placeUnderKyc(investor1, tokenAmount1, etherAmount1, owner);
      await placeUnderKyc(investor2, tokenAmount2, etherAmount2, owner);
    });

    it('should allow to reject by the approver', async () => {
      await testShouldReject(investor1, approver);
    });

    it('should not allow to reject by not the approver', async () => {
      await testShouldNotReject(investor1, investor1);
      await testShouldNotReject(investor1, owner);
    });
  });

  describe('clearing', async () => {
    beforeEach(async() => {
      await placeUnderKyc(investor1, tokenAmount1, etherAmount1, owner);
      await placeUnderKyc(investor2, tokenAmount2, etherAmount2, owner);
      await approve(investor1, approver);
      await reject(investor2, approver);
    });

    it('should not be resolved', async() => {
      expect(await isResolved()).to.be.false;
    });

    const testShouldClearPendingMinting = async (investor, from) => {
      const initialPendingTokenRejection = new BN(await pendingTokenRejections(investor));

      await clearAndReturnPendingMinting(investor, from);

      expect(await pendingTokenMinting(investor)).to.eq.BN(0);
      expect(await pendingTokenRejections(investor)).to.eq.BN(initialPendingTokenRejection);
    };

    const testShouldNotClearPendingMinting = async (investor, from) => {
      const initialPendingTokenMinting = new BN(await pendingTokenMinting(investor));
      const initialPendingTokenRejection = new BN(await pendingTokenRejections(investor));

      await expectThrow(clearAndReturnPendingMinting(investor, from));

      expect(await pendingTokenMinting(investor)).to.eq.BN(initialPendingTokenMinting);
      expect(await pendingTokenRejections(investor)).to.eq.BN(initialPendingTokenRejection);
    };

    const testShouldClearPendingRejection = async (investor, from) => {
      const initialPendingTokenMinting = new BN(await pendingTokenMinting(investor));

      await clearAndReturnPendingRejection(investor, from);

      expect(await pendingTokenMinting(investor)).to.eq.BN(initialPendingTokenMinting);
      expect(await pendingTokenRejections(investor)).to.eq.BN(0);
    };

    const testShouldNotClearPendingRejection = async (investor, from) => {
      const initialPendingTokenMinting = new BN(await pendingTokenMinting(investor));
      const initialPendingTokenRejection = new BN(await pendingTokenRejections(investor));

      await expectThrow(clearAndReturnPendingRejection(investor, from));

      expect(await pendingTokenMinting(investor)).to.eq.BN(initialPendingTokenMinting);
      expect(await pendingTokenRejections(investor)).to.eq.BN(initialPendingTokenRejection);
    };

    it('should allow to clear pending minting by the owner', async () => {
      await testShouldClearPendingMinting(investor1, owner);
      expect(await isResolved()).to.be.false;
    });

    it('should allow to clear pending rejection by the owner', async () => {
      await testShouldClearPendingRejection(investor2, owner);
      expect(await isResolved()).to.be.false;
    });

    it('should not allow to clear pending minting by not the owner', async () => {
      await testShouldNotClearPendingMinting(investor1, investor1);
      await testShouldNotClearPendingMinting(investor1, approver);
    });

    it('should not allow to clear pending rejection by not the owner', async () => {
      await testShouldNotClearPendingRejection(investor2, approver);
    });
  });

  describe('withdrawing', async() => {
    beforeEach(async() => {
      await placeUnderKyc(investor1, tokenAmount1, etherAmount1, owner);
      await placeUnderKyc(investor2, tokenAmount2, etherAmount2, owner);
      await reject(investor1, approver);
      await reject(investor2, approver);
    });

    const testShouldWithdraw = async (from) => {
      const initialBalance = new BN(await balanceOf(from));

      await withdraw(from);

      const balance = new BN(await balanceOf(from));
      expect(await pendingEtherWithdrawals(from)).to.eq.BN(0);
      expect(balance.gt(initialBalance)).to.be.true;
    };
    
    const testShouldForceWithdraw = async (investor, from) => {
      const initialBalance = new BN(await balanceOf(investor));
      const etherValue = new BN(await pendingEtherWithdrawals(investor));

      await forceWithdraw(investor, from);

      expect(await balanceOf(investor)).to.eq.BN(initialBalance.add(etherValue));
      expect(await pendingEtherWithdrawals(investor)).to.eq.BN(0);
    };

    const testShouldNotForceWithdraw = async (investor, from) => {
      const initialBalance = new BN(await balanceOf(investor));
      const etherValue = new BN(await pendingEtherWithdrawals(investor));

      await expectThrow(forceWithdraw(investor, from));

      expect(await balanceOf(investor)).to.eq.BN(initialBalance);
      expect(await pendingEtherWithdrawals(investor)).to.eq.BN(etherValue);
    };

    it('should allow to withdraw by the investor', async () => {
      await testShouldWithdraw(investor1);
    });

    it('should allow to force withdraw by the approver', async () => {
      await testShouldForceWithdraw(investor1, approver);
    });

    it('should not allow to force withdraw by not the approver', async () => {
      await testShouldNotForceWithdraw(investor1, owner);
    });
  });

  it('should be resolved after clearing and withdrawing', async() => {
    expect(await isResolved()).to.be.true;

    await placeUnderKyc(investor1, tokenAmount1, etherAmount1, owner);
    expect(await isResolved()).to.be.false;
    await approve(investor1, approver);
    await clearAndReturnPendingMinting(investor1, owner);

    await placeUnderKyc(investor2, tokenAmount2, etherAmount2, owner);
    await reject(investor2, approver);
    await withdraw(investor2);
    await clearAndReturnPendingRejection(investor2, owner);

    expect(await isResolved()).to.be.true;
  });
});
