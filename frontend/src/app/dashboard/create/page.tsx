import Image from "next/image";
import Link from "next/link";
import { DashboardNavbar } from "@/components/dashboard/DashboardNavbar";
import { CreateEscrowForm } from "@/components/dashboard/CreateEscrowForm";
import { FooterBar } from "@/components/landing/FooterBar";

export const metadata = {
  title: "Create Escrow — Pistis",
};

export default function CreateEscrowPage() {
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

      <DashboardNavbar active="Dashboard" />

      <div className="mx-auto w-full max-w-[1440px] px-6 py-10 lg:px-[71px]">
        <Link
          href="/dashboard"
          className="mb-[46px] inline-flex items-center gap-[10px] rounded-[15px] border border-[rgba(146,146,146,0.15)] bg-[rgba(17,17,17,0.7)] px-[19px] py-[11px] text-[14px] font-light text-white"
        >
          <Image
            src="/dashboard/back-chevron.svg"
            alt=""
            width={12}
            height={6}
            className="-rotate-90"
          />
          Back to dashboard
        </Link>

        <div className="mb-10 flex max-w-[600px] flex-col gap-[10px]">
          <h1 className="text-[25px] font-semibold tracking-[-1.3px] text-white">
            Create an escrow
          </h1>
          <p className="text-[16px] text-white/70">
            Set the terms once, funds get deposited in the next step and lock
            automatically
          </p>
        </div>

        <CreateEscrowForm />
      </div>

      <div className="mt-auto pt-12">
        <FooterBar />
      </div>
    </div>
  );
}
