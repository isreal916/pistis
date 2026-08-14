"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { erc20Abi, formatEther, isAddress, parseUnits, zeroAddress, type Address } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";
import { pistisAbi, BRIDGE_DESTINATIONS } from "@/lib/pistis";
import { buildLzReceiveOptions, DEFAULT_LZ_RECEIVE_GAS } from "@/lib/layerzero-options";
import { SuccessConfetti } from "@/components/dashboard/SuccessConfetti";

type Props = {
  open: boolean;
  escrowAddress: Address;
  milestoneIndex: number;
  milestoneTitle: string;
  workURI: string;
  amount: string;
  freelancerWallet: Address;
  onClose: () => void;
  onSuccess: () => void;
};

type Step = "review" | "approving" | "approved" | "revision" | "revision-sent" | "error";
type ReleaseMode = "local" | "bridge" | "swap";

const EXTRA_OPTIONS = buildLzReceiveOptions(DEFAULT_LZ_RECEIVE_GAS);

// Plain initials on each chain's real brand color — not a logo mark, just an
// honest, quick way to tell destinations apart without misrepresenting a
// chain's actual icon (we don't have licensed/accurate logo assets on hand).
const DESTINATION_BADGE: Record<number, { label: string; bg: string; fg: string }> = {
  40362: { label: "HL", bg: "#97fce4", fg: "#0a2e27" }, // Hyperliquid Testnet
  40161: { label: "ETH", bg: "#627eea", fg: "#ffffff" }, // Ethereum Sepolia
  40102: { label: "BSC", bg: "#f0b90b", fg: "#1a1a1a" }, // BSC Testnet
  40245: { label: "BASE", bg: "#0052ff", fg: "#ffffff" }, // Base Sepolia
};

