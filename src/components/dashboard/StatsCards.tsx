"use client";

import { useAccount } from "wagmi";
import { useWallet } from "@/hooks/useWallet";
import { useFxrpBalance } from "@/hooks/useFxrpBalance";
import { useMyEscrows } from "@/hooks/useEscrows";

function GlowBackground() {
  return (
    <div
      className="pointer-events-none absolute -top-24 left-1/3 h-[300px] w-[400px] opacity-30"
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(255,90,40,0.4) 0%, rgba(255,90,40,0) 70%)",
      }}
    />
  );
}

export function StatsCards() {
  const { isConnected, isWrongNetwork } = useWallet();
  const { address } = useAccount();
  const { formatted, isLoading, isError } = useFxrpBalance();
  const { data: escrows, isLoading: escrowsLoading } = useMyEscrows();

  let availableBalance = "Connect wallet";
  if (isConnected && isWrongNetwork) {
    availableBalance = "Wrong network";
  } else if (isConnected && isLoading) {
    availableBalance = "Loading...";
  } else if (isConnected && isError) {
    availableBalance = "—";
  } else if (isConnected && formatted !== undefined) {
    availableBalance = `${formatted} FXRP`;
  }

  // Pending earnings: sum of not-yet-released milestone value across
  // escrows where this wallet is the freelancer.
  let pendingEarnings = "—";
  if (isConnected && !isWrongNetwork && !escrowsLoading && escrows) {
    const total = escrows
      .filter((e) => e.freelancerWallet.toLowerCase() === address?.toLowerCase())
      .flatMap((e) => e.milestones)
      .filter((m) => m.status !== "settled")
      .reduce((sum, m) => sum + Number(m.amount.replace(" FXRP", "")), 0);
    pendingEarnings = `${total.toLocaleString(undefined, { maximumFractionDigits: 2 })} FXRP`;
  }

  return (
    <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-6 px-6 md:grid-cols-2 lg:px-[71px]">
      <div className="relative overflow-hidden rounded-[12px] border border-white/5 bg-[rgba(17,17,17,0.7)] p-6">
        <GlowBackground />
        <p className="relative text-[16px] font-semibold text-white">
          Escrow
        </p>
        <div className="relative mt-4 flex flex-col gap-2">
          <p className="bg-gradient-to-b from-[#373737] via-[#ff9b7d] to-[#ff3e00] bg-clip-text text-[26px] font-bold tracking-[-0.5px] text-transparent">
            {isConnected ? pendingEarnings : "—"}
          </p>
          <p className="text-[11px] tracking-[-0.5px] text-white/40">
            Pending earnings across escrows where you&apos;re the freelancer
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[12px] border border-white/5 bg-[rgba(17,17,17,0.7)] p-6">
        <GlowBackground />
        <p className="relative text-[16px] font-semibold text-white">
          Available Balance
        </p>
        <p className="relative mt-4 bg-gradient-to-b from-[#373737] via-[#ff9b7d] to-[#ff3e00] bg-clip-text text-[26px] font-bold tracking-[-0.5px] text-transparent">
          {availableBalance}
        </p>
        <p className="relative mt-1 text-[11px] tracking-[-0.5px] text-white/40">
          Live FXRP balance for your connected wallet on Coston2
        </p>
      </div>
    </div>
  );
}
