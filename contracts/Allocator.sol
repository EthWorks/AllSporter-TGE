pragma solidity ^0.4.24;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/token/ERC20/TokenVesting.sol";
import "ethworks-solidity/contracts/Whitelist.sol";
import "ethworks-solidity/contracts/CrowdfundableToken.sol";
import "./Tge.sol";
import "./Minter.sol";
import "./DeferredKyc.sol";
import "./SingleLockingContract.sol";

contract Allocator is Ownable {
    using SafeMath for uint;

    /* --- CONSTANTS --- */

    uint constant public ETHER_AMOUNT = 0;

    // percentages
    uint constant public COMMUNITY_PERCENTAGE = 5;
    uint constant public ADVISORS_PERCENTAGE = 8;
    uint constant public CUSTOMER_PERCENTAGE = 15;
    uint constant public TEAM_PERCENTAGE = 17;
    uint constant public SALE_PERCENTAGE = 55;
    
    // locking
    uint constant public LOCKING_UNLOCK_TIME = 15907104000;

    // vesting
    uint constant public VESTING_START_TIME = 1590710400;
    uint constant public VESTING_CLIFF_DURATION = 10000;
    uint constant public VESTING_PERIOD = 50000;
    
    /* --- EVENTS --- */

    event Initialized();
    event AllocatedCommunity(address indexed account, uint tokenAmount);
    event AllocatedAdvisors(address indexed account, uint tokenAmount);
    event AllocatedCustomer(address indexed account, uint tokenAmount);
    event AllocatedTeam(address indexed account, uint tokenAmount);
    event LockedTokensReleased(address indexed account);
    event VestedTokensReleased(address indexed account);

    /* --- FIELDS --- */

    Minter public minter;
    bool public isInitialized = false;
    mapping(address => TokenVesting) public vestingContracts; // one customer => one TokenVesting contract
    mapping(address => SingleLockingContract) public lockingContracts; // one team => one SingleLockingContract

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

    constructor(Minter _minter) public onlyValidAddress(_minter) {
        minter = _minter;
    }

    /* --- PUBLIC / EXTERNAL METHODS --- */

    function releaseVested(address account) external initialized {
        require(msg.sender == account || msg.sender == owner);
        TokenVesting vesting = vestingContracts[account];
        vesting.release(minter.token());
        emit VestedTokensReleased(account);
    }

    function releaseLocked(address account) external initialized {
        require(msg.sender == account || msg.sender == owner);
        SingleLockingContract locking = lockingContracts[account];
        locking.releaseTokens();
        emit LockedTokensReleased(account);
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
        if (address(lockingContracts[account]) == 0x0) {
            lockingContracts[account] = new SingleLockingContract(minter.token(), LOCKING_UNLOCK_TIME, account);
        }
        minter.mint(lockingContracts[account], ETHER_AMOUNT, tokenAmount);
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
