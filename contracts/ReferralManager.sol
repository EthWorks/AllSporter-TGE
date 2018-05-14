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

    /* --- EVENTS --- */

    event FeeAdded(address indexed account, uint tokenAmount);

    /* --- FIELDS --- */

    Minter public minter;
    uint public ETHER_AMOUNT = 0;
    mapping (address => uint) realised;

    /* --- MODIFIERS --- */

    modifier onlyValidPercent(uint percent) {
        require(percent >= 0 && percent <= 100);
        _;
    }

    /* --- CONSTRUCTOR --- */

    function ReferralManager(Minter _minter) public {
        require(address(_minter) != 0x0);

        minter = _minter;
    }

    /* --- PUBLIC / EXTERNAL METHODS --- */

    function addFee(address referring, uint referringPercent, address referred, uint referredPercent)
        external
        onlyOwner
        onlyValidPercent(referringPercent)
        onlyValidPercent(referredPercent)
    {
        require(referring != 0x0 && referred != 0x0);
        require(referringPercent < 5 && referredPercent < 5);

        applyFee(referring, referringPercent);
        applyFee(referred, referredPercent);
    }

    /* --- INTERNAL METHODS --- */

    function applyFee(address account, uint percent) internal {
        uint balance = minter.token().balanceOf(account);
        uint unrealised = balance.sub(realised[account]);
        uint tokenAmount = unrealised.mul(percent).div(100);

        minter.mint(account, ETHER_AMOUNT, tokenAmount);
        realised[account] = minter.token().balanceOf(account);
        emit FeeAdded(account, tokenAmount);
    }
}
