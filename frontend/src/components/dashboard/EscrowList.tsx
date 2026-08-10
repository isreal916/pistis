"use client";

import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { useMyEscrows } from "@/hooks/useEscrows";
import { EscrowRow, EscrowRowSkeleton } from "@/components/dashboard/EscrowRow";

export function EscrowList() {
  const { isConnected, isWrongNetwork } = useWallet();
  const { data: escrows, isLoading, isError } = useMyEscrows();

  return (
    <section className="mx-auto w-full max-w-[1440px] px-6 py-16 lg:px-[71px]">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[16px] font-semibold text-white">My Escrows</h2>
        <Link
          href="/dashboard/create"
          className="rounded-[90px] bg-gradient-to-b from-[#fc5016] to-[#ff8961] px-6 py-2.5 text-[14px] text-white"
        >
          + Create Escrow
        </Link>
      </div>

      {!isConnected || isWrongNetwork ? (
        <p className="text-[14px] text-white/50">
          Connect your wallet to see your escrows.
        </p>
      ) : isLoading ? (
        <div className="flex flex-col gap-[30px]">
          <EscrowRowSkeleton />
          <EscrowRowSkeleton />
        </div>
      ) : isError ? (
        <p className="text-[14px] text-[#ff460b]">
          Couldn&apos;t load escrows — try refreshing.
        </p>
      ) : !escrows || escrows.length === 0 ? (
        <p className="text-[14px] text-white/50">
          No escrows yet — create one to get started.
        </p>
      ) : (
        <div className="flex flex-col gap-[30px]">
          {escrows.map((escrow) => (
            <EscrowRow key={escrow.id} escrow={escrow} />
          ))}
        </div>
      )}
    </section>
  );
}
