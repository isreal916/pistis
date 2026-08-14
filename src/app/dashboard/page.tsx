import Image from "next/image";
import { DashboardNavbar } from "@/components/dashboard/DashboardNavbar";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { EscrowList } from "@/components/dashboard/EscrowList";
import { FooterBar } from "@/components/landing/FooterBar";

export const metadata = {
  title: "Dashboard — Pistis",
};

export default function DashboardPage() {
  return (
    <div className="relative flex flex-1 flex-col bg-black">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <Image
          src="/dashboard/galaxy-bg.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-60"
          priority
        />
      </div>

      <DashboardNavbar />
      <StatsCards />
      <EscrowList />
      <div className="mt-auto pt-12">
        <FooterBar />
      </div>
    </div>
  );
}
