"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FloatingCoins } from "./FloatingCoins";
import { HeroTexture } from "./HeroTexture";
import { useWallet } from "@/hooks/useWallet";
import { ConnectWalletModal } from "@/components/landing/ConnectWalletModal";

export function Hero() {
  const router = useRouter();
  const { isConnected, isConnecting, isWrongNetwork, isSwitching, switchToCoston2 } =
    useWallet();
  const [wantsToCreate, setWantsToCreate] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  useEffect(() => {
    if (wantsToCreate && isConnected && !isWrongNetwork) {
      router.push("/dashboard/create");
    }
  }, [wantsToCreate, isConnected, isWrongNetwork, router]);

  function handleCreateEscrow() {
    setWantsToCreate(true);
    if (!isConnected) {
      setConnectModalOpen(true);
    } else if (isWrongNetwork) {
      switchToCoston2();
    } else {
      router.push("/dashboard/create");
    }
  }

  return (
    <section className="relative isolate overflow-hidden px-6 pb-24 pt-4">
      <HeroTexture />

      {/* ambient glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[700px] w-[1200px] -translate-x-1/2 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,110,60,0.25) 0%, rgba(255,110,60,0) 60%)",
        }}
      />

      <div className="relative mx-auto flex max-w-[900px] flex-col items-center gap-8 pt-24 text-center">
        <div className="flex items-center gap-2 rounded-[100px] border border-[#6a6a6a] bg-white/5 px-4 py-[6px] backdrop-blur-[25px]">
          <Image
            src="/landing/sparkle.svg"
            alt=""
            width={20}
            height={20}
          />
          <span className="text-sm tracking-[-0.28px] text-[#dcdcdc]">
            Built on Flare
          </span>
        </div>

        <div className="flex flex-col items-center gap-4">
          <h1 className="text-[44px] font-medium leading-[1.15] tracking-[-1.5px] text-white sm:text-[56px] md:text-[75px] md:leading-[90px] md:tracking-[-3px]">
            Cross-chain Escrow Built on{" "}
            <span className="font-serif-italic italic">Trust</span>
          </h1>
          <p className="max-w-[661px] text-[15px] leading-[23px] tracking-[-0.6px] text-[#eee]">
            Lock FXRP in trustless, milestone-based escrow. Release locally on
            Flare, bridge cross-chain via LayerZero, or swap to a stablecoin
            on payout — no centralized custodian, ever.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-5">
          <button
            type="button"
            onClick={handleCreateEscrow}
            disabled={isConnecting || isSwitching}
            className="rounded-[39px] bg-gradient-to-b from-[#ff846d] to-[#fc310c] px-6 py-2.5 text-[14px] font-semibold text-white shadow-[inset_0px_0.5px_0px_0px_rgba(255,255,255,0.32),inset_0px_-1.5px_0px_0px_rgba(255,255,255,0.32)] disabled:opacity-60"
          >
            {isConnecting
              ? "Connecting..."
              : isSwitching
                ? "Switching..."
                : "Create Escrow"}
          </button>
          <button
            type="button"
            className="hidden rounded-[39px] border-2 border-[#ff460b] px-6 py-2.5 text-[14px] font-semibold tracking-[-0.2px] text-[#ff460b] sm:inline-flex"
          >
            See How it Works
          </button>
        </div>
      </div>

      <div className="relative mx-auto h-[280px] max-w-[1200px] md:h-[420px]">
        <FloatingCoins />
      </div>

      <ConnectWalletModal
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
      />
    </section>
  );
}
