import Image from "next/image";

export function FooterBar() {
  return (
    <div className="mx-auto flex max-w-[1078px] flex-col items-center gap-4 border-t border-white/20 px-6 py-8 md:flex-row md:justify-between">
      <p className="text-[13px] text-white/80 md:text-[14px]">
        © PISTIS Network 2026. All rights reserved
      </p>
      <div className="flex items-center gap-9">
        <Image src="/landing/social1.svg" alt="" width={20} height={20} />
        <Image src="/landing/social2.svg" alt="" width={20} height={20} />
        <Image src="/landing/social3.svg" alt="" width={20} height={20} />
      </div>
    </div>
  );
}
