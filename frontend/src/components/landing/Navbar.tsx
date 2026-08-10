"use client";

import Image from "next/image";
import { useWallet, truncateAddress } from "@/hooks/useWallet";

const navLinks = [
  { label: "Home", active: true },
  { label: "About", active: false },
  { label: "Security", active: false },
  { label: "Docs", active: false },
];

export function Navbar() {
  const {
    address,
    isConnected,
    isConnecting,
    isSwitching,
    isWrongNetwork,
    connectWallet,
    disconnect,
    switchToCoston2,
  } = useWallet();

  let walletLabel = "Connect Wallet";
  let walletAction = connectWallet;
  if (isConnecting) {
    walletLabel = "Connecting...";
  } else if (isWrongNetwork) {
    walletLabel = isSwitching ? "Switching..." : "Switch to Coston2";
    walletAction = switchToCoston2;
  } else if (isConnected && address) {
    walletLabel = truncateAddress(address);
    walletAction = () => disconnect();
  }

  return (
    <header className="relative z-20 mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-10 lg:px-[71px]">
      <div className="flex items-end gap-[9px]">
        <Image
          src="/landing/logo-frame.svg"
          alt="Pistis logo"
          width={20}
          height={25}
          className="h-[25px] w-5"
        />
        <span className="text-xl font-medium tracking-[-0.6px] text-[#f0f0f0]">
          Pistis
        </span>
      </div>

      <nav className="hidden items-center gap-1 rounded-[90px] bg-white/10 p-2 backdrop-blur-[20px] md:flex">
        {navLinks.map((link) => (
          <button
            key={link.label}
            type="button"
            className={
              link.active
                ? "rounded-[90px] bg-gradient-to-b from-[#fc5016] to-[#ff8961] px-[18px] py-2 text-[15px] text-white"
                : "px-[18px] py-2 text-[15px] text-white"
            }
          >
            {link.label}
          </button>
        ))}
      </nav>

      <button
        type="button"
        onClick={walletAction}
        disabled={isConnecting || isSwitching}
        className="hidden rounded-[90px] bg-gradient-to-b from-[#ff846d] to-[#fc310c] px-[19px] py-3 text-[15px] font-semibold tracking-[0.2px] text-white disabled:opacity-60 md:block"
      >
        {walletLabel}
      </button>
    </header>
  );
}
