"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useWallet, truncateAddress } from "@/hooks/useWallet";

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
          onClick={connectWallet}
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
    </header>
  );
}
