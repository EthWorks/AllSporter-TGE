pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract StateManager is Ownable {
    using SafeMath for uint;

    uint constant public tokenUnit = 1e18;
    enum State {Presale, Preico1, Preico2, Break, Ico1, Ico2, Ico3, Ico4, Ico5, Ico6, Allocating, Finished}
    State public currentState = State.Presale;
    mapping(uint => uint) public startTimes;
    mapping(uint => uint) public etherCaps;

    event StateChanged(uint from, uint to);

    modifier onlyInState(State _state) {
        require(_state == currentState);
        _;
    }

    function StateManager(uint saleStartTime, uint singleStateEtherCap) public {
        require(saleStartTime >= now);
        require(singleStateEtherCap > 0);
        initStates(saleStartTime, singleStateEtherCap);
    }

    // external

    function updateState(uint totalEtherContributions) external onlyOwner {
        updateStateBasedOnTime();
        updateStateBasedOnContributions(totalEtherContributions);
    }

    function finalize() external onlyOwner onlyInState(State.Allocating) {
        advanceStateIfNewer(State.Finished);
    }

    // public

    function isSellingState() public view returns(bool) {
        return(
            uint(currentState) >= uint(State.Preico1)
            && uint(currentState) <= uint(State.Ico6)
            && uint(currentState) != uint(State.Break)
        );
    }

    function icoEnded() public view returns(bool) {
        return uint(currentState) > uint(State.Ico6);
    }

    // tokens sold for a given amount of ether based on state
    function getCurrentTokensForEther(uint etherAmount) public view returns(uint) {
        if (currentState == State.Preico1) return etherAmount.mul(3250);
        if (currentState == State.Preico2) return etherAmount.mul(30875).div(10);
        if (currentState == State.Ico1) return etherAmount.mul(2925);
        if (currentState == State.Ico2) return etherAmount.mul(27625).div(10);
        if (currentState == State.Ico3) return etherAmount.mul(2600);
        if (currentState == State.Ico4) return etherAmount.mul(24375).div(10);
        if (currentState == State.Ico5) return etherAmount.mul(21125).div(10);
        if (currentState == State.Ico6) return etherAmount.mul(1950);
        return 0;
    }

    // internal

    function advanceStateIfNewer(State newState) internal {
        if (uint(newState) > uint(currentState)) {
            emit StateChanged(uint(currentState), uint(newState));
            currentState = newState;
        }
    }

    // initialize states start times and caps
    function initStates(uint saleStart, uint singleStateEtherCap) internal {
        startTimes[uint(State.Preico1)] = saleStart;
        setStateLength(State.Preico1, 5 days);
        setStateLength(State.Preico2, 5 days);
        setStateLength(State.Break, 3 days);
        setStateLength(State.Ico1, 10 days);
        setStateLength(State.Ico2, 10 days);
        setStateLength(State.Ico3, 10 days);
        setStateLength(State.Ico4, 10 days);
        setStateLength(State.Ico5, 10 days);
        setStateLength(State.Ico6, 10 days);

        setEtherCap(State.Preico1, singleStateEtherCap);
        setEtherCap(State.Preico2, singleStateEtherCap);
        setEtherCap(State.Ico1, singleStateEtherCap);
        setEtherCap(State.Ico2, singleStateEtherCap);
        setEtherCap(State.Ico3, singleStateEtherCap);
        setEtherCap(State.Ico4, singleStateEtherCap);
        setEtherCap(State.Ico5, singleStateEtherCap);
        setEtherCap(State.Ico6, singleStateEtherCap);
    }

    function setStateLength(State state, uint length) private {
        // state length is determined by next state's start time
        startTimes[uint(state)+1] = startTimes[uint(state)].add(length);
    }

    function setEtherCap(State state, uint cap) private {
        // accumulate cap from previous states
        etherCaps[uint(state)] = etherCaps[uint(state)-1].add(cap);
    }

    function updateStateBasedOnTime() private {
        if (now >= startTimes[uint(State.Allocating)]) advanceStateIfNewer(State.Allocating);
        else if (now >= startTimes[uint(State.Ico6)]) advanceStateIfNewer(State.Ico6);
        else if (now >= startTimes[uint(State.Ico5)]) advanceStateIfNewer(State.Ico5);
        else if (now >= startTimes[uint(State.Ico4)]) advanceStateIfNewer(State.Ico4);
        else if (now >= startTimes[uint(State.Ico3)]) advanceStateIfNewer(State.Ico3);
        else if (now >= startTimes[uint(State.Ico2)]) advanceStateIfNewer(State.Ico2);
        else if (now >= startTimes[uint(State.Ico1)]) advanceStateIfNewer(State.Ico1);
        else if (now >= startTimes[uint(State.Break)]) advanceStateIfNewer(State.Break);
        else if (now >= startTimes[uint(State.Preico2)]) advanceStateIfNewer(State.Preico2);
        else if (now >= startTimes[uint(State.Preico1)]) advanceStateIfNewer(State.Preico1);
    }

    function updateStateBasedOnContributions(uint totalEtherContributions) private {
        if (!isSellingState()) {
            return;
        }

        if (int(currentState) < int(State.Break)) {
            // before the break
            if (totalEtherContributions >= etherCaps[uint(State.Preico2)]) advanceStateIfNewer(State.Break);
            else if (totalEtherContributions >= etherCaps[uint(State.Preico1)]) advanceStateIfNewer(State.Preico2);
        }
        else {
            // after the break
            if (totalEtherContributions >= etherCaps[uint(State.Ico6)]) advanceStateIfNewer(State.Allocating);
            else if (totalEtherContributions >= etherCaps[uint(State.Ico5)]) advanceStateIfNewer(State.Ico6);
            else if (totalEtherContributions >= etherCaps[uint(State.Ico4)]) advanceStateIfNewer(State.Ico5);
            else if (totalEtherContributions >= etherCaps[uint(State.Ico3)]) advanceStateIfNewer(State.Ico4);
            else if (totalEtherContributions >= etherCaps[uint(State.Ico2)]) advanceStateIfNewer(State.Ico3);
            else if (totalEtherContributions >= etherCaps[uint(State.Ico1)]) advanceStateIfNewer(State.Ico2);
        }
    }
}
