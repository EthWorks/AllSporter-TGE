pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Minter.sol";
import "./IPricing.sol";
import "./TgeState.sol";

contract Tge is TgeState, IPricing {
    using SafeMath for uint;

    uint constant public MIMIMUM_CONTRIBUTION_AMOUNT_PREICO = 1 * 1e18;
    uint constant public MIMIMUM_CONTRIBUTION_AMOUNT_ICO = 2 * 1e17;
    mapping(uint => mapping(address => bool)) public mintersPerState;
    mapping(uint => uint) minimumContributionAmounts;

    function Tge(uint saleStartTime, uint singleStateEtherCap) public TgeState(saleStartTime, singleStateEtherCap) {
        minimumContributionAmounts[uint(State.Preico1)] = MIMIMUM_CONTRIBUTION_AMOUNT_PREICO;
        minimumContributionAmounts[uint(State.Preico2)] = MIMIMUM_CONTRIBUTION_AMOUNT_PREICO;
        minimumContributionAmounts[uint(State.Ico1)] = MIMIMUM_CONTRIBUTION_AMOUNT_ICO;
        minimumContributionAmounts[uint(State.Ico2)] = MIMIMUM_CONTRIBUTION_AMOUNT_ICO;
        minimumContributionAmounts[uint(State.Ico3)] = MIMIMUM_CONTRIBUTION_AMOUNT_ICO;
        minimumContributionAmounts[uint(State.Ico4)] = MIMIMUM_CONTRIBUTION_AMOUNT_ICO;
        minimumContributionAmounts[uint(State.Ico5)] = MIMIMUM_CONTRIBUTION_AMOUNT_ICO;
        minimumContributionAmounts[uint(State.Ico6)] = MIMIMUM_CONTRIBUTION_AMOUNT_ICO;
    }

    function canMint(address account, uint totalEtherAmount) public returns(bool) {
        updateState(totalEtherAmount); // only state updaters
        return mintersPerState[uint(currentState)][account];
    }

    function approveMinter(address account, uint state) public onlyOwner {
        mintersPerState[uint(state)][account] = true;
    }

    function getTokensForEther(uint etherAmount) public view returns(uint) {
        uint tokenAmount;
        if (currentState == State.Preico1) tokenAmount = etherAmount.mul(3250);
        else if (currentState == State.Preico2) tokenAmount = etherAmount.mul(30875).div(10);
        else if (currentState == State.Ico1) tokenAmount = etherAmount.mul(2925);
        else if (currentState == State.Ico2) tokenAmount = etherAmount.mul(27625).div(10);
        else if (currentState == State.Ico3) tokenAmount = etherAmount.mul(2600);
        else if (currentState == State.Ico4) tokenAmount = etherAmount.mul(24375).div(10);
        else if (currentState == State.Ico5) tokenAmount = etherAmount.mul(21125).div(10);
        else if (currentState == State.Ico6) tokenAmount = etherAmount.mul(1950);

        // bonus
        if (etherAmount > 10 * 1e18) {
            tokenAmount = tokenAmount.mul(105).div(100);
        }
        else if (etherAmount > 5 * 1e18) {
            tokenAmount = tokenAmount.mul(103).div(100);
        }
        return tokenAmount;
    }

    function getMinimumContribution() public view returns(uint) {
        return minimumContributionAmounts[uint(currentState)];
    }
}
