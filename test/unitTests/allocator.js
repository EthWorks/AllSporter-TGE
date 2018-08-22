import {createWeb3, deployContract, expectThrow, increaseTimeTo, createContract} from 'ethworks-solidity';
import allSporterCoinJson from '../../build/contracts/AllSporterCoin.json';
import allocatorJson from '../../build/contracts/Allocator.json';
import tgeMockJson from '../../build/contracts/TgeMock.json';
import lockingContractJson from '../../build/contracts/SingleLockingContract.json';
import Web3 from 'web3';
import chai from 'chai';
import bnChai from 'bn-chai';

const {expect} = chai;
const web3 = createWeb3(Web3, 20);
const {BN} = web3.utils;
chai.use(bnChai(BN));

describe('Allocator', () => {
  let tokenOwner;
  let tokenContract;
  let minterOwner;
  let minterContract;
  let allocatorContract;
  let allocatorOwner;
  let accounts;
  let firstStateMinter;
  let secondStateMinter;
  let investor1;
  let investor2;
  const COMMUNITY_PERCENTAGE = new BN('5');
  const ADVISORS_PERCENTAGE = new BN('8');
  const CUSTOMER_PERCENTAGE = new BN('15');
  const TEAM_PERCENTAGE = new BN('17');
  const SALE_PERCENTAGE = new BN('55');
  const saleEtherCap = new BN(web3.utils.toWei('1000000'));
  const tokenAmount1 = new BN(web3.utils.toWei('1000'));
  const tokenAmount2 = new BN(web3.utils.toWei('100000'));
  const tokensSold = new BN(web3.utils.toWei('1500000'));
  const communityPool = tokensSold.div(SALE_PERCENTAGE).mul(COMMUNITY_PERCENTAGE);
  const advisorsPool = tokensSold.div(SALE_PERCENTAGE).mul(ADVISORS_PERCENTAGE);
  const customerPool = tokensSold.div(SALE_PERCENTAGE).mul(CUSTOMER_PERCENTAGE);
  const teamPool = tokensSold.div(SALE_PERCENTAGE).mul(TEAM_PERCENTAGE);

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tokenOwner, minterOwner, firstStateMinter, secondStateMinter,
      allocatorOwner, investor1, investor2] = accounts;
  });

  beforeEach(async () => {
    tokenContract = await deployContract(web3, allSporterCoinJson, tokenOwner,
      []);
    await tokenContract.methods.mint(0x0, tokensSold).send({from: tokenOwner});

    minterContract = await deployContract(web3, tgeMockJson, minterOwner, [
      tokenContract.options.address,
      saleEtherCap,
      firstStateMinter,
      secondStateMinter
    ]);
    await tokenContract.methods.transferOwnership(minterContract.options.address).send({from: tokenOwner});

    allocatorContract = await deployContract(web3, allocatorJson, allocatorOwner, [
      minterContract.options.address
    ]);
    minterContract.methods.addAllStateMinter(allocatorContract.options.address).send({from: minterOwner});
  });

  const tokenBalanceOf = async(account) => tokenContract.methods.balanceOf(account).call();
  const lockedBalanceOf = async(account) => {
    const lockingContract = await createContract(web3, lockingContractJson, await allocatorContract.methods.lockingContracts(account).call());
    return await lockingContract.methods.balanceOf().call();
  };

  const vestedBalanceOf = async(account) => {
    const vestingContractAddress = await allocatorContract.methods.vestingContracts(account).call();
    return await tokenBalanceOf(vestingContractAddress);
  };

  const isInitialized = async() => allocatorContract.methods.isInitialized().call();
  const allocateCommunity = async(account, tokenAmount, from) => allocatorContract.methods.allocateCommunity(account, tokenAmount).send({from});
  const allocateAdvisors = async(account, tokenAmount, from) => allocatorContract.methods.allocateAdvisors(account, tokenAmount).send({from});
  const allocateCustomer = async(account, tokenAmount, from) => allocatorContract.methods.allocateCustomer(account, tokenAmount).send({from});
  const allocateTeam = async(account, tokenAmount, from) => allocatorContract.methods.allocateTeam(account, tokenAmount).send({from});
  const releaseVested = async(account, from) => allocatorContract.methods.releaseVested(account).send({from});
  const releaseLocked = async(account, from) => allocatorContract.methods.releaseLocked(account).send({from});

  it('should be properly created', async () => {
    const actualMinter = await allocatorContract.methods.minter().call();
    expect(actualMinter).to.be.equal(minterContract.options.address);
  });

  describe('Initializing', async() => {
    it('should not be initialized at first', async() => {
      expect(await isInitialized()).to.be.false;
    });

    it('should be initialized by allocating Community', async () => {
      await allocateCommunity(investor1, tokenAmount1, allocatorOwner);
      expect(await isInitialized()).to.be.true;
    });

    it('should be initialized by allocating Advisors', async () => {
      await allocateAdvisors(investor1, tokenAmount1, allocatorOwner);
      expect(await isInitialized()).to.be.true;
    });

    it('should be initialized by allocating Customer', async () => {
      await allocateCustomer(investor1, tokenAmount1, allocatorOwner);
      expect(await isInitialized()).to.be.true;
    });

    it('should be initialized by allocating Team', async () => {
      await allocateTeam(investor1, tokenAmount1, allocatorOwner);
      expect(await isInitialized()).to.be.true;
    });

    it('should have proper pools after initializing', async () => {
      await allocateCommunity(investor1, 0, allocatorOwner);
      expect(await allocatorContract.methods.communityPool().call()).to.eq.BN(communityPool);
      expect(await allocatorContract.methods.advisorsPool().call()).to.eq.BN(advisorsPool);
      expect(await allocatorContract.methods.customerPool().call()).to.eq.BN(customerPool);
      expect(await allocatorContract.methods.teamPool().call()).to.eq.BN(teamPool);
    });
  });

  describe('Allocating', async () => {
    describe('Community', async () => {
      it('should allow to allocate by the owner', async() => {
        await allocateCommunity(investor1, tokenAmount1, allocatorOwner);
      });

      it('should mint tokens directly', async() => {
        await allocateCommunity(investor1, tokenAmount1, allocatorOwner);
        expect(await tokenBalanceOf(investor1)).to.eq.BN(tokenAmount1);
      });

      it('should not allow to allocate by not the owner', async() => {
        await expectThrow(allocateCommunity(investor1, tokenAmount1, investor1));
      });

      it('should decrease the pool', async() => {
        await allocateCommunity(investor1, tokenAmount1, allocatorOwner);
        expect(await allocatorContract.methods.communityPool().call()).to.eq.BN(communityPool.sub(tokenAmount1));
      });

      it('should allow to allocate up to the pool', async() => {
        await allocateCommunity(investor1, communityPool, allocatorOwner);
      });

      it('should not allow to allocate more than the pool', async() => {
        await expectThrow(allocateCommunity(investor1, communityPool.add(new BN('1')), investor1));
      });
    });

    describe('Advisors', async () => {
      it('should allow to allocate by the owner', async() => {
        await allocateAdvisors(investor1, tokenAmount1, allocatorOwner);
      });

      it('should mint tokens directly', async() => {
        await allocateAdvisors(investor1, tokenAmount1, allocatorOwner);
        expect(await tokenBalanceOf(investor1)).to.eq.BN(tokenAmount1);
      });

      it('should not allow to allocate by not the owner', async() => {
        await expectThrow(allocateAdvisors(investor1, tokenAmount1, investor1));
      });

      it('should decrease the pool', async() => {
        await allocateAdvisors(investor1, tokenAmount1, allocatorOwner);
        expect(await allocatorContract.methods.advisorsPool().call()).to.eq.BN(advisorsPool.sub(tokenAmount1));
      });

      it('should allow to allocate up to the pool', async() => {
        await allocateAdvisors(investor1, advisorsPool, allocatorOwner);
      });

      it('should not allow to allocate more than the pool', async() => {
        await expectThrow(allocateAdvisors(investor1, advisorsPool.add(new BN('1')), investor1));
      });
    });

    describe('Customer', async () => {
      it('should allow to allocate by the owner', async() => {
        await allocateCustomer(investor1, tokenAmount1, allocatorOwner);
      });

      it('should vest the tokens', async () => {
        await allocateCustomer(investor1, tokenAmount1, allocatorOwner);
        expect(await vestedBalanceOf(investor1)).to.eq.BN(tokenAmount1);
      });

      it('should not allow to allocate by not the owner', async() => {
        await expectThrow(allocateCustomer(investor1, tokenAmount1, investor1));
      });

      it('should decrease the pool', async() => {
        await allocateCustomer(investor1, tokenAmount1, allocatorOwner);
        expect(await allocatorContract.methods.customerPool().call()).to.eq.BN(customerPool.sub(tokenAmount1));
      });

      it('should allow to allocate up to the pool', async() => {
        await allocateCustomer(investor1, customerPool, allocatorOwner);
      });

      it('should not allow to allocate more than the pool', async() => {
        await expectThrow(allocateCustomer(investor1, customerPool.add(new BN('1')), investor1));
      });
    });

    describe('Team', async () => {
      it('should allow to allocate by the owner', async() => {
        await allocateTeam(investor1, tokenAmount1, allocatorOwner);
      });

      it('should lock the tokens', async () => {
        await allocateTeam(investor1, tokenAmount1, allocatorOwner);
        expect(await lockedBalanceOf(investor1)).to.eq.BN(tokenAmount1);
      });

      it('should not allow to allocate by not the owner', async() => {
        await expectThrow(allocateTeam(investor1, tokenAmount1, investor1));
      });

      it('should decrease the pool', async() => {
        await allocateTeam(investor1, tokenAmount1, allocatorOwner);
        expect(await allocatorContract.methods.teamPool().call()).to.eq.BN(teamPool.sub(tokenAmount1));
      });

      it('should allow to allocate up to the pool', async() => {
        await allocateTeam(investor1, teamPool, allocatorOwner);
      });

      it('should not allow to allocate more than the pool', async() => {
        await expectThrow(allocateTeam(investor1, teamPool.add(new BN('1')), investor1));
      });
    });
  });

  describe('Releasing', async () => {
    beforeEach(async() => {
      await allocateTeam(investor1, tokenAmount1, allocatorOwner);
      await allocateCustomer(investor2, tokenAmount2, allocatorOwner);
      
      const unlockTime = new BN(await allocatorContract.methods.LOCKING_UNLOCK_TIME().call());
      const vestingPeriod = new BN(await allocatorContract.methods.VESTING_PERIOD().call());
      await increaseTimeTo(web3, unlockTime.add(vestingPeriod).add(new BN('100000')));
      await minterContract.methods.transferTokenOwnership().send({from: minterOwner});
      await tokenContract.methods.finishMinting().send({from: minterOwner});
    });

    it('should not allow to release locked and vested by anyone', async () => {
      expect(await tokenBalanceOf(investor1)).to.eq.BN(0);
      expect(await tokenBalanceOf(investor2)).to.eq.BN(0);
      
      await expectThrow(releaseLocked(investor1, investor2));
      await expectThrow(releaseVested(investor2, investor1));

      expect(await tokenBalanceOf(investor1)).to.eq.BN(0);
      expect(await tokenBalanceOf(investor2)).to.eq.BN(0);
    });
  });
});
