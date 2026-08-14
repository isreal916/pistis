"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import type { Address } from "viem";
import {
  pistisFactoryAbi,
  PISTIS_FACTORY_COSTON2,
  PISTIS_FACTORY_DEPLOY_BLOCK,
} from "@/lib/pistis";
import { resolveFxrp } from "@/lib/fxrp";
import { fetchEscrow, fetchActivity } from "@/lib/escrow-fetch";
import type { Escrow } from "@/lib/escrow-types";

/** Every escrow the connected wallet is a party to — as client, freelancer,
 * or both — read live from PistisFactory's on-chain indexes. */
export function useMyEscrows() {
  const publicClient = usePublicClient();
  const { address } = useAccount();

  return useQuery({
    queryKey: ["myEscrows", address, publicClient?.chain?.id],
    queryFn: async (): Promise<Escrow[]> => {
      if (!publicClient || !address) return [];

      const [asClient, asFreelancer] = await Promise.all([
        publicClient.readContract({
          address: PISTIS_FACTORY_COSTON2,
          abi: pistisFactoryAbi,
          functionName: "escrowsByClient",
          args: [address],
        }),
        publicClient.readContract({
          address: PISTIS_FACTORY_COSTON2,
          abi: pistisFactoryAbi,
          functionName: "escrowsByFreelancer",
          args: [address],
        }),
      ]);

      const addresses = Array.from(new Set([...asClient, ...asFreelancer]));
      if (addresses.length === 0) return [];

      const { decimals } = await resolveFxrp(publicClient);

      return Promise.all(
        addresses.map((addr) => fetchEscrow(publicClient, addr, decimals))
      );
    },
    enabled: Boolean(publicClient && address),
    staleTime: 15_000,
  });
}

/** Full detail for one escrow, including its real on-chain activity log. */
export function useEscrow(address: Address | undefined) {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["escrow", address, publicClient?.chain?.id],
    queryFn: async (): Promise<Escrow | null> => {
      if (!publicClient || !address) return null;

      const { decimals } = await resolveFxrp(publicClient);

      // Activity is a nice-to-have reconstructed from event logs — never let
      // it block the core escrow view (milestones, status, actions) if the
      // RPC has a bad moment (e.g. rate limiting, log-range quirks).
      const [escrow, activity] = await Promise.all([
        fetchEscrow(publicClient, address, decimals),
        fetchActivity(publicClient, address, PISTIS_FACTORY_DEPLOY_BLOCK, decimals).catch(
          () => [] as Escrow["activity"]
        ),
      ]);

      return { ...escrow, activity };
    },
    enabled: Boolean(publicClient && address),
    staleTime: 10_000,
  });
}

/** Invalidate cached escrow reads after a mutating tx (deposit, submit,
 * approve, cancel) so the UI reflects the new on-chain state. */
export function useInvalidateEscrows() {
  const queryClient = useQueryClient();
  return (address?: Address) => {
    queryClient.invalidateQueries({ queryKey: ["myEscrows"] });
    if (address) {
      queryClient.invalidateQueries({ queryKey: ["escrow", address] });
    }
  };
}
