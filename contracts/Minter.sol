pragma solidity ^0.4.26;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "ethworks-solidity/contracts/Whitelist.sol";
import "ethworks-solidity/contracts/CrowdfundableToken.sol";

contract Minter is Ownable {
    using SafeMath for uint;

    /* --- EVENTS --- */

    event Minted(address indexed account, uint etherAmount, uint tokenAmount);
    event Reserved(uint etherAmount);
    event MintedReserved(address indexed account, uint etherAmount, uint tokenAmount);
    event Unreserved(uint etherAmount);

    /* --- FIELDS --- */

    CrowdfundableToken public token;
    uint public saleEtherCap;
    uint public confirmedSaleEther;
    uint public reservedSaleEther;

    /* --- MODIFIERS --- */

    modifier onlyInUpdatedState() {
        updateState();
        _;
    }

    modifier upToSaleEtherCap(uint additionalEtherAmount) {
        uint totalEtherAmount = confirmedSaleEther.add(reservedSaleEther).add(additionalEtherAmount);
        require(totalEtherAmount <= saleEtherCap);
        _;
    }

    modifier onlyApprovedMinter() {
        require(canMint(msg.sender));
        _;
    }

    modifier atLeastMinimumAmount(uint etherAmount) {
        require(etherAmount >= getMinimumContribution());
        _;
    }

    modifier onlyValidAddress(address account) {
        require(account != 0x0);
        _;
    }

    /* --- CONSTRUCTOR --- */

    function Minter(CrowdfundableToken _token, uint _saleEtherCap) public onlyValidAddress(address(_token)) {
        require(_saleEtherCap > 0);

        token = _token;
        saleEtherCap = _saleEtherCap;
    }

    /* --- PUBLIC / EXTERNAL METHODS --- */

    function transferTokenOwnership() external onlyOwner {
        token.transferOwnership(owner);
    }

    function reserve(uint etherAmount) external
        onlyInUpdatedState
        onlyApprovedMinter
        upToSaleEtherCap(etherAmount)
        atLeastMinimumAmount(etherAmount)
    {
        reservedSaleEther = reservedSaleEther.add(etherAmount);
        updateState();
        emit Reserved(etherAmount);
    }

    function mintReserved(address account, uint etherAmount, uint tokenAmount) external
        onlyInUpdatedState
        onlyApprovedMinter
    {
        reservedSaleEther = reservedSaleEther.sub(etherAmount);
        confirmedSaleEther = confirmedSaleEther.add(etherAmount);
        token.mint(account, tokenAmount);
        updateState();
        emit MintedReserved(account, etherAmount, tokenAmount);
    }

    function unreserve(uint etherAmount) public
        onlyInUpdatedState
        onlyApprovedMinter
    {
        reservedSaleEther = reservedSaleEther.sub(etherAmount);
        updateState();
        emit Unreserved(etherAmount);
    }

    function mint(address account, uint etherAmount, uint tokenAmount) public
        onlyInUpdatedState
        onlyApprovedMinter
        upToSaleEtherCap(etherAmount)
    {
        confirmedSaleEther = confirmedSaleEther.add(etherAmount);
        token.mint(account, tokenAmount);
        updateState();
        emit Minted(account, etherAmount, tokenAmount);
    }

    // abstract
    function getMinimumContribution() public view returns(uint);

    // abstract
    function updateState() public;

    // abstract
    function canMint(address sender) public view returns(bool);

    // abstract
    function getTokensForEther(uint etherAmount) public view returns(uint);
}