'use client';

import React, { useEffect, useRef, useState } from 'react';

// Row-specific headlines (user-provided content)
const HEADLINES_ROW_1 = [
  "We're Just A Marketplace—No Frills, No Fluff.",
  "We're a pure-play influencer aggregator platform.",
  "No campaign ideation. No fake AI promises. No hidden tech gimmicks.",
  "You find your own creators. We make the process seamless.",
  "Revolutionizing Influencer Payments",
  "💰 Upfront from Brands.",
  "✅ Escrow-secured.",
  "🚀 Payouts to creators in as fast as 7 days.",
  "📊 Post-campaign report + Brand approval = Immediate payout.",
  "📄 Need Tax Invoices? Sorted—for both creators & brands.",
  "We Are NOT an Agency.",
  "Influencers deliver natural, organic content—no scripting, no interference.",
  "Creators rate brands and the collaboration experience.",
  "Tap into vernacular influence—reach real audiences in their native language and watch your visibility soar.",
  "Legal contracts to indemnify creators and brands."
];

const HEADLINES_ROW_2 = [
  "Creators lead the content. - No agency scripting—let influencers craft unique, authentic campaigns.",
  "Tap into real, local talent—DJs, makeup artists, photographers—no extra cost for travel or digging through Instagram for references.",
  "And yes, we ensure creators are paid on time.",
  "Escrow-secured payments. - Brand money stays safe until the campaign is completed and approved.",
  "Verified influencers only. - We vet for fake followers and inauthentic engagement—no bots.",
  "Leverage UGC creators, not overused celebs. - Get relevant voices that resonate with your target audience."
];

// Ticker speed values
const TICKER_CONFIG = [
  { label: 'MARKET POSITIONING', theme: 'purple', speed: 80, headlines: HEADLINES_ROW_1 }, // Maximum speed for fast marquee
  { label: 'CORE ADVANTAGES', theme: 'cyan', speed: 20, headlines: HEADLINES_ROW_2 }
];

// Map theme keys to static Tailwind classes (avoids purge issues)
const THEME_CLASS_MAP = {
  purple: 'text-purple-300',
  cyan: 'text-cyan-300'
};

// Speed adjustment multipliers (we keep original TICKER_CONFIG speeds intact,
// but apply multipliers so the first row is slower and the second row is faster)
const SPEED_ADJUST = [2.0, 1.9]; // row1 ~160px (maximum speed for very fast marquee), row2 ~38px (approx)

export default function BreakingNewsTicker() {
  return (
    <div className="w-full bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700 shadow-xl z-50 overflow-hidden">
      <div className="relative text-white h-32 flex"> {/* Increased height from h-20 to h-32 */}
        <div className="w-40 h-full bg-gradient-to-r from-purple-700 to-indigo-800 flex flex-col items-center justify-center px-3 py-2 shadow-lg">
          <div className="font-bold text-center uppercase tracking-widest leading-tight">
            <span className="block text-base font-extrabold">EXCLUSIVE </span>
            <span className="block text-xs font-light mt-0.5">Breaking News</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {TICKER_CONFIG.map((config, i) => (
            <div key={i} className={`h-1/2 ${i === 0 ? 'border-b border-gray-700' : ''} overflow-hidden relative flex items-center`}>
              <div className={`absolute left-0 top-0 h-full w-28 flex items-center bg-gray-800/50 px-2 z-10 text-[12px] font-semibold ${config.theme === 'purple' ? 'text-purple-300' : 'text-cyan-300'} tracking-wide`}>
                {config.label}
              </div>
              <NewsTicker 
                headlines={config.headlines} 
                // apply multiplier here so we don't mutate original TICKER_CONFIG speeds
                speed={Math.max(1, Math.round(config.speed * (SPEED_ADJUST[i] || 1)))}
                themeClass={THEME_CLASS_MAP[config.theme] || 'text-white'}
                containerClass="ml-28"
              />
            </div>
          ))}
        </div>

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center bg-red-500/20 backdrop-blur px-2 py-0.5 rounded-full">
          <span className="relative flex h-1.5 w-1.5 mr-1">
            <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative rounded-full h-1.5 w-1.5 bg-red-500"></span>
          </span>
          <span className="text-[10px] font-semibold text-red-100">LIVE</span>
        </div>
      </div>
    </div>
  );
}

function NewsTicker({ headlines = [], speed = 20, themeClass = 'text-white', containerClass = '' }: {
  headlines: string[];
  speed: number;
  themeClass: string;
  containerClass: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const [displayHeadlines, setDisplayHeadlines] = useState<string[]>([]);

  // Build a repeated list of headlines that will comfortably fill twice the container width
  useEffect(() => {
    const calculateDisplay = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth || 0;
      if (containerWidth === 0) return;

      // Create a hidden measurer element to get accurate widths
      const measurer = document.createElement('div');
      measurer.style.position = 'absolute';
      measurer.style.visibility = 'hidden';
      measurer.style.whiteSpace = 'nowrap';
      document.body.appendChild(measurer);

      // Measure width of each headline with same classes applied
      const itemWidths = headlines.map(text => {
        const span = document.createElement('span');
        span.className = `px-2 text-[12px] font-medium ${themeClass}`;
        span.textContent = text;
        measurer.appendChild(span);
        const w = span.offsetWidth;
        measurer.removeChild(span);
        return w + 12; // add small gap/separator width
      });

      // build repeated list until totalWidth > containerWidth * 2
      let built: string[] = [];
      let total = 0;
      let idx = 0;
      while (total < containerWidth * 2 && headlines.length > 0) {
        const w = itemWidths[idx % itemWidths.length] || 100;
        built.push(headlines[idx % headlines.length]);
        total += w;
        idx++;
        // safety cap
        if (idx > headlines.length * 50) break;
      }

      document.body.removeChild(measurer);
      setDisplayHeadlines(built);
    };

    // run on next frame to ensure DOM is painted and widths are measurable
    const rafId = requestAnimationFrame(calculateDisplay);
    window.addEventListener('resize', calculateDisplay);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', calculateDisplay);
    };
  }, [headlines, themeClass]);

  // Continuous animation (no pause on hover)
  useEffect(() => {
    if (!contentRef.current || displayHeadlines.length === 0) return;

    // ensure we start from 0
    let position = 0;

    const step = () => {
      if (!contentRef.current) return;
      position -= speed / 60; // speed is px per second-ish approximation
      // reset when we've scrolled half of the content (we render two sequences)
      const resetAt = contentRef.current.offsetWidth / 2 || 0;
      if (position <= -resetAt) position = 0;
      contentRef.current.style.transform = `translateX(${position}px)`;
      animRef.current = requestAnimationFrame(step);
    };

    // start animation
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = null;
    };
  }, [speed, displayHeadlines]);

  return (
    <div ref={containerRef} className={`relative w-full h-full flex items-center overflow-hidden ${containerClass}`}>
      <div ref={contentRef} className="absolute whitespace-nowrap flex items-center h-full will-change-transform">
        {displayHeadlines.map((headline, i) => (
          <React.Fragment key={i}>
            <span className={`px-2 text-[12px] font-medium ${themeClass}`}>{headline}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-white/30 mx-1"></div>
          </React.Fragment>
        ))}
        {/* duplicate the same sequence once so we always have content to scroll into */}
        {displayHeadlines.map((headline, i) => (
          <React.Fragment key={`dup-${i}`}>
            <span className={`px-2 text-[12px] font-medium ${themeClass}`}>{headline}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-white/30 mx-1"></div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

