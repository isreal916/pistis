import Image from "next/image";

type Coin = {
  id: string;
  left: string;
  top: string;
  width: string;
  height: string;
  bg?: string;
  rounded?: string;
  gradient?: boolean;
  icon: string;
  iconInset?: string;
  shadow?: string;
  innerBg?: string;
  innerInset?: string;
};

const coins: Coin[] = [
  {
    id: "coin-1",
    left: "14.8%",
    top: "38.2%",
    width: "4.8%",
    height: "10%",
    bg: "bg-[#fdfdfd]",
    rounded: "rounded-[17.27px]",
    icon: "/landing/coin-frame1.svg",
    iconInset: "inset-[7%]",
    shadow: "shadow-[0px_12.9px_30px_rgba(0,0,0,0.25)]",
  },
  {
    id: "coin-2",
    left: "46.5%",
    top: "58.7%",
    width: "6.5%",
    height: "13.3%",
    gradient: true,
    rounded: "rounded-[19.9px]",
    icon: "/landing/coin-frame2.svg",
    iconInset: "inset-[14%]",
    shadow: "shadow-[0px_17px_35px_rgba(255,58,58,0.25)]",
  },
  {
    id: "coin-3",
    left: "29.9%",
    top: "58.7%",
    width: "5.6%",
    height: "11.5%",
    bg: "bg-[#fdfdfd]",
    rounded: "rounded-[17.27px]",
    icon: "/landing/img9421.png",
    innerBg: "bg-[#e62058]",
    innerInset: "inset-[12.5%]",
    iconInset: "inset-[22%]",
    shadow: "shadow-[0px_15px_35px_rgba(0,0,0,0.25)]",
  },
  {
    id: "coin-4",
    left: "14.2%",
    top: "73.5%",
    width: "4.8%",
    height: "10%",
    bg: "bg-[#fdfdfd]",
    rounded: "rounded-[17.27px]",
    icon: "/landing/solana.svg",
    innerBg: "bg-[#0c0d0f]",
    innerInset: "inset-[7%]",
    iconInset: "inset-[20%]",
    shadow: "shadow-[0px_15px_35px_rgba(0,0,0,0.25)]",
  },
  {
    id: "coin-5",
    left: "81.8%",
    top: "36.7%",
    width: "4.8%",
    height: "10%",
    bg: "bg-[#fdfdfd]",
    rounded: "rounded-[17.27px]",
    icon: "/landing/coin-frame3.svg",
    iconInset: "inset-[7%]",
    shadow: "shadow-[0px_15px_35px_rgba(0,0,0,0.25)]",
  },
  {
    id: "coin-6",
    left: "64%",
    top: "58.7%",
    width: "5.6%",
    height: "11.5%",
    bg: "bg-[#fdfdfd]",
    rounded: "rounded-[17.27px]",
    icon: "/landing/coin-frame4.svg",
    iconInset: "inset-[13%]",
    shadow: "shadow-[0px_17.2px_40px_rgba(0,0,0,0.25)]",
  },
  {
    id: "coin-7",
    left: "82.5%",
    top: "76.1%",
    width: "4.8%",
    height: "10%",
    icon: "/landing/coin-frame5.svg",
    shadow: "shadow-[0px_15px_35px_rgba(0,0,0,0.25)]",
  },
];

export function FloatingCoins() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 block select-none">
      <div className="absolute inset-[36.7%_50%_23.9%_0] opacity-90">
        <Image
          src="/landing/vector2.svg"
          alt=""
          fill
          sizes="700px"
          className="object-fill"
        />
      </div>
      <div className="absolute inset-[36.7%_0%_23.9%_50%] opacity-90">
        <Image
          src="/landing/vector2-right.svg"
          alt=""
          fill
          sizes="700px"
          className="object-fill"
        />
      </div>
      <div className="absolute left-1/2 top-[64%] h-[3%] w-[43%] -translate-x-1/2 opacity-90">
        <Image
          src="/landing/vector1.svg"
          alt=""
          fill
          sizes="620px"
          className="object-contain"
        />
      </div>

      {coins.map((coin) => (
        <div
          key={coin.id}
          className={`absolute ${coin.bg ?? ""} ${coin.rounded ?? ""} ${
            coin.shadow ?? ""
          }`}
          style={{
            left: coin.left,
            top: coin.top,
            width: coin.width,
            height: coin.height,
            backgroundImage: coin.gradient
              ? "linear-gradient(180deg, #ff846d, #fc310c)"
              : undefined,
          }}
        >
          {coin.innerBg ? (
            <div
              className={`absolute ${coin.innerBg} ${
                coin.innerInset ?? "inset-[10%]"
              } rounded-[12px] overflow-hidden`}
            >
              <div className={`absolute ${coin.iconInset ?? "inset-0"}`}>
                <Image
                  src={coin.icon}
                  alt=""
                  fill
                  sizes="70px"
                  className="object-contain"
                />
              </div>
            </div>
          ) : (
            <div className={`absolute ${coin.iconInset ?? "inset-0"}`}>
              <Image
                src={coin.icon}
                alt=""
                fill
                sizes="70px"
                className="object-contain"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
