// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Pistis} from "./Pistis.sol";

/// @notice Deploys `Pistis` escrows and indexes them by client and freelancer,
/// so a dashboard can enumerate "my escrows" on-chain without an off-chain
/// indexer. The factory holds no funds and has no admin powers over any
/// escrow it creates — it only deploys and remembers addresses.
contract PistisFactory {
    /// @notice LayerZero OFT Adapter baked into every escrow this factory deploys.
    /// Verify the current address for the target network at
    /// https://dev.flare.network/fxrp/oft before deploying the factory itself.
    address public immutable oftAdapter;

    /// @notice Swap-on-release router baked into every escrow this factory deploys.
    /// `address(0)` disables swap-on-release network-wide — use this on any network
    /// without real FXRP DEX liquidity (e.g. Coston2) rather than pointing at a
    /// router with no usable pool.
    address public immutable swapRouter;

    /// @notice Token swap-on-release swaps FXRP into. Unused when `swapRouter` is `address(0)`.
    address public immutable swapToken;

    address[] public allEscrows;
    mapping(address => address[]) private _byClient;
    mapping(address => address[]) private _byFreelancer;

    event EscrowDeployed(
        address indexed escrow,
        address indexed client,
        address indexed freelancer,
        uint256 totalAmount,
        uint256 milestoneCount
    );

    error InvalidFreelancer();

    constructor(address _oftAdapter, address _swapRouter, address _swapToken) {
        oftAdapter = _oftAdapter;
        swapRouter = _swapRouter;
        swapToken = _swapToken;
    }

    /// @notice Deploys a new escrow with `msg.sender` as the client.
    /// @param _freelancer Counterparty who will submit work and receive released funds.
    /// @param _titles Milestone labels, parallel to `_amounts`.
    /// @param _amounts FXRP amount per milestone, parallel to `_titles`.
    /// @param _deadline Unix timestamp the deal is expected to complete by, or `0` for none.
    function createEscrow(
        address _freelancer,
        string[] calldata _titles,
        uint256[] calldata _amounts,
        uint256 _deadline
    ) external returns (address escrow) {
        if (_freelancer == address(0) || _freelancer == msg.sender) revert InvalidFreelancer();

        Pistis pistis =
            new Pistis(msg.sender, _freelancer, oftAdapter, swapRouter, swapToken, _titles, _amounts, _deadline);
        escrow = address(pistis);

        allEscrows.push(escrow);
        _byClient[msg.sender].push(escrow);
        _byFreelancer[_freelancer].push(escrow);

        emit EscrowDeployed(escrow, msg.sender, _freelancer, pistis.totalAmount(), _titles.length);
    }

    function escrowsByClient(address _client) external view returns (address[] memory) {
        return _byClient[_client];
    }

    function escrowsByFreelancer(address _freelancer) external view returns (address[] memory) {
        return _byFreelancer[_freelancer];
    }

    function allEscrowsCount() external view returns (uint256) {
        return allEscrows.length;
    }
}
