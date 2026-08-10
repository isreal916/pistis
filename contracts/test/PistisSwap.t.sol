// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Pistis} from "../src/Pistis.sol";
import {MockFXRP, MockSwapToken, MockAssetManager, MockFlareContractsRegistry} from "./mocks/MockFAssets.sol";
import {MockOFTAdapter} from "./mocks/MockOFTAdapter.sol";
import {MockSwapRouter} from "./mocks/MockSwapRouter.sol";

/// @dev Covers `approveMilestoneAndSwap` — both the "configured" path (a
/// mock stand-in for SparkDEX, since the real router only exists on Flare
/// Mainnet, not Coston2) and the "disabled" path every Coston2 escrow
/// actually uses today.
contract PistisSwapTest is Test {
    address private constant FLARE_CONTRACTS_REGISTRY = 0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019;

    address client = makeAddr("client");
    address freelancer = makeAddr("freelancer");

    MockFXRP fxrp;
    MockSwapToken swapToken;
    MockOFTAdapter oftAdapter;
    MockSwapRouter swapRouter;

    string[] titles;
    uint256[] amounts;

    function setUp() public {
        fxrp = new MockFXRP();
        swapToken = new MockSwapToken();
        MockAssetManager assetManager = new MockAssetManager(address(fxrp));
        MockFlareContractsRegistry registry = new MockFlareContractsRegistry(address(assetManager));
        vm.etch(FLARE_CONTRACTS_REGISTRY, address(registry).code);

        oftAdapter = new MockOFTAdapter(address(fxrp));
        swapRouter = new MockSwapRouter();

        titles.push("Milestone 1");
        amounts.push(100 ether);

        fxrp.mint(client, 1_000 ether);
    }

    function _deployPistis(address _swapRouter, address _swapToken) private returns (Pistis) {
        return new Pistis(client, freelancer, address(oftAdapter), _swapRouter, _swapToken, titles, amounts, 0);
    }

    function _fundAndSubmit(Pistis pistis) private {
        vm.startPrank(client);
        fxrp.approve(address(pistis), pistis.totalAmount());
        pistis.deposit();
        vm.stopPrank();

        vm.prank(freelancer);
        pistis.submitMilestone(0, "ipfs://deliverable");
    }

    function test_approveMilestoneAndSwap_swapsAndPaysFreelancer() public {
        Pistis pistis = _deployPistis(address(swapRouter), address(swapToken));
        _fundAndSubmit(pistis);

        vm.prank(client);
        pistis.approveMilestoneAndSwap(0, 0);

        // MockSwapRouter rate: 0.7 swapToken per 1 FXRP -> 100 * 0.7 = 70.
        assertEq(swapToken.balanceOf(freelancer), 70 ether);
        assertEq(fxrp.balanceOf(freelancer), 0);
        assertEq(fxrp.balanceOf(address(pistis)), 0);
        assertEq(uint8(pistis.getMilestone(0).status), uint8(Pistis.MilestoneStatus.Approved));
        assertEq(uint8(pistis.status()), uint8(Pistis.Status.Completed));
    }

    function test_approveMilestoneAndSwap_revertsBelowMinAmountOut() public {
        Pistis pistis = _deployPistis(address(swapRouter), address(swapToken));
        _fundAndSubmit(pistis);

        vm.prank(client);
        vm.expectRevert("insufficient output");
        pistis.approveMilestoneAndSwap(0, 71 ether); // rate only yields 70
    }

    function test_approveMilestoneAndSwap_revertsWhenNotConfigured() public {
        // address(0), address(0) — how every Coston2 escrow is deployed today.
        Pistis pistis = _deployPistis(address(0), address(0));
        _fundAndSubmit(pistis);

        vm.prank(client);
        vm.expectRevert(Pistis.SwapNotConfigured.selector);
        pistis.approveMilestoneAndSwap(0, 0);
    }

    function test_approveMilestoneAndSwap_revertsForNonClient() public {
        Pistis pistis = _deployPistis(address(swapRouter), address(swapToken));
        _fundAndSubmit(pistis);

        vm.prank(freelancer);
        vm.expectRevert(Pistis.OnlyClient.selector);
        pistis.approveMilestoneAndSwap(0, 0);
    }

    function test_approveMilestoneAndSwap_revertsBeforeSubmitted() public {
        Pistis pistis = _deployPistis(address(swapRouter), address(swapToken));
        vm.startPrank(client);
        fxrp.approve(address(pistis), pistis.totalAmount());
        pistis.deposit();

        vm.expectRevert(
            abi.encodeWithSelector(
                Pistis.WrongMilestoneStatus.selector,
                0,
                Pistis.MilestoneStatus.Submitted,
                Pistis.MilestoneStatus.Pending
            )
        );
        pistis.approveMilestoneAndSwap(0, 0);
        vm.stopPrank();
    }

    function test_swapRouterAndToken_areZeroByDefault() public {
        Pistis pistis = _deployPistis(address(0), address(0));
        assertEq(address(pistis.swapRouter()), address(0));
        assertEq(pistis.swapToken(), address(0));
    }
}
