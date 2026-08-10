// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal LayerZero V2 OFT surface — only what Pistis needs to
/// bridge released FXRP to another chain. Trimmed from the official
/// IOFT.sol in the `@layerzerolabs/oft-evm` package so this project doesn't
/// need the full LayerZero package as a dependency.
struct SendParam {
    uint32 dstEid;
    bytes32 to;
    uint256 amountLD;
    uint256 minAmountLD;
    bytes extraOptions;
    bytes composeMsg;
    bytes oftCmd;
}

struct MessagingFee {
    uint256 nativeFee;
    uint256 lzTokenFee;
}

struct MessagingReceipt {
    bytes32 guid;
    uint64 nonce;
    MessagingFee fee;
}

struct OFTReceipt {
    uint256 amountSentLD;
    uint256 amountReceivedLD;
}

interface IOFT {
    function quoteSend(SendParam calldata _sendParam, bool _payInLzToken) external view returns (MessagingFee memory);

    function send(SendParam calldata _sendParam, MessagingFee calldata _fee, address _refundAddress)
        external
        payable
        returns (MessagingReceipt memory, OFTReceipt memory);
}
