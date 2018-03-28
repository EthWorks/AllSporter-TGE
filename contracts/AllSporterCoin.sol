pragma solidity ^0.4.19;
import "ethworks-solidity/contracts/IcoToken.sol";

contract AllSporterCoin is IcoToken {
    function AllSporterCoin(uint256 _cap) public 
        IcoToken(_cap, "AllSporter Coin", "ASC", 18) {
    }
}
