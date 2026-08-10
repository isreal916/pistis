// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PistisFactory} from "../src/PistisFactory.sol";

/// @dev Deploys the PistisFactory once per network — every deal after that is
/// created via `factory.createEscrow(freelancer, titles, amounts)`, no further
/// deploy scripts needed. Run with:
///   forge script script/Deploy.s.sol:Deploy --rpc-url coston2 --broadcast --private-key $PRIVATE_KEY
///
/// SWAP_ROUTER_ADDRESS / SWAP_TOKEN_ADDRESS are optional — leave unset (or
/// zero) to disable swap-on-release, which is the correct choice on any
/// network without real FXRP DEX liquidity (Coston2 has none as of writing;
/// see contracts/README.md).
contract Deploy is Script {
    function run() external returns (PistisFactory factory) {
        address oftAdapter = vm.envAddress("OFT_ADAPTER_ADDRESS");
        address swapRouter = vm.envOr("SWAP_ROUTER_ADDRESS", address(0));
        address swapToken = vm.envOr("SWAP_TOKEN_ADDRESS", address(0));

        vm.startBroadcast();
        factory = new PistisFactory(oftAdapter, swapRouter, swapToken);
        vm.stopBroadcast();

        console.log("PistisFactory deployed:", address(factory));
        console.log("  oftAdapter:", factory.oftAdapter());
        console.log("  swapRouter:", factory.swapRouter());
        console.log("  swapToken:", factory.swapToken());
    }
}
