import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { Web3Provider } from "@/components/providers/Web3Provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pistis — Cross-chain Escrow Built on Trust",
  description:
    "Trustless escrow for freelancers, powered by Flare FAssets and LayerZero OFT.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black">
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
