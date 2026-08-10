"use client";

import { erc20Abi } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { coston2, FLARE_CONTRACTS_REGISTRY } from "@/lib/chains";
import { flareContractsRegistryAbi, assetManagerAbi } from "@/lib/abis";

/**
 * Resolves the FXRP token address at runtime (registry -> AssetManagerFXRP ->
 * fAsset()) rather than hardcoding it, per Flare's guidance that FAssets
 * addresses differ per network and can change.
 */
export function useFxrpBalance() {
  const { address: account } = useAccount();

  const { data: assetManagerAddress } = useReadContract({
    address: FLARE_CONTRACTS_REGISTRY,
    abi: flareContractsRegistryAbi,
    functionName: "getContractAddressByName",
    args: ["AssetManagerFXRP"],
    chainId: coston2.id,
  });

  const { data: fxrpAddress } = useReadContract({
    address: assetManagerAddress,
    abi: assetManagerAbi,
    functionName: "fAsset",
    chainId: coston2.id,
    query: { enabled: Boolean(assetManagerAddress) },
  });

  const {
    data: balance,
    isLoading,
    isError,
  } = useReadContract({
    address: fxrpAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    chainId: coston2.id,
    query: { enabled: Boolean(fxrpAddress && account) },
  });

  const { data: decimals } = useReadContract({
    address: fxrpAddress,
    abi: erc20Abi,
    functionName: "decimals",
    chainId: coston2.id,
    query: { enabled: Boolean(fxrpAddress) },
  });

  const formatted =
    balance !== undefined && decimals !== undefined
      ? (Number(balance) / 10 ** decimals).toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })
      : undefined;

  return {
    fxrpAddress,
    balance,
    decimals,
    formatted,
    isLoading,
    isError,
  };
}