export function ReviewProjectModal({
  open,
  escrowAddress,
  milestoneIndex,
  milestoneTitle,
  workURI,
  amount,
  freelancerWallet,
  onClose,
  onSuccess,
}: Props) {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [step, setStep] = useState<Step>("review");
  const [revisionNotes, setRevisionNotes] = useState("");
  const [error, setError] = useState("");
  const [releaseMode, setReleaseMode] = useState<ReleaseMode>("local");
  // Initialized from the prop; the parent remounts this component (via a
  // `key` on the milestone being reviewed) whenever that should reset,
  // rather than syncing it here with an effect.
  const [recipient, setRecipient] = useState<string>(freelancerWallet);
  const [dstEid, setDstEid] = useState<number>(BRIDGE_DESTINATIONS[0].eid);
  const destination = BRIDGE_DESTINATIONS.find((d) => d.eid === dstEid) ?? BRIDGE_DESTINATIONS[0];
  const [bridgeTxHash, setBridgeTxHash] = useState<string | null>(null);

  const canQuote = open && releaseMode === "bridge" && Boolean(publicClient) && isAddress(recipient);

  const { data: quotedFee, isFetching: quoting } = useQuery({
    queryKey: ["bridgeFee", escrowAddress, milestoneIndex, recipient, dstEid],
    queryFn: async () => {
      const [nativeFee] = await publicClient!.readContract({
        address: escrowAddress,
        abi: pistisAbi,
        functionName: "quoteBridgeFee",
        args: [BigInt(milestoneIndex), dstEid, recipient as Address, EXTRA_OPTIONS],
      });
      return nativeFee;
    },
    enabled: canQuote,
  });

  // Only true when this escrow's factory actually configured a DEX router —
  // e.g. false on every Coston2 escrow today, since SparkDEX (the only real
  // FXRP/USDT0 pool) exists on Flare Mainnet only. Never shown as available
  // when it isn't.
  const { data: swapConfig } = useQuery({
    queryKey: ["swapConfig", escrowAddress],
    queryFn: async () => {
      const [router, token] = await Promise.all([
        publicClient!.readContract({ address: escrowAddress, abi: pistisAbi, functionName: "swapRouter" }),
        publicClient!.readContract({ address: escrowAddress, abi: pistisAbi, functionName: "swapToken" }),
      ]);
      if (token === zeroAddress) return { router, token, symbol: "", decimals: 18 };
      const [symbol, decimals] = await Promise.all([
        publicClient!.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }),
        publicClient!.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }),
      ]);
      return { router, token, symbol, decimals };
    },
    enabled: open && Boolean(publicClient),
  });
  const swapAvailable = Boolean(swapConfig && swapConfig.token !== zeroAddress);
  const [minAmountOut, setMinAmountOut] = useState("0");

  if (!open) return null;

  function handleClose() {
    if (step === "approving") return;
    setStep("review");
    setRevisionNotes("");
    setError("");
    setReleaseMode("local");
    setDstEid(BRIDGE_DESTINATIONS[0].eid);
    setBridgeTxHash(null);
    onClose();
  }

  async function handleApprove() {
    if (!publicClient) {
      setError("Not connected to Coston2 yet — try again in a moment.");
      setStep("error");
      return;
    }
    try {
      setStep("approving");
      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: pistisAbi,
        functionName: "approveMilestone",
        args: [BigInt(milestoneIndex)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setStep("approved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed. Try again.");
      setStep("error");
    }
  }

  async function handleApproveAndBridge() {
    if (!publicClient) {
      setError("Not connected to Coston2 yet — try again in a moment.");
      setStep("error");
      return;
    }
    if (!isAddress(recipient)) {
      setError("Enter a valid recipient address on the destination chain.");
      setStep("error");
      return;
    }
    if (quotedFee === undefined) {
      setError("Still fetching the bridge fee quote — try again in a moment.");
      setStep("error");
      return;
    }
    try {
      setStep("approving");
      // Small buffer over the quoted fee — the contract refunds anything
      // unused, so overpaying slightly protects against the quote going
      // stale between the read and the tx landing.
      const value = (quotedFee * BigInt(12)) / BigInt(10);
      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: pistisAbi,
        functionName: "approveMilestoneAndBridge",
        args: [BigInt(milestoneIndex), dstEid, recipient, EXTRA_OPTIONS],
        value,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setBridgeTxHash(hash);
      setStep("approved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed. Try again.");
      setStep("error");
    }
  }

  async function handleApproveAndSwap() {
    if (!publicClient || !swapConfig) {
      setError("Not connected to Coston2 yet — try again in a moment.");
      setStep("error");
      return;
    }
    try {
      setStep("approving");
      const minAmountOutUnits = parseUnits(minAmountOut || "0", swapConfig.decimals);
      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: pistisAbi,
        functionName: "approveMilestoneAndSwap",
        args: [BigInt(milestoneIndex), minAmountOutUnits],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setStep("approved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed. Try again.");
      setStep("error");
    }
  }

  function handleSendRevision(e: React.FormEvent) {
    e.preventDefault();
    // Pistis's contract has no on-chain "request revision" state — a
    // submitted milestone can only be approved, not sent back to pending.
    // This is a local-only note to the freelancer, not an on-chain action.
    setStep("revision-sent");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[540px] rounded-[36px] border border-[rgba(146,146,146,0.15)] bg-[#111] p-6 shadow-[-29px_49px_120px_0px_rgba(0,0,0,0.25)]">
        {(step === "review" || step === "approving" || step === "error") && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-[19px] font-bold text-white">
                Review Project
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

            {step === "approving" ? (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#ff460b]" />
                <p className="text-[14px] text-white/70">
                  Confirm in your wallet, then waiting for confirmation...
                </p>
              </div>
            ) : (
              <>
                <p className="mb-6 rounded-[30px] bg-[#1c1c1c] px-[24px] py-[24px] text-[14px] leading-[1.5] text-white/80 break-words">
                  {workURI || "No work submitted yet."}
                </p>

                <div className="mb-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReleaseMode("local")}
                    className={
                      releaseMode === "local"
                        ? "flex-1 rounded-[10px] bg-white/10 px-4 py-2.5 text-[13px] text-white"
                        : "flex-1 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13px] text-white/50"
                    }
                  >
                    Release on Flare
                  </button>
                  <button
                    type="button"
                    onClick={() => setReleaseMode("bridge")}
                    className={
                      releaseMode === "bridge"
                        ? "flex-1 rounded-[10px] bg-white/10 px-4 py-2.5 text-[13px] text-white"
                        : "flex-1 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13px] text-white/50"
                    }
                  >
                    Bridge Cross-chain
                  </button>
                  {swapAvailable && (
                    <button
                      type="button"
                      onClick={() => setReleaseMode("swap")}
                      className={
                        releaseMode === "swap"
                          ? "flex-1 rounded-[10px] bg-white/10 px-4 py-2.5 text-[13px] text-white"
                          : "flex-1 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13px] text-white/50"
                      }
                    >
                      Swap to {swapConfig?.symbol}
                    </button>
                  )}
                </div>

                {releaseMode === "bridge" && (
                  <div className="mb-4 flex flex-col gap-3 rounded-[10px] border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-col gap-[8px]">
                      <span className="text-[12px] text-white/60">
                        Destination chain
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {BRIDGE_DESTINATIONS.map((d) => (
                          <button
                            key={d.eid}
                            type="button"
                            onClick={() => setDstEid(d.eid)}
                            className={
                              dstEid === d.eid
                                ? "flex items-center gap-2 rounded-[10px] border border-[#ff460b]/60 bg-[#ff460b]/10 px-3 py-2 text-left"
                                : "flex items-center gap-2 rounded-[10px] border border-white/10 px-3 py-2 text-left hover:border-white/25"
                            }
                          >
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold"
                              style={{
                                backgroundColor: DESTINATION_BADGE[d.eid].bg,
                                color: DESTINATION_BADGE[d.eid].fg,
                              }}
                            >
                              {DESTINATION_BADGE[d.eid].label}
                            </span>
                            <span className="text-[12px] text-white">
                              {d.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="flex flex-col gap-[8px]">
                      <span className="text-[12px] text-white/60">
                        Recipient on {destination.label}
                      </span>
                      <input
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="0x..."
                        className="h-[46px] rounded-[8px] border border-white/20 bg-transparent px-3 text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#ff460b]"
                      />
                    </label>
                    <p className="text-[12px] text-white/50">
                      {!isAddress(recipient)
                        ? "Enter a valid address to get a fee quote."
                        : quoting
                          ? "Quoting LayerZero fee..."
                          : quotedFee !== undefined
                            ? `Bridge fee: ~${formatEther(quotedFee)} C2FLR (via LayerZero)`
                            : "Couldn't fetch a quote — try again."}
                    </p>
                  </div>
                )}

                {releaseMode === "swap" && swapConfig && (
                  <div className="mb-4 flex flex-col gap-3 rounded-[10px] border border-white/10 bg-white/5 p-4">
                    <p className="text-[12px] text-white/50">
                      Swaps this milestone&apos;s FXRP for {swapConfig.symbol}{" "}
                      via SparkDEX and pays the freelancer directly in{" "}
                      {swapConfig.symbol}.
                    </p>
                    <label className="flex flex-col gap-[8px]">
                      <span className="text-[12px] text-white/60">
                        Minimum {swapConfig.symbol} out (slippage protection)
                      </span>
                      <input
                        value={minAmountOut}
                        onChange={(e) => setMinAmountOut(e.target.value)}
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        className="h-[46px] rounded-[8px] border border-white/20 bg-transparent px-3 text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#ff460b]"
                      />
                    </label>
                    <p className="text-[12px] text-white/40">
                      0 accepts any output — set a real minimum to protect
                      against price movement.
                    </p>
                  </div>
                )}

                {error && (
                  <p className="mb-4 text-[13px] text-[#ff460b]">{error}</p>
                )}

                <div className="flex flex-col gap-[15px]">
                  {releaseMode === "local" && (
                    <button
                      type="button"
                      onClick={handleApprove}
                      className="flex h-[50px] items-center justify-center rounded-[30px] bg-gradient-to-b from-[#fc5016] to-[#ff8961] text-[14px] text-white"
                    >
                      Approve and release {amount}
                    </button>
                  )}
                  {releaseMode === "bridge" && (
                    <button
                      type="button"
                      onClick={handleApproveAndBridge}
                      disabled={!isAddress(recipient) || quotedFee === undefined}
                      className="flex h-[50px] items-center justify-center rounded-[30px] bg-gradient-to-b from-[#fc5016] to-[#ff8961] text-[14px] text-white disabled:opacity-50"
                    >
                      Approve and bridge {amount}
                    </button>
                  )}
                  {releaseMode === "swap" && (
                    <button
                      type="button"
                      onClick={handleApproveAndSwap}
                      disabled={!swapConfig}
                      className="flex h-[50px] items-center justify-center rounded-[30px] bg-gradient-to-b from-[#fc5016] to-[#ff8961] text-[14px] text-white disabled:opacity-50"
                    >
                      Approve and swap {amount}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setStep("revision")}
                    className="flex h-[50px] items-center justify-center rounded-[10px] border-2 border-[#916300] text-[14px] text-[#916300]"
                  >
                    Request Revision
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {step === "revision" && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-[19px] font-bold text-white">
                Review Project
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

            <p className="mb-4 rounded-[8px] border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white/50">
              This just prepares a note — share it with the freelancer
              directly. The milestone stays &quot;awaiting review&quot; until
              you approve it.
            </p>

            <form onSubmit={handleSendRevision} className="flex flex-col gap-6">
              <label className="flex flex-col gap-[10px]">
                <span className="text-[14px] font-semibold text-white">
                  What needs to be changed
                </span>
                <textarea
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  rows={4}
                  placeholder="Explain what's missing or needs rework"
                  className="resize-none rounded-[30px] bg-[#1c1c1c] px-[37px] py-[25px] text-[15px] text-white outline-none placeholder:text-white/50"
                />
              </label>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep("review")}
                  className="text-[14px] text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex h-[50px] w-[220px] items-center justify-center rounded-[10px] border-2 border-[#916300] text-[14px] text-[#916300]"
                >
                  Save Note
                </button>
              </div>
            </form>
          </>
        )}

        {step === "approved" && (
          <div className="flex flex-col items-center gap-[25px] py-6 text-center">
            <SuccessConfetti />
            <p className="text-[20px] font-bold tracking-[-0.5px] text-white">
              {milestoneTitle} approved
            </p>
            <p className="text-[16px] leading-[1.45] text-white/70">
              {amount}{" "}
              {releaseMode === "bridge"
                ? `bridged to ${destination.label}`
                : releaseMode === "swap"
                  ? `swapped to ${swapConfig?.symbol} and paid to the freelancer`
                  : "released to the freelancer"}
              .
            </p>
            {releaseMode === "bridge" && bridgeTxHash && (
              <div className="flex flex-col items-center gap-1 rounded-[10px] border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[12px] text-white/50">
                  This confirms Coston2 sent it — delivery on{" "}
                  {destination.label} takes a few minutes via LayerZero.
                </p>
                <a
                  href={`https://testnet.layerzeroscan.com/tx/${bridgeTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] font-semibold text-[#ff460b] hover:underline"
                >
                  Track delivery on LayerZero Scan →
                </a>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setStep("review");
                onSuccess();
              }}
              className="mt-2 rounded-[39px] border-2 border-[#ff460b] px-6 py-2.5 text-[14px] font-semibold text-[#ff460b]"
            >
              Done
            </button>
          </div>
        )}

        {step === "revision-sent" && (
          <div className="flex flex-col items-center gap-[25px] py-6 text-center">
            <SuccessConfetti />
            <p className="text-[20px] font-bold tracking-[-0.5px] text-white">
              Note saved
            </p>
            <p className="text-[16px] leading-[1.45] text-white/70">
              Share this with the freelancer for {milestoneTitle} — the
              milestone stays open either way.
            </p>
            <button
              type="button"
              onClick={handleClose}
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
