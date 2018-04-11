pragma solidity ^0.4.19;
import "ethworks-solidity/contracts/CrowdfundableToken.sol";

contract AllSporterCoin is CrowdfundableToken {
    function AllSporterCoin() public 
        CrowdfundableToken(260000000 * (10**18), "AllSporter Coin", "ASC", 18) {
    }
}
