import Web3 from 'web3';
import chai from 'chai';
const {assert} = chai;

export const defaultGas = 6000000;

export function createWeb3() {
  const web3 = new Web3();
  const Ganache = require('ganache-core');
  const ganacheOptions = {
    accounts: (new Array(15)).fill({balance: web3.utils.toWei('90000000')})
  };
  web3.setProvider(Ganache.provider(ganacheOptions));
  return web3;
}

export async function deployContract(web3, contractJson, ownerAccount, constructorArguments) {
  const contract = await new web3.eth.Contract(contractJson.abi)
    .deploy({data: contractJson.bytecode, arguments: constructorArguments})
    .send({from: ownerAccount, gas: defaultGas});
  contract.setProvider(web3.currentProvider);
  contract.options.gas = defaultGas;
  return contract;
}

export async function estimateGas(web3, contractJson, ownerAccount, constructorArguments) {
  return await new web3.eth.Contract(contractJson.abi)
    .deploy({data: contractJson.bytecode, arguments: constructorArguments})
    .estimateGas({from: ownerAccount, gas: defaultGas});
}

export async function createContract(web3, contractJson, address) {
  const contract = await new web3.eth.Contract(contractJson.abi, address);
  contract.setProvider(web3.currentProvider);
  return contract;
}

export async function expectThrow(promise) {
  try {
    await promise;
  } catch (error) {
    const invalidOpcode = error.message.search('invalid opcode') >= 0;
    const outOfGas = error.message.search('out of gas') >= 0;
    const revert = error.message.search('revert') >= 0;
    assert(
      invalidOpcode || outOfGas || revert,
      `Expected throw, got '${error}' instead`,
    );
    return;
  }
  assert(false, 'Expected throw not received');
}

export async function latestTime(web3) {
  return (await web3.eth.getBlock('latest')).timestamp;
}

export async function increaseTime (web3, duration) {
  const id = Date.now();

  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [duration],
      id
    }, (err1) => {
      if (err1) {
        return reject(err1);
      }
      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: id + 1
      }, (err2, res) => err2 ? reject(err2) : resolve(res));
    });
  });
}

export async function increaseTimeTo (web3, target) {
  const now = await latestTime(web3);
  if (target < now) {
    throw Error(`Cannot increase current time(${now}) to a moment in the past(${target})`);
  }
  const diff = target - now;
  return await increaseTime(web3, diff);
}

export const durationInit = function(web3) {
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
