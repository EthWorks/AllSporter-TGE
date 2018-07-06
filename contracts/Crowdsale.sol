pragma solidity ^0.4.24;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "ethworks-solidity/contracts/LockingContract.sol";
import "ethworks-solidity/contracts/Whitelist.sol";
import "./Tge.sol";
import "./Minter.sol";
import "./DeferredKyc.sol";

contract Crowdsale is Ownable {
    using SafeMath for uint;

    /* --- EVENTS --- */

    event Bought(address indexed account, uint etherAmount);
    event SaleNoted(address indexed account, uint etherAmount, uint tokenAmount);
    event SaleLockedNoted(address indexed account, uint etherAmount, uint tokenAmount, uint lockingPeriod, address lockingContract);

    /* --- FIELDS --- */

    Minter public minter;
    DeferredKyc public deferredKyc;

    /* --- MODIFIERS --- */

    modifier onlyValidAddress(address account) {
        require(account != 0x0);
        _;
    }

    /* --- CONSTRUCTOR --- */

    constructor(Minter _minter, address _approver, address _treasury)
        public
        onlyValidAddress(address(_minter))
        onlyValidAddress(_approver)
        onlyValidAddress(_treasury)
    {
        minter = _minter;
        deferredKyc = new DeferredKyc(_minter, _approver, _treasury);
    }

    /* --- PUBLIC / EXTERNAL METHODS --- */
    
    function buy() public payable {
        deferredKyc.addToKyc.value(msg.value)(msg.sender);
        emit Bought(msg.sender, msg.value);
    }

    function noteSale(address account, uint etherAmount, uint tokenAmount) public onlyOwner {
        minter.mint(account, etherAmount, tokenAmount);
        emit SaleNoted(account, etherAmount, tokenAmount);
    }

    function noteSaleLocked(address account, uint etherAmount, uint tokenAmount, uint lockingPeriod) public onlyOwner {
        LockingContract lockingContract = new LockingContract(ERC20(minter.token()), now.add(lockingPeriod));
        minter.mint(address(lockingContract), etherAmount, tokenAmount);
        lockingContract.noteTokens(account, tokenAmount);
        emit SaleLockedNoted(account, etherAmount, tokenAmount, lockingPeriod, address(lockingContract));
    }
}
