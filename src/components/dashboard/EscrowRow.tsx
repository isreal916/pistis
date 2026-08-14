"use client";

import Image from "next/image";
import Link from "next/link";
import { useAccount } from "wagmi";
import type { Escrow } from "@/lib/escrow-types";

const statusStyles: Record<
  Escrow["status"],
  { badgeBg: string; text: string; barBg: string; dot: string }
> = {
  Active: {
    badgeBg: "bg-[rgba(22,56,45,0.2)]",
    text: "text-[rgba(0,145,98,0.8)]",
    barBg: "bg-[rgba(0,145,98,0.5)]",
    dot: "/dashboard/status-dot.svg",
  },
  Completed: {
    badgeBg: "bg-[rgba(145,99,0,0.1)]",
    text: "text-[rgba(145,99,0,0.8)]",
    barBg: "bg-[rgba(145,99,0,0.8)]",
    dot: "/dashboard/status-completed-dot.svg",
  },
  Cancelled: {
    badgeBg: "bg-[rgba(146,146,146,0.15)]",
    text: "text-white/50",
    barBg: "bg-white/30",
    dot: "/dashboard/status-completed-dot.svg",
  },
};

export function EscrowRowSkeleton() {
  const pulse = "animate-pulse rounded-[8px] bg-white/[0.06]";
  return (
    <div className="overflow-hidden rounded-[15px] border border-[rgba(146,146,146,0.15)] bg-[rgba(17,17,17,0.7)]">
      <div className="flex flex-col gap-6 px-6 py-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-6">
          <div className={`h-[48px] w-[48px] shrink-0 rounded-full ${pulse}`} />
          <div className="flex flex-col gap-2">
            <div className={`h-[16px] w-[160px] ${pulse}`} />
            <div className={`h-[14px] w-[220px] ${pulse}`} />
          </div>
          <div className="hidden h-[15px] w-[190px] overflow-hidden rounded-[32px] bg-[rgba(146,146,146,0.15)] lg:block" />
        </div>
        <div className="flex items-center gap-6">
          <div className={`h-[14px] w-[60px] ${pulse}`} />
          <div className={`h-[19px] w-[70px] rounded-[32px] ${pulse}`} />
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 px-6 py-4">
        <div className={`h-[14px] w-[220px] ${pulse}`} />
      </div>
    </div>
  );
}

export function EscrowRow({ escrow }: { escrow: Escrow }) {
  const { address: connected } = useAccount();
  const style = statusStyles[escrow.status];
  const icon =
    escrow.status === "Completed"
      ? "/dashboard/escrow-item-icon-completed.svg"
      : "/dashboard/escrow-item-icon.svg";

  const role =
    connected?.toLowerCase() === escrow.clientWallet.toLowerCase()
      ? "You're the client"
      : connected?.toLowerCase() === escrow.freelancerWallet.toLowerCase()
        ? "You're the freelancer"
        : null;

  return (
    <Link
      href={`/dashboard/escrow/${escrow.id}`}
      className="block overflow-hidden rounded-[15px] border border-[rgba(146,146,146,0.15)] bg-[rgba(17,17,17,0.7)] transition-colors hover:border-white/25"
    >
      <div className="flex flex-col gap-6 px-6 py-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-6">
          <Image src={icon} alt="" width={48} height={48} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[16px] font-medium text-white">
                {escrow.title}
              </p>
              {role && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-[2px] text-[11px] font-light text-white/60">
                  {role}
                </span>
              )}
            </div>
            <p className="text-[14px] font-light text-white/50">
              {escrow.client} · due {escrow.dueDate}
            </p>
          </div>
          <div className="hidden h-[15px] w-[190px] overflow-hidden rounded-[32px] bg-[rgba(146,146,146,0.15)] lg:block">
            <div
              className={`h-full rounded-[32px] ${style.barBg}`}
              style={{ width: `${escrow.progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <span className="text-[14px] font-light text-white/80">
            {escrow.amount}
          </span>
          <span
            className={`flex items-center gap-1 rounded-[32px] px-[11px] py-[3px] text-[10px] font-light ${style.badgeBg} ${style.text}`}
          >
            <Image src={style.dot} alt="" width={9} height={9} />
            {escrow.status}
          </span>
          <Image
            src="/dashboard/chevron-right.svg"
            alt=""
            width={10}
            height={6}
            className="rotate-90"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-white/10 px-6 py-4">
        <Image
          src="/dashboard/contract-icon.svg"
          alt=""
          width={15}
          height={17}
        />
        <span className="text-[15px] font-light text-white/50">
          Contract : {escrow.contract}
        </span>
      </div>
    </Link>
  );
}
