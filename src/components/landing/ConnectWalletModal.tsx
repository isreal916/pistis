"use client";

import { useWallet } from "@/hooks/useWallet";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ConnectWalletModal({ open, onClose }: Props) {
  const { connectWith, isConnecting } = useWallet();

  if (!open) return null;

  function handlePick(connectorId: string) {
    connectWith(connectorId);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[420px] rounded-[36px] border border-[rgba(146,146,146,0.15)] bg-[#111] p-6 shadow-[-29px_49px_120px_0px_rgba(0,0,0,0.25)]">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-[19px] font-bold text-white">Connect Wallet</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[#fc3116] text-[28px] text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handlePick("injected")}
            disabled={isConnecting}
            className="flex items-center justify-between rounded-[16px] border border-white/10 bg-white/5 px-5 py-4 text-left text-white transition-colors hover:border-white/25 disabled:opacity-60"
          >
            <span>
              <span className="block text-[15px] font-semibold">
                Browser Wallet
              </span>
              <span className="block text-[12px] text-white/50">
                MetaMask, or another extension already installed
              </span>
            </span>
            <span className="text-white/40">→</span>
          </button>

          <button
            type="button"
            onClick={() => handlePick("walletConnect")}
            disabled={isConnecting}
            className="flex items-center justify-between rounded-[16px] border border-white/10 bg-white/5 px-5 py-4 text-left text-white transition-colors hover:border-white/25 disabled:opacity-60"
          >
            <span>
              <span className="block text-[15px] font-semibold">
                WalletConnect
              </span>
              <span className="block text-[12px] text-white/50">
                Scan a QR code, or open your wallet app directly on mobile
              </span>
            </span>
            <span className="text-white/40">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
