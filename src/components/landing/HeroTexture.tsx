import type { CSSProperties } from "react";

const maskStyle = (position: string): CSSProperties => ({
  maskImage: "url(/landing/hero-texture-mask.svg)",
  maskMode: "luminance",
  maskRepeat: "no-repeat",
  maskPosition: position,
  maskSize: "1440px 1252px",
  WebkitMaskImage: "url(/landing/hero-texture-mask.svg)",
  WebkitMaskRepeat: "no-repeat",
  WebkitMaskPosition: position,
  WebkitMaskSize: "1440px 1252px",
});

export function HeroTexture() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-20 overflow-hidden"
    >
      <div className="relative mx-auto h-[1252px] max-w-[1440px]">
        <div
          className="absolute left-[-386px] top-[646px] h-[1651px] w-[2242px]"
          style={maskStyle("387px -647px")}
        >
          <img
            src="/landing/hero-texture-glyphs.svg"
            alt=""
            className="absolute inset-[-6.06%_-4.46%] block size-full max-w-none"
          />
        </div>
        <div
          className="absolute left-[452px] top-[-144px] h-[502px] w-[552px] mix-blend-plus-lighter"
          style={maskStyle("-451px 143px")}
        >
          <img
            src="/landing/hero-texture-glow.svg"
            alt=""
            className="absolute inset-[-59.76%_-54.35%] block size-full max-w-none"
          />
        </div>
      </div>
    </div>
  );
}
