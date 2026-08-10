"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { isAddress, parseEventLogs, parseUnits } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";
import { useWallet, truncateAddress } from "@/hooks/useWallet";
import { useFxrpBalance } from "@/hooks/useFxrpBalance";
import { pistisFactoryAbi, PISTIS_FACTORY_COSTON2 } from "@/lib/pistis";
import { SuccessConfetti } from "@/components/dashboard/SuccessConfetti";

type Milestone = {
  title: string;
  percent: string;
};

type Step = "form" | "submitting" | "success";

function newMilestone(): Milestone {
  return { title: "", percent: "" };
}

export function CreateEscrowForm() {
  const {
    address,
    isConnected,
    isConnecting,
    isWrongNetwork,
    isSwitching,
    connectWallet,
    switchToCoston2,
  } = useWallet();
  const { decimals } = useFxrpBalance();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [freelancerWallet, setFreelancerWallet] = useState("");
  const [budget, setBudget] = useState("");
  const [depositAsset, setDepositAsset] = useState("FXRP");
  const [deadline, setDeadline] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>([
    newMilestone(),
    newMilestone(),
  ]);
  const [step, setStep] = useState<Step>("form");
  const [escrowAddress, setEscrowAddress] = useState("");
  const [formError, setFormError] = useState("");

  function updateMilestone(index: number, patch: Partial<Milestone>) {
    setMilestones((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...patch } : m))
    );
  }

  function removeMilestone(index: number) {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  }

  function addMilestone() {
    setMilestones((prev) => [...prev, newMilestone()]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!projectName.trim()) {
      setFormError("Enter a project name.");
      return;
    }
    if (!isAddress(freelancerWallet)) {
      setFormError("Enter a valid freelancer wallet address.");
      return;
    }
    const budgetNum = Number(budget);
    if (!budgetNum || budgetNum <= 0) {
      setFormError("Enter a project budget greater than 0.");
      return;
    }
    if (milestones.length === 0) {
      setFormError("Add at least one milestone.");
      return;
    }
    for (const m of milestones) {
      if (!m.title.trim()) {
        setFormError("Every milestone needs a title.");
        return;
      }
    }
    const percentSum = milestones.reduce((sum, m) => sum + Number(m.percent || 0), 0);
    if (Math.round(percentSum) !== 100) {
      setFormError(`Milestone percentages must add up to 100 (currently ${percentSum}).`);
      return;
    }
    if (decimals === undefined || !publicClient) {
      setFormError("Still resolving FXRP on Coston2 — try again in a moment.");
      return;
    }

    // Split the budget across milestones by percent, in basis points to avoid
    // float rounding, then push any remainder onto the last milestone so the
    // amounts sum exactly to the entered budget.
    const totalUnits = parseUnits(budget, decimals);
    const amounts = milestones.map((m) => {
      const bips = BigInt(Math.round(Number(m.percent) * 100));
      return (totalUnits * bips) / BigInt(10_000);
    });
    const allocated = amounts.reduce((sum, a) => sum + a, BigInt(0));
    amounts[amounts.length - 1] += totalUnits - allocated;

    // `<input type="date">` gives midnight local time; the contract only
    // stores a plain Unix timestamp (0 = no deadline).
    const deadlineUnix = deadline ? BigInt(Math.floor(new Date(deadline).getTime() / 1000)) : BigInt(0);

    try {
      setStep("submitting");
      const hash = await writeContractAsync({
        address: PISTIS_FACTORY_COSTON2,
        abi: pistisFactoryAbi,
        functionName: "createEscrow",
        args: [
          freelancerWallet as `0x${string}`,
          milestones.map((m) => m.title.trim()),
          amounts,
          deadlineUnix,
        ],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const [deployedEvent] = parseEventLogs({
        abi: pistisFactoryAbi,
        eventName: "EscrowDeployed",
        logs: receipt.logs,
      });
      if (!deployedEvent) throw new Error("Could not read the new escrow address from the transaction.");

      setEscrowAddress(deployedEvent.args.escrow);
      setStep("success");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Transaction failed. Try again."
      );
      setStep("form");
    }
  }

  if (step === "success") {
    return (
      <div className="overflow-hidden rounded-[36px] border border-[rgba(146,146,146,0.15)] bg-[#111] p-10 text-center shadow-[-29px_49px_120px_0px_rgba(0,0,0,0.25)]">
        <div className="mx-auto max-w-[300px]">
          <SuccessConfetti />
        </div>
        <p className="text-[16px] text-white">Escrow created</p>
        <p className="mx-auto mt-2 max-w-[420px] text-[13px] text-white/50">
          Deployed on Coston2 — next step is depositing FXRP into it from the
          escrow&apos;s page.
        </p>
        <Link
          href={`/dashboard/escrow/${escrowAddress}`}
          className="mt-6 inline-block rounded-[39px] bg-gradient-to-b from-[#fc5016] to-[#ff8961] px-6 py-2.5 text-[14px] font-semibold text-white"
        >
          View escrow
        </Link>
      </div>
    );
  }

  if (!isConnected || isWrongNetwork) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[36px] border border-[rgba(146,146,146,0.15)] bg-[#111] py-16 text-center shadow-[-29px_49px_120px_0px_rgba(0,0,0,0.25)]">
        <p className="text-[14px] text-white/70">
          {!isConnected
            ? "Connect your wallet to create an escrow."
            : "Switch to Flare Testnet Coston2 to continue."}
        </p>
        <button
          type="button"
          onClick={!isConnected ? connectWallet : switchToCoston2}
          disabled={isConnecting || isSwitching}
          className="rounded-[39px] bg-gradient-to-b from-[#ff846d] to-[#fc310c] px-6 py-2.5 text-[14px] font-semibold tracking-[0.2px] text-white disabled:opacity-60"
        >
          {!isConnected
            ? isConnecting
              ? "Connecting..."
              : "Connect Wallet"
            : isSwitching
              ? "Switching..."
              : "Switch to Coston2"}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6"
      aria-busy={step === "submitting"}
    >
      <div className="rounded-[36px] border border-[rgba(146,146,146,0.15)] bg-[#111] p-6 shadow-[-29px_49px_120px_0px_rgba(0,0,0,0.25)] md:p-[43px]">
        <p className="mb-8 text-[12px] uppercase tracking-wide text-white/60">
          Project
        </p>

        <div className="flex flex-col gap-[35px]">
          <label className="flex flex-col gap-[15px]">
            <span className="text-[14px] font-semibold text-white">
              Project Name
            </span>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g website redesign"
              className="h-[70px] rounded-[30px] bg-[#1c1c1c] px-[37px] text-[15px] text-white outline-none placeholder:text-white/50"
            />
          </label>

          <label className="flex flex-col gap-[15px]">
            <span className="text-[14px] font-semibold text-white">
              Project Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What’s ready for review?"
              className="resize-none rounded-[30px] bg-[#1c1c1c] px-[37px] py-[25px] text-[15px] text-white outline-none placeholder:text-white/50"
            />
          </label>

          <p className="text-[12px] text-white/40">
            Name and description are for your reference only — the contract
            stores milestone titles, amounts, and the deadline below.
          </p>

          <label className="flex flex-col gap-[15px]">
            <span className="text-[14px] font-semibold text-white">
              Freelancer Wallet
            </span>
            <input
              value={freelancerWallet}
              onChange={(e) => setFreelancerWallet(e.target.value)}
              placeholder="0x..."
              className="h-[70px] rounded-[30px] bg-[#1c1c1c] px-[37px] text-[15px] text-white outline-none placeholder:text-white/50"
            />
          </label>

          <div className="flex flex-col gap-[25px] md:flex-row md:items-center">
            <label className="flex flex-1 flex-col gap-[15px]">
              <span className="text-[14px] font-semibold text-white">
                Project Budget
              </span>
              <input
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                type="number"
                min="0"
                step="any"
                placeholder="500"
                className="h-[70px] rounded-[30px] bg-[#1c1c1c] px-[37px] text-[15px] text-white outline-none placeholder:text-white/50"
              />
            </label>
            <label className="flex flex-1 flex-col gap-[15px]">
              <span className="text-[14px] font-semibold text-white">
                Deposit Asset
              </span>
              <select
                value={depositAsset}
                onChange={(e) => setDepositAsset(e.target.value)}
                className="h-[70px] rounded-[30px] bg-[#1c1c1c] px-[37px] text-[15px] text-white outline-none"
              >
                <option value="FXRP">FXRP</option>
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-[15px]">
            <span className="text-[14px] font-semibold text-white">
              Project Deadline
            </span>
            <input
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              type="date"
              className="h-[70px] rounded-[30px] bg-[#1c1c1c] px-[37px] text-[15px] text-white outline-none [color-scheme:dark]"
            />
          </label>
        </div>
      </div>

      <div className="rounded-[36px] border border-[rgba(146,146,146,0.15)] bg-[#111] p-6 shadow-[-29px_49px_120px_0px_rgba(0,0,0,0.25)] md:p-[43px]">
        <div className="mb-8 flex items-center justify-between">
          <p className="text-[12px] uppercase tracking-wide text-white/60">
            Milestones
          </p>
          <p className="text-[12px] text-white/40">Percentages must total 100</p>
        </div>

        <div className="flex flex-col gap-[25px]">
          {milestones.map((milestone, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-[28px]"
            >
              <span className="text-[15px] text-white/50">
                {String(i + 1).padStart(2, "0")}
              </span>
              <input
                value={milestone.title}
                onChange={(e) =>
                  updateMilestone(i, { title: e.target.value })
                }
                placeholder="Milestone title"
                className="h-[70px] flex-1 rounded-[30px] bg-[#1c1c1c] px-[37px] text-[15px] text-white outline-none placeholder:text-white/50"
              />
              <div className="flex items-center gap-3">
                <input
                  value={milestone.percent}
                  onChange={(e) =>
                    updateMilestone(i, { percent: e.target.value })
                  }
                  type="number"
                  min="0"
                  max="100"
                  placeholder="25"
                  className="h-[70px] w-full rounded-[30px] bg-[#1c1c1c] px-[37px] text-[15px] text-white outline-none placeholder:text-white/50 sm:w-[140px]"
                />
                <span className="text-[15px] text-white/50">%</span>
                <button
                  type="button"
                  onClick={() => removeMilestone(i)}
                  aria-label="Remove milestone"
                  disabled={milestones.length === 1}
                  className="shrink-0 disabled:opacity-30"
                >
                  <Image
                    src="/dashboard/trash-icon.svg"
                    alt=""
                    width={18}
                    height={20}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addMilestone}
          className="mt-8 text-[14px] text-[#ff3e00]"
        >
          + Add Milestone
        </button>
      </div>

      {formError && (
        <p className="text-[13px] text-[#ff460b]">{formError}</p>
      )}

      <p className="text-[12px] text-white/40">
        Connected as {address ? truncateAddress(address) : ""}
      </p>

      <button
        type="submit"
        disabled={step === "submitting"}
        className="flex h-[50px] w-full items-center justify-center self-end rounded-[30px] bg-gradient-to-b from-[#fc5016] to-[#ff8961] text-[14px] text-white disabled:opacity-60 md:w-[335px]"
      >
        {step === "submitting" ? "Creating..." : "Create Escrow"}
      </button>
    </form>
  );
}
