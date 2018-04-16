pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "ethworks-solidity/contracts/Crowdsale.sol";
import "ethworks-solidity/contracts/CrowdfundableToken.sol";
import "./Kyc.sol";

contract AllSporterCrowdsale is Crowdsale {
    using SafeMath for uint256;
    CrowdfundableToken token;
    address public treasury;
    Kyc public _kyc;

    // events

    uint256 constant PRE_ICO_1_TOKENS_FOR_ETHER = 1;
    uint256 constant PRE_ICO_2_TOKENS_FOR_ETHER = 1;
    uint256 constant ICO_1_TOKENS_FOR_ETHER = 1;
    uint256 constant ICO_2_TOKENS_FOR_ETHER = 1;
    uint256 constant ICO_3_TOKENS_FOR_ETHER = 1;
    uint256 constant ICO_4_TOKENS_FOR_ETHER = 1;
    uint256 constant ICO_5_TOKENS_FOR_ETHER = 1;
    uint256 constant ICO_6_TOKENS_FOR_ETHER = 1;
    uint256 constant PRE_ICO_STATE_CAP = 7800000 * (10**18);
    uint256 constant ICO_STATE_CAP = 23400000 * (10**18);
    uint256 constant ONE_DAY = 60*60*24;
    uint256 constant TEN_DAYS = 10*ONE_DAY;
    uint256 constant LOCKING_PERIOD = ONE_DAY*30*6;

    enum State {Presale, Preico1, Preico2, Break, Ico1, Ico2, Ico3, Ico4, Ico5, Ico6, Finishing, Finished}
    State public currentState = State.Presale;

    // characteristics of the states
    mapping(uint256 => uint256) stateStartTimes;
    mapping(uint256 => uint256) stateCaps;
    mapping(uint256 => uint256) stateTokensForEther;

    modifier onlyInState(State _state) {
        require(currentState == _state);
        _;
    }

    modifier onlyInSellingState() {
        require(isSellingState());
        _;
    }

    modifier updateStates() {
        while(currentState < State.Finishing &&
            stateStartTimes[uint(currentState) + 1] <= now
        ) {
            advanceState();
        }
        if (isSellingState() && currentState != State.Ico6) {
            // automatically move to the next state if sold out - except for the last Ico6 state
            advanceState();
        }
        _;
    }

    function AllSporterCrowdsale(
        CrowdfundableToken _token,
        uint256 _saleStartTime,
        uint256 _saleEndTime,
        address _treasury
    ) public Crowdsale(_token, _saleStartTime, _saleEndTime, LOCKING_PERIOD) {
        require(_treasury != 0x0);
        require(address(_token) != 0x0);
        treasury = _treasury;
        token = _token;
        _kyc = new Kyc(msg.sender, _treasury);

        initStateStartTimes();
        initStateCaps();
        initStatePrices();
    }

    function noteTokenSale(address _beneficiary, uint256 tokens) external updateStates onlyOwner {
        stateCaps[uint(currentState)] = stateCaps[uint(currentState)].sub(tokens);
        mint(_beneficiary, tokens);
    }

    function buy() external payable updateStates onlyInSellingState {
        uint256 tokens = getCurrentTokensForEther(msg.value);
        stateCaps[uint(currentState)] = stateCaps[uint(currentState)].sub(tokens);
        _kyc.placeUnderKyc.value(msg.value)(msg.sender, tokens);
    }

    function noteAllocation(address _beneficiary, uint256 tokens) external updateStates onlyOwner onlyInState(State.Finishing) {
        mint(_beneficiary, tokens);
    }

    function noteAllocationLocked(address _beneficiary, uint256 tokens) external updateStates onlyOwner onlyInState(State.Finishing) {
        mintLocked(_beneficiary, tokens);
    }

    function resolveKyc(address investor) external updateStates onlyOwner {
        _kyc.clearAndReturnPendingMinting(investor);
        stateCaps[uint(currentState)] = stateCaps[uint(currentState)].add(_kyc.clearAndReturnPendingRejection(investor));
    }

    function finishSale() external onlyOwner saleEnded updateStates onlyInState(State.Finishing) {
        require(_kyc.isResolved());
        token.finishMinting();
        token.transferOwnership(msg.sender);
        currentState = State.Finished;
    }

    // internal functions

    function advanceState() internal {
        if (stateStartTimes[uint(currentState) + 1] > now) {
            // all following states are starting earlier
            uint256 shortenedBy = stateStartTimes[uint(currentState) + 1].sub(now);
            for (uint _state = uint(currentState); _state <= uint(State.Ico6); _state++) {
                stateStartTimes[_state] = stateStartTimes[_state].sub(shortenedBy);
            }
        }
        currentState = State(uint(currentState) + 1);
        stateCaps[uint(currentState)] = stateCaps[uint(currentState)].add(stateCaps[uint(currentState) - 1]); // carry over
    }

    function isSellingState() internal view returns(bool) {
        return (currentState >= State.Preico1 &&
            currentState <= State.Ico6 &&
            currentState != State.Break
        );
    }

    function initStateStartTimes() internal {
        stateStartTimes[uint(State.Presale)] = now;
        stateStartTimes[uint(State.Preico1)] = saleStartTime;
        stateStartTimes[uint(State.Preico2)] = stateStartTimes[uint(State.Preico1)] + TEN_DAYS;
        stateStartTimes[uint(State.Break)] = stateStartTimes[uint(State.Preico2)] + 3 * ONE_DAY;

        for (uint i = uint(State.Ico1); i < uint(State.Finishing); i++) {
            stateStartTimes[i] = stateStartTimes[i-1] + TEN_DAYS;
        }
        require(stateStartTimes[uint(State.Ico6)] < saleEndTime);
        stateStartTimes[uint(State.Finishing)] = saleEndTime;
    }

    function initStateCaps() internal {
        stateCaps[uint(State.Preico1)] = PRE_ICO_STATE_CAP;
        stateCaps[uint(State.Preico2)] = PRE_ICO_STATE_CAP;
        stateCaps[uint(State.Ico1)] = ICO_STATE_CAP;
        stateCaps[uint(State.Ico2)] = ICO_STATE_CAP;
        stateCaps[uint(State.Ico3)] = ICO_STATE_CAP;
        stateCaps[uint(State.Ico4)] = ICO_STATE_CAP;
        stateCaps[uint(State.Ico5)] = ICO_STATE_CAP;
        stateCaps[uint(State.Ico6)] = ICO_STATE_CAP;
    }

    function initStatePrices() internal {
        stateTokensForEther[uint(State.Presale)] = 0;
        stateTokensForEther[uint(State.Preico1)] = PRE_ICO_1_TOKENS_FOR_ETHER;
        stateTokensForEther[uint(State.Preico2)] = PRE_ICO_2_TOKENS_FOR_ETHER;
        stateTokensForEther[uint(State.Ico1)] = ICO_1_TOKENS_FOR_ETHER;
        stateTokensForEther[uint(State.Ico2)] = ICO_2_TOKENS_FOR_ETHER;
        stateTokensForEther[uint(State.Ico3)] = ICO_3_TOKENS_FOR_ETHER;
        stateTokensForEther[uint(State.Ico4)] = ICO_4_TOKENS_FOR_ETHER;
        stateTokensForEther[uint(State.Ico5)] = ICO_5_TOKENS_FOR_ETHER;
        stateTokensForEther[uint(State.Ico6)] = ICO_6_TOKENS_FOR_ETHER;
        stateTokensForEther[uint(State.Finishing)] = 0;
        stateTokensForEther[uint(State.Finished)] = 0;
    }

    function getCurrentTokensForEther(uint256 etherValue) internal view returns(uint256) {
        return stateTokensForEther[uint(currentState)].mul(etherValue);
    }
}
