import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { WhyPistis } from "@/components/landing/WhyPistis";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-black">
      <Navbar />
      <Hero />
      <WhyPistis />
      <HowItWorks />
      <Footer />
    </div>
  );
}
