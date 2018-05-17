pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Minter.sol";

contract Tge is Minter {
    using SafeMath for uint;

    /* --- CONSTANTS --- */

    uint constant public MIMIMUM_CONTRIBUTION_AMOUNT_PREICO = 1 * 1e18;
    uint constant public MIMIMUM_CONTRIBUTION_AMOUNT_ICO = 2 * 1e17;

    /* --- EVENTS --- */

    event StateChanged(uint from, uint to);

    /* --- FIELDS --- */

    // minters
    address public crowdsale;
    address public deferredKyc;
    address public referralManager;
    address public allocator;
    address public airdropper;

    // state
    enum State {Presale, Preico1, Preico2, Break, Ico1, Ico2, Ico3, Ico4, Ico5, Ico6, FinishingIco, Allocating, Airdropping, Finished}
    State public currentState = State.Presale;
    mapping(uint => uint) public startTimes;
    mapping(uint => uint) public etherCaps;

    /* --- MODIFIERS --- */

    modifier onlyInState(State _state) {
        require(_state == currentState);
        _;
    }

    modifier onlyInitialized() {
        require(isInitialized());
        _;
    }

    /* --- CONSTRUCTOR / INITIALIZATION --- */

    function Tge(
        CrowdfundableToken _token,
        uint _saleEtherCap,
        uint saleStartTime,
        uint singleStateEtherCap
    ) public Minter(_token, _saleEtherCap) {
        require(saleStartTime >= now);
        require(singleStateEtherCap > 0);
        initStates(saleStartTime, singleStateEtherCap);
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

        // the total sale ether cap is distributed evenly over all selling states
        setEtherCap(State.Preico1, singleStateEtherCap);
        setEtherCap(State.Preico2, singleStateEtherCap);
        setEtherCap(State.Ico1, singleStateEtherCap);
        setEtherCap(State.Ico2, singleStateEtherCap);
        setEtherCap(State.Ico3, singleStateEtherCap);
        setEtherCap(State.Ico4, singleStateEtherCap);
        setEtherCap(State.Ico5, singleStateEtherCap);
        setEtherCap(State.Ico6, singleStateEtherCap);
    }

    function initialize(
        address _crowdsale,
        address _deferredKyc,
        address _referralManager,
        address _allocator,
        address _airdropper
    ) public onlyOwner {
        require(crowdsale == 0x0 && deferredKyc == 0x0 && referralManager == 0x0 && allocator == 0x0 && airdropper == 0x0);
        crowdsale = _crowdsale;
        deferredKyc = _deferredKyc;
        referralManager = _referralManager;
        allocator = _allocator;
        airdropper = _airdropper;
        require(crowdsale != 0x0 && deferredKyc != 0x0 && referralManager != 0x0 && allocator != 0x0 && airdropper != 0x0);
    }

    /* --- PUBLIC / EXTERNAL METHODS --- */

    function moveState(uint from, uint to) external onlyInUpdatedState onlyOwner {
        require(uint(currentState) == from);
        advanceStateIfNewer(State(to));
    }

    // override
    function transferTokenOwnership() external onlyInUpdatedState onlyOwner {
        require(currentState == State.Finished);
        token.transferOwnership(owner);
    }

    // override
    function getTokensForEther(uint etherAmount) public view returns(uint) {
        uint tokenAmount = 0;
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

    function isSellingState() public view returns(bool) {
        return(uint(currentState) >= uint(State.Preico1) && uint(currentState) <= uint(State.Ico6) && uint(currentState) != uint(State.Break));
    }

    /* --- INTERNAL METHODS --- */

    // override
    function getMinimumContribution() public view returns(uint) {
        if (currentState == State.Preico1 || currentState == State.Preico2) {
            return MIMIMUM_CONTRIBUTION_AMOUNT_PREICO;
        }
        if (uint(currentState) >= uint(State.Ico1) && uint(currentState) <= uint(State.Ico6)) {
            return MIMIMUM_CONTRIBUTION_AMOUNT_ICO;
        }
        return 0;
    }

    // override
    function canMint(address account) public view returns(bool) {
        if (currentState == State.Presale) {
            // external sales
            return account == crowdsale;
        }
        else if (isSellingState()) {
            // external sales
            // approving kyc
            // adding to kyc
            // referral fees
            return account == crowdsale || account == deferredKyc || account == referralManager;
        }
        else if (currentState == State.Break || currentState == State.FinishingIco) {
            // external sales
            // approving kyc
            // referral fees
            return account == crowdsale || account == deferredKyc || account == referralManager;
        }
        else if (currentState == State.Allocating) {
            // Community and Bounty allocations
            // Advisors, Developers, Ambassadors and Partners allocations
            // Customer Rewards allocations
            // Team allocations
            return account == allocator;
        }
        else if (currentState == State.Airdropping) {
            // airdropping for all token holders
            return account == airdropper;
        }
        return false;
    }

    // override
    function updateState() public {
        updateStateBasedOnTime();
        updateStateBasedOnContributions(confirmedSaleEther.add(reservedSaleEther));
    }

    function updateStateBasedOnTime() internal {
        // move to the next state, if the current one has finished
        if (now >= startTimes[uint(State.FinishingIco)]) advanceStateIfNewer(State.FinishingIco);
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

    function updateStateBasedOnContributions(uint totalEtherContributions) internal {
        // move to the next state, if the current one's cap has been reached
        if (!isSellingState()) {
            return;
        }

        if (int(currentState) < int(State.Break)) {
            // preico
            if (totalEtherContributions >= etherCaps[uint(State.Preico2)]) advanceStateIfNewer(State.Break);
            else if (totalEtherContributions >= etherCaps[uint(State.Preico1)]) advanceStateIfNewer(State.Preico2);
        }
        else {
            // ico
            if (totalEtherContributions >= etherCaps[uint(State.Ico6)]) advanceStateIfNewer(State.FinishingIco);
            else if (totalEtherContributions >= etherCaps[uint(State.Ico5)]) advanceStateIfNewer(State.Ico6);
            else if (totalEtherContributions >= etherCaps[uint(State.Ico4)]) advanceStateIfNewer(State.Ico5);
            else if (totalEtherContributions >= etherCaps[uint(State.Ico3)]) advanceStateIfNewer(State.Ico4);
            else if (totalEtherContributions >= etherCaps[uint(State.Ico2)]) advanceStateIfNewer(State.Ico3);
            else if (totalEtherContributions >= etherCaps[uint(State.Ico1)]) advanceStateIfNewer(State.Ico2);
        }
    }

    function advanceStateIfNewer(State newState) internal {
        if (uint(newState) > uint(currentState)) {
            emit StateChanged(uint(currentState), uint(newState));
            currentState = newState;
        }
    }

    function setStateLength(State state, uint length) internal {
        // state length is determined by next state's start time
        startTimes[uint(state)+1] = startTimes[uint(state)].add(length);
    }

    function setEtherCap(State state, uint cap) internal {
        // accumulate cap from previous states
        etherCaps[uint(state)] = etherCaps[uint(state)-1].add(cap);
    }

    function isInitialized() public view returns(bool) {
        return crowdsale != 0x0 && referralManager != 0x0 && allocator != 0x0 && airdropper != 0x0 && deferredKyc != 0x0;
    }
}
