"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAccount } from "wagmi";
import type { Address } from "viem";
import { useEscrow } from "@/hooks/useEscrows";
import { truncateAddress } from "@/hooks/useWallet";
import type { Escrow, Milestone, MilestoneStatus } from "@/lib/escrow-types";
import { SubmitWorkModal } from "@/components/dashboard/SubmitWorkModal";
import { ReviewProjectModal } from "@/components/dashboard/ReviewProjectModal";
import { DepositModal } from "@/components/dashboard/DepositModal";

function MilestoneStatusIcon({ status }: { status: MilestoneStatus }) {
  if (status === "settled") {
    return (
      <div className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#009162] text-[10px] font-bold leading-none text-white">
        ✓
      </div>
    );
  }
  return (
    <div
      className={
        status === "awaiting"
          ? "mt-0.5 h-[18px] w-[18px] shrink-0 rounded-full border-2 border-[#916300]"
          : "mt-0.5 h-[18px] w-[18px] shrink-0 rounded-full border-2 border-white/20"
      }
    />
  );
}

const statusBadgeStyles: Record<
  Escrow["status"],
  { bg: string; text: string; dot: string }
> = {
  Active: {
    bg: "bg-[rgba(22,56,45,0.5)]",
    text: "text-[rgba(0,145,98,0.8)]",
    dot: "/dashboard/status-active-dot.svg",
  },
  Completed: {
    bg: "bg-[rgba(145,99,0,0.3)]",
    text: "text-[rgba(255,187,51,0.9)]",
    dot: "/dashboard/status-completed-dot.svg",
  },
  Cancelled: {
    bg: "bg-[rgba(146,146,146,0.2)]",
    text: "text-white/60",
    dot: "/dashboard/status-completed-dot.svg",
  },
};

