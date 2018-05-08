pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";

contract IPricing {
    using SafeMath for uint;

    function getTokensForEther(uint etherAmount) public view returns(uint);

    function canMint(address account, uint totalEtherAmount) public returns(bool);

    function getMinimumContribution() public view returns(uint);
}
