import Image from "next/image";

const rows = [
  {
    traditional: "Funds held by a third party",
    pistis: "Smart contracts securely lock funds on-chain",
  },
  {
    traditional: "Limited to one payment method",
    pistis: "Cross-chain payments with preferred crypto assets",
  },
  {
    traditional: "Platform controls the escrow",
    pistis: "Users retain control through decentralized contracts",
  },
  {
    traditional: "Slow approvals and payouts",
    pistis: "Instant settlement once milestones are approved",
  },
];

export function WhyPistis() {
  return (
    <section className="mx-auto max-w-[1424px] px-6 pb-24">
      <h2 className="mb-12 text-center text-[32px] uppercase text-white md:text-[40px]">
        Why Pistis?
      </h2>

      <div className="overflow-hidden rounded-[12px] border border-white/20">
        <div className="grid grid-cols-2">
          <div className="flex items-center justify-center gap-2 border-b border-r border-white/20 py-4 sm:gap-[15px] sm:py-6">
            <Image
              src="/landing/icon-check.svg"
              alt=""
              width={25}
              height={27}
              className="h-4 w-4 opacity-60 sm:h-[27px] sm:w-[25px]"
            />
            <span className="text-[13px] text-white sm:text-[24px]">
              Traditional Escrow
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 border-b border-white/20 py-4 sm:gap-[15px] sm:py-6">
            <Image
              src="/landing/icon-check.svg"
              alt=""
              width={25}
              height={27}
              className="h-4 w-4 sm:h-[27px] sm:w-[25px]"
            />
            <span className="text-[13px] text-white sm:text-[24px]">
              Pistis
            </span>
          </div>

          {rows.map((row, i) => (
            <div key={row.traditional} className="contents">
              <div
                className={`flex items-center justify-center border-r border-white/20 px-3 py-4 text-center text-[13px] text-white sm:px-6 sm:py-6 sm:text-[18px] md:text-[22px] ${
                  i < rows.length - 1 ? "border-b" : ""
                }`}
              >
                {row.traditional}
              </div>
              <div
                className={`flex items-center justify-center px-3 py-4 text-center text-[13px] text-white sm:px-6 sm:py-6 sm:text-[18px] md:text-[22px] ${
                  i < rows.length - 1 ? "border-b border-white/20" : ""
                }`}
              >
                {row.pistis}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
