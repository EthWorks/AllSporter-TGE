pragma solidity ^0.4.24;
import "ethworks-solidity/contracts/CrowdfundableToken.sol";

contract AllSporterCoin is CrowdfundableToken {
    constructor() public 
        CrowdfundableToken(260000000 * (10**18), "AllSporter Coin", "ALL", 18) {
    }
}
