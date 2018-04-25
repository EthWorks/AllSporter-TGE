pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "ethworks-solidity/contracts/LockingContract.sol";
import "ethworks-solidity/contracts/Whitelist.sol";
import "./StateManager.sol";
import "./Minter.sol";
import "./Kyc.sol";
import "./Minter.sol";

contract Crowdsale is Ownable {
    using SafeMath for uint;
    uint constant public tokenUnit = 1e18;
    uint constant public MIMIMUM_CONTRIBUTION_AMOUNT = 2 * 1e17;
    uint constant public REFERRAL_TOKEN_BONUS = 1 * 1e17;
    address public treasury;
    Minter public minter;
    StateManager public stateManager;
    Kyc public kyc;
    LockingContract public lockingContract;
    Whitelist referralWhitelist;

    event ContributionMade(address account, uint etherAmount, uint tokenAmount);
    event ExternalSaleNoted(address account, uint etherAmount, uint tokenAmount);
    event PercentageAllocationMade(address account, uint percents, uint calculatedTokenAmount);
    event LockedPercentageAllocationMade(address account, uint percents, uint calculatedTokenAmount);
    event ReferralBonusAdded(address referral, address referred);

    modifier onlyValidPercents(uint percents) {
        require(percents > 0 && percents <= 100);
        _;
    }

    modifier onlyInSellingState() {
        require(stateManager.isSellingState());
        _;
    }

    modifier onlyAboveMinimumAmount() {
        require(msg.value >= MIMIMUM_CONTRIBUTION_AMOUNT);
        _;
    }

    modifier onlyAfterIcoEnded() {
        require(stateManager.icoEnded());
        _;
    }

    modifier onlyWhitelistedReferral(address referral) {
        require(referralWhitelist.isWhitelisted(referral));
        _;
    }

    modifier updateState() {
        uint totalEtherContributions = kyc.totalReservedEther().add(kyc.totalConfirmedEther());
        stateManager.updateState(totalEtherContributions);
        _;
    }

    function Crowdsale(Minter _minter, StateManager _stateManager, Kyc _kyc, uint _unlockTime, address _treasury, Whitelist _referralWhitelist) public {
        require(address(_minter) != 0x0);
        require(address(_stateManager) != 0x0);
        require(address(_kyc) != 0x0);
        require(_unlockTime > now);
        require(_treasury != 0x0);
        require(address(_referralWhitelist) != 0x0);

        minter = _minter;
        stateManager = _stateManager;
        kyc = _kyc;
        treasury = _treasury;
        lockingContract = new LockingContract(_minter.token(), _unlockTime);
        referralWhitelist = _referralWhitelist;
    }

    function buy(address referral) external payable updateState onlyInSellingState onlyAboveMinimumAmount {
        uint tokenAmount = calculateTokenAmount();
        kyc.addToKyc(msg.sender, msg.value, tokenAmount);
        treasury.transfer(msg.value);
        emit ContributionMade(msg.sender, msg.value, tokenAmount);

        if (referral != 0x0) {
            addReferralBonus(referral, msg.sender);
        }
    }

    function noteExternalSale(address account, uint etherAmount, uint tokenAmount) external onlyOwner {
        kyc.addToKyc(account, etherAmount, tokenAmount);
        kyc.approve(account);
        emit ExternalSaleNoted(account, etherAmount, tokenAmount);
    }

    function allocatePercentage(address account, uint percents) external onlyOwner onlyValidPercents(percents) {
        uint tokenAmount = getAllocationCap().mul(percents).div(100);
        minter.mintAllocation(account, tokenAmount);
        emit PercentageAllocationMade(account, percents, tokenAmount);
    }

    function allocatePercentageLocked(address account, uint percents) external onlyOwner onlyValidPercents(percents) {
        uint tokenAmount = getAllocationCap().mul(percents).div(100);
        minter.mintAllocation(lockingContract, tokenAmount);
        lockingContract.noteTokens(account, tokenAmount);
        emit LockedPercentageAllocationMade(account, percents, tokenAmount);
    }

    function finalize(address newTokenOwner) external onlyOwner updateState {
        stateManager.finalize();
        minter.finishMinting(newTokenOwner);
    }

    // internal

    // calculate amount of tokens that should be sold by given amount of ether based on:
    // - current state
    // - potential bonus for big investments
    function calculateTokenAmount() internal view returns(uint) {
        uint tokenAmount = stateManager.getCurrentTokensForEther(msg.value);
        require(tokenAmount > 0);

        // bonus
        if (msg.value > 10 * tokenUnit) {
            tokenAmount = tokenAmount.mul(105).div(100);
        }
        else if (msg.value > 5 * tokenUnit) {
            tokenAmount = tokenAmount.mul(103).div(100);
        }
        return tokenAmount;
    }

    function addReferralBonus(address referral, address referred) internal onlyWhitelistedReferral(referral) {
        minter.lockContribution(referral, REFERRAL_TOKEN_BONUS);
        minter.lockContribution(referred, REFERRAL_TOKEN_BONUS);
        minter.confirmContribution(referral);
        minter.confirmContribution(referred);

        emit ReferralBonusAdded(referral, referred);
    }

    function getAllocationCap() internal view returns(uint) {
        uint tokenCap = minter.token().cap();
        uint saleTokenCap = minter.saleTokenCap();
        return tokenCap.sub(saleTokenCap);
    }
}
