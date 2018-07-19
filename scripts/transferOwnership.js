/* eslint-disable import/first */
import Web3 from 'web3';
import allSporterCoinJson from '../build/contracts/AllSporterCoin.json';
import tgeJson from '../build/contracts/Tge.json';
import crowdsaleJson from '../build/contracts/Crowdsale.json';
import deferredKycJson from '../build/contracts/DeferredKyc.json';
import referralManagerJson from '../build/contracts/ReferralManager.json';
import allocatorJson from '../build/contracts/Allocator.json';
import airdropperJson from '../build/contracts/Airdropper.json';

const contractAddresses = {
  Owner: '',
  AllSporterCoinContractAddress: '',
  TgeContractAddress: '',
  CrowdsaleContractAddress: '',
  KycContractAddress: '',
  ReferralManagerContractAddress: '',
  AllocatorContractAddress: '',
  AirdropperContractAddress: ''
};
const newOwner = '';


const createWeb3 = (Web3, numberOfAccounts = 10) => {
  const web3 = new Web3();
  const Ganache = require('ganache-core');
  const ganacheOptions = {
    accounts: (new Array(numberOfAccounts)).fill({balance: web3.utils.toWei('90000000')})
  };
  web3.setProvider(Ganache.provider(ganacheOptions));
  return web3;
};

let web3;
let account;
let from;
let usingInfura = false;

const sendTransaction = async (method, name, to, value = 0) => {
  console.log(`Sending transaction: ${name}...`);
  if (!usingInfura) {
    return await method.send({from, gas: 6000000});
  }

  const tx = {
    from,
    to,
    gas: 3000000,
    gasPrice: 600000000,
    data: method.encodeABI(),
    value
  };
  const signedTx = await account.signTransaction(tx);
  return await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
};

(async () => {
  if (process.env.PRIVATE_KEY) {
    usingInfura = true;
    web3 = new Web3(new Web3.providers.HttpProvider('https://kovan.infura.io/8Mj2LsONZFcI5LKNbRiF'));
    account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
    from = account.address;
    console.log(`Using infura with account: ${from}`);
  } else {
    web3 = createWeb3(Web3);
    [from] = await web3.eth.getAccounts();
    console.log('Using ganache');
  }

  // const allSporterCoinContract = await new web3.eth.Contract(allSporterCoinJson.abi, contractAddresses.allSporterCoinContractAddress);
  const tgeContract = await new web3.eth.Contract(tgeJson.abi, contractAddresses.TgeContractAddress);
  const crowdsaleContract = await new web3.eth.Contract(crowdsaleJson.abi, contractAddresses.CrowdsaleContractAddress);
  const kycContract = await new web3.eth.Contract(deferredKycJson.abi, contractAddresses.KycContractAddress);
  const referralManagerContract = await new web3.eth.Contract(referralManagerJson.abi, contractAddresses.ReferralManagerContractAddress);
  const allocatorContract = await new web3.eth.Contract(allocatorJson.abi, contractAddresses.AllocatorContractAddress);
  const airdropperContract = await new web3.eth.Contract(airdropperJson.abi, contractAddresses.AirdropperContractAddress);

  await sendTransaction(tgeContract.methods.transferOwnership(newOwner), 'transfer ownership: tgeContract', tgeContract.options.address);
  await sendTransaction(crowdsaleContract.methods.transferOwnership(newOwner), 'transfer ownership: crowdsaleContract', crowdsaleContract.options.address);
  await sendTransaction(kycContract.methods.transferApprover(newOwner), 'transfer approver: kycContract', kycContract.options.address);
  await sendTransaction(referralManagerContract.methods.transferOwnership(newOwner), 'transfer ownership: referralManagerContract', referralManagerContract.options.address);
  await sendTransaction(allocatorContract.methods.transferOwnership(newOwner), 'transfer ownership: allocatorContract', allocatorContract.options.address);
  await sendTransaction(airdropperContract.methods.transferOwnership(newOwner), 'transfer ownership: airdropperContract', airdropperContract.options.address);
  console.log('Done.');
})().catch(console.error);
/* eslint-enable import/first */