function EscrowDetailSkeleton() {
  const pulse = "animate-pulse rounded-[8px] bg-white/[0.06]";
  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-10 lg:px-[71px]">
      <div className={`mb-[46px] h-[44px] w-[180px] rounded-[15px] ${pulse}`} />

      <div className="mb-10 flex flex-col gap-[10px]">
        <div className="flex items-center gap-[10px]">
          <div className={`h-[24px] w-[260px] ${pulse}`} />
          <div className={`h-[27px] w-[90px] rounded-[32px] ${pulse}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[851fr_410fr]">
        <div className="flex flex-col gap-6">
          <div className="rounded-[15px] border border-[rgba(146,146,146,0.15)] bg-[rgba(17,17,17,0.7)] p-6 md:p-[43px]">
            <div className="mb-[30px] flex items-center justify-between">
              <div className={`h-[19px] w-[140px] ${pulse}`} />
              <div className={`h-[16px] w-[70px] ${pulse}`} />
            </div>
            <div className={`mb-[68px] h-[15px] w-full rounded-[32px] ${pulse}`} />
            <div className="flex flex-col gap-[42px]">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={
                    i < 2
                      ? "flex items-center gap-4 border-b border-white/10 pb-[42px]"
                      : "flex items-center gap-4"
                  }
                >
                  <div className={`h-[18px] w-[18px] shrink-0 rounded-full ${pulse}`} />
                  <div className="flex w-full items-center justify-between">
                    <div className={`h-[16px] w-[45%] ${pulse}`} />
                    <div className={`h-[16px] w-[60px] ${pulse}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[15px] border border-[rgba(146,146,146,0.15)] bg-[rgba(17,17,17,0.7)] p-6 md:p-[43px]">
            <div className={`mb-[37px] h-[19px] w-[110px] ${pulse}`} />
            <div className="flex flex-col gap-[37px]">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className={
                    i === 0
                      ? "flex items-center justify-between gap-6 border-b border-white/10 pb-[37px]"
                      : "flex items-center justify-between gap-6"
                  }
                >
                  <div className={`h-[15px] w-[65%] ${pulse}`} />
                  <div className={`h-[14px] w-[50px] shrink-0 ${pulse}`} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="h-fit rounded-[15px] border border-[rgba(146,146,146,0.15)] bg-[rgba(17,17,17,0.7)] p-6 md:p-9">
          <div className={`mb-6 h-[13px] w-[70px] ${pulse}`} />
          <div className="flex flex-col gap-[15px]">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 border-b border-white/10 pb-[15px] last:border-0 last:pb-0"
              >
                <div className={`h-[14px] w-[100px] ${pulse}`} />
                <div className={`h-[14px] w-[90px] ${pulse}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContractRow({
  label,
  value,
  copyable,
  truncate,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  truncate?: boolean;
}) {
  const displayValue = truncate ? truncateAddress(value) : value;

  return (
    <div className="flex flex-col gap-[15px] border-b border-white/10 pb-[15px] last:border-0 last:pb-0">
      <div className="flex items-center justify-between gap-4">
        <span className="shrink-0 text-[14px] font-light text-white/70">
          {label}
        </span>
        <span className="flex min-w-0 items-center gap-2 text-[14px] font-light text-white/70">
          <span className="truncate" title={truncate ? value : undefined}>
            {displayValue}
          </span>
          {copyable && (
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(value)}
              aria-label={`Copy ${label}`}
              className="shrink-0"
            >
              <Image
                src="/dashboard/copy-icon.svg"
                alt=""
                width={15}
                height={15}
              />
            </button>
          )}
        </span>
      </div>
    </div>
  );
}

export function EscrowDetail({ address }: { address: Address }) {
  const { address: connected } = useAccount();
  const { data: escrow, isLoading, isError, refetch } = useEscrow(address);
  const [submittingMilestone, setSubmittingMilestone] = useState<Milestone | null>(
    null
  );
  const [reviewingMilestone, setReviewingMilestone] = useState<Milestone | null>(
    null
  );
  const [depositOpen, setDepositOpen] = useState(false);

  if (isLoading) {
    return <EscrowDetailSkeleton />;
  }

  if (isError || !escrow) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-6 py-10 text-[14px] text-[#ff460b] lg:px-[71px]">
        Couldn&apos;t load this escrow — check the address and try again.
      </div>
    );
  }

  const isClient = connected?.toLowerCase() === escrow.clientWallet.toLowerCase();
  const isFreelancer =
    connected?.toLowerCase() === escrow.freelancerWallet.toLowerCase();
  const statusStyle = statusBadgeStyles[escrow.status];

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-10 lg:px-[71px]">
      <Link
        href="/dashboard"
        className="mb-[46px] inline-flex items-center gap-[10px] rounded-[15px] border border-[rgba(146,146,146,0.15)] bg-[rgba(17,17,17,0.7)] px-[19px] py-[11px] text-[14px] font-light text-white"
      >
        <Image
          src="/dashboard/back-chevron.svg"
          alt=""
          width={12}
          height={6}
          className="-rotate-90"
        />
        Back to dashboard
      </Link>

      <div className="mb-10 flex flex-col gap-[10px]">
        <div className="flex flex-wrap items-center gap-[10px]">
          <h1 className="text-[20px] font-semibold tracking-[-0.8px] text-white">
            {escrow.title}
          </h1>
          <span
            className={`flex items-center gap-[9px] rounded-[32px] px-[15px] py-[6px] text-[13px] font-light ${statusStyle.bg} ${statusStyle.text}`}
          >
            <Image src={statusStyle.dot} alt="" width={13} height={13} />
            {escrow.status}
          </span>
        </div>
      </div>

      {escrow.needsDeposit && isClient && (
        <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-[15px] border border-[#ff460b]/30 bg-[#ff460b]/10 p-6 sm:flex-row sm:items-center">
          <p className="text-[14px] text-white/80">
            This escrow is deployed but not funded yet — deposit{" "}
            {escrow.budget} to activate it.
          </p>
          <button
            type="button"
            onClick={() => setDepositOpen(true)}
            className="shrink-0 rounded-[30px] bg-gradient-to-b from-[#fc5016] to-[#ff8961] px-6 py-2.5 text-[14px] font-semibold text-white"
          >
            Deposit {escrow.budget}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[851fr_410fr]">
        <div className="flex flex-col gap-6">
          <div className="rounded-[15px] border border-[rgba(146,146,146,0.15)] bg-[rgba(17,17,17,0.7)] p-6 md:p-[43px]">
            <div className="mb-[30px] flex items-center justify-between">
              <h2 className="text-[16px] font-medium text-white">
                Milestone ledger
              </h2>
              <span className="text-[13px] font-light text-white/80">
                {escrow.progress}% settled
              </span>
            </div>
            <div className="mb-[68px] h-[15px] w-full overflow-hidden rounded-[32px] bg-[rgba(146,146,146,0.15)]">
              <div
                className="h-full rounded-[32px] bg-[rgba(0,145,98,0.5)]"
                style={{ width: `${escrow.progress}%` }}
              />
            </div>

            <div className="flex flex-col gap-[42px]">
              {escrow.milestones.map((milestone, i) => (
                <div
                  key={milestone.index}
                  className={
                    i < escrow.milestones.length - 1
                      ? "flex gap-4 border-b border-white/10 pb-[42px]"
                      : "flex gap-4"
                  }
                >
                  <span className="pt-1 text-[13px] font-light text-white/80">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <MilestoneStatusIcon status={milestone.status} />
                  <div className="flex w-full flex-col gap-[10px] sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[15px] font-medium text-white">
                        {milestone.title}
                      </p>
                      <div className="flex items-center gap-3 text-[13px] font-light text-white/80">
                        <span>{milestone.progressLabel}</span>
                        {milestone.status === "queued" && isFreelancer && (
                          <button
                            type="button"
                            onClick={() => setSubmittingMilestone(milestone)}
                            className="text-[#009162] hover:underline"
                          >
                            submit work →
                          </button>
                        )}
                        {milestone.status === "awaiting" && isClient && (
                          <button
                            type="button"
                            onClick={() => setReviewingMilestone(milestone)}
                            className="text-white/50 hover:underline"
                          >
                            review submission →
                          </button>
                        )}
                        {milestone.status === "awaiting" && !isClient && (
                          <span className="text-white/40">
                            awaiting client review
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={
                        milestone.status === "settled"
                          ? "text-[15px] font-medium text-[#009162]"
                          : "text-[15px] font-medium text-white/80"
                      }
                    >
                      {milestone.amount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[15px] border border-[rgba(146,146,146,0.15)] bg-[rgba(17,17,17,0.7)] p-6 md:p-[43px]">
            <h2 className="mb-[37px] text-[16px] font-medium text-white">
              Activity log
            </h2>
            {escrow.activity.length === 0 ? (
              <p className="text-[13px] text-white/50">
                No on-chain activity yet.
              </p>
            ) : (
              <div className="flex flex-col gap-[37px]">
                {escrow.activity.map((entry, i) => (
                  <div
                    key={`${entry.text}-${i}`}
                    className={
                      i < escrow.activity.length - 1
                        ? "flex items-center justify-between gap-6 border-b border-white/10 pb-[37px]"
                        : "flex items-center justify-between gap-6"
                    }
                  >
                    <p className="text-[14px] text-white">{entry.text}</p>
                    <span className="shrink-0 text-[13px] text-white/50">
                      {entry.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="h-fit rounded-[15px] border border-[rgba(146,146,146,0.15)] bg-[rgba(17,17,17,0.7)] p-6 md:p-9">
          <p className="mb-6 text-[14px] font-light uppercase text-white/80">
            Contract
          </p>
          <div className="flex flex-col gap-[15px]">
            <ContractRow
              label="Contract Address"
              value={escrow.id}
              copyable
              truncate
            />
            <ContractRow
              label="Freelancer wallet"
              value={escrow.freelancerWallet}
              copyable
              truncate
            />
            <ContractRow label="Deposit asset" value={escrow.depositAsset} />
            <ContractRow label="Budget" value={escrow.budget} />
            <ContractRow label="Deadline" value={escrow.deadline} />
          </div>
        </div>
      </div>

      <DepositModal
        open={depositOpen}
        escrowAddress={address}
        totalAmountRaw={escrow.totalAmountRaw}
        amountLabel={escrow.budget}
        onClose={() => setDepositOpen(false)}
        onSuccess={() => {
          setDepositOpen(false);
          refetch();
        }}
      />
      <SubmitWorkModal
        open={submittingMilestone !== null}
        escrowAddress={address}
        milestoneIndex={submittingMilestone?.index ?? 0}
        milestoneTitle={submittingMilestone?.title ?? ""}
        onClose={() => setSubmittingMilestone(null)}
        onSuccess={() => {
          setSubmittingMilestone(null);
          refetch();
        }}
      />
      <ReviewProjectModal
        key={reviewingMilestone?.index ?? "closed"}
        open={reviewingMilestone !== null}
        escrowAddress={address}
        milestoneIndex={reviewingMilestone?.index ?? 0}
        milestoneTitle={reviewingMilestone?.title ?? ""}
        workURI={reviewingMilestone?.workURI ?? ""}
        amount={reviewingMilestone?.amount ?? ""}
        freelancerWallet={escrow.freelancerWallet as Address}
        onClose={() => setReviewingMilestone(null)}
        onSuccess={() => {
          setReviewingMilestone(null);
          refetch();
        }}
      />
    </div>
  );
}
