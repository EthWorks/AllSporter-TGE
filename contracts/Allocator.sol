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

    uint public SALE_PERCENTAGE = 60;
    uint public TEAM_DEVELOPERS_PERCENTAGE = 17;
    uint public CUSTOMER_REWARDS_PERCENTAGE = 15;
    uint public ADVISORS_BOUNTY_PERCENTAGE = 8;
    uint public TEAM_DEVELOPERS_UNLOCK_TIME = 1590710400;
    uint public CUSTOMER_REWARDS_CLIFF_TIME = 10000;
    uint public CUSTOMER_REWARDS_VESTING_PERIOD = 50000;
    uint public CUSTOMER_REWARDS_VESTING_START_TIME = 1590710400;
    uint public ETHER_AMOUNT = 0;

    /* --- EVENTS --- */

    /* --- FIELDS --- */

    Minter public minter;
    LockingContract public teamDevelopersLocking;
    uint public teamDevelopersTokenPool;
    uint public customerRewardsTokenPool;
    uint public advisorsBountyTokenPool;
    uint public tokensPerPercent;
    bool public isInitialized = false;
    mapping(address => TokenVesting) customerRewardsVestingContracts; // one customer => one TokenVesting contract

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

    /* --- CONSTRUCTOR --- */

    function Allocator(Minter _minter) public {
        require(address(_minter) != 0x0);
        minter = _minter;
        teamDevelopersLocking = new LockingContract(_minter.token(), TEAM_DEVELOPERS_UNLOCK_TIME);
    }

    /* --- PUBLIC / EXTERNAL METHODS --- */
    
    function allocateTeamDevelopers(address account, uint tokenAmount) external initialized onlyOwner {
        minter.mint(teamDevelopersLocking, ETHER_AMOUNT, tokenAmount);
        teamDevelopersLocking.noteTokens(account, tokenAmount);
        teamDevelopersTokenPool.sub(tokenAmount);
    }

    function allocateCustomerRewards(address account, uint tokenAmount) external initialized onlyOwner {
        if (address(customerRewardsVestingContracts[account]) == 0x0) {
            customerRewardsVestingContracts[account] = new TokenVesting(account, CUSTOMER_REWARDS_VESTING_START_TIME, CUSTOMER_REWARDS_CLIFF_TIME, CUSTOMER_REWARDS_VESTING_PERIOD, false);
        }
        minter.mint(address(customerRewardsVestingContracts[account]), ETHER_AMOUNT, tokenAmount);
        customerRewardsTokenPool.sub(tokenAmount);
    }

    function allocateAdvisorsBounty(address account, uint tokenAmount) external initialized onlyOwner {
        minter.mint(account, ETHER_AMOUNT, tokenAmount);
        advisorsBountyTokenPool.sub(tokenAmount);
    }

    function releaseVesting(address account) public initialized {
        TokenVesting vesting = customerRewardsVestingContracts[account];
        vesting.release(minter.token());
    }

    /* --- INTERNAL METHODS --- */

    function initialize() internal {
        isInitialized = true;
        CrowdfundableToken token = CrowdfundableToken(minter.token());
        uint tokensSold = token.totalSupply();
        tokensPerPercent = tokensSold.div(SALE_PERCENTAGE);

        teamDevelopersTokenPool = TEAM_DEVELOPERS_PERCENTAGE.mul(tokensPerPercent);
        customerRewardsTokenPool = CUSTOMER_REWARDS_PERCENTAGE.mul(tokensPerPercent);
        advisorsBountyTokenPool = ADVISORS_BOUNTY_PERCENTAGE.mul(tokensPerPercent);
    }
}
