import {createWeb3, deployContract} from 'ethworks-solidity';
import treasurySplitterJson from '../../build/contracts/TreasurySplitter.json';
import Web3 from 'web3';
import chai from 'chai';
import bnChai from 'bn-chai';

const {expect} = chai;
const web3 = createWeb3(Web3);
const {BN} = web3.utils;
chai.use(bnChai(BN));

describe('Treasury Splitter', () => {
  let accounts;
  let splitterOwner;
  let splitterContract;
  let mainTreasury;
  let subTreasury1;
  let subTreasury2;
  const percentage1 = 20;
  const percentage2 = 30;

  before(async () => {
    accounts = await web3.eth.getAccounts();
    [splitterOwner, splitterContract, mainTreasury, subTreasury1, subTreasury2] = accounts;
  });

  beforeEach(async () => {
    splitterContract = await deployContract(web3, treasurySplitterJson, splitterOwner, [
      mainTreasury,
      [subTreasury1, subTreasury2],
      [percentage1, percentage2]
    ]);
  });

  it('should be properly created', async () => {
    expect(await splitterContract.methods.mainTreasury().call()).to.eq.BN(mainTreasury);
  });
});
