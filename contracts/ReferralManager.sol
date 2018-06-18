pragma solidity ^0.4.26;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "ethworks-solidity/contracts/LockingContract.sol";
import "ethworks-solidity/contracts/Whitelist.sol";
import "./Tge.sol";
import "./Minter.sol";
import "./DeferredKyc.sol";

contract ReferralManager is Ownable {
    using SafeMath for uint;

    /* --- CONSTANTS --- */

    uint constant public ETHER_AMOUNT = 0;
    uint constant public MAXIMUM_PERCENT = 5;

    /* --- EVENTS --- */

    event FeeAdded(address indexed account, uint tokenAmount);

    /* --- FIELDS --- */

    Minter public minter;
    mapping(address => bool) alreadyReferred;

    /* --- MODIFIERS --- */

    modifier notAlreadyReferred(address account) {
        require(!alreadyReferred[account]);
        _;
    }

    modifier onlyValidPercent(uint percent) {
        require(percent >= 0 && percent <= 100);
        require(percent <= MAXIMUM_PERCENT);
        _;
    }

    modifier onlyValidAddress(address account) {
        require(account != 0x0);
        _;
    }

    /* --- CONSTRUCTOR --- */

    function ReferralManager(Minter _minter) public onlyValidAddress(address(_minter)) {
        minter = _minter;
    }

    /* --- PUBLIC / EXTERNAL METHODS --- */

    function addFee(address referring, uint referringPercent, address referred, uint referredPercent)
        external
        onlyOwner
        onlyValidAddress(referring)
        onlyValidAddress(referred)
        onlyValidPercent(referringPercent)
        onlyValidPercent(referredPercent)
        notAlreadyReferred(referred)
    {
        alreadyReferred[referred] = true;
        uint baseContribution = minter.token().balanceOf(referred);
        applyFee(referring, baseContribution, referringPercent);
        applyFee(referred, baseContribution, referredPercent);
    }

    /* --- INTERNAL METHODS --- */

    function applyFee(address account, uint baseContribution, uint percent) internal {
        uint tokensDue = baseContribution.div(100).mul(percent);
        minter.mint(account, ETHER_AMOUNT, tokensDue);
        emit FeeAdded(account, tokensDue);
    }
}
