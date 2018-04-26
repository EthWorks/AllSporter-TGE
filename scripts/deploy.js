import {deployContract, createContract, latestTime, durationInit} from 'ethworks-solidity';
import allSporterCoinJson from '../build/contracts/AllSporterCoin.json';
import minterJson from '../build/contracts/Minter.json';
import stateManagerJson from '../build/contracts/StateManager.json';
import crowdsaleJson from '../build/contracts/Crowdsale.json';
import kycJson from '../build/contracts/Kyc.json';
import whitelistJson from '../build/contracts/Whitelist.json';
import lockingJson from '../build/contracts/LockingContract.json';
const Web3 = require('Web3');
const web3 = new Web3(new Web3.providers.HttpProvider(`http://localhost:8545`));
const {BN} = web3.utils;
const duration = durationInit(web3);

const deploying = (what) => console.log(`Deploying ${what}... (check parity wallet / metamask)`);
const deployed = (what, contract) => console.log(`Deployed ${what} at address: ${contract.options.address}`);

(async() => {
  const singleStateEtherCap = new BN(web3.utils.toWei('10000'));
  const saleTokenCap = new BN(web3.utils.toWei('156000000'));
  const accounts = await web3.eth.getAccounts();
  const [deployer] = accounts;

  // token
  deploying('token');
  const tokenContract = await deployContract(web3, allSporterCoinJson, deployer, []);
  deployed('token', tokenContract);
  process.exit();

  // minter
  const minterContract = await deployContract(web3, minterJson, deployer, [
    tokenContract.options.address,
    saleTokenCap
  ]);
  await tokenContract.methods.transferOwnership(minterContract.options.address).send({from: deployer});

  // state manager
  const saleStartTime = (new BN(await latestTime(web3))).add(duration.days(7));
  const stateContract = await deployContract(web3, stateManagerJson, deployer, [
    saleStartTime,
    singleStateEtherCap
  ]);
  await minterContract.methods.add(stateContract.options.address).send({from: deployer});

  // kyc
  const kycContract = await deployContract(web3, kycJson, deployer, [minterContract.options.address]);
  await minterContract.methods.add(kycContract.options.address).send({from: deployer});

  // referralWhitelist
  const referralWhitelistContract = await deployContract(web3, whitelistJson, deployer, []);
  await referralWhitelistContract.methods.add(deployer).send({from: deployer});

  // crowdsale
  const unlockTime = (new BN(await latestTime(web3))).add(duration.years(6));
  const crowdsaleContract = await deployContract(web3, crowdsaleJson, deployer, [
    minterContract.options.address,
    stateContract.options.address,
    kycContract.options.address,
    unlockTime,
    deployer,
    referralWhitelistContract.options.address
  ]);
  // const lockingContract = createContract(web3, lockingJson, await crowdsaleContract.methods.lockingContract().call());

  // setting whitelist referrals for the minter
  await minterContract.methods.add(kycContract.options.address).send({from: deployer});
  await minterContract.methods.add(crowdsaleContract.options.address).send({from: deployer});

  // kyc whitelist referrals
  await kycContract.methods.add(crowdsaleContract.options.address).send({from: deployer});
  await kycContract.methods.add(deployer).send({from: deployer});

  // state manager ownership
  await stateContract.methods.transferOwnership(crowdsaleContract.options.address).send({from: deployer});
})();
