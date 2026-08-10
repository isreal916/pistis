"use client";

import { useState } from "react";
import { erc20Abi, type Address } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";
import { useFxrpBalance } from "@/hooks/useFxrpBalance";
import { pistisAbi } from "@/lib/pistis";
import { SuccessConfetti } from "@/components/dashboard/SuccessConfetti";

type Props = {
  open: boolean;
  escrowAddress: Address;
  totalAmountRaw: bigint;
  amountLabel: string;
  onClose: () => void;
  onSuccess: () => void;
};

type Step = "form" | "approving" | "depositing" | "success";

export function DepositModal({
  open,
  escrowAddress,
  totalAmountRaw,
  amountLabel,
  onClose,
  onSuccess,
}: Props) {
  const { fxrpAddress, formatted, balance } = useFxrpBalance();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState("");

  if (!open) return null;

  function handleClose() {
    if (step === "approving" || step === "depositing") return;
    setStep("form");
    setError("");
    onClose();
  }

  async function handleDeposit() {
    if (!publicClient || !fxrpAddress) {
      setError("Not connected to Coston2 yet — try again in a moment.");
      return;
    }
    if (balance !== undefined && balance < totalAmountRaw) {
      setError("Your FXRP balance is below the escrow total.");
      return;
    }

    try {
      setStep("approving");
      const approveHash = await writeContractAsync({
        address: fxrpAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [escrowAddress, totalAmountRaw],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      setStep("depositing");
      const depositHash = await writeContractAsync({
        address: escrowAddress,
        abi: pistisAbi,
        functionName: "deposit",
      });
      await publicClient.waitForTransactionReceipt({ hash: depositHash });

      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed. Try again.");
      setStep("form");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[480px] rounded-[36px] border border-[rgba(146,146,146,0.15)] bg-[#111] p-6 shadow-[-29px_49px_120px_0px_rgba(0,0,0,0.25)]">
        {step === "form" && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-[19px] font-bold text-white">Deposit FXRP</h3>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[#fc3116] text-[28px] text-white"
              >
                ✕
              </button>
            </div>

            <p className="mb-6 rounded-[8px] border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white/50">
              Two wallet confirmations: approve, then deposit — pulls{" "}
              <span className="text-white/80">{amountLabel}</span> into this
              escrow.
            </p>

            <div className="mb-6 flex items-center justify-between rounded-[8px] border border-white/10 px-4 py-3">
              <span className="text-[13px] text-white/70">Your FXRP balance</span>
              <span className="text-[13px] text-white">
                {formatted !== undefined ? `${formatted} FXRP` : "Loading..."}
              </span>
            </div>

            {error && <p className="mb-4 text-[13px] text-[#ff460b]">{error}</p>}

            <button
              type="button"
              onClick={handleDeposit}
              className="flex h-[50px] w-full items-center justify-center rounded-[30px] bg-gradient-to-b from-[#fc5016] to-[#ff8961] text-[14px] text-white"
            >
              Deposit {amountLabel}
            </button>
          </>
        )}

        {(step === "approving" || step === "depositing") && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#ff460b]" />
            <p className="text-[14px] text-white/70">
              {step === "approving"
                ? "Confirm the FXRP approval in your wallet..."
                : "Confirm the deposit in your wallet..."}
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <SuccessConfetti />
            <p className="text-[16px] text-white">Escrow funded</p>
            <p className="max-w-[360px] text-[12px] text-white/50">
              {amountLabel} is now locked in this escrow.
            </p>
            <button
              type="button"
              onClick={() => {
                setStep("form");
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
