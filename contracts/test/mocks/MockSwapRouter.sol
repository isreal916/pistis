// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ISwapRouter} from "../../src/interfaces/ISwapRouter.sol";
import {MockSwapToken} from "./MockFAssets.sol";

/// @dev Stand-in for SparkDEX's Uniswap-V3-style router. Pulls `tokenIn` via
/// `transferFrom`, mints `tokenOut` to the recipient at a fixed exchange
/// rate — enough to exercise Pistis's swap-on-release path without a real
/// pool (SparkDEX only exists on Flare Mainnet, not Coston2 — see
/// contracts/README.md).
contract MockSwapRouter is ISwapRouter {
    /// @dev tokenOut units minted per 1 tokenIn unit (both assumed 18 decimals
    /// in tests), scaled by 1e18. 700000000000000000 = 0.7 tokenOut per tokenIn.
    uint256 public constant RATE_1E18 = 0.7e18;

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        override
        returns (uint256 amountOut)
    {
        require(block.timestamp <= params.deadline, "expired");

        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);

        amountOut = (params.amountIn * RATE_1E18) / 1e18;
        require(amountOut >= params.amountOutMinimum, "insufficient output");

        MockSwapToken(params.tokenOut).mint(params.recipient, amountOut);
    }
}
