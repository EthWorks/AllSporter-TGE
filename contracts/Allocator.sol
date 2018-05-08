pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "ethworks-solidity/contracts/LockingContract.sol";
import "ethworks-solidity/contracts/Whitelist.sol";
import "ethworks-solidity/contracts/CrowdfundableToken.sol";
import "./Tge.sol";
import "./Minter.sol";
import "./DeferredKyc.sol";
import "./Minter.sol";

contract Allocator is Ownable {
    using SafeMath for uint;

    uint public SALE_PERCENTAGE = 60;
    uint public TEAM_DEVELOPERS_PERCENTAGE = 17;
    uint public CUSTOMER_REWARDS_PERCENTAGE = 15;
    uint public ADVISORS_BOUNTY_PERCENTAGE = 8;
    uint public TEAM_DEVELOPERS_UNLOCK_TIME = 1590710400;
    uint public CUSTOMER_REWARDS_UNLOCK_TIME = 1546300800;
    uint public ETHER_AMOUNT = 0;

    Minter public minter;
    LockingContract public teamDevelopersLocking;
    LockingContract public customerRewardsLocking;
    uint public teamDevelopersTokenPool;
    uint public customerRewardsTokenPool;
    uint public advisorsBountyTokenPool;
    uint public tokensPerPercent;
    bool public isInitialized = false;

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

    function Allocator(Minter _minter) public {
        require(address(_minter) != 0x0);
        minter = _minter;
        teamDevelopersLocking = new LockingContract(_minter.token(), TEAM_DEVELOPERS_UNLOCK_TIME);
        customerRewardsLocking = new LockingContract(_minter.token(), CUSTOMER_REWARDS_UNLOCK_TIME);
    }
    
    function allocateTeamDevelopers(address account, uint tokenAmount) external initialized onlyOwner {
        minter.mint(teamDevelopersLocking, ETHER_AMOUNT, tokenAmount);
        teamDevelopersLocking.noteTokens(account, tokenAmount);
        teamDevelopersTokenPool.sub(tokenAmount);
    }

    function allocateCustomerRewards(address account, uint tokenAmount) external initialized onlyOwner {
        minter.mint(customerRewardsLocking, ETHER_AMOUNT, tokenAmount);
        customerRewardsLocking.noteTokens(account, tokenAmount);
        customerRewardsTokenPool.sub(tokenAmount);
    }

    function allocateAdvisorsBounty(address account, uint tokenAmount) external initialized onlyOwner {
        minter.mint(account, ETHER_AMOUNT, tokenAmount);
        advisorsBountyTokenPool.sub(tokenAmount);
    }

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
