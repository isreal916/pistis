// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockFXRP is ERC20 {
    constructor() ERC20("Mock FTestXRP", "FXRP") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev Stand-in for USDT0 (or any swap-on-release target token) in tests.
contract MockSwapToken is ERC20 {
    constructor() ERC20("Mock USDT0", "USDT0") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev Mirrors the one function of IAssetManager that Pistis calls.
contract MockAssetManager {
    address public immutable fxrp;

    constructor(address _fxrp) {
        fxrp = _fxrp;
    }

    function fAsset() external view returns (address) {
        return fxrp;
    }
}

/// @dev Mirrors the one function of IFlareContractsRegistry that Pistis calls.
/// Deployed normally, then `vm.etch`'d onto the canonical registry address so
/// Pistis's hardcoded registry lookup resolves in tests.
contract MockFlareContractsRegistry {
    address public immutable assetManagerFxrp;

    constructor(address _assetManagerFxrp) {
        assetManagerFxrp = _assetManagerFxrp;
    }

    function getContractAddressByName(string calldata _name) external view returns (address) {
        if (keccak256(bytes(_name)) == keccak256(bytes("AssetManagerFXRP"))) {
            return assetManagerFxrp;
        }
        return address(0);
    }
}
