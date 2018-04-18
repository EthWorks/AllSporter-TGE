pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "ethworks-solidity/contracts/Whitelist.sol";
import "./Minter.sol";

contract StateManager is Whitelist {
    using SafeMath for uint;
    Minter public minter;

    enum State {Presale, Preico1, Preico2, Break, Ico1, Ico2, Ico3, Ico4, Ico5, Ico6, Allocating, Airdropping, Finished}
    State public currentState = State.Presale;
    mapping(uint => uint) startTimes;
    mapping(uint => uint) tokenCaps;

    event StateChanged(uint from, uint to);

    modifier onlyInState(State _state) {
        require(_state == currentState);
        _;
    }

    // update current state based on:
    // - timestamp
    // - amount of tokens bought by investors (confirmed and not)
    modifier updateState() {
        if (now >= startTimes[uint(State.Allocating)]) advanceStateIfNewer(State.Allocating);
        else if (now >= startTimes[uint(State.Ico6)]) advanceStateIfNewer(State.Ico6);
        else if (now >= startTimes[uint(State.Ico5)]) advanceStateIfNewer(State.Ico5);
        else if (now >= startTimes[uint(State.Ico4)]) advanceStateIfNewer(State.Ico4);
        else if (now >= startTimes[uint(State.Ico3)]) advanceStateIfNewer(State.Ico3);
        else if (now >= startTimes[uint(State.Ico2)]) advanceStateIfNewer(State.Ico2);
        else if (now >= startTimes[uint(State.Break)]) advanceStateIfNewer(State.Break);
        else if (now >= startTimes[uint(State.Preico2)]) advanceStateIfNewer(State.Preico2);
        else if (now >= startTimes[uint(State.Preico1)]) advanceStateIfNewer(State.Preico1);

        uint totalTokens = minter.soldTokens();
        if (totalTokens >= tokenCaps[uint(State.Ico6)]) advanceStateIfNewer(State.Allocating);
        else if (totalTokens >= tokenCaps[uint(State.Ico5)]) advanceStateIfNewer(State.Ico6);
        else if (totalTokens >= tokenCaps[uint(State.Ico4)]) advanceStateIfNewer(State.Ico5);
        else if (totalTokens >= tokenCaps[uint(State.Ico3)]) advanceStateIfNewer(State.Ico4);
        else if (totalTokens >= tokenCaps[uint(State.Ico2)]) advanceStateIfNewer(State.Ico3);
        else if (totalTokens >= tokenCaps[uint(State.Ico1)]) advanceStateIfNewer(State.Ico2);
        else if (totalTokens >= tokenCaps[uint(State.Preico2)]) advanceStateIfNewer(State.Break);
        else if (totalTokens >= tokenCaps[uint(State.Preico1)]) advanceStateIfNewer(State.Preico2);
        _;
    }

    function StateManager(Minter _minter, uint saleStartTime) public {
        require(address(_minter) != 0x0);
        require(saleStartTime >= now);
        minter = _minter;
        initStates(saleStartTime);
    }

    // external

    function startAirdropping() external updateState onlyWhitelisted onlyInState(State.Allocating) {
        advanceStateIfNewer(State.Airdropping);
    }

    function finalize(address newTokenOwner) external updateState onlyWhitelisted onlyInState(State.Airdropping) {
        advanceStateIfNewer(State.Finished);
        minter.finishMinting(newTokenOwner);
    }

    function isSellingState() external updateState returns(bool) {
        return(
            uint(currentState) >= uint(State.Preico1)
            && uint(currentState) <= uint(State.Ico6)
            && uint(currentState) != uint(State.Break)
        );
    }

    function icoEnded() external updateState returns(bool) {
        return uint(currentState) > uint(State.Ico6);
    }

    // tokens sold for a given amount of ether based on state
    function getCurrentTokensForEther(uint etherAmount) public updateState returns(uint) {
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
    function initStates(uint saleStart) internal {
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

        setTokenCap(State.Preico1, 23400000 * 1e18);
        setTokenCap(State.Preico2, 23400000 * 1e18);
        setTokenCap(State.Ico1, 23400000 * 1e18);
        setTokenCap(State.Ico2, 23400000 * 1e18);
        setTokenCap(State.Ico3, 23400000 * 1e18);
        setTokenCap(State.Ico4, 23400000 * 1e18);
        setTokenCap(State.Ico5, 23400000 * 1e18);
        setTokenCap(State.Ico6, 23400000 * 1e18);
    }

    function setStateLength(State state, uint length) private {
        // state length is determined by next state's start time
        startTimes[uint(state)+1] = startTimes[uint(state)].add(length);
    }

    function setTokenCap(State state, uint cap) private {
        // accumulate cap from previous states
        tokenCaps[uint(state)] = tokenCaps[uint(state)-1].add(cap);
    }
}
