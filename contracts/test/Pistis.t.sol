// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Pistis} from "../src/Pistis.sol";
import {MockFXRP, MockAssetManager, MockFlareContractsRegistry} from "./mocks/MockFAssets.sol";
import {MockOFTAdapter} from "./mocks/MockOFTAdapter.sol";

contract PistisTest is Test {
    address private constant FLARE_CONTRACTS_REGISTRY = 0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019;
    uint32 private constant DST_EID = 40362; // Hyperliquid testnet, per Pistis architecture doc

    address client = makeAddr("client");
    address freelancer = makeAddr("freelancer");
    address stranger = makeAddr("stranger");

    MockFXRP fxrp;
    MockOFTAdapter oftAdapter;
    Pistis pistis;

    string[] titles;
    uint256[] amounts;

    function setUp() public {
        fxrp = new MockFXRP();
        MockAssetManager assetManager = new MockAssetManager(address(fxrp));
        MockFlareContractsRegistry registry = new MockFlareContractsRegistry(address(assetManager));

        // Bake the mock registry's runtime code onto the canonical address
        // Pistis has hardcoded, so its on-chain lookup resolves in tests.
        vm.etch(FLARE_CONTRACTS_REGISTRY, address(registry).code);

        oftAdapter = new MockOFTAdapter(address(fxrp));

        titles.push("Landing page");
        titles.push("Dashboard shell");
        titles.push("Final delivery");
        amounts.push(40 ether);
        amounts.push(30 ether);
        amounts.push(30 ether);

        pistis = new Pistis(client, freelancer, address(oftAdapter), address(0), address(0), titles, amounts, 0);

        fxrp.mint(client, 1_000 ether);
    }

    function _depositAsClient() private {
        vm.startPrank(client);
        fxrp.approve(address(pistis), pistis.totalAmount());
        pistis.deposit();
        vm.stopPrank();
    }

    function _fundAndSubmit(uint256 index) private {
        _depositAsClient();
        vm.prank(freelancer);
        pistis.submitMilestone(index, "ipfs://deliverable");
    }

    // ---------------------------------------------------------------------
    // Construction
    // ---------------------------------------------------------------------

    function test_constructor_setsPartiesAndMilestones() public view {
        assertEq(pistis.client(), client);
        assertEq(pistis.freelancer(), freelancer);
        assertEq(address(pistis.fxrp()), address(fxrp));
        assertEq(address(pistis.oftAdapter()), address(oftAdapter));
        assertEq(uint8(pistis.status()), uint8(Pistis.Status.Created));
        assertEq(pistis.totalAmount(), 100 ether);
        assertEq(pistis.milestoneCount(), 3);

        Pistis.Milestone memory m0 = pistis.getMilestone(0);
        assertEq(m0.title, "Landing page");
        assertEq(m0.amount, 40 ether);
        assertEq(uint8(m0.status), uint8(Pistis.MilestoneStatus.Pending));
    }

    function test_constructor_defaultsDeadlineToZero() public view {
        assertEq(pistis.deadline(), 0);
    }

    function test_constructor_setsDeadlineWhenProvided() public {
        uint256 futureDeadline = block.timestamp + 30 days;
        Pistis withDeadline = new Pistis(
            client, freelancer, address(oftAdapter), address(0), address(0), titles, amounts, futureDeadline
        );
        assertEq(withDeadline.deadline(), futureDeadline);
    }

    function test_constructor_revertsOnZeroFreelancer() public {
        vm.expectRevert(Pistis.InvalidFreelancer.selector);
        new Pistis(client, address(0), address(oftAdapter), address(0), address(0), titles, amounts, 0);
    }

    function test_constructor_revertsWhenFreelancerIsClient() public {
        vm.expectRevert(Pistis.InvalidFreelancer.selector);
        new Pistis(client, client, address(oftAdapter), address(0), address(0), titles, amounts, 0);
    }

    function test_constructor_revertsOnEmptyMilestones() public {
        string[] memory noTitles = new string[](0);
        uint256[] memory noAmounts = new uint256[](0);
        vm.expectRevert(Pistis.InvalidMilestones.selector);
        new Pistis(client, freelancer, address(oftAdapter), address(0), address(0), noTitles, noAmounts, 0);
    }

    function test_constructor_revertsOnMismatchedArrayLengths() public {
        string[] memory twoTitles = new string[](2);
        twoTitles[0] = "a";
        twoTitles[1] = "b";
        uint256[] memory oneAmount = new uint256[](1);
        oneAmount[0] = 1 ether;
        vm.expectRevert(Pistis.InvalidMilestones.selector);
        new Pistis(client, freelancer, address(oftAdapter), address(0), address(0), twoTitles, oneAmount, 0);
    }

    function test_constructor_revertsOnZeroMilestoneAmount() public {
        string[] memory oneTitle = new string[](1);
        oneTitle[0] = "a";
        uint256[] memory zeroAmount = new uint256[](1);
        zeroAmount[0] = 0;
        vm.expectRevert(Pistis.InvalidMilestones.selector);
        new Pistis(client, freelancer, address(oftAdapter), address(0), address(0), oneTitle, zeroAmount, 0);
    }

    // ---------------------------------------------------------------------
    // deposit
    // ---------------------------------------------------------------------

    function test_deposit_pullsTotalAndAdvancesStatus() public {
        _depositAsClient();

        assertEq(fxrp.balanceOf(address(pistis)), 100 ether);
        assertEq(uint8(pistis.status()), uint8(Pistis.Status.Funded));
    }

    function test_deposit_revertsForNonClient() public {
        vm.prank(stranger);
        vm.expectRevert(Pistis.OnlyClient.selector);
        pistis.deposit();
    }

    function test_deposit_revertsIfAlreadyFunded() public {
        _depositAsClient();

        vm.prank(client);
        vm.expectRevert(
            abi.encodeWithSelector(Pistis.WrongStatus.selector, Pistis.Status.Created, Pistis.Status.Funded)
        );
        pistis.deposit();
    }

    // ---------------------------------------------------------------------
    // submitMilestone
    // ---------------------------------------------------------------------

    function test_submitMilestone_advancesStatusToActive() public {
        _fundAndSubmit(0);

        Pistis.Milestone memory m0 = pistis.getMilestone(0);
        assertEq(uint8(m0.status), uint8(Pistis.MilestoneStatus.Submitted));
        assertEq(m0.workURI, "ipfs://deliverable");
        assertEq(uint8(pistis.status()), uint8(Pistis.Status.Active));
    }

    function test_submitMilestone_secondSubmissionStaysActive() public {
        _fundAndSubmit(0);

        vm.prank(freelancer);
        pistis.submitMilestone(1, "ipfs://deliverable-2");

        assertEq(uint8(pistis.status()), uint8(Pistis.Status.Active));
        assertEq(uint8(pistis.getMilestone(1).status), uint8(Pistis.MilestoneStatus.Submitted));
    }

    function test_submitMilestone_revertsForNonFreelancer() public {
        _depositAsClient();

        vm.prank(client);
        vm.expectRevert(Pistis.OnlyFreelancer.selector);
        pistis.submitMilestone(0, "ipfs://deliverable");
    }

    function test_submitMilestone_revertsBeforeFunded() public {
        vm.prank(freelancer);
        vm.expectRevert(abi.encodeWithSelector(Pistis.NotFundedOrActive.selector, Pistis.Status.Created));
        pistis.submitMilestone(0, "ipfs://deliverable");
    }

    function test_submitMilestone_revertsOnOutOfRangeIndex() public {
        _depositAsClient();

        vm.prank(freelancer);
        vm.expectRevert(abi.encodeWithSelector(Pistis.MilestoneIndexOutOfRange.selector, 3));
        pistis.submitMilestone(3, "ipfs://deliverable");
    }

    function test_submitMilestone_revertsIfAlreadySubmitted() public {
        _fundAndSubmit(0);

        vm.prank(freelancer);
        vm.expectRevert(
            abi.encodeWithSelector(
                Pistis.WrongMilestoneStatus.selector,
                0,
                Pistis.MilestoneStatus.Pending,
                Pistis.MilestoneStatus.Submitted
            )
        );
        pistis.submitMilestone(0, "ipfs://resubmit");
    }

    // ---------------------------------------------------------------------
    // approveMilestone (local release)
    // ---------------------------------------------------------------------

    function test_approveMilestone_releasesFundsToFreelancer() public {
        _fundAndSubmit(0);

        vm.prank(client);
        pistis.approveMilestone(0);

        assertEq(fxrp.balanceOf(freelancer), 40 ether);
        assertEq(fxrp.balanceOf(address(pistis)), 60 ether);
        assertEq(pistis.releasedAmount(), 40 ether);
        assertEq(uint8(pistis.getMilestone(0).status), uint8(Pistis.MilestoneStatus.Approved));
        assertEq(uint8(pistis.status()), uint8(Pistis.Status.Active));
    }

    function test_approveMilestone_lastOneCompletesEscrow() public {
        _depositAsClient();

        vm.startPrank(freelancer);
        pistis.submitMilestone(0, "a");
        pistis.submitMilestone(1, "b");
        pistis.submitMilestone(2, "c");
        vm.stopPrank();

        vm.startPrank(client);
        pistis.approveMilestone(0);
        pistis.approveMilestone(1);
        assertEq(uint8(pistis.status()), uint8(Pistis.Status.Active));
        pistis.approveMilestone(2);
        vm.stopPrank();

        assertEq(uint8(pistis.status()), uint8(Pistis.Status.Completed));
        assertEq(pistis.releasedAmount(), 100 ether);
        assertEq(fxrp.balanceOf(freelancer), 100 ether);
        assertEq(fxrp.balanceOf(address(pistis)), 0);
    }

    function test_approveMilestone_revertsForNonClient() public {
        _fundAndSubmit(0);

        vm.prank(freelancer);
        vm.expectRevert(Pistis.OnlyClient.selector);
        pistis.approveMilestone(0);
    }

    function test_approveMilestone_revertsBeforeSubmitted() public {
        _depositAsClient();

        vm.prank(client);
        vm.expectRevert(
            abi.encodeWithSelector(
                Pistis.WrongMilestoneStatus.selector,
                0,
                Pistis.MilestoneStatus.Submitted,
                Pistis.MilestoneStatus.Pending
            )
        );
        pistis.approveMilestone(0);
    }

    function test_approveMilestone_revertsIfAlreadyApproved() public {
        _fundAndSubmit(0);

        vm.startPrank(client);
        pistis.approveMilestone(0);
        vm.expectRevert(
            abi.encodeWithSelector(
                Pistis.WrongMilestoneStatus.selector,
                0,
                Pistis.MilestoneStatus.Submitted,
                Pistis.MilestoneStatus.Approved
            )
        );
        pistis.approveMilestone(0);
        vm.stopPrank();
    }

    // ---------------------------------------------------------------------
    // approveMilestoneAndBridge (cross-chain release)
    // ---------------------------------------------------------------------

    function test_approveMilestoneAndBridge_locksAndForwardsViaOft() public {
        _fundAndSubmit(0);

        address destRecipient = makeAddr("destRecipient");
        vm.deal(client, 1 ether);

        vm.prank(client);
        pistis.approveMilestoneAndBridge{value: 0.01 ether}(0, DST_EID, destRecipient, "");

        assertEq(uint8(pistis.getMilestone(0).status), uint8(Pistis.MilestoneStatus.Approved));
        assertEq(pistis.releasedAmount(), 40 ether);

        // Adapter pulled the released milestone's FXRP via transferFrom(Pistis, adapter, amount).
        assertEq(fxrp.balanceOf(address(oftAdapter)), 40 ether);
        assertEq(fxrp.balanceOf(address(pistis)), 60 ether);
    }

    function test_approveMilestoneAndBridge_refundsExcessNativeFee() public {
        _fundAndSubmit(0);

        address destRecipient = makeAddr("destRecipient");
        vm.deal(client, 1 ether);

        uint256 balanceBefore = client.balance;

        vm.prank(client);
        pistis.approveMilestoneAndBridge{value: 0.05 ether}(0, DST_EID, destRecipient, "");

        // Sent 0.05, adapter only charges 0.01 (MockOFTAdapter.FIXED_NATIVE_FEE) -> 0.04 refunded.
        assertEq(client.balance, balanceBefore - 0.01 ether);
    }

    function test_quoteBridgeFee_matchesAdapterQuote() public {
        _fundAndSubmit(0);

        (uint256 nativeFee, uint256 lzTokenFee) = pistis.quoteBridgeFee(0, DST_EID, makeAddr("destRecipient"), "");

        assertEq(nativeFee, oftAdapter.FIXED_NATIVE_FEE());
        assertEq(lzTokenFee, 0);
    }

    // ---------------------------------------------------------------------
    // cancel
    // ---------------------------------------------------------------------

    function test_cancel_beforeDeposit_noop() public {
        vm.prank(client);
        pistis.cancel();

        assertEq(uint8(pistis.status()), uint8(Pistis.Status.Cancelled));
    }

    function test_cancel_afterDeposit_refundsClient() public {
        _depositAsClient();

        uint256 balanceBefore = fxrp.balanceOf(client);

        vm.prank(client);
        pistis.cancel();

        assertEq(fxrp.balanceOf(client), balanceBefore + 100 ether);
        assertEq(fxrp.balanceOf(address(pistis)), 0);
        assertEq(uint8(pistis.status()), uint8(Pistis.Status.Cancelled));
    }

    function test_cancel_revertsAfterFirstMilestoneSubmitted() public {
        _fundAndSubmit(0);

        vm.prank(client);
        vm.expectRevert(Pistis.CancelWindowClosed.selector);
        pistis.cancel();
    }

    function test_cancel_revertsForNonClient() public {
        vm.prank(freelancer);
        vm.expectRevert(Pistis.OnlyClient.selector);
        pistis.cancel();
    }
}
