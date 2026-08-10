// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Pistis} from "../src/Pistis.sol";
import {PistisFactory} from "../src/PistisFactory.sol";
import {MockFXRP, MockAssetManager, MockFlareContractsRegistry} from "./mocks/MockFAssets.sol";
import {MockOFTAdapter} from "./mocks/MockOFTAdapter.sol";

contract PistisFactoryTest is Test {
    address private constant FLARE_CONTRACTS_REGISTRY = 0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019;

    address clientA = makeAddr("clientA");
    address clientB = makeAddr("clientB");
    address freelancer = makeAddr("freelancer");

    MockFXRP fxrp;
    MockOFTAdapter oftAdapter;
    PistisFactory factory;

    string[] titles;
    uint256[] amounts;

    function setUp() public {
        fxrp = new MockFXRP();
        MockAssetManager assetManager = new MockAssetManager(address(fxrp));
        MockFlareContractsRegistry registry = new MockFlareContractsRegistry(address(assetManager));
        vm.etch(FLARE_CONTRACTS_REGISTRY, address(registry).code);

        oftAdapter = new MockOFTAdapter(address(fxrp));
        factory = new PistisFactory(address(oftAdapter), address(0), address(0));

        titles.push("Milestone 1");
        amounts.push(50 ether);
    }

    function test_createEscrow_deploysAndIndexesByClientAndFreelancer() public {
        vm.prank(clientA);
        address escrow = factory.createEscrow(freelancer, titles, amounts, 0);

        Pistis pistis = Pistis(escrow);
        assertEq(pistis.client(), clientA);
        assertEq(pistis.freelancer(), freelancer);
        assertEq(address(pistis.oftAdapter()), address(oftAdapter));
        assertEq(pistis.totalAmount(), 50 ether);

        assertEq(factory.allEscrowsCount(), 1);
        assertEq(factory.allEscrows(0), escrow);

        address[] memory clientEscrows = factory.escrowsByClient(clientA);
        assertEq(clientEscrows.length, 1);
        assertEq(clientEscrows[0], escrow);

        address[] memory freelancerEscrows = factory.escrowsByFreelancer(freelancer);
        assertEq(freelancerEscrows.length, 1);
        assertEq(freelancerEscrows[0], escrow);
    }

    function test_createEscrow_emitsEvent() public {
        vm.prank(clientA);
        vm.expectEmit(false, true, true, true);
        emit PistisFactory.EscrowDeployed(address(0), clientA, freelancer, 50 ether, 1);
        factory.createEscrow(freelancer, titles, amounts, 0);
    }

    function test_createEscrow_multipleClientsIndexedSeparately() public {
        vm.prank(clientA);
        address escrowA = factory.createEscrow(freelancer, titles, amounts, 0);

        vm.prank(clientB);
        address escrowB = factory.createEscrow(freelancer, titles, amounts, 0);

        assertEq(factory.allEscrowsCount(), 2);
        assertEq(factory.escrowsByClient(clientA).length, 1);
        assertEq(factory.escrowsByClient(clientB).length, 1);
        assertEq(factory.escrowsByClient(clientA)[0], escrowA);
        assertEq(factory.escrowsByClient(clientB)[0], escrowB);

        // Same freelancer works both deals — should see both.
        address[] memory freelancerEscrows = factory.escrowsByFreelancer(freelancer);
        assertEq(freelancerEscrows.length, 2);
    }

    function test_createEscrow_sameClientMultipleEscrows() public {
        vm.startPrank(clientA);
        factory.createEscrow(freelancer, titles, amounts, 0);
        factory.createEscrow(freelancer, titles, amounts, 0);
        vm.stopPrank();

        assertEq(factory.escrowsByClient(clientA).length, 2);
    }

    function test_createEscrow_revertsOnZeroFreelancer() public {
        vm.prank(clientA);
        vm.expectRevert(PistisFactory.InvalidFreelancer.selector);
        factory.createEscrow(address(0), titles, amounts, 0);
    }

    function test_createEscrow_revertsWhenFreelancerIsCaller() public {
        vm.prank(clientA);
        vm.expectRevert(PistisFactory.InvalidFreelancer.selector);
        factory.createEscrow(clientA, titles, amounts, 0);
    }

    function test_escrowDeployedThroughFactory_worksEndToEnd() public {
        fxrp.mint(clientA, 100 ether);

        vm.prank(clientA);
        address escrow = factory.createEscrow(freelancer, titles, amounts, 0);
        Pistis pistis = Pistis(escrow);

        vm.startPrank(clientA);
        fxrp.approve(escrow, 50 ether);
        pistis.deposit();
        vm.stopPrank();

        vm.prank(freelancer);
        pistis.submitMilestone(0, "ipfs://done");

        vm.prank(clientA);
        pistis.approveMilestone(0);

        assertEq(fxrp.balanceOf(freelancer), 50 ether);
        assertEq(uint8(pistis.status()), uint8(Pistis.Status.Completed));
    }
}
