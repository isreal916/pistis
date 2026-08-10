"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useMyEscrows } from "@/hooks/useEscrows";
import { EscrowRow, EscrowRowSkeleton } from "@/components/dashboard/EscrowRow";

type Filter = "All" | "Active" | "Completed";

export function EscrowsView() {
  const { isConnected, isWrongNetwork } = useWallet();
  const { data: escrows, isLoading, isError } = useMyEscrows();
  const [filter, setFilter] = useState<Filter>("All");

  const all = escrows ?? [];
  const filters: { label: Filter; count: number }[] = [
    { label: "All", count: all.length },
    { label: "Active", count: all.filter((e) => e.status === "Active").length },
    { label: "Completed", count: all.filter((e) => e.status === "Completed").length },
  ];
  const visible = filter === "All" ? all : all.filter((e) => e.status === filter);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-10 lg:px-[71px]">
      <h1 className="mb-8 text-[26px] font-bold tracking-[-1px] text-white">
        Escrows
      </h1>

      <div className="mb-9 flex flex-wrap items-center gap-[15px]">
        {filters.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setFilter(f.label)}
            className={
              filter === f.label
                ? "rounded-[45px] bg-gradient-to-b from-[#fc5016] to-[#ff8961] px-5 py-3 text-[13px] text-white"
                : "rounded-[45px] border border-white/10 bg-white/10 px-5 py-3 text-[13px] text-white backdrop-blur-[20px]"
            }
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {!isConnected || isWrongNetwork ? (
        <p className="text-[14px] text-white/50">
          Connect your wallet to see your escrows.
        </p>
      ) : isLoading ? (
        <div className="flex flex-col gap-[35px]">
          <EscrowRowSkeleton />
          <EscrowRowSkeleton />
          <EscrowRowSkeleton />
        </div>
      ) : isError ? (
        <p className="text-[14px] text-[#ff460b]">
          Couldn&apos;t load escrows — try refreshing.
        </p>
      ) : visible.length === 0 ? (
        <p className="text-[14px] text-white/50">No escrows in this filter yet.</p>
      ) : (
        <div className="flex flex-col gap-[35px]">
          {visible.map((escrow) => (
            <EscrowRow key={escrow.id} escrow={escrow} />
          ))}
        </div>
      )}
    </div>
  );
}
