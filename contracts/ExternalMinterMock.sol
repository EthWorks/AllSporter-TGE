pragma solidity ^0.4.24;
import "./Minter.sol";

/* TgeMock is used for unit testing */

contract ExternalMinterMock {
    Minter public minter;

    function setup(address _minter) external {
        minter = Minter(_minter);
    }

    function reserve(uint etherAmount) external {
        minter.reserve(etherAmount);
    }

    function mintReserved(address account, uint etherAmount, uint tokenAmount) external {
        minter.mintReserved(account, etherAmount, tokenAmount);
    }

    function unreserve(uint etherAmount) external {
        minter.unreserve(etherAmount);
    }
}
