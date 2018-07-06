import {createWeb3, deployContract, expectThrow, latestTime} from 'ethworks-solidity';
import allSporterCoinJson from '../../build/contracts/AllSporterCoin.json';
import crowdsaleJson from '../../build/contracts/Crowdsale.json';
import tgeMockJson from '../../build/contracts/TgeMock.json';
import lockingContractJson from '../../build/contracts/LockingContract.json';
import Web3 from 'web3';
import chai from 'chai';
import bnChai from 'bn-chai';
import web3jsChai from 'web3js-chai';

const {expect} = chai;
const web3 = createWeb3(Web3, 20);
const {BN} = web3.utils;
chai.use(bnChai(BN));
chai.use(web3jsChai(web3));

describe('Crowdsale', () => {
  let approver;
  let tokenOwner;
  let tokenContract;
  let minterOwner;
  let minterContract;
  let crowdsaleContract;
  let crowdsaleOwner;
  let accounts;
  let firstStateMinter;
  let secondStateMinter;
  let kycContractAddress;
  let investor1;
  let treasury;
  let minimumContributionAmount;
  const saleEtherCap = new BN(web3.utils.toWei('100000000'));
  const etherAmount1 = new BN(web3.utils.toWei('1000'));
  const tokenAmount1 = new BN(web3.utils.toWei('4000'));
  const lockingPeriod = 10000;

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tokenOwner, minterOwner, firstStateMinter, secondStateMinter,
      approver, treasury, crowdsaleOwner, investor1] = accounts;
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
    minimumContributionAmount = new BN(await minterContract.methods.minimumContributionAmount().call());

    crowdsaleContract = await deployContract(web3, crowdsaleJson, crowdsaleOwner, [
      minterContract.options.address,
      approver,
      treasury
    ]);
    kycContractAddress = await crowdsaleContract.methods.deferredKyc().call();
    minterContract.methods.addAllStateMinter(crowdsaleContract.options.address).send({from: minterOwner});
    minterContract.methods.addAllStateMinter(kycContractAddress).send({from: minterOwner});
  });

  const etherBalanceOf = async (client) => new BN(await web3.eth.getBalance(client));
  const buy = async(etherAmount, from) => crowdsaleContract.methods.buy().send({from, value: etherAmount});
  const noteSale = async(account, etherAmount, tokenAmount, from) => crowdsaleContract.methods.noteSale(account, etherAmount, tokenAmount).send({from});
  const noteSaleLocked = async(account, etherAmount, tokenAmount, lockingPeriod, from) => crowdsaleContract.methods.noteSaleLocked(account, etherAmount, tokenAmount, lockingPeriod).send({from});
  const tokenBalanceOf = async (client) => new BN(await tokenContract.methods.balanceOf(client).call());

  it('should be properly created', async () => {
    const actualMinter = await crowdsaleContract.methods.minter().call();
    expect(actualMinter).to.be.equal(minterContract.options.address);
  });

  describe('deploying', async () => {
    it('should deploy successfully with all parameters', async() => {
      const args = [
        minterContract.options.address,
        approver,
        treasury
      ];
      await deployContract(web3, crowdsaleJson, crowdsaleOwner, args);
    });

    it('should not allow to deploy without minter', async () => {
      const args = [
        0x0,
        approver,
        treasury
      ];
      await expectThrow(deployContract(web3, crowdsaleJson, crowdsaleOwner, args));
    });

    it('should not allow to deploy without approver', async () => {
      const args = [
        minterContract.options.address,
        0x0,
        treasury
      ];
      await expectThrow(deployContract(web3, crowdsaleJson, crowdsaleOwner, args));
    });

    it('should not allow to deploy without treasury', async () => {
      const args = [
        minterContract.options.address,
        approver,
        0x0
      ];
      await expectThrow(deployContract(web3, crowdsaleJson, crowdsaleOwner, args));
    });
  });

  describe('buying', async () => {
    const testShouldBuy = async (etherAmount, from) => {
      const initialBalance = await etherBalanceOf(kycContractAddress);
      await buy(etherAmount, from);
      expect(await etherBalanceOf(kycContractAddress)).to.eq.BN(initialBalance.add(etherAmount));
    };
    
    const testShouldNotBuy = async (etherAmount, from) => {
      const initialBalance = await etherBalanceOf(kycContractAddress);

      await expectThrow(buy(etherAmount, from));

      expect(await etherBalanceOf(kycContractAddress)).to.eq.BN(initialBalance);
    };

    it('should not allow to buy below minimum contribution amount', async() => {
      await testShouldNotBuy(minimumContributionAmount.sub(new BN('1')), investor1);
    });

    it('should allow to buy equal and above the minimum contribution amount', async() => {
      await testShouldBuy(minimumContributionAmount, investor1);
      await testShouldBuy(minimumContributionAmount.add(new BN('1')), investor1);
    });
  });

  describe('noting sale', async() => {
    it('should allow the owner to note the sale', async () => {
      const initialTokenBalance = new BN(await tokenBalanceOf(investor1));
      await noteSale(investor1, etherAmount1, tokenAmount1, crowdsaleOwner);
      expect(await tokenBalanceOf(investor1)).to.eq.BN(initialTokenBalance.add(tokenAmount1));
    });

    it('should not allow third party to note the sale', async () => {
      const initialTokenBalance = new BN(await tokenBalanceOf(investor1));
      await expectThrow(noteSale(investor1, etherAmount1, tokenAmount1, investor1));
      expect(await tokenBalanceOf(investor1)).to.eq.BN(initialTokenBalance);
    });
  });

  describe('noting sale locked', async() => {
    it('should allow the owner to note locked sale', async () => {
      await noteSaleLocked(investor1, etherAmount1, tokenAmount1, lockingPeriod, crowdsaleOwner);
    });

    it('should not allow third party to note locked sale', async () => {
      await expectThrow(noteSaleLocked(investor1, etherAmount1, tokenAmount1, lockingPeriod, investor1));
    });

    it('should emit address of a locking contract in an event', async () => {
      const tx = await noteSaleLocked(investor1, etherAmount1, tokenAmount1, lockingPeriod, crowdsaleOwner);
      expect(tx.events.SaleLockedNoted.returnValues.lockingContract).to.be.an.address;
      expect(tx.events.SaleLockedNoted.returnValues.lockingPeriod).to.be.eq.BN(lockingPeriod);
    });

    it('should lock proper amount of tokens on the locking contract', async () => {
      const tx = await noteSaleLocked(investor1, etherAmount1, tokenAmount1, lockingPeriod, crowdsaleOwner);
      const lockingContract = new web3.eth.Contract(lockingContractJson.abi, tx.events.SaleLockedNoted.returnValues.lockingContract);
      const balance = await lockingContract.methods.balanceOf(investor1);
      expect(balance).to.be.eq.BN(tokenAmount1);
    });

    it.only('should lock the tokens for a proper amount of time', async () => {
      const initialTime = await latestTime(web3);
      const tx = await noteSaleLocked(investor1, etherAmount1, tokenAmount1, lockingPeriod, crowdsaleOwner);
      const lockingContract = new web3.eth.Contract(lockingContractJson.abi, tx.events.SaleLockedNoted.returnValues.lockingContract);
      expect(await lockingContract.methods.unlockTime().call()).to.be.eq.BN(initialTime + lockingPeriod);
    });
  });
});
