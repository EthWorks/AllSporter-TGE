pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract Kyc is Ownable {
    using SafeMath for uint256;

    event InvestmentPlacedUnderKyc(address indexed investor, uint256 tokenAmount, uint256 etherAmount);
    event InvestmentApproved(address indexed investor, uint256 tokenAmount, uint256 etherAmount);
    event InvestmentRejected(address indexed investor, uint256 tokenAmount, uint256 etherAmount);
    event PendingTokenMintingCleared(address indexed investor, uint256 tokenAmount);
    event PendingTokenRejectionCleared(address indexed investor, uint256 tokenAmount);
    event EtherWithdrawn(address indexed investor, uint256 etherAmount);

    address public approver;
    address public treasury;

    mapping(address => uint256) public etherUnderKyc;
    uint256 public totalEtherUnderKyc;

    mapping(address => uint256) public tokensUnderKyc;
    uint256 public totalTokensUnderKyc;

    mapping(address => uint256) public pendingEtherWithdrawals;
    uint256 public totalPendingEtherWithdrawals;

    mapping(address => uint256) public pendingTokenMinting;
    uint256 public totalPendingTokenMinting;

    mapping(address => uint256) public pendingTokenRejections;
    uint256 public totalPendingTokenRejections;

    function Kyc(address _approver, address _treasury) public {
        require(_treasury != 0x0);
        require(_approver != 0x0);
        approver = _approver;
        treasury = _treasury;
    }

    modifier onlyApprover() {
        require(msg.sender == approver);
        _;
    }

    function clearAndReturnPendingMinting(address investor) external onlyOwner returns(uint256) {
        uint tokenAmount = removePendingTokenMinting(investor);
        emit PendingTokenMintingCleared(investor, tokenAmount);
        return tokenAmount;
    }

    function clearAndReturnPendingRejection(address investor) external onlyOwner returns(uint256) {
        uint tokenAmount = removePendingTokenRejections(investor);
        emit PendingTokenRejectionCleared(investor, tokenAmount);
        return tokenAmount;
    }

    function placeUnderKyc(address investor, uint256 _tokens) external payable onlyOwner {
        addEtherUnderKyc(investor, msg.value);
        addTokensUnderKyc(investor, _tokens);
        emit InvestmentPlacedUnderKyc(investor, _tokens, msg.value);
    }

    function approve(address investor) external onlyApprover {
        uint tokenAmount = removeTokensUnderKyc(investor);
        uint etherAmount = removeEtherUnderKyc(investor);
        addPendingTokenMinting(investor, tokenAmount);
        emit InvestmentApproved(investor, tokenAmount, etherAmount);
        treasury.transfer(etherAmount);
    }

    function reject(address investor) external onlyApprover {
        uint tokenAmount = removeTokensUnderKyc(investor);
        uint etherAmount = removeEtherUnderKyc(investor);
        addPendingTokenRejections(investor, tokenAmount);
        addPendingEtherWithdrawals(investor, etherAmount);
        emit InvestmentRejected(investor, tokenAmount, etherAmount);
    }

    function withdraw() external {
        uint etherAmount = removePendingEtherWithdrawals(msg.sender);
        emit EtherWithdrawn(msg.sender, etherAmount);
        (msg.sender).transfer(etherAmount);
    }

    function forceWithdraw(address investor) onlyApprover external {
        uint etherAmount = removePendingEtherWithdrawals(investor);
        emit EtherWithdrawn(investor, etherAmount);
        investor.transfer(etherAmount);
    }

    function isResolved() view external returns(bool) {
        return (totalEtherUnderKyc == 0 &&
            totalTokensUnderKyc == 0 &&
            totalPendingEtherWithdrawals == 0 &&
            totalPendingTokenMinting == 0 &&
            totalPendingTokenRejections == 0
        );
    }

    // internal functions

    function addEtherUnderKyc(address investor, uint256 amount) internal {
        etherUnderKyc[investor] = etherUnderKyc[investor].add(amount);
        totalEtherUnderKyc = totalEtherUnderKyc.add(amount);
    }

    function removeEtherUnderKyc(address investor) internal returns(uint256) {
        uint amount = etherUnderKyc[investor];
        etherUnderKyc[investor] = 0;
        totalEtherUnderKyc = totalEtherUnderKyc.sub(amount);
        return amount;
    }

    function addTokensUnderKyc(address investor, uint256 amount) internal {
        tokensUnderKyc[investor] = tokensUnderKyc[investor].add(amount);
        totalTokensUnderKyc = totalTokensUnderKyc.add(amount);
    }

    function removeTokensUnderKyc(address investor) internal returns(uint256) {
        uint amount = tokensUnderKyc[investor];
        tokensUnderKyc[investor] = 0;
        totalTokensUnderKyc = totalTokensUnderKyc.sub(amount);
        return amount;
    }

    function addPendingEtherWithdrawals(address investor, uint256 amount) internal {
        pendingEtherWithdrawals[investor] = pendingEtherWithdrawals[investor].add(amount);
        totalPendingEtherWithdrawals = totalPendingEtherWithdrawals.add(amount);
    }

    function removePendingEtherWithdrawals(address investor) internal returns(uint256) {
        uint amount = pendingEtherWithdrawals[investor];
        pendingEtherWithdrawals[investor] = 0;
        totalPendingEtherWithdrawals = totalPendingEtherWithdrawals.sub(amount);
        return amount;
    }

    function addPendingTokenMinting(address investor, uint256 amount) internal {
        pendingTokenMinting[investor] = pendingTokenMinting[investor].add(amount);
        totalPendingTokenMinting = totalPendingTokenMinting.add(amount);
    }

    function removePendingTokenMinting(address investor) internal returns(uint256) {
        uint amount = pendingTokenMinting[investor];
        pendingTokenMinting[investor] = 0;
        totalPendingTokenMinting = totalPendingTokenMinting.sub(amount);
        return amount;
    }

    function addPendingTokenRejections(address investor, uint256 amount) internal {
        pendingTokenRejections[investor] = pendingTokenRejections[investor].add(amount);
        totalPendingTokenRejections = totalPendingTokenRejections.add(amount);
    }

    function removePendingTokenRejections(address investor) internal returns(uint256) {
        uint amount = pendingTokenRejections[investor];
        pendingTokenRejections[investor] = 0;
        totalPendingTokenRejections = totalPendingTokenRejections.sub(amount);
        return amount;
    }
}
