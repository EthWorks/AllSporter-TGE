pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "ethworks-solidity/contracts/Whitelist.sol";
import "ethworks-solidity/contracts/LockingContract.sol";
import "./Minter.sol";

contract DeferredKyc is Ownable {
    using SafeMath for uint;

    /* --- EVENTS --- */

    event AddedToKyc(address investor, uint etherAmount, uint tokenAmount);
    event Approved(address investor, uint etherAmount, uint tokenAmount);
    event Rejected(address investor, uint etherAmount, uint tokenAmount);

    /* --- FIELDS --- */

    address public treasury;
    Minter public minter;
    address public approver;
    mapping(address => uint) public etherInProgress;
    mapping(address => uint) public tokenInProgress;
    mapping(address => uint) public etherRejected;

    /* --- MODIFIERS --- */ 

    modifier onlyApprover() {
        require(msg.sender == approver);
        _;
    }

    /* --- CONSTRUCTOR --- */

    function DeferredKyc(Minter _minter, address _approver, address _treasury) public {
        require(address(_minter) != 0x0);
        require(_approver != 0x0);
        require(_treasury != 0x0);
        
        minter = _minter;
        approver = _approver;
        treasury = _treasury;
    }

    /* --- PUBLIC / EXTERNAL METHODS --- */

    function addToKyc(address investor) external payable onlyOwner {
        minter.reserve(msg.value);
        uint tokenAmount = minter.getTokensForEther(msg.value);
        emit AddedToKyc(investor, msg.value, tokenAmount);

        etherInProgress[investor] = etherInProgress[investor].add(msg.value);
        tokenInProgress[investor] = tokenInProgress[investor].add(tokenAmount);
    }

    function approve(address investor) external onlyApprover {
        minter.mintReserved(investor, etherInProgress[investor], tokenInProgress[investor]);
        emit Approved(investor, etherInProgress[investor], tokenInProgress[investor]);
        
        uint value = etherInProgress[investor];
        etherInProgress[investor] = 0;
        tokenInProgress[investor] = 0;
        treasury.transfer(value);
    }

    function reject(address investor) external onlyApprover {
        minter.unreserve(etherInProgress[investor]);
        emit Rejected(investor, etherInProgress[investor], tokenInProgress[investor]);

        etherRejected[investor] = etherRejected[investor].add(etherInProgress[investor]);
        etherInProgress[investor] = 0;
        tokenInProgress[investor] = 0;
    }

    function withdrawRejected() external {
        uint value = etherRejected[msg.sender];
        etherRejected[msg.sender] = 0;
        (msg.sender).transfer(value);
    }
}
