pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "ethworks-solidity/contracts/Whitelist.sol";
import "ethworks-solidity/contracts/CrowdfundableToken.sol";

contract Minter is Whitelist {
    using SafeMath for uint;
    CrowdfundableToken public token;
    uint public saleTokenCap;
    uint public totalLockedTokens;
    uint public totalConfirmedTokens;
    uint public totalAllocatedTokens;
    mapping(address => uint) public lockedTokens;

    event LockedContribution(address indexed account, uint tokenAmount);
    event RejectedContribution(address indexed account, uint tokenAmount);
    event ConfirmedContribution(address indexed account, uint tokenAmount);
    event MintedAllocation(address indexed account, uint tokenAmount);

    // all tokens except allocated
    modifier notExceedingSaleCap(uint tokensToAdd) {
        uint saleTotal = totalLockedTokens.add(totalConfirmedTokens);
        require(saleTotal.add(tokensToAdd) <= saleTokenCap);
        _;
    }

    modifier notExceedingAllocationCap(uint tokensToAdd) {
        uint allocationCap = token.cap().sub(saleTokenCap);
        require(totalAllocatedTokens.add(tokensToAdd) <= allocationCap);
        _;
    }

    modifier noOutstandingLockedTokens() {
        require(totalLockedTokens == 0);
        _;
    }

    function Minter(CrowdfundableToken _token, uint _saleTokenCap) public {
        require(address(_token) != 0x0);
        require(_saleTokenCap > 0);
        token = _token;
        saleTokenCap = _saleTokenCap;
    }

    // external

    // reserve tokens for a pending investment
    function lockContribution(address account, uint tokenAmount)
        external
        onlyWhitelisted
        notExceedingSaleCap(tokenAmount)
    {
        totalLockedTokens = totalLockedTokens.add(tokenAmount);
        lockedTokens[account] = lockedTokens[account].add(tokenAmount);
        emit LockedContribution(account, tokenAmount);
    }

    // unreserve tokens of pending investment
    function rejectContribution(address account) external onlyWhitelisted {
        totalLockedTokens = totalLockedTokens.sub(lockedTokens[account]);
        emit RejectedContribution(account, lockedTokens[account]);
        lockedTokens[account] = 0;
    }

    // mint reserved tokens of pending investment
    function confirmContribution(address account) external onlyWhitelisted {
        totalLockedTokens = totalLockedTokens.sub(lockedTokens[account]);
        totalConfirmedTokens = totalConfirmedTokens.add(lockedTokens[account]);
        token.mint(account, lockedTokens[account]);
        emit ConfirmedContribution(account, lockedTokens[account]);
        lockedTokens[account] = 0;
    }

    // mint team & advisors allocation
    function mintAllocation(address account, uint tokenAmount) external onlyWhitelisted notExceedingAllocationCap(tokenAmount)
    {
        totalAllocatedTokens = totalAllocatedTokens.add(tokenAmount);
        token.mint(account, tokenAmount);
        emit MintedAllocation(account, tokenAmount);
    }

    // finish minting and give up token ownership
    function finishMinting(address newTokenOwner) external onlyWhitelisted noOutstandingLockedTokens {
        token.finishMinting();
        token.transferOwnership(newTokenOwner);
    }
}