pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "ethworks-solidity/contracts/Whitelist.sol";
import "ethworks-solidity/contracts/CrowdfundableToken.sol";
import "./IPricing.sol";

contract Minter is Ownable {
    using SafeMath for uint;

    CrowdfundableToken public token;
    IPricing public pricing;
    uint public saleEtherCap;
    uint public confirmedEther;
    uint public reservedEther;

    modifier belowSaleEtherCap(uint additionalEtherAmount) {
        uint totalEtherAmount = confirmedEther.add(reservedEther).add(additionalEtherAmount);
        require(totalEtherAmount < saleEtherCap);
        _;
    }

    modifier canMint(uint additionalEtherAmount) {
        require(address(pricing) != 0x0);
        uint totalEtherAmount = confirmedEther.add(reservedEther).add(additionalEtherAmount);
        require(pricing.canMint(msg.sender, totalEtherAmount));
        _;
    }

    modifier aboveMinimumAmount(uint etherAmount) {
        require(etherAmount >= pricing.getMinimumContribution());
        _;
    }

    function Minter(CrowdfundableToken _token, uint _saleEtherCap) public {
        require(address(_token) != 0x0);
        require(_saleEtherCap > 0);

        token = _token;
        saleEtherCap = _saleEtherCap;
    }

    function setPricing(IPricing _pricing) external onlyOwner {
        pricing = _pricing;
    }

    function reserve(uint etherAmount) external belowSaleEtherCap(etherAmount) aboveMinimumAmount(etherAmount) canMint(etherAmount) {
        reservedEther = reservedEther.add(etherAmount);
    }

    function mintReserved(address account, uint etherAmount, uint tokenAmount) external canMint(0) {
        reservedEther = reservedEther.sub(etherAmount);
        confirmedEther = confirmedEther.add(etherAmount);
        token.mint(account, tokenAmount);
    }

    function unreserve(uint etherAmount) public canMint(0) {
        reservedEther = reservedEther.sub(etherAmount);
    }

    function mint(address account, uint etherAmount, uint tokenAmount) public canMint(etherAmount) {
        confirmedEther = confirmedEther.add(etherAmount);
        token.mint(account, tokenAmount);
    }
}