pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/token/ERC20/TokenVesting.sol";
import "ethworks-solidity/contracts/LockingContract.sol";
import "ethworks-solidity/contracts/Whitelist.sol";
import "ethworks-solidity/contracts/CrowdfundableToken.sol";
import "./Tge.sol";
import "./Minter.sol";
import "./DeferredKyc.sol";
import "./Minter.sol";

contract Allocator is Ownable {
    using SafeMath for uint;

    /* --- CONSTANTS --- */

    uint public ETHER_AMOUNT = 0;

    // percentages
    uint public COMMUNITY_PERCENTAGE = 5;
    uint public ADVISORS_PERCENTAGE = 8;
    uint public CUSTOMER_PERCENTAGE = 15;
    uint public TEAM_PERCENTAGE = 17;
    uint public SALE_PERCENTAGE = 55;
    
    // locking
    uint public LOCKING_UNLOCK_TIME = 1590710400;

    // vesting
    uint public VESTING_START_TIME = 1590710400;
    uint public VESTING_CLIFF_DURATION = 10000;
    uint public VESTING_PERIOD = 50000;
    
    /* --- EVENTS --- */

    event Initialized();
    event AllocatedCommunity(address account, uint tokenAmount);
    event AllocatedAdvisors(address account, uint tokenAmount);
    event AllocatedCustomer(address account, uint tokenAmount);
    event AllocatedTeam(address account, uint tokenAmount);

    /* --- FIELDS --- */

    Minter public minter;
    LockingContract public lockingContract;
    bool public isInitialized = false;
    mapping(address => TokenVesting) public vestingContracts; // one customer => one TokenVesting contract

    // pools
    uint public communityPool;
    uint public advisorsPool;
    uint public customerPool;
    uint public teamPool;
    

    /* --- MODIFIERS --- */

    modifier initialized() {
        if (!isInitialized) {
            initialize();
        }
        _;
    }

    modifier validPercentage(uint percent) {
        require(percent >= 0 && percent <= 100);
        _;
    }

    modifier onlyValidAddress(address account) {
        require(account != 0x0);
        _;
    }

    /* --- CONSTRUCTOR --- */

    function Allocator(Minter _minter) public onlyValidAddress(_minter) {

        minter = _minter;
        lockingContract = new LockingContract(_minter.token(), LOCKING_UNLOCK_TIME);
    }

    /* --- PUBLIC / EXTERNAL METHODS --- */

    function releaseVested(address account) external initialized {
        TokenVesting vesting = vestingContracts[account];
        vesting.release(minter.token());
    }

    function releaseLocked(address account) external initialized {
        lockingContract.releaseTokens(account);
    }

    function allocateCommunity(address account, uint tokenAmount) external initialized onlyOwner {
        communityPool = communityPool.sub(tokenAmount);
        minter.mint(account, ETHER_AMOUNT, tokenAmount);
        emit AllocatedCommunity(account, tokenAmount);
    }

    function allocateAdvisors(address account, uint tokenAmount) external initialized onlyOwner {
        advisorsPool = advisorsPool.sub(tokenAmount);
        minter.mint(account, ETHER_AMOUNT, tokenAmount);
        emit AllocatedAdvisors(account, tokenAmount);
    }

    // vesting
    function allocateCustomer(address account, uint tokenAmount) external initialized onlyOwner {
        customerPool = customerPool.sub(tokenAmount);
        if (address(vestingContracts[account]) == 0x0) {
            vestingContracts[account] = new TokenVesting(account, VESTING_START_TIME, VESTING_CLIFF_DURATION, VESTING_PERIOD, false);
        }
        minter.mint(address(vestingContracts[account]), ETHER_AMOUNT, tokenAmount);
        emit AllocatedCustomer(account, tokenAmount);
    }

    // locking
    function allocateTeam(address account, uint tokenAmount) external initialized onlyOwner {
        teamPool = teamPool.sub(tokenAmount);
        minter.mint(lockingContract, ETHER_AMOUNT, tokenAmount);
        lockingContract.noteTokens(account, tokenAmount);
        emit AllocatedTeam(account, tokenAmount);
    }

    /* --- INTERNAL METHODS --- */

    function initialize() internal {
        isInitialized = true;
        CrowdfundableToken token = minter.token();
        uint tokensSold = token.totalSupply();
        uint tokensPerPercent = tokensSold.div(SALE_PERCENTAGE);

        communityPool = COMMUNITY_PERCENTAGE.mul(tokensPerPercent);
        advisorsPool = ADVISORS_PERCENTAGE.mul(tokensPerPercent);
        customerPool = CUSTOMER_PERCENTAGE.mul(tokensPerPercent);
        teamPool = TEAM_PERCENTAGE.mul(tokensPerPercent);

        emit Initialized();
    }
}
