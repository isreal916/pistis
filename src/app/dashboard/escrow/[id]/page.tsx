import Image from "next/image";
import { notFound } from "next/navigation";
import { isAddress } from "viem";
import { DashboardNavbar } from "@/components/dashboard/DashboardNavbar";
import { EscrowDetail } from "@/components/dashboard/EscrowDetail";
import { FooterBar } from "@/components/landing/FooterBar";

export default async function EscrowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isAddress(id)) {
    notFound();
  }

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
      <EscrowDetail address={id} />
      <div className="mt-auto pt-12">
        <FooterBar />
      </div>
    </div>
  );
}
