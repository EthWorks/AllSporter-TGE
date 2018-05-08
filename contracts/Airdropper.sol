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

    Minter public minter;
    bool isInitialized = false;
    uint tokensPerDrop;
    mapping(address => bool) public dropped;
    uint public ETHER_AMOUNT = 0;

    modifier notAlreadyDropped(address account) {
        require(!dropped[account]);
        _;
    }

    modifier initialized {
        require(isInitialized);
        _;
    }

    function Airdropper(Minter _minter) public {
        require(address(_minter) != 0x0);
        minter = _minter;
    }

    function dropMultiple(address[] accounts) external onlyOwner initialized {
        for (uint i = 0; i < accounts.length; i++) {
            drop(accounts[i]);
        }
    }

    function drop(address account) public onlyOwner initialized notAlreadyDropped(account) {
        dropped[account] = true;
        minter.mint(account, ETHER_AMOUNT, tokensPerDrop);
    }

    function initialize(uint totalDrops) external onlyOwner {
        require(totalDrops > 0);
        isInitialized = true;
        CrowdfundableToken token = CrowdfundableToken(minter.token());
        uint tokensLeft = token.cap().sub(token.totalSupply());
        tokensPerDrop = tokensLeft.div(totalDrops);
    }
}
