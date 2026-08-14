import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { coston2 } from "./chains";

/** Reown/WalletConnect Cloud project ID — public by design (identifies the
 * app to the relay, not a secret). Get one at https://cloud.reown.com. */
const WALLETCONNECT_PROJECT_ID = "5414f073a9c16a5df5cd5557f09a4c6c";

export const wagmiConfig = createConfig({
  chains: [coston2],
  connectors: [
    injected(),
    walletConnect({
      projectId: WALLETCONNECT_PROJECT_ID,
      metadata: {
        name: "Pistis",
        description: "Trustless FXRP escrow on Flare",
        url: "https://pistis-henna.vercel.app",
        icons: ["https://pistis-henna.vercel.app/landing/logo-frame.svg"],
      },
      showQrModal: true, // WalletConnect's own QR/deep-link modal — battle-tested, not worth reinventing
    }),
  ],
  transports: {
    [coston2.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
