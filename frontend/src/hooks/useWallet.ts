"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { coston2 } from "@/lib/chains";

export function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function useWallet() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const isWrongNetwork = isConnected && chainId !== coston2.id;

  function connectWallet() {
    const injectedConnector = connectors.find((c) => c.id === "injected");
    connect({ connector: injectedConnector ?? connectors[0] });
  }

  function switchToCoston2() {
    switchChain({ chainId: coston2.id });
  }

  return {
    address,
    isConnected,
    isConnecting,
    isSwitching,
    isWrongNetwork,
    connectWallet,
    disconnect,
    switchToCoston2,
  };
}
