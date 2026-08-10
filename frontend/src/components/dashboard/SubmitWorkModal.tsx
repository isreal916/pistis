"use client";

import { useState } from "react";
import type { Address } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";
import { pistisAbi } from "@/lib/pistis";
import { SuccessConfetti } from "@/components/dashboard/SuccessConfetti";

type Props = {
  open: boolean;
  escrowAddress: Address;
  milestoneIndex: number;
  milestoneTitle: string;
  onClose: () => void;
  onSuccess: () => void;
};

type Step = "form" | "submitting" | "success";

export function SubmitWorkModal({
  open,
  escrowAddress,
  milestoneIndex,
  milestoneTitle,
  onClose,
  onSuccess,
}: Props) {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [proofUrl, setProofUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [formError, setFormError] = useState("");

  if (!open) return null;

  function reset() {
    setProofUrl("");
    setNotes("");
    setStep("form");
    setFormError("");
  }

  function handleClose() {
    if (step === "submitting") return;
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!proofUrl.trim()) {
      setFormError("Add a link to the delivered work.");
      return;
    }
    if (!publicClient) {
      setFormError("Not connected to Coston2 yet — try again in a moment.");
      return;
    }

    const workURI = notes.trim() ? `${proofUrl.trim()} — ${notes.trim()}` : proofUrl.trim();

    try {
      setStep("submitting");
      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: pistisAbi,
        functionName: "submitMilestone",
        args: [BigInt(milestoneIndex), workURI],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setStep("success");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Transaction failed. Try again."
      );
      setStep("form");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-[480px] overflow-hidden rounded-[36px] border border-[rgba(146,146,146,0.15)] bg-[#111] p-6 shadow-[-29px_49px_120px_0px_rgba(0,0,0,0.25)]">
        {step === "form" && (
          <>
            <div className="mb-8 flex items-center justify-between">
              <h3 className="text-[19px] font-bold text-white">
                Submit Work
              </h3>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[#fc3116] text-[28px] text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <p className="rounded-[8px] border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white/50">
                Submitting <span className="text-white/80">{milestoneTitle}</span>{" "}
                — you&apos;ll be asked to confirm in your wallet.
              </p>

              <label className="flex flex-col gap-[10px]">
                <span className="text-[14px] font-semibold text-white">
                  Link to work
                </span>
                <input
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-[70px] rounded-[30px] bg-[#1c1c1c] px-[37px] text-[15px] text-white outline-none placeholder:text-white/50"
                />
              </label>

              <label className="flex flex-col gap-[10px]">
                <span className="text-[14px] font-semibold text-white">
                  Notes (optional)
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="What's ready for review?"
                  className="resize-none rounded-[30px] bg-[#1c1c1c] px-[37px] py-[25px] text-[15px] text-white outline-none placeholder:text-white/50"
                />
              </label>

              {formError && (
                <p className="text-[13px] text-[#ff460b]">{formError}</p>
              )}

              <button
                type="submit"
                className="flex h-[50px] items-center justify-center rounded-[30px] bg-gradient-to-b from-[#fc5016] to-[#ff8961] text-[14px] text-white"
              >
                Submit Work
              </button>
            </form>
          </>
        )}

        {step === "submitting" && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#ff460b]" />
            <p className="text-[14px] text-white/70">
              Confirm in your wallet, then waiting for confirmation...
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="relative flex flex-col items-center gap-[25px] py-6 text-center">
            <button
              type="button"
              onClick={() => {
                reset();
                onSuccess();
              }}
              aria-label="Close"
              className="absolute right-0 top-0 flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[#fc3116] text-[28px] text-white"
            >
              ✕
            </button>

            <SuccessConfetti />

            <p className="text-[22px] font-bold tracking-[-0.6px] text-white">
              Work Submitted
            </p>
            <p className="text-[16px] leading-[1.45] text-white/70">
              Awaiting client review and release.
            </p>
            <button
              type="button"
              onClick={() => {
                reset();
                onSuccess();
              }}
              className="mt-2 rounded-[39px] border-2 border-[#ff460b] px-6 py-2.5 text-[14px] font-semibold text-[#ff460b]"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
