pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./StateManager.sol";
import "./Minter.sol";
import "./Allocator.sol";
import "./Kyc.sol";
import "./Minter.sol";

contract Crowdsale is Ownable {
    using SafeMath for uint;
    uint constant public MIMIMUM_CONTRIBUTION_AMOUNT = 2 * 1e17;
    address public treasury;
    Minter minter;
    StateManager stateManager;
    Kyc kyc;
    Allocator allocator;

    event InvestmentMade(address investor, uint etherAmount, uint tokenAmount);

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

    function Crowdsale(StateManager _stateManager, Kyc _kyc, Allocator _allocator, address _treasury) public {
        require(address(_stateManager) != 0x0);
        require(address(_kyc) != 0x0);
        require(address(_allocator) != 0x0);
        require(_treasury != 0x0);

        stateManager = _stateManager;
        kyc = _kyc;
        allocator = _allocator;
        treasury = _treasury;
    }

    function buy() external payable onlyInSellingState onlyAboveMinimumAmount {
        uint tokenAmount = calculateTokenAmount();
        kyc.addToKyc(msg.sender, msg.value, tokenAmount);
        treasury.transfer(msg.value);
        
        emit InvestmentMade(msg.sender, msg.value, tokenAmount);
    }

    function allocate(address beneficiary, uint tokenAmount) external onlyOwner {
        allocator.allocate(beneficiary, tokenAmount);
    }

    function allocateLocked(address beneficiary, uint tokenAmount) external onlyOwner {
        allocator.allocateLocked(beneficiary, tokenAmount);
    }

    function startAirdropping() external onlyOwner {
        stateManager.startAirdropping();
    }

    function finalize(address newTokenOwner) external onlyOwner {
        stateManager.finalize(newTokenOwner);
    }

    // internal

    // calculate amount of tokens that should be sold by given amount of ether based on:
    // - current state
    // - potential bonus for big investments
    function calculateTokenAmount() internal returns(uint) {
        uint tokenAmount = stateManager.getCurrentTokensForEther(msg.value);
        require(tokenAmount > 0);

        // bonus
        if (msg.value > 10 * 1e18) {
            tokenAmount = tokenAmount.mul(105).div(100);
        }
        else if (msg.value > 5 * 1e18) {
            tokenAmount = tokenAmount.mul(103).div(100);
        }
        return tokenAmount;
    }
}
