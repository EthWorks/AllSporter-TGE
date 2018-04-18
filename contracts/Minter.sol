pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "ethworks-solidity/contracts/Whitelist.sol";
import "ethworks-solidity/contracts/CrowdfundableToken.sol";

contract Minter is Whitelist {
    using SafeMath for uint;
    CrowdfundableToken public token;
    uint public confirmedEtherContributions;
    uint public reservedEtherContributions;
    uint constant public saleTokenCap = 156000000 * 1e18;
    uint public soldTokens; // tokens bought - both already minted and reserved
    uint public allocatedTokens; // tokens allocated
    mapping(address => uint) public reservedEther;
    mapping(address => uint) public reservedTokens;
    
    event ReservedContribution(address investor, uint etherAmount, uint tokenAmount);
    event UnreservedContribution(address investor, uint etherAmount, uint tokenAmount);
    event MintedReserved(address investor, uint etherAmount, uint tokenAmount);
    event MintedAllocation(address beneficiary, uint tokenAmount);
    event FinishedMinting();

    // tokens bought by investors (confirmed or not) plus tokens allocated should not exceed token cap
    modifier notExceedingTokenCap(uint tokensToAdd) {
        require(soldTokens.add(allocatedTokens).add(tokensToAdd) <= token.cap());
        _;
    }

    // tokens bought by investors (confirmed and not) should not exceed sale cap
    modifier notExceedingSaleCap(uint tokensToAdd) {
        require(soldTokens.add(tokensToAdd) <= saleTokenCap);
        _;
    }

    function Minter(CrowdfundableToken _token) public {
        require(address(_token) != 0x0);
        token = _token;
    }

    // external

    // reserve tokens for a pending investment
    function reserveContribution(address investor, uint etherAmount, uint tokenAmount)
        external
        onlyWhitelisted
        notExceedingTokenCap(tokenAmount)
        notExceedingSaleCap(tokenAmount)
    {
        reservedEtherContributions = reservedEtherContributions.add(etherAmount);
        soldTokens = soldTokens.add(tokenAmount);
        reservedEther[investor] = reservedEther[investor].add(etherAmount);
        reservedTokens[investor] = reservedTokens[investor].add(tokenAmount);
        
        emit ReservedContribution(investor, etherAmount, tokenAmount);
    }

    // unreserve tokens of pending investment
    function unreserveContribution(address investor) external onlyWhitelisted {
        reservedEtherContributions = reservedEtherContributions.sub(reservedEther[investor]);
        soldTokens = soldTokens.sub(reservedTokens[investor]);

        emit UnreservedContribution(investor, reservedEther[investor], reservedTokens[investor]);
        clearReserved(investor);
    }

    // mint reserved tokens of pending investment
    function mintReserved(address investor) external onlyWhitelisted {
        reservedEtherContributions = reservedEtherContributions.sub(reservedEther[investor]);
        confirmedEtherContributions = confirmedEtherContributions.add(reservedEther[investor]);
        token.mint(investor, reservedTokens[investor]);

        emit MintedReserved(investor, reservedEther[investor], reservedTokens[investor]);
        clearReserved(investor);
    }

    // mint team & advisors allocation
    function mintAllocation(address beneficiary, uint tokenAmount) external onlyWhitelisted notExceedingTokenCap(tokenAmount)
    {
        allocatedTokens = allocatedTokens.add(tokenAmount);
        token.mint(beneficiary, tokenAmount);

        emit MintedAllocation(beneficiary, tokenAmount);
    }

    // finish minting and give up token ownership
    function finishMinting(address newTokenOwner) external onlyWhitelisted {
        require(reservedEtherContributions == 0);

        token.finishMinting();
        token.transferOwnership(newTokenOwner);

        emit FinishedMinting();
    }

    // internal

    function clearReserved(address investor) internal {
        reservedEther[investor] = 0;
        reservedTokens[investor] = 0;
    }
}