import {createWeb3, deployContract, durationInit, latestTime} from 'ethworks-solidity';
import allSporterCoinJson from '../../build/contracts/AllSporterCoin.json';
import crowdsaleJson from '../../build/contracts/AllSporterCrowdsale.json';
import lockingJson from '../../build/contracts/LockingContract.json';
import Web3 from 'web3';
import chai from 'chai';
import bnChai from 'bn-chai';

const {expect} = chai;
const web3 = createWeb3(Web3);
chai.use(bnChai(web3.utils.BN));
const {BN} = web3.utils;
const duration = durationInit(web3);

describe('AllSporter Crowdsale', () => {
  let tokenDeployer;
  const tokenCap = new BN(web3.utils.toWei('260000000'));
  let tokenContract;
  let accounts;
  let tokenContractAddress;
  let saleContract;
  let saleOwner;
  let saleContractAddress;
  let lockingContract;
  let saleStartTime;
  let saleEndTime;
  let treasury;

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [tokenDeployer, saleOwner, treasury] = accounts;
  });

  beforeEach(async () => {
    // token
    tokenContract = await deployContract(web3, allSporterCoinJson, tokenDeployer,
      []);
    tokenContractAddress = tokenContract.options.address;

    // dates and times
    const now = new BN(await latestTime(web3));
    saleStartTime = now.add(duration.days(1));
    saleEndTime = saleStartTime.add(duration.days(83));

    // crowdsale contract
    const saleArgs = [
      tokenContractAddress,
      saleStartTime,
      saleEndTime,
      treasury
    ];
    saleContract = await deployContract(web3, crowdsaleJson, saleOwner, saleArgs);
    saleContractAddress = saleContract.options.address;

    // Locking contract
    const lockingContractAddress = await saleContract.methods.lockingContract().call({from: saleOwner});
    lockingContract = await new web3.eth.Contract(lockingJson.abi, lockingContractAddress);

    // token ownership
    await tokenContract.methods.transferOwnership(saleContractAddress).send({from: tokenDeployer});
  });

  it('should be properly deployed', async () => {
    const actualCap = new BN(await tokenContract.methods.cap().call({from: tokenDeployer}));
    expect(tokenCap).to.be.eq.BN(actualCap);
    const actualTokenAddress = await saleContract.methods.token().call({from: saleOwner});
    expect(actualTokenAddress).to.be.equal(tokenContractAddress);
    const actualTokenOwner = await tokenContract.methods.owner().call({from: tokenDeployer});
    expect(actualTokenOwner).to.be.equal(saleContractAddress);
  });
});
