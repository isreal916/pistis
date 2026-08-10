import Image from "next/image";

/** Shared success visual — confetti + badge + check — for every completed
 * on-chain action across the dashboard (create, deposit, submit, approve). */
export function SuccessConfetti() {
  return (
    <div className="relative flex h-[140px] w-full items-center justify-center">
      <Image
        src="/dashboard/confetti-bg.png"
        alt=""
        fill
        className="object-contain"
      />
      <div className="relative flex h-[110px] w-[110px] items-center justify-center">
        <Image
          src="/dashboard/success-badge.svg"
          alt=""
          fill
          className="object-contain"
        />
        <Image
          src="/dashboard/success-check.svg"
          alt=""
          width={34}
          height={29}
          className="relative"
        />
      </div>
    </div>
  );
}
