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
    bool isInitialized = false;
    uint initialTotalSupply;
    uint airdropPool;
    mapping(address => bool) public dropped;

    /* --- MODIFIERS --- */

    modifier notAlreadyDropped(address account) {
        require(!dropped[account]);
        _;
    }

    modifier initialized {
        require(isInitialized);
        _;
    }

    /* --- CONSTRUCTOR --- */

    function Airdropper(Minter _minter) public {
        require(address(_minter) != 0x0);
        minter = _minter;
    }

    /* --- PUBLIC / EXTERNAL METHODS --- */

    function initialize() external onlyOwner {
        isInitialized = true;
        initialTotalSupply = minter.token().totalSupply();
        airdropPool = minter.token().cap().sub(initialTotalSupply);
        emit Initialized();
    }

    function dropMultiple(address[] accounts) external onlyOwner initialized {
        for (uint i = 0; i < accounts.length; i++) {
            drop(accounts[i]);
        }
    }

    function drop(address account) public onlyOwner initialized notAlreadyDropped(account) {
        dropped[account] = true;
        uint contributed = minter.token().balanceOf(account);
        uint tokenAmount = airdropPool.div(initialTotalSupply).mul(contributed);
        minter.mint(account, ETHER_AMOUNT, tokenAmount);
        emit Airdropped(account, tokenAmount);
    }
}
