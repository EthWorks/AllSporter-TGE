pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "ethworks-solidity/contracts/Whitelist.sol";
import "ethworks-solidity/contracts/LockingContract.sol";
import "./Minter.sol";

contract Kyc is Whitelist {
    using SafeMath for uint;
    Minter public minter;

    uint public totalReservedEther;
    uint public totalConfirmedEther;
    mapping(address => uint) public reservedEther;

    event AddedToKyc(address investor, uint etherAmount, uint tokenAmount);
    event Approved(address investor, uint etherAmount);
    event Rejected(address investor, uint etherAmount);

    function Kyc(Minter _minter) public {
        require(address(_minter) != 0x0);
        minter = _minter;
    }

    function addToKyc(address investor, uint etherAmount, uint tokenAmount) external onlyWhitelisted {
        totalReservedEther = totalReservedEther.add(etherAmount);
        reservedEther[investor] = reservedEther[investor].add(etherAmount);
        minter.lockContribution(investor, tokenAmount);
        emit AddedToKyc(investor, etherAmount, tokenAmount);
    }

    function approve(address investor) external onlyWhitelisted {
        totalReservedEther = totalReservedEther.sub(reservedEther[investor]);
        totalConfirmedEther = totalConfirmedEther.add(reservedEther[investor]);
        minter.confirmContribution(investor);
        emit Approved(investor, reservedEther[investor]);
        reservedEther[investor] = 0;
    }

    function reject(address investor) external onlyWhitelisted {
        totalReservedEther = totalReservedEther.sub(reservedEther[investor]);
        minter.rejectContribution(investor);
        emit Rejected(investor, reservedEther[investor]);
        reservedEther[investor] = 0;
    }
}
