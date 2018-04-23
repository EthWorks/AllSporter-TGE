pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "ethworks-solidity/contracts/LockingContract.sol";
import "./StateManager.sol";
import "./Minter.sol";
import "./Kyc.sol";
import "./Minter.sol";

contract Crowdsale is Ownable {
    using SafeMath for uint;
    uint constant public tokenUnit = 1e18;
    uint constant public MIMIMUM_CONTRIBUTION_AMOUNT = 2 * 1e17;
    address public treasury;
    Minter public minter;
    StateManager public stateManager;
    Kyc public kyc;
    LockingContract public lockingContract;

    event ContributionMade(address investor, uint etherAmount, uint tokenAmount);
    event AllocationMade(address beneficiary, uint tokenAmount);
    event LockedAllocationMade(address beneficiary, uint tokenAmount);

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

    modifier updateState() {
        uint totalEtherContributions = kyc.totalReservedEther().add(kyc.totalConfirmedEther());
        stateManager.updateState(totalEtherContributions);
        _;
    }

    function Crowdsale(Minter _minter, StateManager _stateManager, Kyc _kyc, uint _unlockTime, address _treasury) public {
        require(address(_minter) != 0x0);
        require(address(_stateManager) != 0x0);
        require(address(_kyc) != 0x0);
        require(_unlockTime > now);
        require(_treasury != 0x0);

        minter = _minter;
        stateManager = _stateManager;
        kyc = _kyc;
        treasury = _treasury;
        lockingContract = new LockingContract(_minter.token(), _unlockTime);
    }

    function buy() external payable updateState onlyInSellingState onlyAboveMinimumAmount {
        uint tokenAmount = calculateTokenAmount();
        kyc.addToKyc(msg.sender, msg.value, tokenAmount);
        treasury.transfer(msg.value);
        emit ContributionMade(msg.sender, msg.value, tokenAmount);
    }

    function allocate(address beneficiary, uint tokenAmount) external onlyOwner {
        minter.mintAllocation(beneficiary, tokenAmount);
        emit AllocationMade(beneficiary, tokenAmount);
    }

    function allocateLocked(address beneficiary, uint tokenAmount) external onlyOwner {
        minter.mintAllocation(lockingContract, tokenAmount);
        lockingContract.noteTokens(beneficiary, tokenAmount);
        emit LockedAllocationMade(beneficiary, tokenAmount);
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
}
