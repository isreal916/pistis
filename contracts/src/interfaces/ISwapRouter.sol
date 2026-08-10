// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal Uniswap V3-style swap router surface — matches SparkDEX's
/// router on Flare Mainnet (see dev.flare.network/fxrp/token-interactions/usdt0-fxrp-swap).
/// Trimmed to the one function Pistis needs so this project doesn't need the
/// full Uniswap V3 periphery package as a dependency.
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}
