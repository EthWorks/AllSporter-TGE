pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract TreasurySplitter is Ownable {
    using SafeMath for uint;

	/* --- EVENTS --- */

    event Transferred(address indexed receiver, uint amount);

	/* --- FIELDS --- */

    address public mainTreasury;
    address[] public subTreasuries;
    uint[] public percentages;

	/* --- MODIFIERS --- */

    modifier validPercentages(uint[] _percentages) {
        uint sum;
        for(uint i = 0; i < _percentages.length; i++) {
            uint perc = _percentages[i];
            require(perc > 0 && perc <= 100);
            sum = sum.add(perc);
        }
        require(sum <= 100);
        _;
    }

	/* --- CONSTRUCTOR --- */

    function TreasurySplitter(address _mainTreasury, address[] _subTreasuries, uint[] _percentages) public validPercentages(_percentages) {
        require(_subTreasuries.length == _percentages.length);
        mainTreasury = _mainTreasury;
        subTreasuries = _subTreasuries;
        percentages = _percentages;
    }

	/* --- PUBLIC / EXTERNAL METHODS --- */

    function() payable external {
        uint etherPerPercent = (msg.value).div(100);
        for(uint i = 0; i < percentages.length; i++) {
            uint amount = percentages[i].mul(etherPerPercent);
            address receiver = subTreasuries[i];
            receiver.transfer(amount);
            emit Transferred(receiver, amount);
        }
        uint remainder = address(this).balance;
        mainTreasury.transfer(remainder);
        emit Transferred(mainTreasury, remainder);
    }
}
