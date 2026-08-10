import Image from "next/image";

const steps = [
  {
    title: "Fund the escrow",
    description:
      "The client locks payment in a smart contract using whatever asset they already hold. Neither side can withdraw it freely.",
  },
  {
    title: "Milestones control release",
    description:
      "Work is submitted against agreed milestones. Approval releases exactly that slice of the funds automatically.",
  },
  {
    title: "Release, bridge, or swap",
    description:
      "Release locally on Flare, bridge cross-chain via LayerZero, or swap into a stablecoin on payout — the client only ever deposits FXRP.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-[1424px] px-6 pb-32">
      <h2 className="mb-16 text-center text-[32px] uppercase text-white md:text-[40px]">
        How it Works
      </h2>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.title}
            className="relative overflow-hidden rounded-[16px] border border-white/10 bg-[rgba(17,17,17,0.9)] p-6"
          >
            <div
              className="pointer-events-none absolute -top-24 left-1/2 h-[300px] w-[300px] -translate-x-1/2 opacity-30"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(255,90,40,0.5) 0%, rgba(255,90,40,0) 70%)",
              }}
            />
            <div className="relative flex items-center justify-between">
              <span className="text-[13.5px] font-medium uppercase tracking-[1.4px] text-[#a1a3a7]">
                Explore docs
              </span>
              <Image
                src="/landing/icon-check2.svg"
                alt=""
                width={16}
                height={16}
              />
            </div>
            <div className="relative mt-20 flex flex-col gap-3">
              <h3 className="text-[25px] italic text-white">{step.title}</h3>
              <p className="text-[14px] leading-[23px] text-white">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
