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

    event LockedContribution(address indexed investor, uint tokenAmount);
    event RejectedContribution(address indexed investor, uint tokenAmount);
    event ConfirmedContribution(address indexed investor, uint tokenAmount);
    event MintedAllocation(address indexed beneficiary, uint tokenAmount);

    // all minted and locked tokens
    modifier notExceedingTokenCap(uint tokensToAdd) {
        uint total = totalLockedTokens.add(totalConfirmedTokens).add(totalAllocatedTokens);
        require(total.add(tokensToAdd) <= token.cap());
        _;
    }

    // all tokens except allocated
    modifier notExceedingSaleCap(uint tokensToAdd) {
        uint saleTotal = totalLockedTokens.add(totalConfirmedTokens);
        require(saleTotal.add(tokensToAdd) <= saleTokenCap);
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
    function lockContribution(address investor, uint tokenAmount)
        external
        onlyWhitelistedReferral
        notExceedingTokenCap(tokenAmount)
        notExceedingSaleCap(tokenAmount)
    {
        totalLockedTokens = totalLockedTokens.add(tokenAmount);
        lockedTokens[investor] = lockedTokens[investor].add(tokenAmount);
        emit LockedContribution(investor, tokenAmount);
    }

    // unreserve tokens of pending investment
    function rejectContribution(address investor) external onlyWhitelistedReferral {
        totalLockedTokens = totalLockedTokens.sub(lockedTokens[investor]);
        emit RejectedContribution(investor, lockedTokens[investor]);
        lockedTokens[investor] = 0;
    }

    // mint reserved tokens of pending investment
    function confirmContribution(address investor) external onlyWhitelistedReferral {
        totalLockedTokens = totalLockedTokens.sub(lockedTokens[investor]);
        totalConfirmedTokens = totalConfirmedTokens.add(lockedTokens[investor]);
        token.mint(investor, lockedTokens[investor]);
        emit ConfirmedContribution(investor, lockedTokens[investor]);
        lockedTokens[investor] = 0;
    }

    // mint team & advisors allocation
    function mintAllocation(address beneficiary, uint tokenAmount) external onlyWhitelistedReferral notExceedingTokenCap(tokenAmount)
    {
        totalAllocatedTokens = totalAllocatedTokens.add(tokenAmount);
        token.mint(beneficiary, tokenAmount);
        emit MintedAllocation(beneficiary, tokenAmount);
    }

    // finish minting and give up token ownership
    function finishMinting(address newTokenOwner) external onlyWhitelistedReferral noOutstandingLockedTokens {
        token.finishMinting();
        token.transferOwnership(newTokenOwner);
    }
}