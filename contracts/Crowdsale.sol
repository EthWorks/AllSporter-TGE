pragma solidity ^0.4.19;
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/lifecycle/Pausable.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';

contract Crowdsale is Ownable, Pausable {
  using SafeMath for uint256;
}
