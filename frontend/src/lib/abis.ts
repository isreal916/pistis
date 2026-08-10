import { parseAbi } from "viem";

export const flareContractsRegistryAbi = parseAbi([
  "function getContractAddressByName(string name) view returns (address)",
]);

export const assetManagerAbi = parseAbi([
  "function fAsset() view returns (address)",
]);
