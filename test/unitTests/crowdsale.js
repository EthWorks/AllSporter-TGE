import {createWeb3, deployContract} from 'ethworks-solidity';
import allSporterCoinJson from '../../build/contracts/AllSporterCoin.json';
import minterJson from '../../build/contracts/Minter.json';
import stateManagerJson from '../../build/contracts/StateManager.json';
import crowdsaleJson from '../../build/contracts/Crowdsale.json';
import kycJson from '../../build/contracts/Kyc.json';
import Web3 from 'web3';
import chai from 'chai';
import bnChai from 'bn-chai';

const {expect} = chai;
const web3 = createWeb3(Web3, 20);
const {BN} = web3.utils;
chai.use(bnChai(BN));

describe('Crowdsale', () => {
  let tokenOwner;
  let tokenContract;
  let accounts;
  let minterOwner;
  let minterContract;
  let stateContract;
  let stateContractOwner;
  let kycContract;
  let kycOwner;
  let crowdsaleContract;
  let crowdsaleOwner;
  let treasury;
  const saleStartTime = 1577840461;
  const unlockTime = 1640998861;
  const singleStateEtherCap = new BN(web3.utils.toWei('10000'));
  const saleTokenCap = new BN(web3.utils.toWei('156000000'));

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tokenOwner, minterOwner,
      stateContractOwner, kycOwner, crowdsaleOwner,
      treasury] = accounts;
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

    // state manager
    stateContract = await deployContract(web3, stateManagerJson, stateContractOwner, [
      saleStartTime,
      singleStateEtherCap
    ]);
    await minterContract.methods.add(stateContract.options.address).send({from: minterOwner});

    // kyc
    kycContract = await deployContract(web3, kycJson, kycOwner, [minterContract.options.address]);
    await minterContract.methods.add(kycContract.options.address).send({from: minterOwner});

    // crowdsale
    crowdsaleContract = await deployContract(web3, crowdsaleJson, crowdsaleOwner, [
      minterContract.options.address,
      stateContract.options.address,
      kycContract.options.address,
      unlockTime,
      treasury
    ]);
  });

  it('should be properly created', async () => {
    const actualTreasury = await crowdsaleContract.methods.treasury().call({from: crowdsaleOwner});
    expect(actualTreasury).to.be.equal(treasury);
  });
});
