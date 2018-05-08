pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "./IPricing.sol";

contract PricingMock is IPricing {
    using SafeMath for uint;
    address public firstStateMinter;
    address public secondStateMinter;
    uint public firstStateMultiplier = 2;
    uint public secondStateMultiplier = 3;
    bool public secondState = false;
    uint public secondStateAfter = 10 * 1e18;
    mapping(address => bool) public allStateMinters;

    function PricingMock(address _firstStateMinter, address _secondStateMinter) public {
        firstStateMinter = _firstStateMinter;
        secondStateMinter = _secondStateMinter;
    }

    function addAllStateMinter(address account) public {
        allStateMinters[account] = true;
    }

    function getTokensForEther(uint etherAmount) public view returns(uint) {
        if (secondState) {
            return etherAmount.mul(secondStateMultiplier);
        }
        return etherAmount.mul(firstStateMultiplier);
    }

    function updateState(uint totalEtherAmount) internal {
        if (totalEtherAmount >= secondStateAfter) {
            secondState = true;
        }
    }

    function canMint(address account, uint totalEtherAmount) public returns(bool) {
        bool result = false;
        if (secondState) {
            result = account == secondStateMinter;
        }
        else result = account == firstStateMinter;
        updateState(totalEtherAmount);
        return result || allStateMinters[account];
    }

    function getMinimumContribution() public view returns(uint) {
        return 10;
    }
}
