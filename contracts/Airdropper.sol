pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "ethworks-solidity/contracts/LockingContract.sol";
import "ethworks-solidity/contracts/Whitelist.sol";
import "ethworks-solidity/contracts/CrowdfundableToken.sol";
import "./Tge.sol";
import "./Minter.sol";
import "./DeferredKyc.sol";
import "./Minter.sol";

contract Airdropper is Ownable {
    using SafeMath for uint;

    /* --- CONSTANTS --- */

    uint public ETHER_AMOUNT = 0;

    /* --- EVENTS --- */

    event Initialized();
    event Airdropped(address account, uint tokenAmount);

    /* --- FIELDS --- */

    Minter public minter;
    bool public isInitialized = false;
    uint public initialTotalSupply;
    uint public airdropPool;
    mapping(address => bool) public dropped;

    /* --- MODIFIERS --- */

    modifier notAlreadyDropped(address account) {
        require(!dropped[account]);
        _;
    }

    modifier initialized {
        if (!isInitialized) {
            initialize();
        }
        _;
    }

    modifier onlyValidAddress(address account) {
        require(account != 0x0);
        _;
    }

    /* --- CONSTRUCTOR --- */

    function Airdropper(Minter _minter) public  onlyValidAddress(address(_minter)) {
        minter = _minter;
    }

    /* --- PUBLIC / EXTERNAL METHODS --- */

    function dropMultiple(address[] accounts) external onlyOwner initialized {
        for (uint i = 0; i < accounts.length; i++) {
            drop(accounts[i]);
        }
    }

    function drop(address account) public onlyOwner initialized notAlreadyDropped(account) {
        dropped[account] = true;
        uint contributed = minter.token().balanceOf(account);
        uint tokenAmount = airdropPool.mul(contributed).div(initialTotalSupply);
        minter.mint(account, ETHER_AMOUNT, tokenAmount);
        emit Airdropped(account, tokenAmount);
    }

    /* --- INTERNAL METHODS --- */

    function initialize() internal {
        isInitialized = true;
        initialTotalSupply = minter.token().totalSupply();
        airdropPool = minter.token().cap().sub(initialTotalSupply);
        emit Initialized();
    }
}
