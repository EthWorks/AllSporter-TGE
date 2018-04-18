pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "ethworks-solidity/contracts/Whitelist.sol";
import "ethworks-solidity/contracts/LockingContract.sol";
import "./Minter.sol";

contract Kyc is Whitelist {
    using SafeMath for uint;
    Minter public minter;

    event AddedToKyc(address investor, uint etherAmount, uint tokenAmount);
    event Approved(address investor);
    event Rejected(address investor);

    function Kyc(Minter _minter) public {
        require(address(_minter) != 0x0);
        minter = _minter;
    }

    function addToKyc(address investor, uint etherAmount, uint tokenAmount) external onlyWhitelisted {
        minter.reserveContribution(investor, etherAmount, tokenAmount);
        emit AddedToKyc(investor, etherAmount, tokenAmount);
    }

    function approve(address investor) external onlyWhitelisted {
        minter.mintReserved(investor);
        emit Approved(investor);
    }

    function reject(address investor) external onlyWhitelisted {
        minter.unreserveContribution(investor);
        emit Rejected(investor);
    }
}
