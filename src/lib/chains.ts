import { defineChain } from "viem";

export const coston2 = defineChain({
  id: 114,
  name: "Flare Testnet Coston2",
  nativeCurrency: {
    name: "Coston2 Flare",
    symbol: "C2FLR",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://coston2-api.flare.network/ext/C/rpc"],
      webSocket: ["wss://coston2-api.flare.network/ext/C/ws"],
    },
  },
  blockExplorers: {
    default: {
      name: "Coston2 Explorer",
      url: "https://coston2-explorer.flare.network",
    },
  },
  testnet: true,
});

/** FlareContractRegistry — same address on every Flare network. Never hardcode
 * downstream contract addresses (AssetManager, FXRP, etc.) — resolve them at
 * runtime through this registry instead. */
export const FLARE_CONTRACTS_REGISTRY =
  "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019" as const;
