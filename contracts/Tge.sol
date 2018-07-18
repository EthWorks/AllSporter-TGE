pragma solidity ^0.4.24;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Minter.sol";

contract Tge is Minter {
    using SafeMath for uint;

    /* --- CONSTANTS --- */

    uint constant public MIMIMUM_CONTRIBUTION_AMOUNT_PREICO = 1 ether;
    uint constant public MIMIMUM_CONTRIBUTION_AMOUNT_ICO = 1 ether / 5;
    
    uint constant public PRICE_MULTIPLIER_PREICO1 = 3955300;
    uint constant public PRICE_MULTIPLIER_PREICO2 = 3818900;

    uint constant public PRICE_MULTIPLIER_ICO1 = 3460900;
    uint constant public PRICE_MULTIPLIER_ICO2 = 3355900;
    uint constant public PRICE_MULTIPLIER_ICO3 = 3164100;
    uint constant public PRICE_MULTIPLIER_ICO4 = 3076200;
    uint constant public PRICE_MULTIPLIER_ICO5 = 2914300;
    uint constant public PRICE_MULTIPLIER_ICO6 = 2768600;
    uint constant public PRICE_DIVIDER = 1000;

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

    // private ico
    bool public privateIcoFinalized = true;
    uint public privateIcoCap = 0;
    uint public privateIcoTokensForEther = 0;
    uint public privateIcoStartTime = 0;
    uint public privateIcoEndTime = 0;
    uint public privateIcoMinimumContribution = 0;

    /* --- MODIFIERS --- */

    modifier onlyInState(State _state) {
        require(_state == currentState);
        _;
    }

    modifier onlyValidAddress(address account) {
        require(account != 0x0);
        _;
    }

    /* --- CONSTRUCTOR / INITIALIZATION --- */

    constructor(
        CrowdfundableToken _token,
        uint _saleEtherCap
    ) public Minter(_token, _saleEtherCap) { }

    // initialize states start times and caps
    function setupStates(uint saleStart, uint singleStateEtherCap, uint[] stateLengths) internal {
        require(!isPrivateIcoActive());

        startTimes[uint(State.Preico1)] = saleStart;
        setStateLength(State.Preico1, stateLengths[0]);
        setStateLength(State.Preico2, stateLengths[1]);
        setStateLength(State.Break, stateLengths[2]);
        setStateLength(State.Ico1, stateLengths[3]);
        setStateLength(State.Ico2, stateLengths[4]);
        setStateLength(State.Ico3, stateLengths[5]);
        setStateLength(State.Ico4, stateLengths[6]);
        setStateLength(State.Ico5, stateLengths[7]);
        setStateLength(State.Ico6, stateLengths[8]);

        // the total sale ether cap is distributed evenly over all selling states
        // the cap from previous states is accumulated in consequent states
        // adding confirmed sale ether from private ico
        etherCaps[uint(State.Preico1)] = singleStateEtherCap;
        etherCaps[uint(State.Preico2)] = singleStateEtherCap.mul(2);
        etherCaps[uint(State.Ico1)] = singleStateEtherCap.mul(3);
        etherCaps[uint(State.Ico2)] = singleStateEtherCap.mul(4);
        etherCaps[uint(State.Ico3)] = singleStateEtherCap.mul(5);
        etherCaps[uint(State.Ico4)] = singleStateEtherCap.mul(6);
        etherCaps[uint(State.Ico5)] = singleStateEtherCap.mul(7);
        etherCaps[uint(State.Ico6)] = singleStateEtherCap.mul(8);
    }

    function setup(
        address _crowdsale,
        address _deferredKyc,
        address _referralManager,
        address _allocator,
        address _airdropper,
        uint saleStartTime,
        uint singleStateEtherCap,
        uint[] stateLengths
    )
    public
    onlyOwner
    onlyInState(State.Presale)
    onlyValidAddress(_crowdsale)
    onlyValidAddress(_deferredKyc)
    onlyValidAddress(_referralManager)
    onlyValidAddress(_allocator)
    onlyValidAddress(_airdropper)
    {
        require(stateLengths.length == 9); // preico 1-2, break, ico 1-6
        require(saleStartTime >= now);
        require(singleStateEtherCap > 0);
        crowdsale = _crowdsale;
        deferredKyc = _deferredKyc;
        referralManager = _referralManager;
        allocator = _allocator;
        airdropper = _airdropper;
        setupStates(saleStartTime, singleStateEtherCap, stateLengths);
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
        if (isPrivateIcoActive()) tokenAmount = etherAmount.mul(privateIcoTokensForEther).div(PRICE_DIVIDER);
        else if (currentState == State.Preico1) tokenAmount = etherAmount.mul(PRICE_MULTIPLIER_PREICO1).div(PRICE_DIVIDER);
        else if (currentState == State.Preico2) tokenAmount = etherAmount.mul(PRICE_MULTIPLIER_PREICO2).div(PRICE_DIVIDER);
        else if (currentState == State.Ico1) tokenAmount = etherAmount.mul(PRICE_MULTIPLIER_ICO1).div(PRICE_DIVIDER);
        else if (currentState == State.Ico2) tokenAmount = etherAmount.mul(PRICE_MULTIPLIER_ICO2).div(PRICE_DIVIDER);
        else if (currentState == State.Ico3) tokenAmount = etherAmount.mul(PRICE_MULTIPLIER_ICO3).div(PRICE_DIVIDER);
        else if (currentState == State.Ico4) tokenAmount = etherAmount.mul(PRICE_MULTIPLIER_ICO4).div(PRICE_DIVIDER);
        else if (currentState == State.Ico5) tokenAmount = etherAmount.mul(PRICE_MULTIPLIER_ICO5).div(PRICE_DIVIDER);
        else if (currentState == State.Ico6) tokenAmount = etherAmount.mul(PRICE_MULTIPLIER_ICO6).div(PRICE_DIVIDER);

        return tokenAmount;
    }

    function isSellingState() public view returns(bool) {
        if (currentState == State.Presale) return isPrivateIcoActive();
        return (
            uint(currentState) >= uint(State.Preico1) &&
            uint(currentState) <= uint(State.Ico6) &&
            uint(currentState) != uint(State.Break)
        );
    }

    function isPrivateIcoActive() public view returns(bool) {
        return now >= privateIcoStartTime && now < privateIcoEndTime;
    }

    function initPrivateIco(uint _cap, uint _tokensForEther, uint _startTime, uint _endTime, uint _minimumContribution) external onlyOwner {
        require(_startTime > privateIcoEndTime); // should start after previous private ico
        require(now >= privateIcoEndTime); // previous private ico should be finished
        require(privateIcoFinalized); // previous private ico should be finalized
        require(_tokensForEther > 0);
        require(_endTime > _startTime);
        require(_endTime < startTimes[uint(State.Preico1)]);

        privateIcoCap = _cap;
        privateIcoTokensForEther = _tokensForEther;
        privateIcoStartTime = _startTime;
        privateIcoEndTime = _endTime;
        privateIcoMinimumContribution = _minimumContribution;
        privateIcoFinalized = false;
    }

    function finalizePrivateIco() external onlyOwner {
        require(!isPrivateIcoActive());
        require(now >= privateIcoEndTime); // previous private ico should be finished
        require(!privateIcoFinalized);
        require(reservedSaleEther == 0); // kyc needs to be finished

        privateIcoFinalized = true;
        confirmedSaleEther = 0;
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
        if (isPrivateIcoActive()) {
            return privateIcoMinimumContribution;
        }
        return 0;
    }

    // override
    function canMint(address account) public view returns(bool) {
        if (currentState == State.Presale) {
            // external sales and private ico
            return account == crowdsale || account == deferredKyc;
        }
        else if (isSellingState()) {
            // crowdsale: external sales
            // deferredKyc: adding and approving kyc
            // referralManager: referral fees
            return account == crowdsale || account == deferredKyc || account == referralManager;
        }
        else if (currentState == State.Break || currentState == State.FinishingIco) {
            // crowdsale: external sales
            // deferredKyc: approving kyc
            // referralManager: referral fees
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
        updateStateBasedOnContributions();
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

    function updateStateBasedOnContributions() internal {
        // move to the next state, if the current one's cap has been reached
        uint totalEtherContributions = confirmedSaleEther.add(reservedSaleEther);
        if(isPrivateIcoActive()) {
            // if private ico cap exceeded, revert transaction
            require(totalEtherContributions <= privateIcoCap);
            return;
        }
        
        if (!isSellingState()) {
            return;
        }
        
        else if (int(currentState) < int(State.Break)) {
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

    function isInitialized() public view returns(bool) {
        return crowdsale != 0x0 && referralManager != 0x0 && allocator != 0x0 && airdropper != 0x0 && deferredKyc != 0x0;
    }
}
