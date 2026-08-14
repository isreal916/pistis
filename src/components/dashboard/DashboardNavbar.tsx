"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useWallet, truncateAddress } from "@/hooks/useWallet";
import { ConnectWalletModal } from "@/components/landing/ConnectWalletModal";

const navLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Escrow", href: "/dashboard/escrows" },
  { label: "Activity", href: "/dashboard" },
  { label: "Docs", href: "/dashboard" },
];

type Props = {
  active?: string;
};

export function DashboardNavbar({ active = "Dashboard" }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
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

  const walletButton = isConnected ? null : isWrongNetwork ? (
    <button
      type="button"
      onClick={() => {
        switchToCoston2();
        setNavOpen(false);
      }}
      disabled={isSwitching}
      className="rounded-[16px] border border-[#ff460b]/60 bg-[#ff460b]/10 px-[18px] py-3 text-[15px] text-[#ff460b] disabled:opacity-60"
    >
      {isSwitching ? "Switching..." : "Switch to Coston2"}
    </button>
  ) : (
    <button
      type="button"
      onClick={() => {
        setConnectModalOpen(true);
        setNavOpen(false);
      }}
      disabled={isConnecting}
      className="rounded-[16px] bg-gradient-to-b from-[#ff846d] to-[#fc310c] px-[18px] py-3 text-[15px] font-semibold text-white disabled:opacity-60"
    >
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );

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
          onClick={() => setNavOpen((open) => !open)}
          aria-label="Toggle menu"
          aria-expanded={navOpen}
          className={
            navOpen
              ? "flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#ff846d] to-[#fc310c] text-white"
              : "flex h-[38px] w-[38px] shrink-0 items-center justify-center"
          }
        >
          {navOpen ? (
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

      {navOpen && (
        <div className="mt-3 flex flex-col gap-3 rounded-[24px] border border-white/10 bg-[#111] p-3 md:hidden">
          {walletButton}
          {isConnected && (
            <button
              type="button"
              onClick={() => {
                disconnect();
                setNavOpen(false);
              }}
              className="rounded-[16px] border border-white/10 bg-white/5 px-[18px] py-3 text-left text-[15px] text-white"
            >
              Disconnect {address ? truncateAddress(address) : ""}
            </button>
          )}
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setNavOpen(false)}
                className={
                  link.label === active
                    ? "rounded-[14px] bg-white/10 px-[18px] py-3 text-[15px] text-white"
                    : "rounded-[14px] px-[18px] py-3 text-[15px] text-white/80"
                }
              >
                {link.label}
              </Link>
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
            <Link
              key={link.label}
              href={link.href}
              className={
                link.label === active
                  ? "rounded-[90px] bg-gradient-to-b from-[#fc5016] to-[#ff8961] px-[18px] py-2 text-[15px] text-white"
                  : "px-[18px] py-2 text-[15px] text-white"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {!isConnected ? (
          <button
            type="button"
            onClick={() => setConnectModalOpen(true)}
            disabled={isConnecting}
            className="rounded-[90px] border border-white/10 bg-white/10 px-4 py-3 text-[13px] tracking-[0.2px] text-white backdrop-blur-[20px] disabled:opacity-60"
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        ) : isWrongNetwork ? (
          <button
            type="button"
            onClick={switchToCoston2}
            disabled={isSwitching}
            className="rounded-[90px] border border-[#ff460b]/60 bg-[#ff460b]/10 px-4 py-3 text-[13px] text-[#ff460b] backdrop-blur-[20px] disabled:opacity-60"
          >
            {isSwitching ? "Switching..." : "Switch to Coston2"}
          </button>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-3 rounded-[90px] border border-white/10 bg-white/10 py-2 pl-2 pr-4 backdrop-blur-[20px]"
            >
              <Image
                src="/dashboard/wallet-avatar.png"
                alt=""
                width={20}
                height={20}
                className="rounded-full"
              />
              <span className="text-[13px] text-white">
                {address ? truncateAddress(address) : ""}
              </span>
              <Image
                src="/dashboard/chevron-down.svg"
                alt=""
                width={8}
                height={4}
              />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-full min-w-[140px] overflow-hidden rounded-[12px] border border-white/10 bg-black/90 backdrop-blur-[20px]">
                <button
                  type="button"
                  onClick={() => {
                    disconnect();
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-[13px] text-white hover:bg-white/10"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConnectWalletModal
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
      />
    </header>
  );
}
