pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "ethworks-solidity/contracts/LockingContract.sol";
import "ethworks-solidity/contracts/Whitelist.sol";
import "./Tge.sol";
import "./Minter.sol";
import "./DeferredKyc.sol";
import "./Minter.sol";

contract ReferralManager is Ownable {
    using SafeMath for uint;

    Minter public minter;
    uint public ETHER_AMOUNT = 0;

    function ReferralManager(Minter _minter) public {
        require(address(_minter) != 0x0);

        minter = _minter;
    }
    
    function addReferralFee(address referral, address referred, uint tokenAmount) public onlyOwner {
        minter.mint(referral, ETHER_AMOUNT, tokenAmount);
        minter.mint(referred, ETHER_AMOUNT, tokenAmount);
    }
}
