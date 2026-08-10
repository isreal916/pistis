// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IOFT, SendParam, MessagingFee, MessagingReceipt, OFTReceipt} from "../../src/interfaces/IOFT.sol";

/// @dev Stand-in for the LayerZero OFT Adapter. Charges a fixed native fee,
/// pulls the locked token via `transferFrom` (mirroring the real adapter's
/// lock-on-send behavior), and fabricates a receipt/guid.
contract MockOFTAdapter is IOFT {
    IERC20 public immutable token;
    uint256 public constant FIXED_NATIVE_FEE = 0.01 ether;

    uint64 private nonce;
    SendParam public lastSendParam;
    address public lastRefundAddress;

    constructor(address _token) {
        token = IERC20(_token);
    }

    function quoteSend(SendParam calldata, bool) external pure returns (MessagingFee memory) {
        return MessagingFee({nativeFee: FIXED_NATIVE_FEE, lzTokenFee: 0});
    }

    function send(SendParam calldata _sendParam, MessagingFee calldata _fee, address _refundAddress)
        external
        payable
        returns (MessagingReceipt memory receipt, OFTReceipt memory oftReceipt)
    {
        require(msg.value >= _fee.nativeFee, "insufficient native fee");

        token.transferFrom(msg.sender, address(this), _sendParam.amountLD);

        lastSendParam = _sendParam;
        lastRefundAddress = _refundAddress;
        nonce++;

        receipt = MessagingReceipt({guid: keccak256(abi.encode(nonce, _sendParam)), nonce: nonce, fee: _fee});
        oftReceipt = OFTReceipt({amountSentLD: _sendParam.amountLD, amountReceivedLD: _sendParam.amountLD});
    }
}
