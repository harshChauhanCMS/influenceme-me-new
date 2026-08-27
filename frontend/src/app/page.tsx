'use client';

import HeroSection from "@/components/HeroSection";
import BreakingNewsTicker from "@/components/BreakingNewsTicker";
import WhyInflu from "@/components/WhyInflu";
import Journey from "@/components/Journey";
import InfluencerCarousel from "@/components/InfluencerCarousel";

export default function Home() {
  return (
      <>
        <HeroSection/>
        <BreakingNewsTicker/>
        <WhyInflu/>
        <div id="journey">
          <Journey/>
        </div>
        <InfluencerCarousel/>
      </>
  );
}
