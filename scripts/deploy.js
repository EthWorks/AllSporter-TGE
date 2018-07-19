/* eslint-disable import/first */
import Web3 from 'web3';
import allSporterCoinJson from '../build/contracts/AllSporterCoin.json';
import tgeJson from '../build/contracts/Tge.json';
import crowdsaleJson from '../build/contracts/Crowdsale.json';
import deferredKycJson from '../build/contracts/DeferredKyc.json';
import referralManagerJson from '../build/contracts/ReferralManager.json';
import allocatorJson from '../build/contracts/Allocator.json';
import airdropperJson from '../build/contracts/Airdropper.json';

const durationInit = function(web3) {
  return {
    seconds (val) {
      return (new web3.utils.BN(val)); 
    },
    minutes (val) {
      return (new web3.utils.BN(val)).mul(this.seconds(60)); 
    },
    hours (val) {
      return (new web3.utils.BN(val)).mul(this.minutes(60)); 
    },
    days (val) {
      return (new web3.utils.BN(val)).mul(this.hours(24)); 
    },
    weeks (val) {
      return (new web3.utils.BN(val)).mul(this.days(7)); 
    },
    years (val) {
      return (new web3.utils.BN(val)).mul(this.days(365)); 
    }
  };
};

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

const deployContract = async (json, constructorArguments, name) => {
  console.log(`Deploying ${name}...`);
  const deployMethod = await new web3.eth.Contract(json.abi)
    .deploy({data: json.bytecode, arguments: constructorArguments});

  if (!usingInfura) {
    const contract = await deployMethod.send({from, gas: 6000000});
    console.log(`Deployed ${name} at ${contract.options.address}`);
    return contract;
  }

  const tx = {
    from,
    gas: 5000000,
    gasPrice: 600000000,
    data: deployMethod.encodeABI()
  };
  const signedTx = await account.signTransaction(tx);
  const {contractAddress} = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
  console.log(`Deployed ${name} at ${contractAddress}`);
  return await new web3.eth.Contract(json.abi, contractAddress);
};

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
  if (process.env.GANACHE_PORT) {
    console.log(`Connecting to ganache server on port ${process.env.GANACHE_PORT}`);
    web3 = new Web3(new Web3.providers.HttpProvider(`http://localhost:${process.env.GANACHE_PORT}`));
    [from] = await web3.eth.getAccounts();
  } else if (process.env.PRIVATE_KEY) {
    usingInfura = true;
    web3 = new Web3(new Web3.providers.HttpProvider('https://kovan.infura.io/8Mj2LsONZFcI5LKNbRiF'));
    account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
    from = account.address;
    console.log(`Using infura with account: ${from}`);
  } else {
    console.log('Using ganache core');
    web3 = createWeb3(Web3);
    [from] = await web3.eth.getAccounts();
    console.log('Using ganache');
  }
  const duration = durationInit(web3);

  const allSporterCoinContract = await deployContract(allSporterCoinJson, [], 'AllSporterCoin');

  const tgeArguments = [
    allSporterCoinContract.options.address,
    web3.utils.toWei('100000') // total ether cap
    
  ];
  const tgeContract = await deployContract(tgeJson, tgeArguments, 'Tge');

  await sendTransaction(allSporterCoinContract.methods.transferOwnership(tgeContract.options.address), 'transferOwnership', allSporterCoinContract.options.address);

  const crowdsaleArguments = [
    tgeContract.options.address,
    from,
    from
  ];
  const crowdsaleContract = await deployContract(crowdsaleJson, crowdsaleArguments, 'Crowdsale');
  
  const kycAddress = await crowdsaleContract.methods.deferredKyc().call();
  const kycContract = new web3.eth.Contract(deferredKycJson.abi, kycAddress);
  console.log(`Kyc is at ${kycContract.options.address}`);

  const referralManagerContract = await deployContract(referralManagerJson, [tgeContract.options.address], 'Referral Manager');
  const allocatorContract = await deployContract(allocatorJson, [tgeContract.options.address], 'Allocator');
  const airdropperContract = await deployContract(airdropperJson, [tgeContract.options.address], 'Airdropper');

  const stateLengths = [
    duration.days(5),
    duration.days(5),
    duration.days(3),
    duration.days(5),
    duration.days(5),
    duration.days(5),
    duration.days(5),
    duration.days(5),
    duration.days(5)
  ];

  const setupMethod = tgeContract.methods.setup(
    crowdsaleContract.options.address,
    kycContract.options.address,
    referralManagerContract.options.address,
    allocatorContract.options.address,
    airdropperContract.options.address,
    1577840461, // sale start time 
    web3.utils.toWei('1000'), // single state ether cap
    stateLengths
  );
  await sendTransaction(setupMethod, 'setup', tgeContract.options.address);

  console.log(`
export const constants = {  
  Owner: '${from}',
  AllSporterCoinContractAddress: '${allSporterCoinContract.options.address}',
  TgeContractAddress: '${tgeContract.options.address}',
  CrowdsaleContractAddress: '${crowdsaleContract.options.address}',
  KycContractAddress: '${kycContract.options.address}',
  ReferralManagerContractAddress: '${referralManagerContract.options.address}',
  AllocatorContractAddress: '${allocatorContract.options.address}',
  AirdropperContractAddress: '${airdropperContract.options.address}'
};
  `);
})().catch(console.error);
/* eslint-enable import/first */
