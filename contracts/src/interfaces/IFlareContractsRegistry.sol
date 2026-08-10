// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Same address on every Flare network. Source of truth for resolving
/// other protocol contracts (e.g. AssetManagerFXRP) so they never need to be
/// hardcoded and re-deployed if Flare governance rotates them.
interface IFlareContractsRegistry {
    function getContractAddressByName(string calldata _name) external view returns (address);
}

/// @notice Minimal AssetManager surface — just enough to resolve the FXRP
/// ERC-20 token address. Full interface: https://dev.flare.network/fassets/reference/IAssetManager
interface IAssetManager {
    function fAsset() external view returns (address);
}
