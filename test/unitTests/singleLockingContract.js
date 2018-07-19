import {createWeb3, deployContract, expectThrow, increaseTimeTo, durationInit, latestTime} from 'ethworks-solidity';
import tokenJson from '../../build/contracts/CrowdfundableToken.json';
import lockingJson from '../../build/contracts/SingleLockingContract.json';
import Web3 from 'web3';
import chai from 'chai';
import bnChai from 'bn-chai';

const {expect} = chai;
const web3 = createWeb3(Web3);
chai.use(bnChai(web3.utils.BN));

describe('SingleLockingContract', () => {
  let tokenOwner;
  let tokenContract;
  let lockingOwner;
  let lockingContract;
  let accounts; 
  let client1;
  let notTheOwner;
  let deploymentTime; 
  let lockingContractAddress;
  let unlockTime;
  const {BN} = web3.utils;
  const duration = durationInit(web3);
  const tokenCap = new BN(500000000);
  const lockingDuration = duration.weeks(1);

  const isLocked = async () => lockingContract.methods.isLocked().call({from: lockingOwner});
  const balanceOf = async () => tokenContract.methods.balanceOf(client1).call({from: tokenOwner});

  const releaseTokens = async (from = lockingOwner) =>
    lockingContract.methods.releaseTokens().send({from});

  const advanceToAfterLockingPeriod = async () =>
    increaseTimeTo(web3, deploymentTime.add(lockingDuration).add(duration.days(1)));

  const mint = async (account, amount, from = tokenOwner) =>
    tokenContract.methods.mint(account, amount).send({from});

  const finishMinting = async () =>
    tokenContract.methods.finishMinting().send({from: tokenOwner});

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tokenOwner, lockingOwner, client1, notTheOwner] = accounts;
  });

  beforeEach(async () => {
    tokenContract = await deployContract(web3, tokenJson, tokenOwner,
      [tokenCap, 'CrowdfundableToken', 'CT', 18]);

    deploymentTime = new BN(await latestTime(web3));
    unlockTime = deploymentTime.add(lockingDuration);
    lockingContract = await deployContract(web3, lockingJson, lockingOwner,
      [tokenContract.options.address, unlockTime, client1]);
    lockingContractAddress = lockingContract.options.address;
  });

  it('should not allow to be deployed with past unlock time', async () => {
    const args = [tokenContract.options.address, '1', client1];
    await expectThrow(deployContract(web3, lockingJson, lockingOwner, args));
  });

  it('should not allow to be deployed with invalid beneficiary', async () => {
    const args = [tokenContract.options.address, '738658800', '0x0'];
    await expectThrow(deployContract(web3, lockingJson, lockingOwner, args));
  });

  it('should be locked initially', async () => {
    expect(await isLocked()).to.be.equal(true);
  });

  it('should be unlocked after the unlocking period', async () => {
    await advanceToAfterLockingPeriod();
    expect(await isLocked()).to.be.equal(false);
  });

  describe('releasing', async () => {
    beforeEach(async () => {
      await mint(lockingContractAddress, 100);
      await mint(lockingContractAddress, 1000);
    });

    it('should allow to release the tokens when unlocked', async () => {
      await advanceToAfterLockingPeriod();
      await finishMinting();
      await releaseTokens(lockingOwner);
      const balance = await balanceOf();
      expect(balance).to.eq.BN(1100);
    });

    it('should allow to release by the beneficiary', async () => {
      await advanceToAfterLockingPeriod();
      await finishMinting();
      await releaseTokens(client1);
      const balance = await balanceOf();
      expect(balance).to.eq.BN(1100);
    });

    it('should not allow to release by anyone', async () => {
      await advanceToAfterLockingPeriod();
      await finishMinting();
      await expectThrow(releaseTokens(notTheOwner));
      const balance = await balanceOf();
      expect(balance).to.be.zero;
    });

    it('should not allow to release the tokens when locked', async () => {
      await expectThrow(releaseTokens(lockingOwner));
      const balance = await balanceOf();
      expect(balance).to.be.zero;
    });

    it('should not release the tokens twice', async () => {
      await advanceToAfterLockingPeriod();
      await finishMinting();
      await releaseTokens(lockingOwner);
      await releaseTokens(lockingOwner);
      const balance = await balanceOf();
      expect(balance).to.eq.BN(1100);
    });
  });
});
