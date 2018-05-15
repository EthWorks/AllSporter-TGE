import {createWeb3, deployContract, expectThrow} from 'ethworks-solidity';
import allSporterCoinJson from '../../build/contracts/AllSporterCoin.json';
import referralManagerJson from '../../build/contracts/ReferralManager.json';
import tgeMockJson from '../../build/contracts/TgeMock.json';
import Web3 from 'web3';
import chai from 'chai';
import bnChai from 'bn-chai';

const {expect} = chai;
const web3 = createWeb3(Web3, 20);
const {BN} = web3.utils;
chai.use(bnChai(BN));

describe('Referral Manager', () => {
  let tokenOwner;
  let tokenContract;
  let minterOwner;
  let minterContract;
  let referralManagerContract;
  let referralManagerOwner;
  let accounts;
  let firstStateMinter;
  let secondStateMinter;
  let referring1;
  let referring2;
  let referred1;
  let referred2;
  let maximumPercent;
  const saleEtherCap = new BN(web3.utils.toWei('100000000'));
  const tokenAmount1 = new BN(web3.utils.toWei('1000'));
  const tokenAmount2 = new BN(web3.utils.toWei('3000'));

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tokenOwner, minterOwner, firstStateMinter, secondStateMinter,
      referralManagerOwner, referring1, referring2, referred1, referred2] = accounts;
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

    referralManagerContract = await deployContract(web3, referralManagerJson, referralManagerOwner, [
      minterContract.options.address
    ]);
    minterContract.methods.addAllStateMinter(referralManagerContract.options.address).send({from: minterOwner});
    minterContract.methods.addAllStateMinter(minterOwner).send({from: minterOwner});
    maximumPercent = await referralManagerContract.methods.MAXIMUM_PERCENT().call();

    // contributions before adding fees
    await minterContract.methods.mint(referred1, 0, tokenAmount1).send({from: minterOwner});
    await minterContract.methods.mint(referred2, 0, tokenAmount2).send({from: minterOwner});
  });

  const addFee = async(referring, referringPercent, referred, referredPercent, from) =>
    referralManagerContract.methods.addFee(referring, referringPercent, referred, referredPercent).send({from});

  const tokenBalanceOf = async(account) => tokenContract.methods.balanceOf(account).call();

  it('should be properly created', async () => {
    const actualMinter = await referralManagerContract.methods.minter().call();
    expect(actualMinter).to.be.equal(minterContract.options.address);
  });

  describe('adding fee', async () => {
    it('should allow the owner to add fee', async() => {
      await addFee(referring1, 1, referred1, 1, referralManagerOwner);
    });

    it('should not allow not the owner to add fee', async() => {
      await expectThrow(addFee(referring1, 1, referred1, 1, referring1));
      await expectThrow(addFee(referring1, 1, referred1, 1, referred1));
    });

    it('should not allow to add fee with referring percentage up to the maximum percentage', async() => {
      await addFee(referring1, maximumPercent, referred1, 1, referralManagerOwner);
    });

    it('should not allow to add fee with referred percentage up to the maximum percentage', async() => {
      await addFee(referring1, 1, referred1, maximumPercent, referralManagerOwner);
    });

    it('should not allow to add fee with referring percentage above the maximum percentage', async() => {
      await expectThrow(addFee(referring1, maximumPercent + 1, referred1, 1, referralManagerOwner));
    });

    it('should not allow to add fee with referred percentage above the maximum percentage', async() => {
      await expectThrow(addFee(referring1, 1, referred1, maximumPercent + 1, referralManagerOwner));
    });

    it('should allow to adding fee for the same referring person twice', async() => {
      await addFee(referring1, 1, referred1, 1, referralManagerOwner);
      await addFee(referring1, 1, referred2, 1, referralManagerOwner);
    });

    it('should not allow to adding fee for the same referred person twice', async() => {
      await addFee(referring1, 1, referred1, 1, referralManagerOwner);
      await expectThrow(addFee(referring2, 1, referred1, 1, referralManagerOwner));
    });

    it('should calculate proper token amounts for referring', async () => {
      const initialReferredBalance = new BN(await tokenBalanceOf(referred1));
      await addFee(referring1, 1, referred1, 2, referralManagerOwner);
      const referringTokensDue = initialReferredBalance.div(new BN('100')).mul(new BN('1'));

      expect(await tokenBalanceOf(referring1)).to.eq.BN(referringTokensDue);
    });

    it('should calculate proper token amounts for referred', async () => {
      const initialReferredBalance = new BN(await tokenBalanceOf(referred1));
      await addFee(referring1, 1, referred1, 2, referralManagerOwner);
      const referredTokensDue = initialReferredBalance.div(new BN('100')).mul(new BN('2'));

      expect(await tokenBalanceOf(referred1)).to.eq.BN(initialReferredBalance.add(referredTokensDue));
    });
  });
});
