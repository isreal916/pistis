"use client";

import { useState } from "react";
import Image from "next/image";
import { useWallet, truncateAddress } from "@/hooks/useWallet";
import { ConnectWalletModal } from "@/components/landing/ConnectWalletModal";

const navLinks = [
  { label: "Home", active: true },
  { label: "About", active: false },
  { label: "Security", active: false },
  { label: "Docs", active: false },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const {
    address,
    isConnected,
    isConnecting,
    isSwitching,
    isWrongNetwork,
    disconnect,
    switchToCoston2,
  } = useWallet();

  let walletLabel = "Connect Wallet";
  let walletAction: () => void = () => setConnectModalOpen(true);
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
    <header className="relative z-20 mx-auto w-full max-w-[1440px] px-6 py-6 md:py-10 lg:px-[71px]">
      {/* Mobile: logo + hamburger in one pill (matches Figma node 21:344) */}
      <div className="flex items-center justify-between rounded-[90px] bg-white/10 px-4 py-2 backdrop-blur-[20px] md:hidden">
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
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          className={
            menuOpen
              ? "flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#ff846d] to-[#fc310c] text-white"
              : "flex h-[38px] w-[38px] shrink-0 items-center justify-center"
          }
        >
          {menuOpen ? (
            "✕"
          ) : (
            <Image
              src="/landing/hamburger-icon.svg"
              alt=""
              width={27}
              height={18}
            />
          )}
        </button>
      </div>

      {menuOpen && (
        <div className="mt-3 flex flex-col gap-3 rounded-[24px] border border-white/10 bg-[#111] p-3 md:hidden">
          <button
            type="button"
            onClick={() => {
              walletAction();
              setMenuOpen(false);
            }}
            disabled={isConnecting || isSwitching}
            className="rounded-[16px] bg-gradient-to-b from-[#ff846d] to-[#fc310c] px-[18px] py-3 text-[15px] font-semibold text-white disabled:opacity-60"
          >
            {walletLabel}
          </button>
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={() => setMenuOpen(false)}
                className={
                  link.active
                    ? "rounded-[14px] bg-white/10 px-[18px] py-3 text-left text-[15px] text-white"
                    : "rounded-[14px] px-[18px] py-3 text-left text-[15px] text-white/80"
                }
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Desktop */}
      <div className="hidden items-center justify-between md:flex">
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

        <nav className="flex items-center gap-1 rounded-[90px] bg-white/10 p-2 backdrop-blur-[20px]">
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
          className="rounded-[90px] bg-gradient-to-b from-[#ff846d] to-[#fc310c] px-[19px] py-3 text-[15px] font-semibold tracking-[0.2px] text-white disabled:opacity-60"
        >
          {walletLabel}
        </button>
      </div>

      <ConnectWalletModal
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
      />
    </header>
  );
}
