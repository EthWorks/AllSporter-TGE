import {createWeb3, deployContract, expectThrow} from 'ethworks-solidity';
import allSporterCoinJson from '../../build/contracts/AllSporterCoin.json';
import airdropperJson from '../../build/contracts/Airdropper.json';
import tgeMockJson from '../../build/contracts/TgeMock.json';
import Web3 from 'web3';
import chai from 'chai';
import bnChai from 'bn-chai';

const {expect} = chai;
const web3 = createWeb3(Web3, 20);
const {BN} = web3.utils;
chai.use(bnChai(BN));

describe('Airdropper', () => {
  let tokenOwner;
  let tokenContract;
  let minterOwner;
  let minterContract;
  let airdropperContract;
  let airdropperOwner;
  let accounts;
  let firstStateMinter;
  let secondStateMinter;
  let investor1;
  let investor2;
  let tokenCap;
  const tokenAmount1 = new BN(web3.utils.toWei('1000'));
  const tokenAmount2 = new BN(web3.utils.toWei('3000'));
  const saleEtherCap = new BN(web3.utils.toWei('100000000'));

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tokenOwner, minterOwner, firstStateMinter, secondStateMinter,
      airdropperOwner, investor1, investor2] = accounts;
  });

  beforeEach(async () => {
    tokenContract = await deployContract(web3, allSporterCoinJson, tokenOwner,
      []);
    tokenCap = new BN(await tokenContract.methods.cap().call());

    minterContract = await deployContract(web3, tgeMockJson, minterOwner, [
      tokenContract.options.address,
      saleEtherCap,
      firstStateMinter,
      secondStateMinter
    ]);
    await tokenContract.methods.transferOwnership(minterContract.options.address).send({from: tokenOwner});

    airdropperContract = await deployContract(web3, airdropperJson, airdropperOwner, [
      minterContract.options.address
    ]);
    minterContract.methods.addAllStateMinter(airdropperContract.options.address).send({from: minterOwner});
    minterContract.methods.addAllStateMinter(minterOwner).send({from: minterOwner});

    // contributions before airdropping
    await minterContract.methods.mint(investor1, 0, tokenAmount1).send({from: minterOwner});
    await minterContract.methods.mint(investor2, 0, tokenAmount2).send({from: minterOwner});
  });

  const isInitialized = async() => airdropperContract.methods.isInitialized().call();
  const drop = async(account, from) => airdropperContract.methods.drop(account).send({from});
  const tokenBalanceOf = async(account) => tokenContract.methods.balanceOf(account).call();

  it('should be properly created', async () => {
    const actualMinter = await airdropperContract.methods.minter().call();
    expect(actualMinter).to.be.equal(minterContract.options.address);
  });

  describe('initializing', async () => {
    it('should not be initialized at first', async () => {
      expect(await isInitialized()).to.be.false;
    });

    it('should be initialized by dropping', async () => {
      await drop('0x0', airdropperOwner);
      expect(await isInitialized()).to.be.true;
    });

    it('should have airdrop pool equal to not minted tokens', async() => {
      await drop('0x0', airdropperOwner);
      const minted = tokenAmount1.add(tokenAmount2);
      const notMinted = tokenCap.sub(minted);
      expect(await airdropperContract.methods.airdropPool().call()).to.eq.BN(notMinted);
    });
  });

  describe('airdropping', async () => {
    it('should not allow to airdrop by not the owner', async() => {
      await expectThrow(drop(investor1, investor1));
    });

    it('should airdrop proportionally to contributions', async() => {
      const initialContribution1 = new BN(await tokenBalanceOf(investor1));
      const initialContribution2 = new BN(await tokenBalanceOf(investor2));
      const initialRatio = initialContribution2.div(initialContribution1);

      await drop(investor1, airdropperOwner);
      await drop(investor2, airdropperOwner);
      
      const balance1 = new BN(await tokenBalanceOf(investor1));
      const balance2 = new BN(await tokenBalanceOf(investor2));
      const ratio = balance2.div(balance1);
      expect(ratio).to.eq.BN(initialRatio);
    });

    it('should drop up to the token cap', async() => {
      await drop(investor1, airdropperOwner);
      await drop(investor2, airdropperOwner);
      expect(await tokenContract.methods.totalSupply().call()).to.eq.BN(tokenCap);
    });

    it('should not allow to drop twice', async () => {
      await drop(investor1, airdropperOwner);
      await expectThrow(drop(investor1, airdropperOwner));
    });
  });
});
