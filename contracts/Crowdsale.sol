pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "ethworks-solidity/contracts/LockingContract.sol";
import "ethworks-solidity/contracts/Whitelist.sol";
import "./Tge.sol";
import "./Minter.sol";
import "./DeferredKyc.sol";
import "./Minter.sol";

contract Crowdsale is Ownable {
    using SafeMath for uint;

    /* --- FIELDS --- */

    Minter public minter;
    DeferredKyc public deferredKyc;

    /* --- CONSTRUCTOR --- */

    function Crowdsale(Minter _minter, address _approver, address _treasury) public {
        require(address(_minter) != 0x0);
        require(_approver != 0x0);
        require(_treasury != 0x0);

        minter = _minter;
        deferredKyc = new DeferredKyc(_minter, _approver, _treasury);
    }

    /* --- PUBLIC / EXTERNAL METHODS --- */
    
    function buy() public payable {
        deferredKyc.addToKyc.value(msg.value)(msg.sender);
    }

    function noteSale(address account, uint etherAmount, uint tokenAmount) public onlyOwner {
        minter.mint(account, etherAmount, tokenAmount);
    }
}
