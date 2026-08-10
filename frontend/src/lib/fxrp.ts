import { erc20Abi, type Address, type PublicClient } from "viem";
import { FLARE_CONTRACTS_REGISTRY } from "./chains";
import { flareContractsRegistryAbi, assetManagerAbi } from "./abis";

/** Resolves the FXRP token address + decimals at runtime, the same way
 * `useFxrpBalance` does — but as a plain async function so it can be used
 * inside react-query `queryFn`s instead of as a hook. */
export async function resolveFxrp(
  publicClient: PublicClient
): Promise<{ address: Address; decimals: number }> {
  const assetManager = await publicClient.readContract({
    address: FLARE_CONTRACTS_REGISTRY,
    abi: flareContractsRegistryAbi,
    functionName: "getContractAddressByName",
    args: ["AssetManagerFXRP"],
  });

  const address = await publicClient.readContract({
    address: assetManager,
    abi: assetManagerAbi,
    functionName: "fAsset",
  });

  const decimals = await publicClient.readContract({
    address,
    abi: erc20Abi,
    functionName: "decimals",
  });

  return { address, decimals };
}
