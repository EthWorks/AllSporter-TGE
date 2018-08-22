pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract SingleLockingContract is Ownable {
    /* --- EVENTS --- */

    event ReleasedTokens(address indexed _beneficiary);

    /* --- FIELDS --- */

    ERC20 public tokenContract;
    uint256 public unlockTime;
    address public beneficiary;

    /* --- MODIFIERS --- */

    modifier onlyWhenUnlocked() {
        require(!isLocked());
        _;
    }

    modifier onlyWhenLocked() {
        require(isLocked());
        _;
    }

    /* --- CONSTRUCTOR --- */

    function SingleLockingContract(ERC20 _tokenContract, uint256 _unlockTime, address _beneficiary) public {
        require(_unlockTime > now);
        require(address(_tokenContract) != 0x0);
        require(_beneficiary != 0x0);

        unlockTime = _unlockTime;
        tokenContract = _tokenContract;
        beneficiary = _beneficiary;
    }

    /* --- PUBLIC / EXTERNAL METHODS --- */

    function isLocked() public view returns(bool) {
        return now < unlockTime;
    }

    function balanceOf() public view returns (uint256 balance) {
        return tokenContract.balanceOf(address(this));
    }

    function releaseTokens() public onlyWhenUnlocked {
        require(msg.sender == owner || msg.sender == beneficiary);
        require(tokenContract.transfer(beneficiary, balanceOf())); 
        emit ReleasedTokens(beneficiary);
    }
}