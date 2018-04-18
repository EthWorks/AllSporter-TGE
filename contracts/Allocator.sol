pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "ethworks-solidity/contracts/Whitelist.sol";
import "ethworks-solidity/contracts/LockingContract.sol";
import "./Minter.sol";

contract Allocator is Whitelist {
    using SafeMath for uint;
    Minter minter;
    LockingContract lockingContract;

    event AllocatedLocked(address investor, uint tokenAmount);
    event Allocated(address investor, uint tokenAmount);

    function Allocator(Minter _minter, uint _unlockTime) public {
        require(address(_minter) != 0x0);
        minter = _minter;
        lockingContract = new LockingContract(_minter.token(), _unlockTime);
    }

    // allocate tokens for the investor
    function allocate(address investor, uint tokenAmount) external onlyWhitelisted {
        minter.mintAllocation(investor, tokenAmount);
        emit Allocated(investor, tokenAmount);
    }

    // allocate tokens that will be locked
    function allocateLocked(address investor, uint tokenAmount) external onlyWhitelisted {
        minter.mintAllocation(lockingContract, tokenAmount);
        lockingContract.noteTokens(investor, tokenAmount);

        emit AllocatedLocked(investor, tokenAmount);
    }
}
